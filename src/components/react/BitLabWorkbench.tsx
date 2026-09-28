import { useEffect, useMemo, useRef, useState } from 'react';
import { calculateSegmentation, MAX_WORD_SIZE_BITS, MIN_WORD_SIZE_BITS } from '../../core/bits';
import type { HuffmanContainerMetrics } from '../../core/container';
import type { BitLabWorkerResult } from '../../workers/protocol';
import CalculationAuditCards from './CalculationAuditCards';
import CodingMetricsPanel from './CodingMetricsPanel';
import FilePickerPreview from './FilePickerPreview';
import FilePreview from './FilePreview';
import SourceStatisticsPanel from './SourceStatisticsPanel';
import WordSizeComparator from './WordSizeComparator';
import {
  makeRequestId,
  startWorkerTask,
  type WorkerProgressState,
  type WorkerTask,
} from './worker-client';

const QUICK_SIZES = [2, 4, 8, 13, 16, 32, 64, 128, 256, 512, 1024, 2048];
type Mode = 'encode' | 'decode';
type EncodeCodec = 'huffman' | 'raw';
type EncodeResult = Extract<BitLabWorkerResult, { operation: 'encode' }>;
type DecodeWorkerResult = Extract<BitLabWorkerResult, { operation: 'decode' }>;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function makeDeterministicRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state = 0x12345678;
  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    bytes[index] = state & 0xff;
  }
  return bytes;
}

function createDemoFile(kind: 'repetitive' | 'structured' | 'random'): File {
  if (kind === 'repetitive') {
    const text = 'BITLAB|UD|TEORIA-DE-LA-INFORMACION|'.repeat(4096);
    return new File([text], 'texto-repetitivo.txt', { type: 'text/plain' });
  }

  if (kind === 'structured') {
    const records = Array.from({ length: 700 }, (_, index) => ({
      id: index,
      sensor: `nodo-${index % 8}`,
      state: index % 3 === 0 ? 'activo' : 'espera',
      value: (index % 17) * 5,
    }));
    return new File([JSON.stringify(records, null, 2)], 'telemetria-estructurada.json', {
      type: 'application/json',
    });
  }

  const bytes = makeDeterministicRandomBytes(96 * 1024);
  return new File([toArrayBuffer(bytes)], 'datos-pseudoaleatorios.bin', {
    type: 'application/octet-stream',
  });
}

interface DecodeResult {
  restoredFile: File;
  wordSizeBits: number;
  paddingBits: number;
  originalSize: number;
  codecLabel: string;
  storedSha256Hex: string | null;
  restoredSha256Hex: string;
  integrityStatus: 'verified' | 'mismatch' | 'unavailable';
}

