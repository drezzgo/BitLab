import { BitReader } from './BitReader';
import { BitWriter } from './BitWriter';
import { validateWordSizeBits } from './validation';

export interface BitSymbol {
  bytes: Uint8Array;
  bitLength: number;
}

export interface SegmentedBitstream {
  wordSizeBits: number;
  originalBitLength: number;
  paddingBits: number;
  symbols: BitSymbol[];
}

export interface SegmentationSummary {
  originalBitLength: number;
  symbolCount: number;
  paddingBits: number;
}

export function calculateSegmentation(
  originalByteLength: number,
  wordSizeBits: number,
): SegmentationSummary {
  validateWordSizeBits(wordSizeBits);

  if (!Number.isSafeInteger(originalByteLength) || originalByteLength < 0) {
    throw new RangeError('El tamaño del archivo debe ser un entero seguro no negativo.');
  }

  const originalBitLength = originalByteLength * 8;
  if (!Number.isSafeInteger(originalBitLength)) {
    throw new RangeError('El archivo excede el rango seguro para contabilizar bits con Number.');
  }

  if (originalBitLength === 0) {
    return { originalBitLength: 0, symbolCount: 0, paddingBits: 0 };
  }

  const symbolCount = Math.ceil(originalBitLength / wordSizeBits);
  const paddingBits = symbolCount * wordSizeBits - originalBitLength;
  return { originalBitLength, symbolCount, paddingBits };
}

export function segmentBytes(data: Uint8Array, wordSizeBits: number): SegmentedBitstream {
  validateWordSizeBits(wordSizeBits);
  const summary = calculateSegmentation(data.length, wordSizeBits);
  const reader = new BitReader(data);
  const symbols: BitSymbol[] = [];

  for (let index = 0; index < summary.symbolCount; index += 1) {
    const validBits = Math.min(wordSizeBits, reader.remainingBits);
    const raw = reader.readBits(validBits);
    const padded = new Uint8Array(Math.ceil(wordSizeBits / 8));
    padded.set(raw);
    symbols.push({ bytes: padded, bitLength: wordSizeBits });
  }

  return {
    wordSizeBits,
    originalBitLength: summary.originalBitLength,
    paddingBits: summary.paddingBits,
    symbols,
  };
}

export function reassembleBytes(segmented: SegmentedBitstream): Uint8Array {
  validateWordSizeBits(segmented.wordSizeBits);

  // The doubling challenge uses byte-aligned word sizes. Reassembling those
  // symbols can be done as block copies instead of bit-by-bit writes.
  if (segmented.wordSizeBits % 8 === 0 && segmented.originalBitLength % 8 === 0) {
    const output = new Uint8Array(segmented.originalBitLength / 8);
    const wordBytes = segmented.wordSizeBits / 8;
    let offset = 0;

    for (const symbol of segmented.symbols) {
      if (offset >= output.length) break;
      const bytesToCopy = Math.min(wordBytes, output.length - offset);
      output.set(symbol.bytes.subarray(0, bytesToCopy), offset);
      offset += bytesToCopy;
    }

    if (offset !== output.length) {
      throw new Error('Faltan bits para reconstruir el archivo original.');
    }
    return output;
  }

  const writer = new BitWriter();
  let remaining = segmented.originalBitLength;

  for (const symbol of segmented.symbols) {
    if (remaining <= 0) break;
    const bitsToWrite = Math.min(segmented.wordSizeBits, remaining);
    writer.writeBits(symbol.bytes, bitsToWrite);
    remaining -= bitsToWrite;
  }

  if (remaining !== 0) {
    throw new Error('Faltan bits para reconstruir el archivo original.');
  }

  return writer.toUint8Array();
}
