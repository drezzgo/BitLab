export const RLE_HUFFMAN_METADATA_VERSION = 1;
export const RLE_HUFFMAN_METADATA_FIXED_BYTES = 13;

export interface RleHuffmanMetadata {
  rleSizeBytes: number;
  huffmanMetadata: Uint8Array;
}

function bigintToSafeNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${label} excede el rango seguro de JavaScript.`);
  }
  return Number(value);
}

export function encodeRleHuffmanMetadata(input: {
  rleSizeBytes: number;
  huffmanMetadata: Uint8Array;
}): Uint8Array {
  if (!Number.isSafeInteger(input.rleSizeBytes) || input.rleSizeBytes < 0) {
    throw new RangeError('El tamaño del flujo RLE no es válido.');
  }
  if (input.huffmanMetadata.length > 0xffffffff) {
    throw new RangeError('La metadata Huffman interna es demasiado grande.');
  }

  const output = new Uint8Array(
    RLE_HUFFMAN_METADATA_FIXED_BYTES + input.huffmanMetadata.length,
  );
  const view = new DataView(output.buffer);

  view.setUint8(0, RLE_HUFFMAN_METADATA_VERSION);
  view.setBigUint64(1, BigInt(input.rleSizeBytes), false);
  view.setUint32(9, input.huffmanMetadata.length, false);
  output.set(input.huffmanMetadata, RLE_HUFFMAN_METADATA_FIXED_BYTES);

  return output;
}

export function parseRleHuffmanMetadata(
  metadata: Uint8Array,
): RleHuffmanMetadata {
  if (metadata.length < RLE_HUFFMAN_METADATA_FIXED_BYTES) {
    throw new Error('Metadata RLE + Huffman truncada.');
  }

  const view = new DataView(
    metadata.buffer,
    metadata.byteOffset,
    metadata.byteLength,
  );
  const version = view.getUint8(0);

  if (version !== RLE_HUFFMAN_METADATA_VERSION) {
    throw new Error(`Versión de metadata RLE + Huffman no soportada: ${version}.`);
  }

  const rleSizeBytes = bigintToSafeNumber(
    view.getBigUint64(1, false),
    'El tamaño RLE',
  );
  const huffmanMetadataLength = view.getUint32(9, false);
  const expectedLength =
    RLE_HUFFMAN_METADATA_FIXED_BYTES + huffmanMetadataLength;

  if (expectedLength !== metadata.length) {
    throw new Error(
      'La longitud de metadata RLE + Huffman no coincide con su header.',
    );
  }

  return {
    rleSizeBytes,
    huffmanMetadata: metadata.slice(RLE_HUFFMAN_METADATA_FIXED_BYTES),
  };
}
