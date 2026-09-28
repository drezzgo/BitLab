import { parseBitLabContainer, restoreRawContainer } from './format';
import { restoreHuffmanContainer } from './huffman';
import { BitLabCodecId, type RestoredBitLabFile } from './types';

export function restoreBitLabContainer(data: Uint8Array): RestoredBitLabFile {
  const parsed = parseBitLabContainer(data);

  if (parsed.header.codecId === BitLabCodecId.Raw) {
    const restored = restoreRawContainer(data);
    return { ...restored, codecId: BitLabCodecId.Raw };
  }

  if (parsed.header.codecId === BitLabCodecId.Huffman) {
    const restored = restoreHuffmanContainer(data);
    return { ...restored, codecId: BitLabCodecId.Huffman };
  }

  throw new Error(`Codec no soportado: ${parsed.header.codecId}.`);
}
