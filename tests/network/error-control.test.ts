import { describe, expect, it } from 'vitest';
import { encodeHuffmanContainerDetailed, restoreBitLabContainer } from '../../src/core/container';
import { createChannelRandom, transmitFrame } from '../../src/core/network/error-channel';
import { crc16, decodeErrorFrame, encodeErrorFrame } from '../../src/core/network/error-codes';
import { MAX_CHANNEL_BYTES, simulateErrorControl } from '../../src/core/network/error-simulation';

const bits = (value: string) => Uint8Array.from(value, Number);

describe('códigos de control de errores', () => {
  it('detecta una inversión de paridad y deja pasar dos', () => {
    const frame = new Uint8Array(5);
    const decoded = new Uint8Array(4);
    encodeErrorFrame('parity', bits('1011'), frame);
    expect(frame).toEqual(bits('10111'));
    frame[0] ^= 1;
    expect(decodeErrorFrame('parity', frame, decoded)).toBe(1);
    expect(decoded).toEqual(bits('0011'));
    frame[1] ^= 1;
    expect(decodeErrorFrame('parity', frame, decoded)).toBe(0);
    expect(decoded).toEqual(bits('0111'));
  });

  it('reproduce el vector CRC-16/XMODEM 123456789 y detecta toda inversión simple', () => {
    const data = bits(Array.from('123456789', (character) => character.charCodeAt(0).toString(2).padStart(8, '0')).join(''));
    const frame = new Uint8Array(data.length + 16);
    const decoded = new Uint8Array(data.length);
    expect(crc16(data)).toBe(0x31c3);
    encodeErrorFrame('crc16', data, frame);
    expect(frame.slice(-16)).toEqual(bits('0011000111000011'));
    expect(decodeErrorFrame('crc16', frame, decoded)).toBe(0);
    expect(decoded).toEqual(data);
    for (let position = 0; position < frame.length; position++) {
      frame[position] ^= 1;
      expect(decodeErrorFrame('crc16', frame, decoded)).not.toBe(0);
      frame[position] ^= 1;
    }
  });

  it('corrige las siete posibles inversiones para cada palabra Hamming de 4 bits', () => {
    const frame = new Uint8Array(7);
    const decoded = new Uint8Array(4);
    for (let value = 0; value < 16; value++) {
      const data = bits(value.toString(2).padStart(4, '0'));
      encodeErrorFrame('hamming74', data, frame);
      expect(decodeErrorFrame('hamming74', frame, decoded)).toBe(0);
      expect(decoded).toEqual(data);
      for (let position = 0; position < frame.length; position++) {
        frame[position] ^= 1;
        expect(decodeErrorFrame('hamming74', frame, decoded)).toBe(position + 1);
        expect(decoded).toEqual(data);
        frame[position] ^= 1;
      }
    }
  });
});

