import { encodeRawContainer, restoreRawContainer } from '../../container/format';
import {
  encodeHuffmanContainerDetailed,
  restoreHuffmanContainer,
} from '../../container/huffman';
import {
  encodeRleHuffmanContainerDetailed,
  restoreRleHuffmanContainer,
} from '../../container/rle-huffman';
import {
  encodeLz77HuffmanContainerDetailed,
  restoreLz77HuffmanContainer,
} from '../../container/lz77-huffman';
import { BitLabCodecId } from '../../container/types';
import type {
  CodecEncodeResult,
  CodecInput,
  CodecRestoreResult,
  RegisteredCodec,
  RegisteredCodecKey,
  RegisteredCodecSummary,
} from './types';

const registeredCodecs: readonly RegisteredCodec[] = [
  {
    key: 'raw',
    id: BitLabCodecId.Raw,
    label: 'RAW',
    description: 'Control reversible sin compresión.',
    progressLabel: 'Construyendo contenedor RAW',
    encode(input, sha256Digest): CodecEncodeResult {
      return {
        container: encodeRawContainer(input, sha256Digest),
        metrics: null,
      };
    },
    restore(container): CodecRestoreResult {
      return restoreRawContainer(container);
    },
  },
  {
    key: 'huffman',
    id: BitLabCodecId.Huffman,
    label: 'Huffman',
    description: 'Baseline de codificación de fuente.',
    progressLabel: 'Codificando Huffman',
    encode(input, sha256Digest): CodecEncodeResult {
      return encodeHuffmanContainerDetailed(input, sha256Digest);
    },
    restore(container): CodecRestoreResult {
      return restoreHuffmanContainer(container);
    },
  },
  {
    key: 'rle-huffman',
    id: BitLabCodecId.RleHuffman,
    label: 'RLE + Huffman',
    description: 'Reduce runs de bytes y codifica el flujo resultante con Huffman.',
    progressLabel: 'Aplicando RLE + Huffman',
    fixedWordSizeBits: 8,
    encode(input, sha256Digest): CodecEncodeResult {
      return encodeRleHuffmanContainerDetailed(input, sha256Digest);
    },
    restore(container): CodecRestoreResult {
      return restoreRleHuffmanContainer(container);
    },
  },
  {
    key: 'lz77-huffman',
    id: BitLabCodecId.Lz77Huffman,
    label: 'LZ77 + Huffman',
    description: 'Reemplaza secuencias repetidas por referencias y aplica Huffman al flujo resultante.',
    progressLabel: 'Aplicando LZ77 + Huffman',
    fixedWordSizeBits: 8,
    encode(input, sha256Digest, options): CodecEncodeResult {
      return encodeLz77HuffmanContainerDetailed(
        input,
        sha256Digest,
        options?.lz77,
      );
    },
    restore(container): CodecRestoreResult {
      return restoreLz77HuffmanContainer(container);
    },
  },
] as const;

const codecsByKey = new Map<RegisteredCodecKey, RegisteredCodec>();
const codecsById = new Map<BitLabCodecId, RegisteredCodec>();

for (const codec of registeredCodecs) {
  if (codecsByKey.has(codec.key)) {
    throw new Error(`Codec duplicado en registry: ${codec.key}.`);
  }
  if (codecsById.has(codec.id)) {
    throw new Error(`codecId duplicado en registry: ${codec.id}.`);
  }

  codecsByKey.set(codec.key, codec);
  codecsById.set(codec.id, codec);
}

export function listRegisteredCodecs(): RegisteredCodecSummary[] {
  return registeredCodecs.map(({ key, id, label, description, fixedWordSizeBits }) => ({
    key,
    id,
    label,
    description,
    fixedWordSizeBits,
  }));
}

export function getRegisteredCodecByKey(key: RegisteredCodecKey): RegisteredCodec {
  const codec = codecsByKey.get(key);
  if (!codec) throw new Error(`Codec no registrado: ${key}.`);
  return codec;
}

export function getRegisteredCodecById(id: BitLabCodecId): RegisteredCodec {
  const codec = codecsById.get(id);
  if (!codec) throw new Error(`Codec no registrado para codecId ${id}.`);
  return codec;
}

export function encodeWithRegisteredCodec(
  key: RegisteredCodecKey,
  input: CodecInput,
  sha256Digest?: Uint8Array,
): CodecEncodeResult {
  return getRegisteredCodecByKey(key).encode(input, sha256Digest);
}

export function restoreWithRegisteredCodec(
  id: BitLabCodecId,
  container: Uint8Array,
): CodecRestoreResult {
  return getRegisteredCodecById(id).restore(container);
}

export type {
  CodecEncodeResult,
  CodecInput,
  CodecMetrics,
  CodecRestoreResult,
  RegisteredCodec,
  RegisteredCodecKey,
  RegisteredCodecSummary,
} from './types';
