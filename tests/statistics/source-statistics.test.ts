import { describe, expect, it } from 'vitest';
import { analyzeSourceStatistics } from '../../src/core/statistics';

describe('source statistics', () => {
  it('calcula entropía cero para una fuente constante de 2 bits', () => {
    const input = Uint8Array.from([0x00, 0x00]);
    const result = analyzeSourceStatistics(input, 2);

    expect(result.totalSymbols).toBe(8);
    expect(result.uniqueSymbols).toBe(1);
    expect(result.entropyBitsPerSymbol).toBe(0);
    expect(result.topSymbols[0]).toMatchObject({ display: '00', count: 8, probability: 1 });
  });

  it('obtiene 2 bits/símbolo cuando los cuatro símbolos de 2 bits son equiprobables', () => {
    // 00 01 10 11, repetidos dos veces.
    const input = Uint8Array.from([0x1b, 0x1b]);
    const result = analyzeSourceStatistics(input, 2);

    expect(result.totalSymbols).toBe(8);
    expect(result.uniqueSymbols).toBe(4);
    expect(result.entropyBitsPerSymbol).toBeCloseTo(2, 12);
    expect(result.redundancyBitsPerSymbol).toBeCloseTo(0, 12);
    expect(result.entropyUtilizationPercent).toBeCloseTo(100, 12);
  });

  it('soporta palabras no alineadas a byte', () => {
    const input = Uint8Array.from([0b10101100, 0b11110000]);
    const result = analyzeSourceStatistics(input, 3);

    expect(result.totalSymbols).toBe(6);
    expect(result.wordSizeBits).toBe(3);
    expect(result.uniqueSymbols).toBeGreaterThan(1);
  });

  it('soporta palabras de 2048 bits sin convertirlas a Number', () => {
    const input = new Uint8Array(512);
    input.fill(0xaa);
    const result = analyzeSourceStatistics(input, 2048);

    expect(result.totalSymbols).toBe(2);
    expect(result.uniqueSymbols).toBe(1);
    expect(result.entropyBitsPerSymbol).toBe(0);
    expect(result.topSymbols[0].display.startsWith('0x')).toBe(true);
  });
});
