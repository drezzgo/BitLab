import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createBlendy, type Blendy } from 'blendy';
import {
  benchmarkRowsToCsv,
  benchmarkRowsToJson,
  calculateReductionPercent,
  summarizeBenchmark,
  type BenchmarkRow,
} from '../../core/benchmark';
import type { BitLabWorkerResult } from '../../workers/protocol';
import {
  makeRequestId,
  startWorkerTask,
  type WorkerProgressState,
  type WorkerTask,
} from './worker-client';

const CARD_ID = 'bitlab-benchmark';
const MAX_BENCHMARK_FILES = 20;
type EncodeResult = Extract<BitLabWorkerResult, { operation: 'encode' }>;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function downloadText(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function BenchmarkPanel() {
  const blendy = useRef<Blendy | null>(null);
  const activeTask = useRef<WorkerTask<EncodeResult> | null>(null);
  const cancelled = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<BenchmarkRow[]>([]);
  const [running, setRunning] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [progress, setProgress] = useState<WorkerProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    blendy.current = createBlendy({ animation: 'dynamic' });
    return () => {
      activeTask.current?.cancel();
      blendy.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    blendy.current?.update();
    blendy.current?.toggle(CARD_ID);
  }, [open]);

  const summary = useMemo(
    () => summarizeBenchmark(rows),
    [rows],
  );

  function close() {
    if (running) return;
    blendy.current?.untoggle(CARD_ID, () => setOpen(false));
  }

  function cancelBenchmark() {
    cancelled.current = true;
    activeTask.current?.cancel();
    activeTask.current = null;
  }

  async function runBenchmark() {
    if (files.length === 0 || running) return;

    cancelled.current = false;
    setRunning(true);
    setRows([]);
    setError(null);
    setProgress(null);

    const nextRows: BenchmarkRow[] = [];

    try {
      for (let index = 0; index < files.length; index += 1) {
        if (cancelled.current) break;

        const file = files[index];
        setCurrentFile(`${index + 1}/${files.length} · ${file.name}`);

        const buffer = await file.arrayBuffer();
        if (cancelled.current) break;

        const startedAt = performance.now();
        const task = startWorkerTask<EncodeResult>({
          id: makeRequestId('benchmark'),
          operation: 'encode',
          bytes: buffer,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          wordSizeBits: 8,
          codec: 'auto',
        }, [buffer], setProgress);

        activeTask.current = task;
        const response = await task.promise;
        activeTask.current = null;

        const elapsedMs = performance.now() - startedAt;
        const containerBytes = response.container.byteLength;
        const row: BenchmarkRow = {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          originalBytes: file.size,
          containerBytes,
          reductionPercent: calculateReductionPercent(
            file.size,
            containerBytes,
          ),
          selectedCodec: response.selectedCodec,
          selectedCodecLabel: response.selectedCodecLabel,
          selectedParameterLabel: response.selectedParameterLabel,
          candidateCount: response.candidates?.length ?? 1,
          elapsedMs,
        };

        nextRows.push(row);
        setRows([...nextRows]);
      }
    } catch (cause) {
      if (
        !(cause instanceof DOMException && cause.name === 'AbortError') &&
        !cancelled.current
      ) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'No fue posible completar el benchmark.',
        );
      }
    } finally {
      activeTask.current = null;
      setRunning(false);
      setCurrentFile(null);
      setProgress(null);
    }
  }

  const totalSelectedBytes = files.reduce(
    (total, file) => total + file.size,
    0,
  );

  return (
    <section id="benchmark">
      <button
        type="button"
        className="adaptive-feature-card"
        data-blendy-from={CARD_ID}
        onClick={() => setOpen(true)}
      >
        <div>
          <span className="adaptive-feature-index">Benchmark</span>
          <strong>Mide el sistema con varios archivos</strong>
          <p>
            Ejecuta el optimizador sobre un corpus, registra el ganador de cada archivo
            y exporta los resultados para el informe.
          </p>
        </div>
        <div className="adaptive-feature-state">
          <span>{rows.length > 0 ? `${rows.length} resultados` : 'CSV + JSON'}</span>
          <small>Abrir benchmark ↗</small>
        </div>
      </button>

      {mounted && open && createPortal(
        <div
          className="format-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <section
            className="format-dialog adaptive-dialog benchmark-dialog"
            data-blendy-to={CARD_ID}
            role="dialog"
            aria-modal="true"
            aria-labelledby="benchmark-title"
          >
            <header>
              <div>
                <span>Benchmark</span>
                <h3 id="benchmark-title">Compara el optimizador sobre un corpus.</h3>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                disabled={running}
              >
                ×
              </button>
            </header>

            <div className="benchmark-controls">
              <label className="benchmark-file-picker">
                <strong>Seleccionar archivos</strong>
                <span>
                  Puedes cargar hasta {MAX_BENCHMARK_FILES} archivos. Se procesan
                  secuencialmente para no mantener todos los contenedores en memoria.
                </span>
                <input
                  type="file"
                  multiple
                  disabled={running}
                  onChange={(event) => {
                    const selected = Array.from(event.target.files ?? [])
                      .slice(0, MAX_BENCHMARK_FILES);
                    setFiles(selected);
                    setRows([]);
                    setError(null);
                  }}
                />
              </label>

              <div className="benchmark-selection-summary">
                <div>
                  <span>Archivos</span>
                  <strong>{files.length}</strong>
                </div>
                <div>
                  <span>Tamaño total</span>
                  <strong>{formatBytes(totalSelectedBytes)}</strong>
                </div>
                <div>
                  <span>Búsqueda</span>
                  <strong>11 candidatos / archivo</strong>
                </div>
              </div>

              <div className="benchmark-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={files.length === 0 || running}
                  onClick={runBenchmark}
                >
                  {running ? 'Ejecutando benchmark…' : 'Ejecutar benchmark →'}
                </button>
                {running && (
                  <button
                    type="button"
                    className="console-button"
                    onClick={cancelBenchmark}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {files.length > 0 && (
              <div className="benchmark-file-list">
                {files.map((file) => (
                  <span key={`${file.name}-${file.size}-${file.lastModified}`}>
                    {file.name} · {formatBytes(file.size)}
                  </span>
                ))}
              </div>
            )}

            {running && currentFile && (
              <div className="benchmark-progress">
                <strong>{currentFile}</strong>
                <span>{progress?.label ?? 'Preparando archivo'}</span>
                {progress && progress.total > 0 && (
                  <progress value={progress.completed} max={progress.total} />
                )}
              </div>
            )}

            {rows.length > 0 && (
              <>
                <div className="benchmark-summary-grid">
                  <article>
                    <span>Corpus original</span>
                    <strong>{formatBytes(summary.originalBytes)}</strong>
                  </article>
                  <article>
                    <span>.bitlab acumulado</span>
                    <strong>{formatBytes(summary.containerBytes)}</strong>
                  </article>
                  <article>
                    <span>Variación global</span>
                    <strong>
                      {summary.reductionPercent >= 0 ? '−' : '+'}
                      {formatPercent(Math.abs(summary.reductionPercent))} %
                    </strong>
                  </article>
                  <article>
                    <span>Archivos que redujeron</span>
                    <strong>{summary.smallerResults} / {summary.files}</strong>
                  </article>
                  <article>
                    <span>Tiempo acumulado</span>
                    <strong>{formatDuration(summary.totalElapsedMs)}</strong>
                  </article>
                </div>

                <div className="benchmark-table-wrap">
                  <table className="benchmark-table">
                    <thead>
                      <tr>
                        <th>Archivo</th>
                        <th>Original</th>
                        <th>.bitlab</th>
                        <th>Reducción</th>
                        <th>Ganador</th>
                        <th>Parámetros</th>
                        <th>Tiempo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={`${row.fileName}-${row.originalBytes}`}>
                          <td>{row.fileName}</td>
                          <td>{formatBytes(row.originalBytes)}</td>
                          <td>{formatBytes(row.containerBytes)}</td>
                          <td className={row.reductionPercent >= 0 ? 'positive' : 'negative'}>
                            {row.reductionPercent >= 0 ? '−' : '+'}
                            {formatPercent(Math.abs(row.reductionPercent))} %
                          </td>
                          <td>{row.selectedCodecLabel}</td>
                          <td><code>{row.selectedParameterLabel}</code></td>
                          <td>{formatDuration(row.elapsedMs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="benchmark-wins">
                  {Object.entries(summary.codecWins).map(([codec, wins]) => (
                    <span key={codec}>
                      {codec}: <strong>{wins}</strong>
                    </span>
                  ))}
                </div>

                <div className="benchmark-export-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => downloadText(
                      benchmarkRowsToCsv(rows),
                      'bitlab-benchmark.csv',
                      'text/csv;charset=utf-8',
                    )}
                  >
                    Exportar CSV
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => downloadText(
                      benchmarkRowsToJson(rows),
                      'bitlab-benchmark.json',
                      'application/json;charset=utf-8',
                    )}
                  >
                    Exportar JSON
                  </button>
                </div>

                <p className="benchmark-method-note">
                  El tiempo corresponde a la ejecución del Worker para cada archivo
                  e incluye SHA-256 y las 11 configuraciones del optimizador. Depende
                  del navegador y del equipo, por lo que debe reportarse junto con el
                  entorno de prueba.
                </p>
              </>
            )}

            {error && <p className="error-banner">{error}</p>}
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
