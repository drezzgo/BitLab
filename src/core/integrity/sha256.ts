export const SHA256_DIGEST_BYTES = 32;

export async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const copy = data.slice();
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return new Uint8Array(digest);
}

export function bytesToHex(data: Uint8Array): string {
  let output = '';
  for (const value of data) output += value.toString(16).padStart(2, '0');
  return output;
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}
