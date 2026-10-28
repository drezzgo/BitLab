export const LZ77_HUFFMAN_METADATA_VERSION = 1;
export const LZ77_HUFFMAN_METADATA_FIXED_BYTES = 13;

export interface Lz77HuffmanMetadata {
  lz77SizeBytes: number;
  huffmanMetadata: Uint8Array;
}

function bigintToSafeNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${label} excede el rango seguro de JavaScript.`);
  }
  return Number(value);
}

export function encodeLz77HuffmanMetadata(input: {
  lz77SizeBytes: number;
  huffmanMetadata: Uint8Array;
}): Uint8Array {
  if (!Number.isSafeInteger(input.lz77SizeBytes) || input.lz77SizeBytes < 0) {
    throw new RangeError('El tamaño del flujo LZ77 no es válido.');
  }
  if (input.huffmanMetadata.length > 0xffffffff) {
    throw new RangeError('La metadata Huffman interna es demasiado grande.');
  }

  const output = new Uint8Array(
    LZ77_HUFFMAN_METADATA_FIXED_BYTES + input.huffmanMetadata.length,
  );
  const view = new DataView(output.buffer);

  view.setUint8(0, LZ77_HUFFMAN_METADATA_VERSION);
  view.setBigUint64(1, BigInt(input.lz77SizeBytes), false);
  view.setUint32(9, input.huffmanMetadata.length, false);
  output.set(input.huffmanMetadata, LZ77_HUFFMAN_METADATA_FIXED_BYTES);

  return output;
}

export function parseLz77HuffmanMetadata(
  metadata: Uint8Array,
): Lz77HuffmanMetadata {
  if (metadata.length < LZ77_HUFFMAN_METADATA_FIXED_BYTES) {
    throw new Error('Metadata LZ77 + Huffman truncada.');
  }

  const view = new DataView(
    metadata.buffer,
    metadata.byteOffset,
    metadata.byteLength,
  );
  const version = view.getUint8(0);

  if (version !== LZ77_HUFFMAN_METADATA_VERSION) {
    throw new Error(
      `Versión de metadata LZ77 + Huffman no soportada: ${version}.`,
    );
  }

  const rawSize = view.getBigUint64(1, false);
  const lz77SizeBytes = bigintToSafeNumber(rawSize, 'El tamaño LZ77');
  const huffmanMetadataLength = view.getUint32(9, false);
  const expectedLength =
    LZ77_HUFFMAN_METADATA_FIXED_BYTES + huffmanMetadataLength;

  if (expectedLength !== metadata.length) {
    throw new Error(
      'La longitud de metadata LZ77 + Huffman no coincide con su header.',
    );
  }

  return {
    lz77SizeBytes,
    huffmanMetadata: metadata.slice(LZ77_HUFFMAN_METADATA_FIXED_BYTES),
  };
}
