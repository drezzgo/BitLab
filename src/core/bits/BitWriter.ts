export class BitWriter {
  private bytes: number[] = [];
  private writtenBits = 0;

  get bitLength(): number {
    return this.writtenBits;
  }

  writeBit(bit: 0 | 1): void {
    const byteIndex = Math.floor(this.writtenBits / 8);
    const bitIndex = 7 - (this.writtenBits % 8);

    if (this.bytes[byteIndex] === undefined) this.bytes[byteIndex] = 0;
    if (bit === 1) this.bytes[byteIndex] |= 1 << bitIndex;
    this.writtenBits += 1;
  }

  writeBits(data: Uint8Array, bitCount = data.length * 8): void {
    if (!Number.isInteger(bitCount) || bitCount < 0 || bitCount > data.length * 8) {
      throw new RangeError('bitCount no es válido para el arreglo suministrado.');
    }

    for (let i = 0; i < bitCount; i += 1) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);
      this.writeBit(((data[byteIndex] >> bitIndex) & 1) as 0 | 1);
    }
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}
