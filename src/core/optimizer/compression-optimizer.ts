import {
  getRegisteredCodecByKey,
  type CodecEncodeOptions,
  type CodecInput,
  type RegisteredCodecKey,
} from '../codecs/registry';
import type {
  CompressionCandidateParameters,
  CompressionCandidateResult,
  CompressionOptimizationResult,
} from './types';

export const HUFFMAN_WORD_SIZE_CANDIDATES =
  [4, 8, 12, 16] as const;

export const LZ77_PARAMETER_CANDIDATES = [
  { windowSize: 4 * 1024, minMatchLength: 4, maxChain: 24 },
  { windowSize: 16 * 1024, minMatchLength: 4, maxChain: 48 },
  { windowSize: 32 * 1024, minMatchLength: 4, maxChain: 64 },
  { windowSize: 32 * 1024, minMatchLength: 5, maxChain: 64 },
  { windowSize: 0xffff, minMatchLength: 4, maxChain: 96 },
] as const;

interface SearchPlanEntry {
  id: string;
  codec: RegisteredCodecKey;
  label: string;
  parameterLabel: string;
  parameters: CompressionCandidateParameters;
  encodeOptions?: CodecEncodeOptions;
}

function formatKiB(bytes: number): string {
  return bytes === 0xffff
    ? '64 KiB'
    : `${Math.round(bytes / 1024)} KiB`;
}

export function buildCompressionSearchPlan(): SearchPlanEntry[] {
  const plan: SearchPlanEntry[] = [
    {
      id: 'raw-n8',
      codec: 'raw',
      label: 'RAW',
      parameterLabel: 'N = 8',
      parameters: { wordSizeBits: 8 },
    },
  ];

  for (const wordSizeBits of HUFFMAN_WORD_SIZE_CANDIDATES) {
    plan.push({
      id: `huffman-n${wordSizeBits}`,
      codec: 'huffman',
      label: 'Huffman',
      parameterLabel: `N = ${wordSizeBits}`,
      parameters: { wordSizeBits },
    });
  }

  plan.push({
    id: 'rle-huffman-n8',
    codec: 'rle-huffman',
    label: 'RLE + Huffman',
    parameterLabel: 'N = 8',
    parameters: { wordSizeBits: 8 },
  });

  for (const profile of LZ77_PARAMETER_CANDIDATES) {
    plan.push({
      id:
        `lz77-w${profile.windowSize}` +
        `-m${profile.minMatchLength}` +
        `-c${profile.maxChain}`,
      codec: 'lz77-huffman',
      label: 'LZ77 + Huffman',
      parameterLabel:
        `${formatKiB(profile.windowSize)} · ` +
        `match ≥ ${profile.minMatchLength} · ` +
        `búsqueda ${profile.maxChain}`,
      parameters: {
        wordSizeBits: 8,
        lz77WindowBytes: profile.windowSize,
        lz77MinMatchLength: profile.minMatchLength,
        lz77MaxChain: profile.maxChain,
      },
      encodeOptions: {
        lz77: {
          windowSize: profile.windowSize,
          minMatchLength: profile.minMatchLength,
          maxChain: profile.maxChain,
        },
      },
    });
  }

  return plan;
}

export function getCompressionSearchCandidateCount(): number {
  return buildCompressionSearchPlan().length;
}

export type CompressionCandidateObserver = (
  candidate: CompressionCandidateResult,
  completed: number,
  total: number,
) => void;

/**
 * Bounded parameter optimizer.
 *
 * It explores codec + configuration pairs, compares complete `.bitlab`
 * containers and keeps only the smallest full container in memory.
 */
export function optimizeCompression(
  input: CodecInput,
  sha256Digest?: Uint8Array,
  onCandidate?: CompressionCandidateObserver,
): CompressionOptimizationResult {
  const plan = buildCompressionSearchPlan();
  const candidates: CompressionCandidateResult[] = [];

  let best:
    | {
        container: Uint8Array;
        metrics: CompressionOptimizationResult['metrics'];
        entry: SearchPlanEntry;
      }
    | null = null;

  for (let index = 0; index < plan.length; index += 1) {
    const entry = plan[index];
    const codec = getRegisteredCodecByKey(entry.codec);

    const encoded = codec.encode({
      ...input,
      wordSizeBits: entry.parameters.wordSizeBits,
    }, sha256Digest, entry.encodeOptions);

    const originalBytes = input.originalBytes.length;
    const candidate: CompressionCandidateResult = {
      id: entry.id,
      codec: entry.codec,
      label: entry.label,
      parameterLabel: entry.parameterLabel,
      parameters: entry.parameters,
      containerBytes: encoded.container.length,
      variationPercent: originalBytes > 0
        ? (encoded.container.length / originalBytes - 1) * 100
        : 0,
    };

    candidates.push(candidate);
    onCandidate?.(candidate, index + 1, plan.length);

    // Strictly smaller preserves deterministic plan-order tie breaking.
    if (!best || encoded.container.length < best.container.length) {
      best = {
        container: encoded.container,
        metrics: encoded.metrics,
        entry,
      };
    }
  }

  if (!best) {
    throw new Error('No hay configuraciones disponibles para optimizar el archivo.');
  }

  return {
    container: best.container,
    metrics: best.metrics,
    selectedCodec: best.entry.codec,
    selectedCodecLabel: best.entry.label,
    selectedWordSizeBits: best.entry.parameters.wordSizeBits,
    selectedParameterLabel: best.entry.parameterLabel,
    selectedParameters: best.entry.parameters,
    selectedCandidateId: best.entry.id,
    candidates,
  };
}
