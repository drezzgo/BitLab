import {
  decodeHuffmanPayload,
  encodeHuffmanMetadata,
  encodeHuffmanPayload,
  parseHuffmanMetadata,
} from '../codecs/huffman';
import {
  encodeRleHuffmanMetadata,
  parseRleHuffmanMetadata,
  RLE_HUFFMAN_METADATA_FIXED_BYTES,
} from '../codecs/rle-huffman';
import { decodeRle, encodeRleDetailed } from '../codecs/rle';
import {
  INTEGRITY_ENVELOPE_OVERHEAD_BYTES,
  packIntegrityMetadata,
  unpackIntegrityMetadata,
} from '../integrity';
import { encodeBitLabContainerParts, parseBitLabContainer } from './format';
import { BitLabCodecId, type RleHuffmanContainerInput } from './types';

export interface RleHuffmanContainerMetrics {
  originalBytes: number;
  rleBytes: number;
  rleSavingsPercent: number;
  runBlocks: number;
  literalBlocks: number;
  huffmanEncodedBits: number;
  huffmanPayloadBytes: number;
  huffmanCodebookBytes: number;
  codecMetadataBytes: number;
  metadataBytes: number;
  integrityMetadataBytes: number;
  containerBytes: number;
  overallVariationPercent: number;
  tokenEntropyBitsPerByte: number;
  tokenAverageCodeLengthBits: number;
  tokenEfficiencyPercent: number;
  tokenUniqueSymbols: number;
}

export function encodeRleHuffmanContainerDetailed(
  input: RleHuffmanContainerInput,
  sha256Digest?: Uint8Array,
): {
  container: Uint8Array;
  metrics: RleHuffmanContainerMetrics;
} {
  if (input.wordSizeBits !== 8) {
    throw new RangeError(
      'RLE + Huffman es byte-oriented y usa un tamaño de palabra fijo de 8 bits.',
    );
  }

  const rle = encodeRleDetailed(input.originalBytes);
  const huffman = encodeHuffmanPayload(rle.bytes, 8);

  const huffmanMetadata = encodeHuffmanMetadata({
    wordSizeBits: 8,
    encodedBitLength: huffman.encodedBitLength,
    totalSymbols: huffman.model.totalSymbols,
    entries: huffman.model.symbols.map((symbol) => ({
      key: symbol.key,
      bytes: symbol.bytes,
      codeLength: symbol.codeLength,
    })),
  });

  const codecMetadata = encodeRleHuffmanMetadata({
    rleSizeBytes: rle.bytes.length,
    huffmanMetadata,
  });

  const metadata = sha256Digest
    ? packIntegrityMetadata(codecMetadata, sha256Digest)
    : codecMetadata;

  const container = encodeBitLabContainerParts({
    codecId: BitLabCodecId.RleHuffman,
    originalName: input.originalName,
    mimeType: input.mimeType,
    wordSizeBits: 8,
    originalSizeBytes: input.originalBytes.length,
    metadata,
    payload: huffman.payload,
  });

  const originalBytes = input.originalBytes.length;
  const rleSavingsPercent = originalBytes > 0
    ? (1 - rle.bytes.length / originalBytes) * 100
    : 0;
  const overallVariationPercent = originalBytes > 0
    ? (container.length / originalBytes - 1) * 100
    : 0;

  return {
    container,
    metrics: {
      originalBytes,
      rleBytes: rle.bytes.length,
      rleSavingsPercent,
      runBlocks: rle.runBlocks,
      literalBlocks: rle.literalBlocks,
      huffmanEncodedBits: huffman.encodedBitLength,
      huffmanPayloadBytes: huffman.payload.length,
      huffmanCodebookBytes: huffmanMetadata.length,
      codecMetadataBytes:
        RLE_HUFFMAN_METADATA_FIXED_BYTES + huffmanMetadata.length,
      metadataBytes: metadata.length,
      integrityMetadataBytes: sha256Digest
        ? INTEGRITY_ENVELOPE_OVERHEAD_BYTES
        : 0,
      containerBytes: container.length,
      overallVariationPercent,
      tokenEntropyBitsPerByte: huffman.model.entropyBitsPerSymbol,
      tokenAverageCodeLengthBits: huffman.model.averageCodeLengthBits,
      tokenEfficiencyPercent: huffman.model.efficiencyPercent,
      tokenUniqueSymbols: huffman.model.uniqueSymbols,
    },
  };
}

export function encodeRleHuffmanContainer(
  input: RleHuffmanContainerInput,
  sha256Digest?: Uint8Array,
): Uint8Array {
  return encodeRleHuffmanContainerDetailed(input, sha256Digest).container;
}

export function restoreRleHuffmanContainer(data: Uint8Array): {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
} {
  const parsed = parseBitLabContainer(data);

  if (parsed.header.codecId !== BitLabCodecId.RleHuffman) {
    throw new Error('El contenedor no usa el codec RLE + Huffman.');
  }
  if (parsed.header.wordSizeBits !== 8) {
    throw new Error('Un contenedor RLE + Huffman válido debe usar N = 8.');
  }

  const unpacked = unpackIntegrityMetadata(parsed.metadata);
  const codecMetadata = parseRleHuffmanMetadata(unpacked.codecMetadata);
  const huffmanMetadata = parseHuffmanMetadata(
    codecMetadata.huffmanMetadata,
    8,
  );

  if (huffmanMetadata.totalSymbols !== codecMetadata.rleSizeBytes) {
    throw new Error(
      'La cantidad de símbolos Huffman no coincide con el tamaño del flujo RLE.',
    );
  }

  const rleBytes = decodeHuffmanPayload({
    payload: parsed.payload,
    encodedBitLength: huffmanMetadata.encodedBitLength,
    originalSizeBytes: codecMetadata.rleSizeBytes,
    wordSizeBits: 8,
    codebook: huffmanMetadata.entries,
  });

  const originalSizeBytes = Number(parsed.header.originalSizeBytes);
  const bytes = decodeRle(rleBytes, originalSizeBytes);

  return {
    fileName: parsed.header.originalName,
    mimeType: parsed.header.mimeType,
    bytes,
  };
}
