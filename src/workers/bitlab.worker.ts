import { compareWordSize, validateComparisonSizes } from '../core/comparison';
import {
  BitLabCodecId,
  encodeHuffmanContainerDetailed,
  encodeRawContainer,
  parseBitLabContainer,
  restoreBitLabContainer,
} from '../core/container';
import {
  bytesToHex,
  equalBytes,
  sha256Bytes,
  unpackIntegrityMetadata,
} from '../core/integrity';
import { analyzeSourceStatistics } from '../core/statistics';
import type {
  BitLabWorkerMessage,
  BitLabWorkerRequest,
} from './protocol';

const workerScope = self as unknown as {
  postMessage: (message: BitLabWorkerMessage, transfer?: Transferable[]) => void;
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<BitLabWorkerRequest>) => void,
  ) => void;
};

function send(message: BitLabWorkerMessage, transfer: Transferable[] = []): void {
  workerScope.postMessage(message, transfer);
}

workerScope.addEventListener('message', async (event) => {
  const request = event.data;

  try {
    if (request.operation === 'encode') {
      const bytes = new Uint8Array(request.bytes);
      send({
        id: request.id,
        type: 'progress',
        completed: 1,
        total: 3,
        label: 'Calculando SHA-256',
      });

      const digest = await sha256Bytes(bytes);

      send({
        id: request.id,
        type: 'progress',
        completed: 2,
        total: 3,
        label: request.codec === 'huffman' ? 'Codificando Huffman' : 'Construyendo contenedor RAW',
      });

      let container: Uint8Array;
      let metrics = null;

      const baseInput = {
        originalName: request.fileName,
        mimeType: request.mimeType,
        wordSizeBits: request.wordSizeBits,
        originalBytes: bytes,
      };

      if (request.codec === 'huffman') {
        const encoded = encodeHuffmanContainerDetailed(baseInput, digest);
        container = encoded.container;
        metrics = encoded.metrics;
      } else {
        container = encodeRawContainer(baseInput, digest);
      }

      send({
        id: request.id,
        type: 'progress',
        completed: 3,
        total: 3,
        label: 'Contenedor listo',
      });

      const output = container.slice();
      send({
        id: request.id,
        type: 'result',
        operation: 'encode',
        container: output.buffer,
        metrics,
        sha256Hex: bytesToHex(digest),
      }, [output.buffer]);
      return;
    }

    if (request.operation === 'decode') {
      const data = new Uint8Array(request.bytes);
      send({
        id: request.id,
        type: 'progress',
        completed: 1,
        total: 3,
        label: 'Leyendo contenedor',
      });

      const parsed = parseBitLabContainer(data);
      const integrityMetadata = unpackIntegrityMetadata(parsed.metadata);
      const restored = restoreBitLabContainer(data);

      send({
        id: request.id,
        type: 'progress',
        completed: 2,
        total: 3,
        label: 'Verificando integridad',
      });

      const restoredDigest = await sha256Bytes(restored.bytes);
      const storedDigest = integrityMetadata.sha256Digest;
      const integrityStatus = storedDigest
        ? (equalBytes(storedDigest, restoredDigest) ? 'verified' : 'mismatch')
        : 'unavailable';

      send({
        id: request.id,
        type: 'progress',
        completed: 3,
        total: 3,
        label: 'Archivo recuperado',
      });

      const restoredCopy = restored.bytes.slice();
      send({
        id: request.id,
        type: 'result',
        operation: 'decode',
        restored: restoredCopy.buffer,
        fileName: restored.fileName,
        mimeType: restored.mimeType,
        wordSizeBits: parsed.header.wordSizeBits,
        paddingBits: parsed.header.paddingBits,
        originalSize: Number(parsed.header.originalSizeBytes),
        codecLabel: parsed.header.codecId === BitLabCodecId.Huffman ? 'Huffman' : 'RAW',
        storedSha256Hex: storedDigest ? bytesToHex(storedDigest) : null,
        restoredSha256Hex: bytesToHex(restoredDigest),
        integrityStatus,
      }, [restoredCopy.buffer]);
      return;
    }

    if (request.operation === 'analyze') {
      const bytes = new Uint8Array(request.bytes);
      send({
        id: request.id,
        type: 'progress',
        completed: 0,
        total: 1,
        label: 'Contando símbolos',
      });
      const statistics = analyzeSourceStatistics(bytes, request.wordSizeBits);
      send({
        id: request.id,
        type: 'result',
        operation: 'analyze',
        statistics,
      });
      return;
    }

    if (request.operation === 'compare') {
      const bytes = new Uint8Array(request.bytes);
      const sizes = validateComparisonSizes(request.sizes);
      const digest = await sha256Bytes(bytes);
      const rows = [];

      for (let index = 0; index < sizes.length; index += 1) {
        const size = sizes[index];
        send({
          id: request.id,
          type: 'progress',
          completed: index,
          total: sizes.length,
          label: `Evaluando ${size} bits`,
        });

        rows.push(compareWordSize(bytes, {
          originalName: request.fileName,
          mimeType: request.mimeType,
          wordSizeBits: size,
          sha256Digest: digest,
        }));
      }

      send({
        id: request.id,
        type: 'progress',
        completed: sizes.length,
        total: sizes.length,
        label: 'Comparación lista',
      });

      send({
        id: request.id,
        type: 'result',
        operation: 'compare',
        rows,
      });
    }
  } catch (cause) {
    send({
      id: request.id,
      type: 'error',
      message: cause instanceof Error ? cause.message : 'Ocurrió un error en el procesamiento.',
    });
  }
});
