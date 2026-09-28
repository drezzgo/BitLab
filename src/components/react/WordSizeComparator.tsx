import { useEffect, useMemo, useRef, useState } from 'react';
import type { WordSizeComparisonRow } from '../../core/comparison';
import type { BitLabWorkerResult } from '../../workers/protocol';
import { makeRequestId, startWorkerTask, type WorkerProgressState, type WorkerTask } from './worker-client';

interface Props {
  file: File | null;
}

type CompareResult = Extract<BitLabWorkerResult, { operation: 'compare' }>;

const AVAILABLE_SIZES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
const DEFAULT_SIZES = [4, 8, 16, 32];

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 });
const integer = new Intl.NumberFormat('es-CO');

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export default function WordSizeComparator({ file }: Props) {
  const [sizes, setSizes] = useState<number[]>(DEFAULT_SIZES);
  const [rows, setRows] = useState<WordSizeComparisonRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<WorkerProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<WorkerTask<CompareResult> | null>(null);

  useEffect(() => {
    taskRef.current?.cancel();
    taskRef.current = null;
    setRows([]);
    setError(null);
    setProgress(null);
    setBusy(false);
  }, [file]);

  useEffect(() => () => taskRef.current?.cancel(), []);

  const smallest = useMemo(() => {
    if (rows.length === 0) return null;
    return rows.reduce((best, row) => row.containerBytes < best.containerBytes ? row : best);
  }, [rows]);

  function toggleSize(size: number) {
    if (busy) return;
    setSizes((current) => current.includes(size)
      ? current.filter((value) => value !== size)
      : [...current, size].sort((left, right) => left - right));
    setRows([]);
  }

  async function compare() {
    if (!file || sizes.length === 0) return;
    setBusy(true);
    setRows([]);
    setError(null);
    setProgress({ completed: 0, total: sizes.length, label: 'Preparando archivo' });

    try {
      const buffer = await file.arrayBuffer();
      const task = startWorkerTask<CompareResult>({
        id: makeRequestId('compare'),
        operation: 'compare',
        bytes: buffer,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizes,
      }, [buffer], setProgress);
      taskRef.current = task;
      const response = await task.promise;
      taskRef.current = null;
      setRows(response.rows);
      setProgress(null);
    } catch (cause) {
      taskRef.current = null;
      setProgress(null);
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'No fue posible comparar los tamaños.');
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    taskRef.current?.cancel();
    taskRef.current = null;
    setBusy(false);
    setProgress(null);
  }

  return (
    <section className="word-comparator" aria-labelledby="word-comparator-title">
      <div className="word-comparator-head">
        <div>
          <p className="eyebrow">COMPARADOR DE PALABRAS</p>
          <h3 id="word-comparator-title">El mismo archivo, distintos alfabetos.</h3>
          <p>
            Compara únicamente los tamaños que selecciones. El resultado resaltado es el menor
            contenedor <code>.bitlab</code> entre esos casos, no un óptimo universal.
          </p>
        </div>
        <div className="comparator-actions">
          <button type="button" className="console-button" disabled={busy} onClick={() => setSizes([...AVAILABLE_SIZES])}>Seleccionar todos</button>
          <button type="button" className="console-button" disabled={busy} onClick={() => setSizes([...DEFAULT_SIZES])}>Selección corta</button>
        </div>
      </div>

      <div className="comparison-size-picker" aria-label="Tamaños a comparar">
        {AVAILABLE_SIZES.map((size) => (
          <button
            type="button"
            key={size}
            className={sizes.includes(size) ? 'active' : ''}
            aria-pressed={sizes.includes(size)}
            disabled={busy}
            onClick={() => toggleSize(size)}
          >
            {size}
          </button>
        ))}
      </div>

      <div className="comparison-run">
        <button className="primary-button" type="button" disabled={!file || sizes.length === 0 || busy} onClick={compare}>
          {busy ? progress?.label ?? 'Comparando…' : 'Comparar con Huffman →'}
        </button>
        {busy && <button className="console-button" type="button" onClick={cancel}>Cancelar</button>}
        {busy && progress && progress.total > 0 && (
          <span>{progress.completed}/{progress.total}</span>
        )}
      </div>

      {rows.length > 0 && (
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Palabra</th>
                <th>H(X)</th>
                <th>L̄</th>
                <th>Símbolos únicos</th>
                <th>Payload</th>
                <th>.bitlab</th>
                <th>Tamaño final</th>
                <th>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSmallest = smallest?.wordSizeBits === row.wordSizeBits;
                return (
                  <tr key={row.wordSizeBits} className={isSmallest ? 'is-smallest' : ''}>
                    <td><strong>{row.wordSizeBits} bits</strong>{isSmallest && <small>menor seleccionado</small>}</td>
                    <td>{decimal.format(row.entropyBitsPerSymbol)}</td>
                    <td>{decimal.format(row.averageCodeLengthBits)}</td>
                    <td>{integer.format(row.uniqueSymbols)}</td>
                    <td>{row.payloadSavingsPercent >= 0 ? '−' : '+'}{decimal.format(Math.abs(row.payloadSavingsPercent))} %</td>
                    <td>{row.overallVariationPercent <= 0 ? '−' : '+'}{decimal.format(Math.abs(row.overallVariationPercent))} %</td>
                    <td>{formatBytes(row.containerBytes)}</td>
                    <td>{decimal.format(row.processingMs)} ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="comparator-note">
        Una palabra mayor no garantiza un archivo menor: puede aumentar el número de símbolos únicos
        y el tamaño del codebook. La comparación mide ese trade-off sobre la fuente concreta.
      </p>
      {error && <p className="error-banner">{error}</p>}
    </section>
  );
}
