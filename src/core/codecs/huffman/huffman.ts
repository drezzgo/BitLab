import { BitReader, BitWriter, calculateSegmentation, reassembleBytes, validateWordSizeBits } from '../../bits';

export interface HuffmanSymbol {
  key: string;
  bytes: Uint8Array;
  count: number;
  probability: number;
  codeLength: number;
  code: string;
}

export interface HuffmanModel {
  wordSizeBits: number;
  totalSymbols: number;
  uniqueSymbols: number;
  entropyBitsPerSymbol: number;
  averageCodeLengthBits: number;
  efficiencyPercent: number;
  symbols: HuffmanSymbol[];
}

export interface HuffmanEncodedPayload {
  payload: Uint8Array;
  encodedBitLength: number;
  model: HuffmanModel;
}

interface FrequencyEntry {
  key: string;
  bytes: Uint8Array;
  count: number;
}

interface HuffmanNode {
  count: number;
  minKey: string;
  sequence: number;
  key?: string;
  left?: HuffmanNode;
  right?: HuffmanNode;
}

function bytesToHex(bytes: Uint8Array): string {
  let output = '';
  for (const value of bytes) output += value.toString(16).padStart(2, '0');
  return output;
}

function readPaddedSymbol(reader: BitReader, wordSizeBits: number): Uint8Array {
  const validBits = Math.min(wordSizeBits, reader.remainingBits);
  const raw = reader.readBits(validBits);
  const padded = new Uint8Array(Math.ceil(wordSizeBits / 8));
  padded.set(raw);
  return padded;
}

export function collectSymbolFrequencies(
  data: Uint8Array,
  wordSizeBits: number,
): { totalSymbols: number; entries: FrequencyEntry[] } {
  validateWordSizeBits(wordSizeBits);
  const segmentation = calculateSegmentation(data.length, wordSizeBits);
  const reader = new BitReader(data);
  const frequency = new Map<string, FrequencyEntry>();

  for (let index = 0; index < segmentation.symbolCount; index += 1) {
    const bytes = readPaddedSymbol(reader, wordSizeBits);
    const key = bytesToHex(bytes);
    const current = frequency.get(key);
    if (current) current.count += 1;
    else frequency.set(key, { key, bytes, count: 1 });
  }

  return {
    totalSymbols: segmentation.symbolCount,
    entries: [...frequency.values()],
  };
}

class MinHeap {
  private items: HuffmanNode[] = [];

  private compare(left: HuffmanNode, right: HuffmanNode): number {
    if (left.count !== right.count) return left.count - right.count;
    const keyOrder = left.minKey < right.minKey ? -1 : left.minKey > right.minKey ? 1 : 0;
    if (keyOrder !== 0) return keyOrder;
    return left.sequence - right.sequence;
  }

  push(node: HuffmanNode): void {
    this.items.push(node);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.items[parent], this.items[index]) <= 0) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  pop(): HuffmanNode {
    if (this.items.length === 0) throw new Error('Heap Huffman vacío.');
    const root = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;

        if (left < this.items.length && this.compare(this.items[left], this.items[smallest]) < 0) {
          smallest = left;
        }
        if (right < this.items.length && this.compare(this.items[right], this.items[smallest]) < 0) {
          smallest = right;
        }
        if (smallest === index) break;
        [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
        index = smallest;
      }
    }
    return root;
  }

  get size(): number {
    return this.items.length;
  }
}

function buildCodeLengths(entries: FrequencyEntry[]): Map<string, number> {
  const lengths = new Map<string, number>();
  if (entries.length === 0) return lengths;
  if (entries.length === 1) {
    lengths.set(entries[0].key, 1);
    return lengths;
  }

  let sequence = 0;
  const heap = new MinHeap();
  for (const entry of entries) {
    heap.push({
      count: entry.count,
      minKey: entry.key,
      sequence: sequence++,
      key: entry.key,
    });
  }

  while (heap.size > 1) {
    const left = heap.pop();
    const right = heap.pop();
    heap.push({
      count: left.count + right.count,
      minKey: left.minKey < right.minKey ? left.minKey : right.minKey,
      sequence: sequence++,
      left,
      right,
    });
  }

  const root = heap.pop();
  const visit = (node: HuffmanNode, depth: number): void => {
    if (node.key !== undefined) {
      lengths.set(node.key, Math.max(1, depth));
      return;
    }
    if (node.left) visit(node.left, depth + 1);
    if (node.right) visit(node.right, depth + 1);
  };
  visit(root, 0);
  return lengths;
}

export function buildCanonicalCodes(
  entries: Array<{ key: string; codeLength: number }>,
): Map<string, string> {
  const sorted = [...entries].sort(
    (left, right) => left.codeLength - right.codeLength || (left.key < right.key ? -1 : left.key > right.key ? 1 : 0),
  );
  const codes = new Map<string, string>();
  if (sorted.length === 0) return codes;

  let code = 0n;
  let previousLength = sorted[0].codeLength;

  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index];
    if (!Number.isInteger(entry.codeLength) || entry.codeLength < 1) {
      throw new Error('Longitud de código Huffman inválida.');
    }

    if (index === 0) {
      previousLength = entry.codeLength;
    } else {
      const shift = entry.codeLength - previousLength;
      if (shift < 0) throw new Error('Las longitudes canónicas no están ordenadas correctamente.');
      code <<= BigInt(shift);
      previousLength = entry.codeLength;
    }

    const binary = code.toString(2);
    if (binary.length > entry.codeLength) {
      throw new Error('Las longitudes de código no forman un código prefijo válido.');
    }
    codes.set(entry.key, binary.padStart(entry.codeLength, '0'));
    code += 1n;
  }

  return codes;
}