export default function BitLabWorkbench() {
  const [mode, setMode] = useState<Mode>('encode');
  const [codec, setCodec] = useState<EncodeCodec>('huffman');
  const [file, setFile] = useState<File | null>(null);
  const [wordSizeBits, setWordSizeBits] = useState(8);
  const [containerBytes, setContainerBytes] = useState<Uint8Array | null>(null);
  const [huffmanMetrics, setHuffmanMetrics] = useState<HuffmanContainerMetrics | null>(null);
  const [sourceSha256, setSourceSha256] = useState<string | null>(null);
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<WorkerProgressState | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const taskRef = useRef<WorkerTask<EncodeResult | DecodeWorkerResult> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('modo') === 'decodificar') setMode('decode');
  }, []);

  useEffect(() => () => taskRef.current?.cancel(), []);

  const segmentation = useMemo(
    () => (mode === 'encode' && file ? calculateSegmentation(file.size, wordSizeBits) : null),
    [file, mode, wordSizeBits],
  );

  useEffect(() => {
    taskRef.current?.cancel();
    taskRef.current = null;
    setContainerBytes(null);
    setHuffmanMetrics(null);
    setSourceSha256(null);
    setDecodeResult(null);
    setProgress(null);
    setBusy(false);
    setError(null);
  }, [file, mode, wordSizeBits, codec]);

  useEffect(() => {
    if (!containerBytes && !decodeResult) {
      setDownloadUrl(null);
      return;
    }

    const blob = containerBytes
      ? new Blob([toArrayBuffer(containerBytes)], { type: 'application/x-bitlab' })
      : decodeResult!.restoredFile;
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [containerBytes, decodeResult]);

  function changeMode(next: Mode) {
    setMode(next);
    setFile(null);
    const url = new URL(window.location.href);
    url.searchParams.set('modo', next === 'encode' ? 'codificar' : 'decodificar');
    history.replaceState({}, '', `${url.pathname}${url.search}#herramienta`);
  }

  function chooseDemo(kind: 'repetitive' | 'structured' | 'random') {
    setMode('encode');
    setFile(createDemoFile(kind));
  }

  async function encode() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setHuffmanMetrics(null);
    setProgress({ completed: 0, total: 3, label: 'Preparando archivo' });

    try {
      const buffer = await file.arrayBuffer();
      const task = startWorkerTask<EncodeResult>({
        id: makeRequestId('encode'),
        operation: 'encode',
        bytes: buffer,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        wordSizeBits,
        codec,
      }, [buffer], setProgress);
      taskRef.current = task;
      const response = await task.promise;
      taskRef.current = null;

      setContainerBytes(new Uint8Array(response.container));
      setHuffmanMetrics(response.metrics);
      setSourceSha256(response.sha256Hex);
      setProgress(null);
    } catch (cause) {
      taskRef.current = null;
      setContainerBytes(null);
      setHuffmanMetrics(null);
      setSourceSha256(null);
      setProgress(null);

      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'No fue posible crear el contenedor.');
    } finally {
      setBusy(false);
    }
  }

  async function decode() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress({ completed: 0, total: 3, label: 'Preparando contenedor' });

    try {
      const buffer = await file.arrayBuffer();
      const task = startWorkerTask<DecodeWorkerResult>({
        id: makeRequestId('decode'),
        operation: 'decode',
        bytes: buffer,
      }, [buffer], setProgress);
      taskRef.current = task;
      const response = await task.promise;
      taskRef.current = null;

      const restoredFile = new File([response.restored], response.fileName, {
        type: response.mimeType,
      });

      setDecodeResult({
        restoredFile,
        wordSizeBits: response.wordSizeBits,
        paddingBits: response.paddingBits,
        originalSize: response.originalSize,
        codecLabel: response.codecLabel,
        storedSha256Hex: response.storedSha256Hex,
        restoredSha256Hex: response.restoredSha256Hex,
        integrityStatus: response.integrityStatus,
      });
      setProgress(null);
    } catch (cause) {
      taskRef.current = null;
      setDecodeResult(null);
      setProgress(null);

      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'No fue posible leer el contenedor.');
    } finally {
      setBusy(false);
    }
  }

  function cancelOperation() {
    taskRef.current?.cancel();
    taskRef.current = null;
    setBusy(false);
    setProgress(null);
  }

  const sizeDifference = mode === 'encode' && file && containerBytes
    ? containerBytes.length - file.size
    : null;

  return (
    <section className="unified-workbench" aria-labelledby="tool-title">
      <div className="tool-heading">
        <div>
          <p className="eyebrow">HERRAMIENTA BINARIA</p>
          <h2 id="tool-title">Codifica y recupera desde un mismo lugar.</h2>
          <p>
            El archivo se procesa localmente. Las operaciones pesadas se ejecutan fuera del hilo principal
            y los nuevos contenedores guardan un SHA-256 del archivo original.
          </p>
        </div>
        <span className="local-badge">procesamiento local</span>
      </div>

      <div className="mode-switch" role="tablist" aria-label="Operación">
        <button type="button" role="tab" aria-selected={mode === 'encode'} className={mode === 'encode' ? 'active' : ''} onClick={() => changeMode('encode')}>
          Codificar archivo
        </button>
        <button type="button" role="tab" aria-selected={mode === 'decode'} className={mode === 'decode' ? 'active' : ''} onClick={() => changeMode('decode')}>
          Recuperar .bitlab
        </button>
      </div>

      {mode === 'encode' ? (
        <>
          <details className="demo-sources">
            <summary>Probar con fuentes reproducibles</summary>
            <div>
              <button type="button" onClick={() => chooseDemo('repetitive')}>Texto repetitivo</button>
              <button type="button" onClick={() => chooseDemo('structured')}>JSON estructurado</button>
              <button type="button" onClick={() => chooseDemo('random')}>Datos pseudoaleatorios</button>
            </div>
            <p>
              Los tres ejemplos se generan localmente y permiten contrastar una fuente muy redundante,
              una fuente estructurada y una fuente con distribución más uniforme.
            </p>
          </details>

          <div className="workflow-grid">
            <FilePickerPreview file={file} onFile={setFile} />
            <div className="settings-panel">
              <div className="panel-number">01</div>
              <label htmlFor="word-size">Tamaño de palabra</label>
              <p>Define el ancho lógico de cada símbolo entre 2 y 2048 bits.</p>
              <div className="number-control">
                <input
                  id="word-size"
                  type="number"
                  min={MIN_WORD_SIZE_BITS}
                  max={MAX_WORD_SIZE_BITS}
                  value={wordSizeBits}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value) && value >= 2 && value <= 2048) setWordSizeBits(value);
                  }}
                />
                <span>bits</span>
              </div>
              <div className="quick-sizes">
                {QUICK_SIZES.map((size) => (
                  <button key={size} type="button" className={size === wordSizeBits ? 'active' : ''} onClick={() => setWordSizeBits(size)}>
                    {size}
                  </button>
                ))}
              </div>

              <div className="codec-picker" aria-label="Codec de salida">
                <span>Codec</span>
                <div>
                  <button type="button" className={codec === 'huffman' ? 'active' : ''} onClick={() => setCodec('huffman')}>
                    <strong>Huffman</strong><small>codificación de fuente</small>
                  </button>
                  <button type="button" className={codec === 'raw' ? 'active' : ''} onClick={() => setCodec('raw')}>
                    <strong>RAW</strong><small>control sin compresión</small>
                  </button>
                </div>
              </div>

              <button className="primary-button full-button" type="button" disabled={!file || busy} onClick={encode}>
                {busy ? progress?.label ?? 'Procesando…' : 'Crear archivo .bitlab →'}
              </button>
              {busy && <button className="console-button full-button" type="button" onClick={cancelOperation}>Cancelar operación</button>}
            </div>
          </div>

          <div className="metric-grid">
            <article><span>Bits originales</span><strong>{segmentation?.originalBitLength.toLocaleString('es-CO') ?? '—'}</strong></article>
            <article><span>Palabras</span><strong>{segmentation?.symbolCount.toLocaleString('es-CO') ?? '—'}</strong></article>
            <article><span>Padding</span><strong>{segmentation ? `${segmentation.paddingBits} bits` : '—'}</strong></article>
            <article><span>Codec seleccionado</span><strong>{codec === 'huffman' ? 'HUFFMAN' : 'RAW'}</strong></article>
          </div>

          <CalculationAuditCards
            file={file}
            wordSizeBits={wordSizeBits}
            containerSizeBytes={codec === 'raw' ? containerBytes?.length ?? null : null}
            idPrefix="workbench-audit"
            title="Comprueba de dónde sale cada resultado"
          />

          <SourceStatisticsPanel file={file} wordSizeBits={wordSizeBits} />

          {huffmanMetrics && file && (
            <CodingMetricsPanel metrics={huffmanMetrics} originalSizeBytes={file.size} />
          )}

          <WordSizeComparator file={file} />

          {containerBytes && file && downloadUrl && (
            <section className="output-panel">
              <div>
                <span className="result-kicker">ARCHIVO GENERADO</span>
                <h3>{file.name}.bitlab</h3>
                <p>
                  {codec === 'huffman'
                    ? 'El payload usa Huffman canónico; la metadata conserva el codebook y el SHA-256 necesario para verificar la reconstrucción.'
                    : 'RAW conserva los bytes originales y añade el SHA-256 como referencia de integridad.'}
                </p>
                {sourceSha256 && <code className="hash-inline">SHA-256 {sourceSha256}</code>}
              </div>
              <div className="output-stats">
                <div><span>Tamaño final</span><strong>{formatBytes(containerBytes.length)}</strong></div>
                <div>
                  <span>Vs. original</span>
                  <strong>{sizeDifference !== null && sizeDifference >= 0 ? '+' : '−'}{formatBytes(Math.abs(sizeDifference ?? 0))}</strong>
                </div>
              </div>
              <a className="primary-cta" href={downloadUrl} download={`${file.name}.bitlab`}>Descargar ↓</a>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="workflow-grid">
            <FilePickerPreview
              file={file}
              onFile={setFile}
              accept=".bitlab,application/x-bitlab"
              hint="Selecciona un contenedor .bitlab generado por la herramienta"
            />
            <div className="settings-panel decode-panel">
              <div className="panel-number">02</div>
              <strong>Qué valida el decodificador</strong>
              <ul>
                <li>Firma, versión y longitudes del contenedor.</li>
                <li>Codec, tamaño de palabra y padding.</li>
                <li>Codebook Huffman cuando corresponde.</li>
                <li>SHA-256 del archivo restaurado cuando está disponible.</li>
              </ul>
              <button className="primary-button full-button" type="button" disabled={!file || busy} onClick={decode}>
                {busy ? progress?.label ?? 'Recuperando…' : 'Recuperar archivo →'}
              </button>
              {busy && <button className="console-button full-button" type="button" onClick={cancelOperation}>Cancelar operación</button>}
            </div>
          </div>

          {decodeResult && downloadUrl && (
            <section className="decoded-result">
              <div className="decoded-preview"><FilePreview file={decodeResult.restoredFile} compact /></div>
              <div className="decoded-info">
                <span className="result-kicker">ARCHIVO RECUPERADO</span>
                <h3>{decodeResult.restoredFile.name}</h3>
                <div className="decoded-metrics">
                  <div><span>Tamaño</span><strong>{formatBytes(decodeResult.originalSize)}</strong></div>
                  <div><span>Palabra</span><strong>{decodeResult.wordSizeBits} bits</strong></div>
                  <div><span>Padding</span><strong>{decodeResult.paddingBits} bits</strong></div>
                  <div><span>Codec</span><strong>{decodeResult.codecLabel}</strong></div>
                </div>

                <div className={`integrity-card ${decodeResult.integrityStatus}`}>
                  <span>INTEGRIDAD SHA-256</span>
                  <strong>
                    {decodeResult.integrityStatus === 'verified' && 'Verificada'}
                    {decodeResult.integrityStatus === 'mismatch' && 'No coincide'}
                    {decodeResult.integrityStatus === 'unavailable' && 'No disponible en este contenedor'}
                  </strong>
                  {decodeResult.storedSha256Hex && (
                    <div><small>Esperado</small><code>{decodeResult.storedSha256Hex}</code></div>
                  )}
                  <div><small>Restaurado</small><code>{decodeResult.restoredSha256Hex}</code></div>
                  <p>
                    La coincidencia demuestra que los bytes recuperados producen el mismo digest almacenado;
                    no equivale a certificar seguridad general del archivo.
                  </p>
                </div>

                <a className="primary-cta" href={downloadUrl} download={decodeResult.restoredFile.name}>Descargar original ↓</a>
              </div>
            </section>
          )}
        </>
      )}

      {error && <p className="error-banner">{error}</p>}
    </section>
  );
}
