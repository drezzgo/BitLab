import type {
  CodecMetrics,
  RegisteredCodecKey,
} from '../core/codecs/registry';
import type {
  CompressionCandidateParameters,
  CompressionCandidateResult,
} from '../core/optimizer';
import type { SourceStatistics } from '../core/statistics';
import type { WordSizeComparisonRow } from '../core/comparison';

export type ManualEncodeCodec = RegisteredCodecKey;
export type EncodeCodec = ManualEncodeCodec | 'auto';

export type BitLabWorkerRequest =
  | {
      id: string;
      operation: 'encode';
      bytes: ArrayBuffer;
      fileName: string;
      mimeType: string;
      wordSizeBits: number;
      codec: EncodeCodec;
    }
  | {
      id: string;
      operation: 'decode';
      bytes: ArrayBuffer;
    }
  | {
      id: string;
      operation: 'analyze';
      bytes: ArrayBuffer;
      wordSizeBits: number;
    }
  | {
      id: string;
      operation: 'compare';
      bytes: ArrayBuffer;
      fileName: string;
      mimeType: string;
      sizes: number[];
    };

export type BitLabWorkerProgress = {
  id: string;
  type: 'progress';
  completed: number;
  total: number;
  label: string;
};

export type BitLabWorkerResult =
  | {
      id: string;
      type: 'result';
      operation: 'encode';
      container: ArrayBuffer;
      metrics: CodecMetrics | null;
      sha256Hex: string;
      selectedCodec: ManualEncodeCodec;
      selectedCodecLabel: string;
      selectedWordSizeBits: number;
      selectedParameterLabel: string;
      selectedParameters: CompressionCandidateParameters;
      selectedCandidateId: string | null;
      candidates: CompressionCandidateResult[] | null;
    }
  | {
      id: string;
      type: 'result';
      operation: 'decode';
      restored: ArrayBuffer;
      fileName: string;
      mimeType: string;
      wordSizeBits: number;
      paddingBits: number;
      originalSize: number;
      codecLabel: string;
      storedSha256Hex: string | null;
      restoredSha256Hex: string;
      integrityStatus: 'verified' | 'mismatch' | 'unavailable';
    }
  | {
      id: string;
      type: 'result';
      operation: 'analyze';
      statistics: SourceStatistics;
    }
  | {
      id: string;
      type: 'result';
      operation: 'compare';
      rows: WordSizeComparisonRow[];
    }
  | {
      id: string;
      type: 'error';
      message: string;
    };

export type BitLabWorkerMessage = BitLabWorkerProgress | BitLabWorkerResult;
