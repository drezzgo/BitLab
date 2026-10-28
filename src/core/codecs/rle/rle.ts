export const RLE_MIN_RUN_LENGTH = 3;
export const RLE_MAX_RUN_LENGTH = 130;
export const RLE_MAX_LITERAL_LENGTH = 128;

export interface RleEncodeResult {
  bytes: Uint8Array;
  runBlocks: number;
  literalBlocks: number;
}

function countRun(data: Uint8Array, offset: number): number {
  if (offset >= data.length) return 0;

  const value = data[offset];
  let length = 1;

  while (
    offset + length < data.length &&
    data[offset + length] === value &&
    length < RLE_MAX_RUN_LENGTH
  ) {
    length += 1;
  }

  return length;
}

/**
 * PackBits-inspired byte RLE.
 *
 * control 0..127   -> literal block of control + 1 bytes
 * control 128..255 -> run of (control & 0x7f) + 3 copies of the next byte
 *
 * Runs shorter than 3 bytes stay inside literal blocks because encoding them
 * as runs would not reduce their representation.
 */
export function encodeRleDetailed(data: Uint8Array): RleEncodeResult {
  if (data.length === 0) {
    return { bytes: new Uint8Array(), runBlocks: 0, literalBlocks: 0 };
  }

  const output: number[] = [];
  let runBlocks = 0;
  let literalBlocks = 0;
  let offset = 0;

  while (offset < data.length) {
    const runLength = countRun(data, offset);

    if (runLength >= RLE_MIN_RUN_LENGTH) {
      output.push(0x80 | (runLength - RLE_MIN_RUN_LENGTH));
      output.push(data[offset]);
      offset += runLength;
      runBlocks += 1;
      continue;
    }

    const literalStart = offset;
    offset += runLength;

    while (offset < data.length && offset - literalStart < RLE_MAX_LITERAL_LENGTH) {
      const nextRun = countRun(data, offset);

      if (nextRun >= RLE_MIN_RUN_LENGTH) break;

      const remainingLiteral = RLE_MAX_LITERAL_LENGTH - (offset - literalStart);
      offset += Math.min(nextRun, remainingLiteral);

      if (nextRun > remainingLiteral) break;
    }

    const literalLength = offset - literalStart;
    output.push(literalLength - 1);

    for (let index = literalStart; index < offset; index += 1) {
      output.push(data[index]);
    }

    literalBlocks += 1;
  }

  return {
    bytes: Uint8Array.from(output),
    runBlocks,
    literalBlocks,
  };
}

export function encodeRle(data: Uint8Array): Uint8Array {
  return encodeRleDetailed(data).bytes;
}

export function decodeRle(
  encoded: Uint8Array,
  expectedSizeBytes: number,
): Uint8Array {
  if (!Number.isSafeInteger(expectedSizeBytes) || expectedSizeBytes < 0) {
    throw new RangeError('El tamaño original esperado para RLE no es válido.');
  }

  if (expectedSizeBytes === 0) {
    if (encoded.length !== 0) {
      throw new Error('Un archivo vacío no debe contener tokens RLE.');
    }
    return new Uint8Array();
  }

  const output = new Uint8Array(expectedSizeBytes);
  let sourceOffset = 0;
  let targetOffset = 0;

  while (sourceOffset < encoded.length) {
    const control = encoded[sourceOffset++];

    if (control < 0x80) {
      const literalLength = control + 1;

      if (sourceOffset + literalLength > encoded.length) {
        throw new Error('El flujo RLE termina dentro de un bloque literal.');
      }
      if (targetOffset + literalLength > output.length) {
        throw new Error('El flujo RLE reconstruye más bytes de los esperados.');
      }

      output.set(
        encoded.subarray(sourceOffset, sourceOffset + literalLength),
        targetOffset,
      );
      sourceOffset += literalLength;
      targetOffset += literalLength;
      continue;
    }

    const runLength = (control & 0x7f) + RLE_MIN_RUN_LENGTH;

    if (sourceOffset >= encoded.length) {
      throw new Error('El flujo RLE termina antes del valor de un run.');
    }
    if (targetOffset + runLength > output.length) {
      throw new Error('El flujo RLE reconstruye más bytes de los esperados.');
    }

    output.fill(
      encoded[sourceOffset++],
      targetOffset,
      targetOffset + runLength,
    );
    targetOffset += runLength;
  }

  if (targetOffset !== output.length) {
    throw new Error('El flujo RLE terminó antes de reconstruir el tamaño original.');
  }

  return output;
}
