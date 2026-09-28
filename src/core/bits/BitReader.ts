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

    const output = new Uint8Array(Math.ceil(bitCount / 8));

    for (let i = 0; i < bitCount; i += 1) {
      const bit = this.readBit();
      if (bit === 1) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = 7 - (i % 8);
        output[byteIndex] |= 1 << bitIndex;
      }
    }

    return output;
  }
}
