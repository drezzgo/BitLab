export const LZ77_DEFAULT_WINDOW_SIZE = 32 * 1024;
export const LZ77_TOKEN_MIN_MATCH_LENGTH = 4;
export const LZ77_DEFAULT_MIN_MATCH_LENGTH = 4;
export const LZ77_MAX_MATCH_LENGTH = 131;
export const LZ77_MAX_LITERAL_LENGTH = 128;
export const LZ77_DEFAULT_MAX_CHAIN = 64;
export const LZ77_MAX_DISTANCE = 0xffff;

// Backward-compatible aliases used by earlier docs/tests.
export const LZ77_WINDOW_SIZE = LZ77_DEFAULT_WINDOW_SIZE;
export const LZ77_MIN_MATCH_LENGTH = LZ77_DEFAULT_MIN_MATCH_LENGTH;
export const LZ77_MAX_CHAIN = LZ77_DEFAULT_MAX_CHAIN;

const HASH_SIZE = 1 << 16;
const HASH_MASK = HASH_SIZE - 1;

export interface Lz77EncodeOptions {
  windowSize?: number;
  minMatchLength?: number;
  maxChain?: number;
}

export interface ResolvedLz77EncodeOptions {
  windowSize: number;
  minMatchLength: number;
  maxChain: number;
}

export interface Lz77EncodeResult {
  bytes: Uint8Array;
  matchBlocks: number;
  literalBlocks: number;
  matchedBytes: number;
  literalBytes: number;
  longestMatch: number;
  averageMatchLength: number;
  options: ResolvedLz77EncodeOptions;
}

interface Match {
  length: number;
  distance: number;
}

