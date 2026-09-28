import { BitReader, calculateSegmentation, validateWordSizeBits } from '../bits';

export interface SymbolFrequency {
  key: string;
  count: number;
  probability: number;
  display: string;
}

export interface SourceStatistics {
  wordSizeBits: number;
  originalBitLength: number;
  totalSymbols: number;
  uniqueSymbols: number;
  entropyBitsPerSymbol: number;
  theoreticalBitsPerSymbol: number;
  redundancyBitsPerSymbol: number;
  entropyUtilizationPercent: number;
  topSymbols: SymbolFrequency[];
}

function bytesToHex(bytes: Uint8Array): string {
  let output = '';
  for (const value of bytes) output += value.toString(16).padStart(2, '0');
  return output;
}

function bytesToBinary(bytes: Uint8Array, bitLength: number): string {
  let output = '';
  for (let index = 0; index < bitLength; index += 1) {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = 7 - (index % 8);
    output += ((bytes[byteIndex] >> bitIndex) & 1).toString();
  }
  return output;
}

function displaySymbol(bytes: Uint8Array, wordSizeBits: number): string {
  if (wordSizeBits <= 16) return bytesToBinary(bytes, wordSizeBits);

  const hex = bytesToHex(bytes);
  if (hex.length <= 24) return `0x${hex}`;
  return `0x${hex.slice(0, 12)}…${hex.slice(-8)}`;
}

export function analyzeSourceStatistics(
  data: Uint8Array,
  wordSizeBits: number,
  topLimit = 8,
): SourceStatistics {
  validateWordSizeBits(wordSizeBits);
  if (!Number.isInteger(topLimit) || topLimit < 1) {
    throw new RangeError('topLimit debe ser un entero mayor o igual que 1.');
  }

  const segmentation = calculateSegmentation(data.length, wordSizeBits);
  if (segmentation.symbolCount === 0) {
    return {
      wordSizeBits,
      originalBitLength: 0,
      totalSymbols: 0,
      uniqueSymbols: 0,
      entropyBitsPerSymbol: 0,
      theoreticalBitsPerSymbol: wordSizeBits,
      redundancyBitsPerSymbol: wordSizeBits,
      entropyUtilizationPercent: 0,
      topSymbols: [],
    };
  }

  const reader = new BitReader(data);
  const frequency = new Map<string, { count: number; bytes: Uint8Array }>();

  for (let symbolIndex = 0; symbolIndex < segmentation.symbolCount; symbolIndex += 1) {
    const validBits = Math.min(wordSizeBits, reader.remainingBits);
    const raw = reader.readBits(validBits);
    const padded = new Uint8Array(Math.ceil(wordSizeBits / 8));
    padded.set(raw);

    const key = bytesToHex(padded);
    const current = frequency.get(key);
    if (current) current.count += 1;
    else frequency.set(key, { count: 1, bytes: padded });
  }

  let entropyBitsPerSymbol = 0;
  const allSymbols: SymbolFrequency[] = [];

  for (const [key, entry] of frequency) {
    const probability = entry.count / segmentation.symbolCount;
    entropyBitsPerSymbol -= probability * Math.log2(probability);
    allSymbols.push({
      key,
      count: entry.count,
      probability,
      display: displaySymbol(entry.bytes, wordSizeBits),
    });
  }

  allSymbols.sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));

  const redundancyBitsPerSymbol = Math.max(0, wordSizeBits - entropyBitsPerSymbol);
  const entropyUtilizationPercent = (entropyBitsPerSymbol / wordSizeBits) * 100;

  return {
    wordSizeBits,
    originalBitLength: segmentation.originalBitLength,
    totalSymbols: segmentation.symbolCount,
    uniqueSymbols: frequency.size,
    entropyBitsPerSymbol,
    theoreticalBitsPerSymbol: wordSizeBits,
    redundancyBitsPerSymbol,
    entropyUtilizationPercent,
    topSymbols: allSymbols.slice(0, topLimit),
  };
}
