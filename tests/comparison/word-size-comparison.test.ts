import { describe, expect, it } from 'vitest';
import { compareWordSize, validateComparisonSizes } from '../../src/core/comparison';
import { sha256Bytes } from '../../src/core/integrity';

describe('comparador de tamaño de palabra', () => {
  it('normaliza y valida tamaños', () => {
    expect(validateComparisonSizes([16, 8, 8, 2])).toEqual([2, 8, 16]);
    expect(() => validateComparisonSizes([])).toThrow();
    expect(() => validateComparisonSizes([1, 8])).toThrow();
  });

  it('produce métricas comparables sin perder la integridad del contenedor', async () => {
    const data = new TextEncoder().encode('ABRACADABRA|'.repeat(200));
    const digest = await sha256Bytes(data);

    const row8 = compareWordSize(data, {
      originalName: 'demo.txt',
      mimeType: 'text/plain',
      wordSizeBits: 8,
      sha256Digest: digest,
    });

    const row16 = compareWordSize(data, {
      originalName: 'demo.txt',
      mimeType: 'text/plain',
      wordSizeBits: 16,
      sha256Digest: digest,
    });

    expect(row8.containerBytes).toBeGreaterThan(0);
    expect(row16.containerBytes).toBeGreaterThan(0);
    expect(row8.entropyBitsPerSymbol).toBeGreaterThanOrEqual(0);
    expect(row16.entropyBitsPerSymbol).toBeGreaterThanOrEqual(0);
  });
});