function validateIntegerRange(
  value: number,
  min: number,
  max: number,
  label: string,
): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} debe estar entre ${min} y ${max}.`);
  }
  return value;
}

export function resolveLz77Options(
  options: Lz77EncodeOptions = {},
): ResolvedLz77EncodeOptions {
  const windowSize = validateIntegerRange(
    options.windowSize ?? LZ77_DEFAULT_WINDOW_SIZE,
    256,
    LZ77_MAX_DISTANCE,
    'La ventana LZ77',
  );
  const minMatchLength = validateIntegerRange(
    options.minMatchLength ?? LZ77_DEFAULT_MIN_MATCH_LENGTH,
    LZ77_TOKEN_MIN_MATCH_LENGTH,
    LZ77_MAX_MATCH_LENGTH,
    'El match mínimo LZ77',
  );
  const maxChain = validateIntegerRange(
    options.maxChain ?? LZ77_DEFAULT_MAX_CHAIN,
    1,
    1024,
    'La profundidad de búsqueda LZ77',
  );

  return { windowSize, minMatchLength, maxChain };
}

function hashAt(data: Uint8Array, offset: number): number {
  const a = data[offset] ?? 0;
  const b = data[offset + 1] ?? 0;
  const c = data[offset + 2] ?? 0;
  return (((a * 251 + b) * 251 + c) >>> 0) & HASH_MASK;
}

/**
 * Token format stays stable regardless of encoder search parameters:
 *
 * control 0..127:
 *   literal block of control + 1 bytes
 *
 * control 128..255:
 *   match length = (control & 0x7f) + 4
 *   followed by uint16 big-endian distance
 *
 * `minMatchLength` controls when the encoder decides a match is worthwhile;
 * it does NOT alter the token decoding formula.
 */
export function encodeLz77Detailed(
  data: Uint8Array,
  options: Lz77EncodeOptions = {},
): Lz77EncodeResult {
  const resolved = resolveLz77Options(options);

  if (data.length === 0) {
    return {
      bytes: new Uint8Array(),
      matchBlocks: 0,
      literalBlocks: 0,
      matchedBytes: 0,
      literalBytes: 0,
      longestMatch: 0,
      averageMatchLength: 0,
      options: resolved,
    };
  }

  const output = new Uint8Array(
    data.length + Math.ceil(data.length / LZ77_MAX_LITERAL_LENGTH) + 3,
  );
  let outputOffset = 0;

  const head = new Int32Array(HASH_SIZE);
  head.fill(-1);
  const previous = new Int32Array(data.length);
  previous.fill(-1);

  let matchBlocks = 0;
  let literalBlocks = 0;
  let matchedBytes = 0;
  let literalBytes = 0;
  let longestMatch = 0;

  let literalStart = 0;
  let literalLength = 0;

  function insertPosition(position: number): void {
    if (position + 2 >= data.length) return;
    const hash = hashAt(data, position);
    previous[position] = head[hash];
    head[hash] = position;
  }

  function findBestMatch(position: number): Match {
    if (position + resolved.minMatchLength > data.length) {
      return { length: 0, distance: 0 };
    }

    const hash = hashAt(data, position);
    const windowStart = Math.max(0, position - resolved.windowSize);
    const maxLength = Math.min(
      LZ77_MAX_MATCH_LENGTH,
      data.length - position,
    );

    let candidate = head[hash];
    let checked = 0;
    let bestLength = 0;
    let bestDistance = 0;

    while (
      candidate >= windowStart &&
      candidate >= 0 &&
      checked < resolved.maxChain
    ) {
      const distance = position - candidate;

      if (
        distance > 0 &&
        distance <= resolved.windowSize &&
        data[candidate] === data[position] &&
        data[candidate + 1] === data[position + 1] &&
        data[candidate + 2] === data[position + 2]
      ) {
        let length = 3;

        while (
          length < maxLength &&
          data[candidate + length] === data[position + length]
        ) {
          length += 1;
        }

        if (length > bestLength) {
          bestLength = length;
          bestDistance = distance;

          if (bestLength === maxLength) break;
        }
      }

      candidate = previous[candidate];
      checked += 1;
    }

    return bestLength >= resolved.minMatchLength
      ? { length: bestLength, distance: bestDistance }
      : { length: 0, distance: 0 };
  }

  function flushLiterals(): void {
    if (literalLength === 0) return;

    output[outputOffset++] = literalLength - 1;
    output.set(
      data.subarray(literalStart, literalStart + literalLength),
      outputOffset,
    );
    outputOffset += literalLength;
    literalBlocks += 1;
    literalBytes += literalLength;
    literalLength = 0;
  }

  let position = 0;

  while (position < data.length) {
    const match = findBestMatch(position);

    if (match.length >= resolved.minMatchLength) {
      flushLiterals();

      output[outputOffset++] =
        0x80 | (match.length - LZ77_TOKEN_MIN_MATCH_LENGTH);
      output[outputOffset++] = (match.distance >>> 8) & 0xff;
      output[outputOffset++] = match.distance & 0xff;

      matchBlocks += 1;
      matchedBytes += match.length;
      longestMatch = Math.max(longestMatch, match.length);

      for (
        let index = position;
        index < position + match.length;
        index += 1
      ) {
        insertPosition(index);
      }

      position += match.length;
      literalStart = position;
      continue;
    }

    if (literalLength === 0) literalStart = position;

    literalLength += 1;
    insertPosition(position);
    position += 1;

    if (literalLength === LZ77_MAX_LITERAL_LENGTH) {
      flushLiterals();
      literalStart = position;
    }
  }

  flushLiterals();

  return {
    bytes: output.slice(0, outputOffset),
    matchBlocks,
    literalBlocks,
    matchedBytes,
    literalBytes,
    longestMatch,
    averageMatchLength: matchBlocks > 0 ? matchedBytes / matchBlocks : 0,
    options: resolved,
  };
}

export function encodeLz77(
  data: Uint8Array,
  options: Lz77EncodeOptions = {},
): Uint8Array {
  return encodeLz77Detailed(data, options).bytes;
}

export function decodeLz77(
  encoded: Uint8Array,
  expectedSizeBytes: number,
): Uint8Array {
  if (!Number.isSafeInteger(expectedSizeBytes) || expectedSizeBytes < 0) {
    throw new RangeError('El tamaño original esperado para LZ77 no es válido.');
  }

  if (expectedSizeBytes === 0) {
    if (encoded.length !== 0) {
      throw new Error('Un archivo vacío no debe contener tokens LZ77.');
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
        throw new Error('El flujo LZ77 termina dentro de un bloque literal.');
      }
      if (targetOffset + literalLength > output.length) {
        throw new Error('El flujo LZ77 reconstruye más bytes de los esperados.');
      }

      output.set(
        encoded.subarray(sourceOffset, sourceOffset + literalLength),
        targetOffset,
      );
      sourceOffset += literalLength;
      targetOffset += literalLength;
      continue;
    }

    const matchLength =
      (control & 0x7f) + LZ77_TOKEN_MIN_MATCH_LENGTH;

    if (sourceOffset + 2 > encoded.length) {
      throw new Error('El flujo LZ77 termina dentro de una referencia.');
    }

    const distance =
      (encoded[sourceOffset] << 8) |
      encoded[sourceOffset + 1];
    sourceOffset += 2;

    if (
      distance <= 0 ||
      distance > LZ77_MAX_DISTANCE ||
      distance > targetOffset
    ) {
      throw new Error('El flujo LZ77 contiene una distancia inválida.');
    }
    if (targetOffset + matchLength > output.length) {
      throw new Error('El flujo LZ77 reconstruye más bytes de los esperados.');
    }

    for (let index = 0; index < matchLength; index += 1) {
      output[targetOffset + index] =
        output[targetOffset - distance + index];
    }
    targetOffset += matchLength;
  }

  if (targetOffset !== output.length) {
    throw new Error(
      'El flujo LZ77 terminó antes de reconstruir el tamaño original.',
    );
  }

  return output;
}
