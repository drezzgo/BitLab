import { validateWordSizeBits } from '../bits';
import { encodeHuffmanContainerDetailed } from '../container';

export interface WordSizeComparisonRow {
  wordSizeBits: number;
  entropyBitsPerSymbol: number;
  averageCodeLengthBits: number;
  uniqueSymbols: number;
  payloadSavingsPercent: number;
  overallVariationPercent: number;
  containerBytes: number;
  processingMs: number;
}

export function compareWordSize(
  data: Uint8Array,
  input: {
    originalName: string;
    mimeType: string;
    wordSizeBits: number;
    sha256Digest?: Uint8Array;
  },
): WordSizeComparisonRow {
  validateWordSizeBits(input.wordSizeBits);
  const started = performance.now();
  const encoded = encodeHuffmanContainerDetailed({
    originalName: input.originalName,
    mimeType: input.mimeType,
    wordSizeBits: input.wordSizeBits,
    originalBytes: data,
  }, input.sha256Digest);
  const processingMs = performance.now() - started;

  return {
    wordSizeBits: input.wordSizeBits,
    entropyBitsPerSymbol: encoded.metrics.entropyBitsPerSymbol,
    averageCodeLengthBits: encoded.metrics.averageCodeLengthBits,
    uniqueSymbols: encoded.metrics.uniqueSymbols,
    payloadSavingsPercent: encoded.metrics.payloadSavingsPercent,
    overallVariationPercent: encoded.metrics.overallVariationPercent,
    containerBytes: encoded.metrics.containerBytes,
    processingMs,
  };
}

export function validateComparisonSizes(sizes: number[]): number[] {
  const unique = [...new Set(sizes)].sort((left, right) => left - right);
  if (unique.length === 0) throw new Error('Selecciona al menos un tamaño de palabra.');
  for (const size of unique) validateWordSizeBits(size);
  return unique;
}
