import { getRegisteredCodecById, getRegisteredCodecByKey } from '../core/codecs/registry';
import { compareWordSize, validateComparisonSizes } from '../core/comparison';
import {
  parseBitLabContainer,
  restoreBitLabContainer,
} from '../core/container';
import {
  bytesToHex,
  equalBytes,
  sha256Bytes,
  unpackIntegrityMetadata,
} from '../core/integrity';
import {
  getCompressionSearchCandidateCount,
  optimizeCompression,
} from '../core/optimizer';
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

function manualParameterLabel(
  codec: Exclude<BitLabWorkerRequest, { operation: 'decode' | 'analyze' | 'compare' }>['codec'],
  wordSizeBits: number,
): string {
  if (codec === 'lz77-huffman') {
    return '32 KiB · match ≥ 4 · búsqueda 64';
  }
  return `N = ${wordSizeBits}`;
}

workerScope.addEventListener('message', async (event) => {
  const request = event.data;

  try {
    if (request.operation === 'encode') {
      const bytes = new Uint8Array(request.bytes);
      const searchCount = request.codec === 'auto'
        ? getCompressionSearchCandidateCount()
        : 1;
      const totalSteps = searchCount + 2;

      send({
        id: request.id,
        type: 'progress',
        completed: 1,
        total: totalSteps,
        label: 'Calculando SHA-256',
      });

      const digest = await sha256Bytes(bytes);
      const baseInput = {
        originalName: request.fileName,
        mimeType: request.mimeType,
        wordSizeBits: request.wordSizeBits,
        originalBytes: bytes,
      };

      let container: Uint8Array;
      let metrics = null;
      let selectedCodec;
      let selectedCodecLabel: string;
      let selectedWordSizeBits: number;
      let selectedParameterLabel: string;
      let selectedParameters;
      let selectedCandidateId: string | null = null;
      let candidates = null;

      if (request.codec === 'auto') {
        const optimized = optimizeCompression(
          baseInput,
          digest,
          (candidate, completed, total) => {
            send({
              id: request.id,
              type: 'progress',
              completed: completed + 1,
              total: total + 2,
              label: `Probando ${candidate.label} · ${candidate.parameterLabel}`,
            });
          },
        );

        container = optimized.container;
        metrics = optimized.metrics;
        selectedCodec = optimized.selectedCodec;
        selectedCodecLabel = optimized.selectedCodecLabel;
        selectedWordSizeBits = optimized.selectedWordSizeBits;
        selectedParameterLabel = optimized.selectedParameterLabel;
        selectedParameters = optimized.selectedParameters;
        selectedCandidateId = optimized.selectedCandidateId;
        candidates = optimized.candidates;
      } else {
        const codec = getRegisteredCodecByKey(request.codec);

        send({
          id: request.id,
          type: 'progress',
          completed: 2,
          total: totalSteps,
          label: codec.progressLabel,
        });

        const encoded = codec.encode(baseInput, digest);
        container = encoded.container;
        metrics = encoded.metrics;
        selectedCodec = codec.key;
        selectedCodecLabel = codec.label;
        selectedWordSizeBits = request.wordSizeBits;
        selectedParameterLabel = manualParameterLabel(
          request.codec,
          request.wordSizeBits,
        );
        selectedParameters = {
          wordSizeBits: request.wordSizeBits,
        };
      }

      send({
        id: request.id,
        type: 'progress',
        completed: totalSteps,
        total: totalSteps,
        label: request.codec === 'auto'
          ? 'Configuración óptima encontrada'
          : 'Contenedor listo',
      });

      const output = container.slice();
      send({
        id: request.id,
        type: 'result',
        operation: 'encode',
        container: output.buffer,
        metrics,
        sha256Hex: bytesToHex(digest),
        selectedCodec,
        selectedCodecLabel,
        selectedWordSizeBits,
        selectedParameterLabel,
        selectedParameters,
        selectedCandidateId,
        candidates,
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
      const codec = getRegisteredCodecById(parsed.header.codecId);
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
        codecLabel: codec.label,
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
