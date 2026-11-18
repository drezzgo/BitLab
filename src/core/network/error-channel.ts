export function createChannelRandom(seed: number): () => number {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('La semilla debe ser un entero entre 0 y 4.294.967.295.');
  }
  let state = seed;
  // Mulberry32, deterministic across browsers.
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

export function transmitFrame(
  sent: Uint8Array,
  received: Uint8Array,
  probability: number,
  random: () => number,
): number {
  let flips = 0;
  for (let index = 0; index < sent.length; index++) {
    const flip = probability === 1 || (probability > 0 && random() < probability);
    received[index] = sent[index] ^ Number(flip);
    if (flip) flips++;
  }
  return flips;
}