describe('canal binario y métricas', () => {
  it.each([1, 2] as const)('invierte %i bits en los datos de la fuente y conserva ambas etapas', (count) => {
    const input = Uint8Array.of(0x42, 0x76);
    const result = simulateErrorControl(input, { code: 'hamming74', probability: 0, seed: 0, demonstrationErrors: count });
    expect(result.receivedPayload).toEqual(Uint8Array.of(count === 1 ? 0x43 : 0x41, 0x76));
    expect(result.receivedPayloadErrors).toBe(count);
    expect(result.channelBitErrors).toBe(count);
    expect(result.recovered).toEqual(count === 1 ? input : result.receivedPayload);
    expect(result.residualBitErrors).toBe(count === 1 ? 0 : 2);
    expect(input).toEqual(Uint8Array.of(0x42, 0x76));
  });

  it('implementa p=0, p=1 y el umbral estricto para cada bit', () => {
    const sent = bits('1011');
    const received = new Uint8Array(4);
    expect(transmitFrame(sent, received, 0, createChannelRandom(1))).toBe(0);
    expect(received).toEqual(sent);
    expect(transmitFrame(sent, received, 1, createChannelRandom(1))).toBe(4);
    expect(received).toEqual(bits('0100'));
    const values = [0.4, 0.5, 0.1, 0.7];
    expect(transmitFrame(sent, received, 0.5, () => values.shift()!)).toBe(2);
    expect(received).toEqual(bits('0001'));
    expect(sent).toEqual(bits('1011'));
  });

  it('mide un error de canal corregido por Hamming de forma reproducible', () => {
    const input = Uint8Array.of(0x5a);
    const options = { code: 'hamming74', probability: 0.1, seed: 1 } as const;
    const result = simulateErrorControl(input, options);
    expect(result).toEqual(simulateErrorControl(input, options));
    expect(result).toMatchObject({
      receivedPayload: input, receivedPayloadErrors: 0,
      recovered: input,
      payloadBits: 8, transmittedBits: 14, redundancyBits: 6,
      channelBitErrors: 1, channelFrameErrors: 1, frames: 2,
      residualBitErrors: 0, residualFrameErrors: 0,
      residualBer: 0, residualFer: 0,
      detectedFrames: 1, correctedFrames: 1, miscorrectedFrames: 0,
    });
    expect(result.codeRate).toBeCloseTo(4 / 7);
    expect(result.channelBer).toBeCloseTo(1 / 14);
    expect(result.channelFer).toBe(0.5);
  });

  it('no cuenta una inversión equivocada de Hamming como corrección', () => {
    const result = simulateErrorControl(Uint8Array.of(0x5a), { code: 'hamming74', probability: 0.1, seed: 3 });
    expect(result).toMatchObject({ detectedFrames: 2, correctedFrames: 1, miscorrectedFrames: 1, residualFrameErrors: 1 });
    expect(result.residualBer).toBeGreaterThan(0);
  });

  it('cuenta errores que una comprobación deja pasar', () => {
    const result = simulateErrorControl(Uint8Array.of(0x5a), { code: 'hamming74', probability: 1, seed: 42 });
    expect(result).toMatchObject({ receivedPayload: Uint8Array.of(0xa5), receivedPayloadErrors: 8, channelBer: 1, channelFer: 1, residualBer: 1, residualFer: 1, undetectedFrames: 2, detectedFrames: 0 });
  });

  it.each([['parity', 1], ['crc16', 16]] as const)('calcula redundancia en la última trama parcial de %s', (code, checkBits) => {
    const data = new Uint8Array(33).fill(0x85);
    const result = simulateErrorControl(data, { code, probability: 0, seed: 42 });
    expect(result).toMatchObject({ recovered: data, payloadBits: 264, frames: 2, redundancyBits: checkBits * 2, residualBer: 0 });
    expect(result.examples.map(({ sent }) => sent.length)).toEqual([256 + checkBits, 8 + checkBits]);
  });

  it('rechaza probabilidades, semillas y volúmenes fuera de rango', () => {
    const options = { code: 'crc16', probability: 0, seed: 42 } as const;
    const input = Uint8Array.of(0x5a);
    expect(() => simulateErrorControl(input, { ...options, probability: NaN })).toThrow(RangeError);
    expect(() => simulateErrorControl(input, { ...options, probability: 1.01 })).toThrow(RangeError);
    expect(() => simulateErrorControl(input, { ...options, seed: -1 })).toThrow(RangeError);
    expect(() => simulateErrorControl(new Uint8Array(0), options)).toThrow(RangeError);
    expect(() => simulateErrorControl(new Uint8Array(MAX_CHANNEL_BYTES + 1), options)).toThrow(RangeError);
  });

  it('entrega un contenedor comprimido intacto al decodificador tras corregir el canal', () => {
    const original = new TextEncoder().encode('BitLab '.repeat(8));
    const { container } = encodeHuffmanContainerDetailed({
      originalBytes: original, originalName: 'ejemplo.txt', mimeType: 'text/plain', wordSizeBits: 8,
    });
    const result = simulateErrorControl(container, { code: 'hamming74', probability: 0.002, seed: 0 });
    expect(result.correctedFrames).toBeGreaterThan(0);
    expect(result.residualBitErrors).toBe(0);
    expect(result.recovered).toEqual(container);
    expect(restoreBitLabContainer(result.recovered).bytes).toEqual(original);
  });
});
