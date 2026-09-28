import { describe, expect, it } from 'vitest';
import { DEMO_SOURCES, generateDemoSource } from '../../src/core/demo-sources';

function startsWith(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

function endsWith(bytes: Uint8Array, expected: number[]): boolean {
  const offset = bytes.length - expected.length;
  return expected.every((value, index) => bytes[offset + index] === value);
}

function containsAscii(bytes: Uint8Array, text: string): boolean {
  const target = new TextEncoder().encode(text);
  outer: for (let index = 0; index <= bytes.length - target.length; index += 1) {
    for (let offset = 0; offset < target.length; offset += 1) {
      if (bytes[index + offset] !== target[offset]) continue outer;
    }
    return true;
  }
  return false;
}

describe('fuentes reproducibles', () => {
  it('expone casos sintéticos y formatos binarios reales', () => {
    expect(DEMO_SOURCES.map((source) => source.id)).toEqual([
      'repetitive',
      'varied-text',
      'structured',
      'bmp',
      'png',
      'jpeg',
      'pdf',
      'zip',
      'random',
    ]);
  });

  it('genera exactamente los mismos bytes en ejecuciones repetidas', () => {
    for (const source of DEMO_SOURCES) {
      const first = generateDemoSource(source.id);
      const second = generateDemoSource(source.id);

      expect(first.definition).toEqual(source);
      expect(first.bytes.length).toBeGreaterThan(0);
      expect(second.bytes).toEqual(first.bytes);
    }
  });

  it('conserva el tamaño del caso pseudoaleatorio existente', () => {
    expect(generateDemoSource('random').bytes).toHaveLength(96 * 1024);
  });

  it('distingue el texto variado del caso altamente repetitivo', () => {
    const repetitive = generateDemoSource('repetitive');
    const varied = generateDemoSource('varied-text');

    expect(varied.bytes).not.toEqual(repetitive.bytes);
    expect(new TextDecoder().decode(varied.bytes)).toContain('entropía');
  });

  it('genera un BMP sin compresión con tamaño declarado coherente', () => {
    const bytes = generateDemoSource('bmp').bytes;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(startsWith(bytes, [0x42, 0x4d])).toBe(true);
    expect(view.getUint32(2, true)).toBe(bytes.length);
    expect(view.getUint16(28, true)).toBe(24);
    expect(view.getUint32(30, true)).toBe(0);
  });

  it('incluye un PNG válido con firma e IEND', () => {
    const bytes = generateDemoSource('png').bytes;
    expect(startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).toBe(true);
    expect(containsAscii(bytes, 'IEND')).toBe(true);
  });

  it('incluye un JPEG delimitado por SOI y EOI', () => {
    const bytes = generateDemoSource('jpeg').bytes;
    expect(startsWith(bytes, [0xff, 0xd8, 0xff])).toBe(true);
    expect(endsWith(bytes, [0xff, 0xd9])).toBe(true);
  });

  it('incluye un PDF con cabecera, xref y EOF', () => {
    const bytes = generateDemoSource('pdf').bytes;
    expect(containsAscii(bytes.subarray(0, 16), '%PDF-1.4')).toBe(true);
    expect(containsAscii(bytes, 'xref')).toBe(true);
    expect(containsAscii(bytes, '%%EOF')).toBe(true);
  });

  it('incluye un ZIP con entrada local y registro de fin de directorio central', () => {
    const bytes = generateDemoSource('zip').bytes;
    expect(startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])).toBe(true);
    expect(containsAscii(bytes, 'repetitivo.txt')).toBe(true);
    expect(containsAscii(bytes, 'telemetria.csv')).toBe(true);

    const eocd = [0x50, 0x4b, 0x05, 0x06];
    expect(bytes.some((_, index) =>
      index <= bytes.length - eocd.length &&
      eocd.every((value, offset) => bytes[index + offset] === value)
    )).toBe(true);
  });
});
