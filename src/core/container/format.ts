import { calculateSegmentation, validateWordSizeBits } from '../bits';
import { packIntegrityMetadata } from '../integrity';
import {
  BITLAB_CONTAINER_VERSION,
  BITLAB_FIXED_HEADER_BYTES,
  BITLAB_MAGIC_TEXT,
  BitLabCodecId,
  type ParsedBitLabContainer,
  type RawContainerInput,
} from './types';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });
const MAGIC = textEncoder.encode(BITLAB_MAGIC_TEXT);

function assertFitsUint16(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(`${label} excede el máximo permitido por el formato.`);
  }
}

function assertFitsUint32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${label} excede el máximo permitido por el formato.`);
  }
}

function bigintToSafeNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${label} excede el rango seguro de JavaScript para indexar un ArrayBuffer.`);
  }
  return Number(value);
}

function assertMagic(bytes: Uint8Array): void {
  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC[i]) {
      throw new Error('El archivo no tiene una firma BitLab válida.');
    }
  }
}

export function encodeBitLabContainerParts(input: {
  codecId: BitLabCodecId;
  originalName: string;
  mimeType: string;
  wordSizeBits: number;
  originalSizeBytes: number;
  metadata: Uint8Array;
  payload: Uint8Array;
}): Uint8Array {
  validateWordSizeBits(input.wordSizeBits);
  if (!Number.isSafeInteger(input.originalSizeBytes) || input.originalSizeBytes < 0) {
    throw new RangeError('El tamaño original no es válido.');
  }

  const nameBytes = textEncoder.encode(input.originalName);
  const mimeBytes = textEncoder.encode(input.mimeType || 'application/octet-stream');
  const segmentation = calculateSegmentation(input.originalSizeBytes, input.wordSizeBits);

  assertFitsUint16(nameBytes.length, 'El nombre del archivo');
  assertFitsUint16(mimeBytes.length, 'El MIME type');
  assertFitsUint32(input.metadata.length, 'La metadata del codec');

  const totalLength =
    BITLAB_FIXED_HEADER_BYTES +
    nameBytes.length +
    mimeBytes.length +
    input.metadata.length +
    input.payload.length;

  if (!Number.isSafeInteger(totalLength)) {
    throw new RangeError('El contenedor resultante excede el rango seguro de tamaño.');
  }

  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);

  output.set(MAGIC, 0);
  view.setUint8(4, BITLAB_CONTAINER_VERSION);
  view.setUint8(5, input.codecId);
  view.setUint16(6, input.wordSizeBits, false);
  view.setUint16(8, segmentation.paddingBits, false);
  view.setUint16(10, 0, false);
  view.setBigUint64(12, BigInt(input.originalSizeBytes), false);
  view.setUint16(20, nameBytes.length, false);
  view.setUint16(22, mimeBytes.length, false);
  view.setUint32(24, input.metadata.length, false);
  view.setBigUint64(28, BigInt(input.payload.length), false);

  let offset = BITLAB_FIXED_HEADER_BYTES;
  output.set(nameBytes, offset);
  offset += nameBytes.length;
  output.set(mimeBytes, offset);
  offset += mimeBytes.length;
  output.set(input.metadata, offset);
  offset += input.metadata.length;
  output.set(input.payload, offset);

  return output;
}

export function encodeRawContainer(
  input: RawContainerInput,
  sha256Digest?: Uint8Array,
): Uint8Array {
  const codecMetadata = new Uint8Array();
  const metadata = sha256Digest
    ? packIntegrityMetadata(codecMetadata, sha256Digest)
    : codecMetadata;

  return encodeBitLabContainerParts({
    codecId: BitLabCodecId.Raw,
    originalName: input.originalName,
    mimeType: input.mimeType,
    wordSizeBits: input.wordSizeBits,
    originalSizeBytes: input.originalBytes.length,
    metadata,
    payload: input.originalBytes,
  });
}

export function parseBitLabContainer(data: Uint8Array): ParsedBitLabContainer {
  if (data.length < BITLAB_FIXED_HEADER_BYTES) {
    throw new Error('El archivo es demasiado pequeño para ser un contenedor BitLab.');
  }

  assertMagic(data);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const version = view.getUint8(4);
  if (version !== BITLAB_CONTAINER_VERSION) {
    throw new Error(`Versión BitLab no soportada: ${version}.`);
  }

  const codecRaw = view.getUint8(5);
  if (codecRaw !== BitLabCodecId.Raw && codecRaw !== BitLabCodecId.Huffman) {
    throw new Error(`Codec BitLab no soportado: ${codecRaw}.`);
  }
  const codecId = codecRaw as BitLabCodecId;

  const wordSizeBits = view.getUint16(6, false);
  validateWordSizeBits(wordSizeBits);

  const paddingBits = view.getUint16(8, false);
  const originalSizeBytes = view.getBigUint64(12, false);
  const nameLength = view.getUint16(20, false);
  const mimeLength = view.getUint16(22, false);
  const metadataLength = view.getUint32(24, false);
  const payloadSizeBytes = view.getBigUint64(28, false);

  const originalSize = bigintToSafeNumber(originalSizeBytes, 'El tamaño original');
  const payloadSize = bigintToSafeNumber(payloadSizeBytes, 'El tamaño del payload');

  const expectedPadding = calculateSegmentation(originalSize, wordSizeBits).paddingBits;
  if (paddingBits !== expectedPadding) {
    throw new Error('La metadata de padding no coincide con el tamaño original y la palabra configurada.');
  }

  const variableLength = nameLength + mimeLength + metadataLength + payloadSize;
  const expectedTotalLength = BITLAB_FIXED_HEADER_BYTES + variableLength;

  if (expectedTotalLength !== data.length) {
    throw new Error('La longitud del contenedor no coincide con su header; puede estar truncado o alterado.');
  }

  let offset = BITLAB_FIXED_HEADER_BYTES;
  const nameBytes = data.slice(offset, offset + nameLength);
  offset += nameLength;
  const mimeBytes = data.slice(offset, offset + mimeLength);
  offset += mimeLength;
  const metadata = data.slice(offset, offset + metadataLength);
  offset += metadataLength;
  const payload = data.slice(offset, offset + payloadSize);

  if (codecId === BitLabCodecId.Raw && payloadSize !== originalSize) {
    throw new Error('Un contenedor RAW debe conservar el mismo número de bytes que el archivo original.');
  }

  return {
    header: {
      version,
      codecId,
      wordSizeBits,
      paddingBits,
      originalSizeBytes,
      payloadSizeBytes,
      originalName: textDecoder.decode(nameBytes),
      mimeType: textDecoder.decode(mimeBytes),
      metadataLength,
    },
    metadata,
    payload,
  };
}

export function restoreRawContainer(data: Uint8Array): {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
} {
  const parsed = parseBitLabContainer(data);

  if (parsed.header.codecId !== BitLabCodecId.Raw) {
    throw new Error('El contenedor no usa el codec RAW.');
  }

  return {
    fileName: parsed.header.originalName,
    mimeType: parsed.header.mimeType,
    bytes: parsed.payload.slice(),
  };
}
