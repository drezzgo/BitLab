export const ERROR_CODES = {
  parity: { label: 'Paridad par', payloadBits: 256, checkBits: 1 },
  crc16: { label: 'CRC-16', payloadBits: 256, checkBits: 16 },
  hamming74: { label: 'Hamming (7,4)', payloadBits: 4, checkBits: 3 },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

const HAMMING_DATA_POSITIONS = [2, 4, 5, 6] as const;

// MSB first, polynomial 0x1021, initial remainder 0, no reflection or final XOR.
export function crc16(bits: Uint8Array): number {
  let remainder = 0;
  for (const bit of bits) {
    const feedback = (remainder >>> 15) ^ bit;
    remainder = (remainder << 1) & 0xffff;
    if (feedback) remainder ^= 0x1021;
  }
  return remainder;
}

function evenParity(bits: Uint8Array): number {
  let parity = 0;
  for (const bit of bits) parity ^= bit;
  return parity;
}

export function encodeErrorFrame(code: ErrorCode, data: Uint8Array, frame: Uint8Array): void {
  if (code === 'hamming74') {
    for (let index = 0; index < 4; index++) frame[HAMMING_DATA_POSITIONS[index]] = data[index];
    frame[0] = frame[2] ^ frame[4] ^ frame[6];
    frame[1] = frame[2] ^ frame[5] ^ frame[6];
    frame[3] = frame[4] ^ frame[5] ^ frame[6];
    return;
  }
  frame.set(data);
  if (code === 'parity') {
    frame[data.length] = evenParity(data);
    return;
  }
  const remainder = crc16(data);
  for (let index = 0; index < 16; index++) frame[data.length + index] = (remainder >>> (15 - index)) & 1;
}

/** Returns 0 for a passing check, or the syndrome (1-based position for Hamming). */
export function decodeErrorFrame(code: ErrorCode, frame: Uint8Array, data: Uint8Array): number {
  if (code === 'hamming74') {
    let syndrome = 0;
    for (let index = 0; index < 7; index++) {
      if (frame[index]) syndrome ^= index + 1;
    }
    for (let index = 0; index < 4; index++) {
      const position = HAMMING_DATA_POSITIONS[index];
      data[index] = frame[position] ^ Number(syndrome === position + 1);
    }
    return syndrome;
  }
  data.set(frame.subarray(0, data.length));
  return code === 'parity' ? evenParity(frame) : crc16(frame);
}
