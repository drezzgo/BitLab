import { useEffect, useMemo, useRef, useState } from 'react';
import { V1_DOUBLING_CHALLENGE_SIZES } from '../../core/bits';
import type { WordSizeComparisonRow } from '../../core/comparison';
import type { BitLabWorkerResult } from '../../workers/protocol';
import { makeRequestId, startWorkerTask, type WorkerProgressState, type WorkerTask } from './worker-client';

interface Props {
  file: File | null;
}

type CompareResult = Extract<BitLabWorkerResult, { operation: 'compare' }>;

const AVAILABLE_SIZES = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024,
  2048, 4096, 8192, 16384, 32768, 65535,
];
const DEFAULT_SIZES = [4, 8, 16, 32];
const CHALLENGE_SIZES = [...V1_DOUBLING_CHALLENGE_SIZES];

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

  function applyPreset(next: number[]) {
    if (busy) return;
    setSizes([...next]);
    setRows([]);
  }

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
          <button type="button" className="console-button" disabled={busy} onClick={() => applyPreset(DEFAULT_SIZES)}>
            Selección corta
          </button>
          <button type="button" className="console-button gold-button" disabled={busy} onClick={() => applyPreset(CHALLENGE_SIZES)}>
            Reto ×2
          </button>
          <button type="button" className="console-button" disabled={busy} onClick={() => applyPreset([65535])}>
            Límite v1
          </button>
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
            {integer.format(size)}
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
                <th>Símbolos</th>
                <th>H(X)</th>
                <th>L̄</th>
                <th>Únicos</th>
                <th>Payload</th>
                <th>Codebook</th>
                <th>Metadata</th>
                <th>.bitlab</th>
                <th>Tamaño final</th>
                <th>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSmallest = smallest?.wordSizeBits === row.wordSizeBits;
                const isDegenerate = row.totalSymbols <= 1;

                return (
                  <tr key={row.wordSizeBits} className={isSmallest ? 'is-smallest' : ''}>
                    <td>
                      <strong>{integer.format(row.wordSizeBits)} bits</strong>
                      {isSmallest && <small>menor seleccionado</small>}
                      {isDegenerate && <small>solo 1 símbolo</small>}
                    </td>
                    <td>{integer.format(row.totalSymbols)}</td>
                    <td>{decimal.format(row.entropyBitsPerSymbol)}</td>
                    <td>{decimal.format(row.averageCodeLengthBits)}</td>
                    <td>{integer.format(row.uniqueSymbols)}</td>
                    <td>
                      {formatBytes(row.payloadBytes)}
                      <small>{row.payloadSavingsPercent >= 0 ? '−' : '+'}{decimal.format(Math.abs(row.payloadSavingsPercent))} %</small>
                    </td>
                    <td>{formatBytes(row.codebookMetadataBytes)}</td>
                    <td>{formatBytes(row.metadataBytes)}</td>
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
        <strong>Reto ×2:</strong> 2.048 → 4.096 → 8.192 → 16.384 → 32.768 bits.
        El siguiente doble (65.536) ya no cabe en el campo <code>uint16</code> de <code>.bitlab</code> v1.
        El valor 65.535 se ofrece aparte para validar el límite exacto del formato.
      </p>
      <p className="comparator-note">
        Una palabra mayor no garantiza un archivo menor: puede reducir el número de símbolos pero aumentar
        el tamaño de cada entrada del codebook. Si queda un solo símbolo, el cálculo sigue siendo correcto,
        aunque esa distribución ya aporta poca información para comparar estadísticamente la fuente.
      </p>
      {error && <p className="error-banner">{error}</p>}
    </section>
  );
}
