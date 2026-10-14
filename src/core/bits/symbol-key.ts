const SYMBOL_KEY_CHUNK_BYTES = 4096;

/**
 * Creates an exact, collision-free Map key with one UTF-16 code unit per byte.
 *
 * The previous implementation used hexadecimal text (two characters per byte).
 * This representation preserves byte-for-byte identity while avoiding that
 * 2x textual expansion for large symbols.
 */
export function bytesToSymbolKey(bytes: Uint8Array): string {
  let key = '';

  for (let offset = 0; offset < bytes.length; offset += SYMBOL_KEY_CHUNK_BYTES) {
    const chunk = bytes.subarray(
      offset,
      Math.min(offset + SYMBOL_KEY_CHUNK_BYTES, bytes.length),
    );
    key += String.fromCharCode(...chunk);
  }

  return key;
}
