export class BitReader {
  private readonly data: Uint8Array;
  private position = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  get totalBits(): number {
    return this.data.length * 8;
  }

  get remainingBits(): number {
    return this.totalBits - this.position;
  }

  get bitPosition(): number {
    return this.position;
  }

  readBit(): 0 | 1 | null {
    if (this.position >= this.totalBits) return null;

    const byteIndex = Math.floor(this.position / 8);
    const bitIndex = 7 - (this.position % 8);
    const bit = ((this.data[byteIndex] >> bitIndex) & 1) as 0 | 1;
    this.position += 1;
    return bit;
  }

  readBits(bitCount: number): Uint8Array {
    if (!Number.isInteger(bitCount) || bitCount < 0) {
      throw new RangeError('bitCount debe ser un entero no negativo.');
    }
    if (bitCount > this.remainingBits) {
      throw new RangeError('No hay suficientes bits disponibles.');
    }
    if (bitCount === 0) return new Uint8Array();

    const output = new Uint8Array(Math.ceil(bitCount / 8));
    const sourceByteStart = Math.floor(this.position / 8);
    const sourceBitOffset = this.position % 8;

    // Copy one output byte at a time instead of one bit at a time.
    // For byte-aligned reads this becomes a direct Uint8Array copy.
    if (sourceBitOffset === 0) {
      const wholeBytes = Math.floor(bitCount / 8);
      if (wholeBytes > 0) {
        output.set(
          this.data.subarray(sourceByteStart, sourceByteStart + wholeBytes),
          0,
        );
      }

      const remaining = bitCount % 8;
      if (remaining > 0) {
        output[wholeBytes] =
          this.data[sourceByteStart + wholeBytes] & (0xff << (8 - remaining));
      }
    } else {
      for (let outputIndex = 0; outputIndex < output.length; outputIndex += 1) {
        const sourceIndex = sourceByteStart + outputIndex;
        const current = this.data[sourceIndex] ?? 0;
        const next = this.data[sourceIndex + 1] ?? 0;

        output[outputIndex] =
          ((current << sourceBitOffset) & 0xff) |
          (next >>> (8 - sourceBitOffset));
      }

      const remaining = bitCount % 8;
      if (remaining > 0) {
        output[output.length - 1] &= 0xff << (8 - remaining);
      }
    }

    this.position += bitCount;
    return output;
  }
}
