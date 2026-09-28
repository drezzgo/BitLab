import type {
  BitLabWorkerMessage,
  BitLabWorkerRequest,
  BitLabWorkerResult,
} from '../../workers/protocol';

export interface WorkerProgressState {
  completed: number;
  total: number;
  label: string;
}

export interface WorkerTask<T extends BitLabWorkerResult> {
  promise: Promise<T>;
  cancel: () => void;
}

export function startWorkerTask<T extends BitLabWorkerResult>(
  request: BitLabWorkerRequest,
  transfer: Transferable[],
  onProgress?: (progress: WorkerProgressState) => void,
): WorkerTask<T> {
  const worker = new Worker(
    new URL('../../workers/bitlab.worker.ts', import.meta.url),
    { type: 'module' },
  );

  let settled = false;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<T>((resolve, reject) => {
    rejectPromise = reject;

    worker.onmessage = (event: MessageEvent<BitLabWorkerMessage>) => {
      const message = event.data;
      if (message.id !== request.id) return;

      if (message.type === 'progress') {
        onProgress?.({
          completed: message.completed,
          total: message.total,
          label: message.label,
        });
        return;
      }

      settled = true;
      worker.terminate();

      if (message.type === 'error') {
        reject(new Error(message.message));
        return;
      }

      resolve(message as T);
    };

    worker.onerror = (event) => {
      settled = true;
      worker.terminate();
      reject(new Error(event.message || 'El Web Worker dejó de responder.'));
    };

    worker.postMessage(request, transfer);
  });

  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      worker.terminate();
      rejectPromise?.(new DOMException('Operación cancelada por el usuario.', 'AbortError'));
    },
  };
}

export function makeRequestId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
