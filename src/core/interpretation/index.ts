import type { HuffmanContainerMetrics } from '../container';
import type { SourceStatistics } from '../statistics';

export type SizeOutcome = 'lower' | 'equal' | 'higher';

export interface SourceInterpretation {
  entropyGapBitsPerSymbol: number;
  entropyUtilizationPercent: number;
  dominantSymbolProbabilityPercent: number | null;
  singleObservedSymbol: boolean;
}

export interface HuffmanInterpretation {
  codeGapBitsPerSymbol: number;
  payloadDeltaBits: number;
  payloadOutcome: SizeOutcome;
  nonPayloadOverheadBytes: number;
  containerDeltaBytes: number;
  containerOutcome: SizeOutcome;
}

function outcomeFromDelta(delta: number): SizeOutcome {
  if (delta < 0) return 'lower';
  if (delta > 0) return 'higher';
  return 'equal';
}

export function interpretSourceStatistics(statistics: SourceStatistics): SourceInterpretation {
  const dominant = statistics.topSymbols[0];

  return {
    entropyGapBitsPerSymbol: Math.max(
      0,
      statistics.theoreticalBitsPerSymbol - statistics.entropyBitsPerSymbol,
    ),
    entropyUtilizationPercent: statistics.entropyUtilizationPercent,
    dominantSymbolProbabilityPercent: dominant ? dominant.probability * 100 : null,
    singleObservedSymbol: statistics.totalSymbols > 0 && statistics.uniqueSymbols === 1,
  };
}

export function interpretHuffmanMetrics(
  metrics: HuffmanContainerMetrics,
  originalSizeBytes: number,
): HuffmanInterpretation {
  if (!Number.isSafeInteger(originalSizeBytes) || originalSizeBytes < 0) {
    throw new RangeError('originalSizeBytes debe ser un entero seguro mayor o igual que cero.');
  }

  const payloadDeltaBits = metrics.encodedBitLength - metrics.fixedLengthBits;
  const containerDeltaBytes = metrics.containerBytes - originalSizeBytes;

  return {
    codeGapBitsPerSymbol: Math.max(
      0,
      metrics.averageCodeLengthBits - metrics.entropyBitsPerSymbol,
    ),
    payloadDeltaBits,
    payloadOutcome: outcomeFromDelta(payloadDeltaBits),
    nonPayloadOverheadBytes: metrics.containerBytes - metrics.payloadBytes,
    containerDeltaBytes,
    containerOutcome: outcomeFromDelta(containerDeltaBytes),
  };
}
