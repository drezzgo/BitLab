import { describe, expect, it } from 'vitest';
import type { HuffmanContainerMetrics } from '../../src/core/container';
import {
  interpretHuffmanMetrics,
  interpretSourceStatistics,
} from '../../src/core/interpretation';
import { analyzeSourceStatistics } from '../../src/core/statistics';

describe('interpretación pedagógica', () => {
  it('deriva la brecha de entropía y la concentración observada sin heurísticas por extensión', () => {
    const statistics = analyzeSourceStatistics(new Uint8Array([0x41, 0x41, 0x41, 0x41]), 8);
    const interpretation = interpretSourceStatistics(statistics);

    expect(interpretation.singleObservedSymbol).toBe(true);
    expect(interpretation.dominantSymbolProbabilityPercent).toBe(100);
    expect(interpretation.entropyGapBitsPerSymbol).toBe(8);
    expect(interpretation.entropyUtilizationPercent).toBe(0);
  });

  it('distingue ahorro de payload de crecimiento del contenedor', () => {
    const metrics: HuffmanContainerMetrics = {
      entropyBitsPerSymbol: 1.5,
      averageCodeLengthBits: 1.75,
      efficiencyPercent: 85.7143,
      totalSymbols: 100,
      uniqueSymbols: 4,
      fixedLengthBits: 800,
      encodedBitLength: 400,
      payloadBytes: 50,
      metadataBytes: 35,
      codebookMetadataBytes: 20,
      integrityMetadataBytes: 15,
      containerBytes: 120,
      payloadSavingsPercent: 50,
      overallVariationPercent: 20,
    };

    const interpretation = interpretHuffmanMetrics(metrics, 100);

    expect(interpretation.codeGapBitsPerSymbol).toBeCloseTo(0.25);
    expect(interpretation.payloadDeltaBits).toBe(-400);
    expect(interpretation.payloadOutcome).toBe('lower');
    expect(interpretation.nonPayloadOverheadBytes).toBe(70);
    expect(interpretation.containerDeltaBytes).toBe(20);
    expect(interpretation.containerOutcome).toBe('higher');
  });

  it('rechaza tamaños originales que no pueden representarse de forma segura', () => {
    const metrics = {
      entropyBitsPerSymbol: 0,
      averageCodeLengthBits: 0,
      efficiencyPercent: 0,
      totalSymbols: 0,
      uniqueSymbols: 0,
      fixedLengthBits: 0,
      encodedBitLength: 0,
      payloadBytes: 0,
      metadataBytes: 0,
      codebookMetadataBytes: 0,
      integrityMetadataBytes: 0,
      containerBytes: 0,
      payloadSavingsPercent: 0,
      overallVariationPercent: 0,
    } satisfies HuffmanContainerMetrics;

    expect(() => interpretHuffmanMetrics(metrics, -1)).toThrow(RangeError);
    expect(() => interpretHuffmanMetrics(metrics, Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
