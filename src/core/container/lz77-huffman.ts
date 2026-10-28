import {
  decodeHuffmanPayload,
  encodeHuffmanMetadata,
  encodeHuffmanPayload,
  parseHuffmanMetadata,
} from '../codecs/huffman';
import {
  decodeLz77,
  encodeLz77Detailed,
  type Lz77EncodeOptions,
} from '../codecs/lz77';
import {
  encodeLz77HuffmanMetadata,
  parseLz77HuffmanMetadata,
  LZ77_HUFFMAN_METADATA_FIXED_BYTES,
} from '../codecs/lz77-huffman';
import {
  INTEGRITY_ENVELOPE_OVERHEAD_BYTES,
  packIntegrityMetadata,
  unpackIntegrityMetadata,
} from '../integrity';
import { encodeBitLabContainerParts, parseBitLabContainer } from './format';
import { BitLabCodecId, type Lz77HuffmanContainerInput } from './types';

export interface Lz77HuffmanContainerMetrics {
  originalBytes: number;
  lz77Bytes: number;
  lz77SavingsPercent: number;
  matchBlocks: number;
  literalBlocks: number;
  matchedBytes: number;
  literalBytes: number;
  longestMatch: number;
  averageMatchLength: number;
  windowBytes: number;
  minMatchLength: number;
  maxChain: number;
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

export function encodeLz77HuffmanContainerDetailed(
  input: Lz77HuffmanContainerInput,
  sha256Digest?: Uint8Array,
  lz77Options: Lz77EncodeOptions = {},
): {
  container: Uint8Array;
  metrics: Lz77HuffmanContainerMetrics;
} {
  if (input.wordSizeBits !== 8) {
    throw new RangeError(
      'LZ77 + Huffman es byte-oriented y usa un tamaño de palabra fijo de 8 bits.',
    );
  }

  const lz77 = encodeLz77Detailed(input.originalBytes, lz77Options);
  const huffman = encodeHuffmanPayload(lz77.bytes, 8);

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

  const codecMetadata = encodeLz77HuffmanMetadata({
    lz77SizeBytes: lz77.bytes.length,
    huffmanMetadata,
  });

  const metadata = sha256Digest
    ? packIntegrityMetadata(codecMetadata, sha256Digest)
    : codecMetadata;

  const container = encodeBitLabContainerParts({
    codecId: BitLabCodecId.Lz77Huffman,
    originalName: input.originalName,
    mimeType: input.mimeType,
    wordSizeBits: 8,
    originalSizeBytes: input.originalBytes.length,
    metadata,
    payload: huffman.payload,
  });

  const originalBytes = input.originalBytes.length;

  return {
    container,
    metrics: {
      originalBytes,
      lz77Bytes: lz77.bytes.length,
      lz77SavingsPercent: originalBytes > 0
        ? (1 - lz77.bytes.length / originalBytes) * 100
        : 0,
      matchBlocks: lz77.matchBlocks,
      literalBlocks: lz77.literalBlocks,
      matchedBytes: lz77.matchedBytes,
      literalBytes: lz77.literalBytes,
      longestMatch: lz77.longestMatch,
      averageMatchLength: lz77.averageMatchLength,
      windowBytes: lz77.options.windowSize,
      minMatchLength: lz77.options.minMatchLength,
      maxChain: lz77.options.maxChain,
      huffmanEncodedBits: huffman.encodedBitLength,
      huffmanPayloadBytes: huffman.payload.length,
      huffmanCodebookBytes: huffmanMetadata.length,
      codecMetadataBytes:
        LZ77_HUFFMAN_METADATA_FIXED_BYTES + huffmanMetadata.length,
      metadataBytes: metadata.length,
      integrityMetadataBytes: sha256Digest
        ? INTEGRITY_ENVELOPE_OVERHEAD_BYTES
        : 0,
      containerBytes: container.length,
      overallVariationPercent: originalBytes > 0
        ? (container.length / originalBytes - 1) * 100
        : 0,
      tokenEntropyBitsPerByte: huffman.model.entropyBitsPerSymbol,
      tokenAverageCodeLengthBits: huffman.model.averageCodeLengthBits,
      tokenEfficiencyPercent: huffman.model.efficiencyPercent,
      tokenUniqueSymbols: huffman.model.uniqueSymbols,
    },
  };
}

export function encodeLz77HuffmanContainer(
  input: Lz77HuffmanContainerInput,
  sha256Digest?: Uint8Array,
  lz77Options: Lz77EncodeOptions = {},
): Uint8Array {
  return encodeLz77HuffmanContainerDetailed(
    input,
    sha256Digest,
    lz77Options,
  ).container;
}

export function restoreLz77HuffmanContainer(data: Uint8Array): {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
} {
  const parsed = parseBitLabContainer(data);

  if (parsed.header.codecId !== BitLabCodecId.Lz77Huffman) {
    throw new Error('El contenedor no usa el codec LZ77 + Huffman.');
  }
  if (parsed.header.wordSizeBits !== 8) {
    throw new Error('Un contenedor LZ77 + Huffman válido debe usar N = 8.');
  }

  const unpacked = unpackIntegrityMetadata(parsed.metadata);
  const codecMetadata = parseLz77HuffmanMetadata(unpacked.codecMetadata);
  const huffmanMetadata = parseHuffmanMetadata(
    codecMetadata.huffmanMetadata,
    8,
  );

  if (huffmanMetadata.totalSymbols !== codecMetadata.lz77SizeBytes) {
    throw new Error(
      'La cantidad de símbolos Huffman no coincide con el tamaño del flujo LZ77.',
    );
  }

  const lz77Bytes = decodeHuffmanPayload({
    payload: parsed.payload,
    encodedBitLength: huffmanMetadata.encodedBitLength,
    originalSizeBytes: codecMetadata.lz77SizeBytes,
    wordSizeBits: 8,
    codebook: huffmanMetadata.entries,
  });

  const originalSizeBytes = Number(parsed.header.originalSizeBytes);
  const bytes = decodeLz77(lz77Bytes, originalSizeBytes);

  return {
    fileName: parsed.header.originalName,
    mimeType: parsed.header.mimeType,
    bytes,
  };
}
