import { describe, expect, it } from 'vitest';
import { estimateTransfer, inspectFileSignal } from '../../src/core/network/simulation';

describe('simulación de red', () => {
  it('usa el tamaño real del archivo y la tasa efectiva', () => {
    const original = estimateTransfer(1_000_000, 100, 20, 80);
    const compressed = estimateTransfer(500_000, 100, 20, 80);
    expect(original.totalMs).toBe(120);
    expect(compressed.totalMs).toBe(70);
  });

  it('rechaza velocidades y tamaños inválidos', () => {
    expect(() => estimateTransfer(-1, 100, 20, 80)).toThrow(RangeError);
    expect(() => estimateTransfer(10, 0, 20, 80)).toThrow(RangeError);
  });

  it('reconoce rachas y explicita una recomendación heurística', () => {
    const signal = inspectFileSignal(new Uint8Array(1024).fill(65));
    expect(signal.recommendation).toBe('rle-huffman');
    expect(signal.adjacentRepeatPercent).toBe(100);
  });
});
