import type {
  CodecMetrics,
  RegisteredCodecKey,
} from '../codecs/registry';

export interface CompressionCandidateParameters {
  wordSizeBits: number;
  lz77WindowBytes?: number;
  lz77MinMatchLength?: number;
  lz77MaxChain?: number;
}

export interface CompressionCandidateResult {
  id: string;
  codec: RegisteredCodecKey;
  label: string;
  parameterLabel: string;
  parameters: CompressionCandidateParameters;
  containerBytes: number;
  variationPercent: number;
}

export interface CompressionOptimizationResult {
  container: Uint8Array;
  metrics: CodecMetrics | null;
  selectedCodec: RegisteredCodecKey;
  selectedCodecLabel: string;
  selectedWordSizeBits: number;
  selectedParameterLabel: string;
  selectedParameters: CompressionCandidateParameters;
  selectedCandidateId: string;
  candidates: CompressionCandidateResult[];
}
