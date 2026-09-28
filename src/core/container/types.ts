export const BITLAB_MAGIC_TEXT = 'BTLB';
export const BITLAB_CONTAINER_VERSION = 1;
export const BITLAB_FIXED_HEADER_BYTES = 36;

export enum BitLabCodecId {
  Raw = 0,
  Huffman = 1,
}

export interface RawContainerInput {
  originalName: string;
  mimeType: string;
  wordSizeBits: number;
  originalBytes: Uint8Array;
}

export interface HuffmanContainerInput extends RawContainerInput {}

export interface BitLabContainerHeader {
  version: number;
  codecId: BitLabCodecId;
  wordSizeBits: number;
  paddingBits: number;
  originalSizeBytes: bigint;
  payloadSizeBytes: bigint;
  originalName: string;
  mimeType: string;
  metadataLength: number;
}

export interface ParsedBitLabContainer {
  header: BitLabContainerHeader;
  metadata: Uint8Array;
  payload: Uint8Array;
}

export interface RestoredBitLabFile {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  codecId: BitLabCodecId;
}
