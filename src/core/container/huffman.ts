import { calculateSegmentation } from '../bits';
import {
  decodeHuffmanPayload,
  encodeHuffmanMetadata,
  encodeHuffmanPayload,
  parseHuffmanMetadata,
  type HuffmanModel,
} from '../codecs/huffman';
import {
  INTEGRITY_ENVELOPE_OVERHEAD_BYTES,
  packIntegrityMetadata,
  unpackIntegrityMetadata,
} from '../integrity';
import { encodeBitLabContainerParts, parseBitLabContainer } from './format';
import { BitLabCodecId, type HuffmanContainerInput } from './types';

export interface HuffmanContainerMetrics {
  entropyBitsPerSymbol: number;
  averageCodeLengthBits: number;
  efficiencyPercent: number;
  totalSymbols: number;
  uniqueSymbols: number;
  fixedLengthBits: number;
  encodedBitLength: number;
  payloadBytes: number;
  metadataBytes: number;
  codebookMetadataBytes: number;
  integrityMetadataBytes: number;
  containerBytes: number;
  payloadSavingsPercent: number;
  overallVariationPercent: number;
}

function makeMetrics(input: {
  model: HuffmanModel;
  encodedBitLength: number;
  payloadBytes: number;
  metadataBytes: number;
  codebookMetadataBytes: number;
  integrityMetadataBytes: number;
  containerBytes: number;
  originalBytes: number;
}): HuffmanContainerMetrics {
  const fixedLengthBits = input.model.totalSymbols * input.model.wordSizeBits;
  const payloadSavingsPercent = fixedLengthBits > 0
    ? (1 - input.encodedBitLength / fixedLengthBits) * 100
    : 0;
  const overallVariationPercent = input.originalBytes > 0
    ? (input.containerBytes / input.originalBytes - 1) * 100
    : 0;

  return {
    entropyBitsPerSymbol: input.model.entropyBitsPerSymbol,
    averageCodeLengthBits: input.model.averageCodeLengthBits,
    efficiencyPercent: input.model.efficiencyPercent,
    totalSymbols: input.model.totalSymbols,
    uniqueSymbols: input.model.uniqueSymbols,
    fixedLengthBits,
    encodedBitLength: input.encodedBitLength,
    payloadBytes: input.payloadBytes,
    metadataBytes: input.metadataBytes,
    codebookMetadataBytes: input.codebookMetadataBytes,
    integrityMetadataBytes: input.integrityMetadataBytes,
    containerBytes: input.containerBytes,
    payloadSavingsPercent,
    overallVariationPercent,
  };
}

export function encodeHuffmanContainerDetailed(
  input: HuffmanContainerInput,
  sha256Digest?: Uint8Array,
): {
  container: Uint8Array;
  metrics: HuffmanContainerMetrics;
} {
  const encoded = encodeHuffmanPayload(input.originalBytes, input.wordSizeBits);
  const codecMetadata = encodeHuffmanMetadata({
    wordSizeBits: input.wordSizeBits,
    encodedBitLength: encoded.encodedBitLength,
    totalSymbols: encoded.model.totalSymbols,
    entries: encoded.model.symbols.map((symbol) => ({
      key: symbol.key,
      bytes: symbol.bytes,
      codeLength: symbol.codeLength,
    })),
  });

  const metadata = sha256Digest
    ? packIntegrityMetadata(codecMetadata, sha256Digest)
    : codecMetadata;

  const container = encodeBitLabContainerParts({
    codecId: BitLabCodecId.Huffman,
    originalName: input.originalName,
    mimeType: input.mimeType,
    wordSizeBits: input.wordSizeBits,
    originalSizeBytes: input.originalBytes.length,
    metadata,
    payload: encoded.payload,
  });

  return {
    container,
    metrics: makeMetrics({
      model: encoded.model,
      encodedBitLength: encoded.encodedBitLength,
      payloadBytes: encoded.payload.length,
      metadataBytes: metadata.length,
      codebookMetadataBytes: codecMetadata.length,
      integrityMetadataBytes: sha256Digest ? INTEGRITY_ENVELOPE_OVERHEAD_BYTES : 0,
      containerBytes: container.length,
      originalBytes: input.originalBytes.length,
    }),
  };
}

export function encodeHuffmanContainer(
  input: HuffmanContainerInput,
  sha256Digest?: Uint8Array,
): Uint8Array {
  return encodeHuffmanContainerDetailed(input, sha256Digest).container;
}

export function restoreHuffmanContainer(data: Uint8Array): {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
} {
  const parsed = parseBitLabContainer(data);
  if (parsed.header.codecId !== BitLabCodecId.Huffman) {
    throw new Error('El contenedor no usa el codec Huffman.');
  }

  const originalSizeBytes = Number(parsed.header.originalSizeBytes);
  const unpacked = unpackIntegrityMetadata(parsed.metadata);
  const metadata = parseHuffmanMetadata(unpacked.codecMetadata, parsed.header.wordSizeBits);
  const expectedSymbols = calculateSegmentation(originalSizeBytes, parsed.header.wordSizeBits).symbolCount;

  if (metadata.totalSymbols !== expectedSymbols) {
    throw new Error('La cantidad de símbolos Huffman no coincide con el tamaño original.');
  }

  const bytes = decodeHuffmanPayload({
    payload: parsed.payload,
    encodedBitLength: metadata.encodedBitLength,
    originalSizeBytes,
    wordSizeBits: parsed.header.wordSizeBits,
    codebook: metadata.entries,
  });

  return {
    fileName: parsed.header.originalName,
    mimeType: parsed.header.mimeType,
    bytes,
  };
}

export function describeHuffmanContainer(data: Uint8Array): HuffmanContainerMetrics {
  const parsed = parseBitLabContainer(data);
  if (parsed.header.codecId !== BitLabCodecId.Huffman) {
    throw new Error('El contenedor no usa Huffman.');
  }

  const unpacked = unpackIntegrityMetadata(parsed.metadata);
  const metadata = parseHuffmanMetadata(unpacked.codecMetadata, parsed.header.wordSizeBits);
  const originalBytes = Number(parsed.header.originalSizeBytes);
  const fixedLengthBits = metadata.totalSymbols * parsed.header.wordSizeBits;

  return {
    entropyBitsPerSymbol: Number.NaN,
    averageCodeLengthBits: metadata.totalSymbols > 0 ? metadata.encodedBitLength / metadata.totalSymbols : 0,
    efficiencyPercent: Number.NaN,
    totalSymbols: metadata.totalSymbols,
    uniqueSymbols: metadata.entries.length,
    fixedLengthBits,
    encodedBitLength: metadata.encodedBitLength,
    payloadBytes: parsed.payload.length,
    metadataBytes: parsed.metadata.length,
    codebookMetadataBytes: unpacked.codecMetadata.length,
    integrityMetadataBytes: unpacked.wrapped ? INTEGRITY_ENVELOPE_OVERHEAD_BYTES : 0,
    containerBytes: data.length,
    payloadSavingsPercent: fixedLengthBits > 0 ? (1 - metadata.encodedBitLength / fixedLengthBits) * 100 : 0,
    overallVariationPercent: originalBytes > 0 ? (data.length / originalBytes - 1) * 100 : 0,
  };
}