export function buildHuffmanModel(data: Uint8Array, wordSizeBits: number): HuffmanModel {
  const { totalSymbols, entries } = collectSymbolFrequencies(data, wordSizeBits);
  if (totalSymbols === 0) {
    return {
      wordSizeBits,
      totalSymbols: 0,
      uniqueSymbols: 0,
      entropyBitsPerSymbol: 0,
      averageCodeLengthBits: 0,
      efficiencyPercent: 0,
      symbols: [],
    };
  }

  const lengths = buildCodeLengths(entries);
  const codes = buildCanonicalCodes(
    entries.map((entry) => ({ key: entry.key, codeLength: lengths.get(entry.key)! })),
  );

  let entropyBitsPerSymbol = 0;
  let averageCodeLengthBits = 0;
  const symbols = entries.map((entry): HuffmanSymbol => {
    const probability = entry.count / totalSymbols;
    const codeLength = lengths.get(entry.key)!;
    entropyBitsPerSymbol -= probability * Math.log2(probability);
    averageCodeLengthBits += probability * codeLength;
    return {
      ...entry,
      probability,
      codeLength,
      code: codes.get(entry.key)!,
    };
  });

  symbols.sort((left, right) => right.count - left.count || (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));

  const efficiencyPercent = averageCodeLengthBits > 0
    ? (entropyBitsPerSymbol / averageCodeLengthBits) * 100
    : 0;

  return {
    wordSizeBits,
    totalSymbols,
    uniqueSymbols: symbols.length,
    entropyBitsPerSymbol,
    averageCodeLengthBits,
    efficiencyPercent,
    symbols,
  };
}

export function encodeHuffmanPayload(data: Uint8Array, wordSizeBits: number): HuffmanEncodedPayload {
  const model = buildHuffmanModel(data, wordSizeBits);
  if (model.totalSymbols === 0) {
    return { payload: new Uint8Array(), encodedBitLength: 0, model };
  }

  const codeMap = new Map(model.symbols.map((symbol) => [symbol.key, symbol.code]));
  const reader = new BitReader(data);
  const writer = new BitWriter();

  for (let index = 0; index < model.totalSymbols; index += 1) {
    const bytes = readPaddedSymbol(reader, wordSizeBits);
    const code = codeMap.get(bytesToHex(bytes));
    if (!code) throw new Error('No se encontró código Huffman para un símbolo observado.');
    for (const char of code) writer.writeBit(char === '1' ? 1 : 0);
  }

  return {
    payload: writer.toUint8Array(),
    encodedBitLength: writer.bitLength,
    model,
  };
}

interface DecodeTrieNode {
  zero?: DecodeTrieNode;
  one?: DecodeTrieNode;
  bytes?: Uint8Array;
}

function buildDecodeTrie(
  entries: Array<{ key: string; bytes: Uint8Array; codeLength: number }>,
): DecodeTrieNode {
  const codes = buildCanonicalCodes(entries);
  const root: DecodeTrieNode = {};

  for (const entry of entries) {
    const code = codes.get(entry.key)!;
    let node = root;
    for (const bit of code) {
      if (bit === '0') {
        node.zero ??= {};
        node = node.zero;
      } else {
        node.one ??= {};
        node = node.one;
      }
    }
    if (node.bytes) throw new Error('Metadata Huffman contiene códigos duplicados.');
    node.bytes = entry.bytes;
  }

  return root;
}

export function decodeHuffmanPayload(input: {
  payload: Uint8Array;
  encodedBitLength: number;
  originalSizeBytes: number;
  wordSizeBits: number;
  codebook: Array<{ key: string; bytes: Uint8Array; codeLength: number }>;
}): Uint8Array {
  validateWordSizeBits(input.wordSizeBits);
  if (!Number.isSafeInteger(input.encodedBitLength) || input.encodedBitLength < 0) {
    throw new RangeError('La longitud codificada Huffman no es válida.');
  }
  if (input.encodedBitLength > input.payload.length * 8) {
    throw new Error('El payload Huffman no contiene todos los bits indicados por la metadata.');
  }

  const segmentation = calculateSegmentation(input.originalSizeBytes, input.wordSizeBits);
  if (segmentation.symbolCount === 0) {
    if (input.codebook.length !== 0 || input.encodedBitLength !== 0) {
      throw new Error('Un archivo vacío no debe contener símbolos Huffman.');
    }
    return new Uint8Array();
  }

  if (input.codebook.length === 0) throw new Error('Falta el codebook Huffman.');
  const trie = buildDecodeTrie(input.codebook);
  const reader = new BitReader(input.payload);
  const symbols: Array<{ bytes: Uint8Array; bitLength: number }> = [];
  let consumedBits = 0;
  let node = trie;

  while (consumedBits < input.encodedBitLength && symbols.length < segmentation.symbolCount) {
    const bit = reader.readBit();
    if (bit === null) break;
    consumedBits += 1;
    node = bit === 0 ? node.zero! : node.one!;
    if (!node) throw new Error('El payload Huffman contiene una secuencia que no existe en el codebook.');

    if (node.bytes) {
      symbols.push({ bytes: node.bytes, bitLength: input.wordSizeBits });
      node = trie;
    }
  }

  if (symbols.length !== segmentation.symbolCount) {
    throw new Error('El payload Huffman terminó antes de reconstruir todos los símbolos originales.');
  }

  return reassembleBytes({
    wordSizeBits: input.wordSizeBits,
    originalBitLength: segmentation.originalBitLength,
    paddingBits: segmentation.paddingBits,
    symbols,
  });
}
