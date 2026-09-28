import { MAX_WORD_SIZE_BITS, MIN_WORD_SIZE_BITS } from './constants';

export function validateWordSizeBits(wordSizeBits: number): void {
  if (!Number.isInteger(wordSizeBits)) {
    throw new TypeError('El tamaño de palabra debe ser un entero.');
  }

  if (wordSizeBits < MIN_WORD_SIZE_BITS || wordSizeBits > MAX_WORD_SIZE_BITS) {
    throw new RangeError(
      `El tamaño de palabra debe estar entre ${MIN_WORD_SIZE_BITS} y ${MAX_WORD_SIZE_BITS} bits.`,
    );
  }
}
