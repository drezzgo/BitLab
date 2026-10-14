import { describe, expect, it } from 'vitest';
import { V1_DOUBLING_CHALLENGE_SIZES } from '../../src/core/bits';
import { compareWordSize, validateComparisonSizes } from '../../src/core/comparison';

describe('comparador extendido v1', () => {
  it('acepta el preset de duplicación y el límite exacto', () => {
    expect(validateComparisonSizes([...V1_DOUBLING_CHALLENGE_SIZES])).toEqual([
      2048, 4096, 8192, 16384, 32768,
    ]);
    expect(validateComparisonSizes([65535])).toEqual([65535]);
    expect(() => validateComparisonSizes([65536])).toThrow();
  });

  it('expone payload, codebook y metadata para tamaños grandes', () => {
    const data = new TextEncoder().encode('BITLAB|RETO|'.repeat(4096));
    const row = compareWordSize(data, {
      originalName: 'reto.txt',
      mimeType: 'text/plain',
      wordSizeBits: 32768,
    });

    expect(row.totalSymbols).toBeGreaterThan(1);
    expect(row.payloadBytes).toBeGreaterThan(0);
    expect(row.codebookMetadataBytes).toBeGreaterThan(0);
    expect(row.metadataBytes).toBeGreaterThanOrEqual(row.codebookMetadataBytes);
    expect(row.containerBytes).toBeGreaterThan(0);
  });
});
