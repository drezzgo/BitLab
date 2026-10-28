import type { Lz77EncodeOptions } from '../lz77';
import type { HuffmanContainerMetrics } from '../../container/huffman';
import type { RleHuffmanContainerMetrics } from '../../container/rle-huffman';
import type { Lz77HuffmanContainerMetrics } from '../../container/lz77-huffman';
import type { BitLabCodecId } from '../../container/types';

export type RegisteredCodecKey =
  | 'raw'
  | 'huffman'
  | 'rle-huffman'
  | 'lz77-huffman';

export interface CodecInput {
  originalName: string;
  mimeType: string;
  wordSizeBits: number;
  originalBytes: Uint8Array;
}

export interface CodecEncodeOptions {
  lz77?: Lz77EncodeOptions;
}

export type CodecMetrics =
  | HuffmanContainerMetrics
  | RleHuffmanContainerMetrics
  | Lz77HuffmanContainerMetrics;

export interface CodecEncodeResult {
  container: Uint8Array;
  metrics: CodecMetrics | null;
}

export interface CodecRestoreResult {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface RegisteredCodec {
  key: RegisteredCodecKey;
  id: BitLabCodecId;
  label: string;
  description: string;
  progressLabel: string;
  fixedWordSizeBits?: number;
  encode: (
    input: CodecInput,
    sha256Digest?: Uint8Array,
    options?: CodecEncodeOptions,
  ) => CodecEncodeResult;
  restore: (container: Uint8Array) => CodecRestoreResult;
}

export interface RegisteredCodecSummary {
  key: RegisteredCodecKey;
  id: BitLabCodecId;
  label: string;
  description: string;
  fixedWordSizeBits?: number;
}
