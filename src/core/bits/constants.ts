export const MIN_WORD_SIZE_BITS = 2;

/**
 * BitLab container v1 persists wordSizeBits and paddingBits as uint16.
 * 65_535 is therefore the largest word size that can be represented
 * without changing the container format.
 */
export const MAX_WORD_SIZE_BITS = 0xffff;

export const V1_DOUBLING_CHALLENGE_SIZES = [
  2048,
  4096,
  8192,
  16384,
  32768,
] as const;
