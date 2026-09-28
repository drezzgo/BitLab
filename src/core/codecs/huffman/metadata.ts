export const HUFFMAN_METADATA_VERSION = 1;
export const HUFFMAN_METADATA_FIXED_BYTES = 21;

export interface HuffmanMetadataEntry {
  key: string;
  bytes: Uint8Array;
  codeLength: number;
}

export interface HuffmanMetadata {
  encodedBitLength: number;
  totalSymbols: number;
  entries: HuffmanMetadataEntry[];
}

function bytesToHex(bytes: Uint8Array): string {
  let output = '';
  for (const value of bytes) output += value.toString(16).padStart(2, '0');
  return output;
}

function bigintToSafeNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${label} excede el rango seguro de JavaScript.`);
  }
  return Number(value);
}

export function encodeHuffmanMetadata(input: {
  wordSizeBits: number;
  encodedBitLength: number;
  totalSymbols: number;
  entries: HuffmanMetadataEntry[];
}): Uint8Array {
  const symbolBytes = Math.ceil(input.wordSizeBits / 8);
  if (!Number.isSafeInteger(input.encodedBitLength) || input.encodedBitLength < 0) {
    throw new RangeError('encodedBitLength no es válido.');
  }
  if (!Number.isSafeInteger(input.totalSymbols) || input.totalSymbols < 0) {
    throw new RangeError('totalSymbols no es válido.');
  }
  if (input.entries.length > 0xffffffff) throw new RangeError('El codebook Huffman es demasiado grande.');

  const entryBytes = symbolBytes + 4;
  const totalLength = HUFFMAN_METADATA_FIXED_BYTES + input.entries.length * entryBytes;
  if (!Number.isSafeInteger(totalLength)) throw new RangeError('La metadata Huffman es demasiado grande.');

  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);
  view.setUint8(0, HUFFMAN_METADATA_VERSION);
  view.setBigUint64(1, BigInt(input.encodedBitLength), false);
  view.setBigUint64(9, BigInt(input.totalSymbols), false);
  view.setUint32(17, input.entries.length, false);

  let offset = HUFFMAN_METADATA_FIXED_BYTES;
  for (const entry of input.entries) {
    if (entry.bytes.length !== symbolBytes) {
      throw new Error('Un símbolo del codebook no tiene el ancho esperado.');
    }
    if (!Number.isInteger(entry.codeLength) || entry.codeLength < 1 || entry.codeLength > 0xffffffff) {
      throw new RangeError('Longitud de código Huffman fuera de rango.');
    }
    output.set(entry.bytes, offset);
    offset += symbolBytes;
    view.setUint32(offset, entry.codeLength, false);
    offset += 4;
  }

  return output;
}

export function parseHuffmanMetadata(metadata: Uint8Array, wordSizeBits: number): HuffmanMetadata {
  if (metadata.length < HUFFMAN_METADATA_FIXED_BYTES) {
    throw new Error('Metadata Huffman truncada.');
  }
  const view = new DataView(metadata.buffer, metadata.byteOffset, metadata.byteLength);
  const version = view.getUint8(0);
  if (version !== HUFFMAN_METADATA_VERSION) {
    throw new Error(`Versión de metadata Huffman no soportada: ${version}.`);
  }

  const encodedBitLength = bigintToSafeNumber(view.getBigUint64(1, false), 'La longitud codificada');
  const totalSymbols = bigintToSafeNumber(view.getBigUint64(9, false), 'La cantidad de símbolos');
  const uniqueSymbols = view.getUint32(17, false);
  const symbolBytes = Math.ceil(wordSizeBits / 8);
  const expectedLength = HUFFMAN_METADATA_FIXED_BYTES + uniqueSymbols * (symbolBytes + 4);
  if (expectedLength !== metadata.length) {
    throw new Error('La longitud de metadata Huffman no coincide con su codebook.');
  }

  const entries: HuffmanMetadataEntry[] = [];
  let offset = HUFFMAN_METADATA_FIXED_BYTES;
  for (let index = 0; index < uniqueSymbols; index += 1) {
    const bytes = metadata.slice(offset, offset + symbolBytes);
    offset += symbolBytes;
    const codeLength = view.getUint32(offset, false);
    offset += 4;
    if (codeLength < 1) throw new Error('Metadata Huffman contiene una longitud de código inválida.');
    entries.push({ key: bytesToHex(bytes), bytes, codeLength });
  }

  return { encodedBitLength, totalSymbols, entries };
}
