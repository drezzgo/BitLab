import { useEffect, useMemo, useState } from 'react';
import { calculateSegmentation, MAX_WORD_SIZE_BITS, MIN_WORD_SIZE_BITS } from '../../core/bits';
import { encodeRawContainer } from '../../core/container';
import FilePickerPreview from './FilePickerPreview';
import CalculationAuditCards from './CalculationAuditCards';

const QUICK_SIZES = [2, 4, 8, 13, 16, 32, 64, 128, 256, 512, 1024, 2048];

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

export default function ContainerEncoder() {
  const [file, setFile] = useState<File | null>(null);
  const [wordSizeBits, setWordSizeBits] = useState(8);
  const [containerBytes, setContainerBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const segmentation = useMemo(
    () => (file ? calculateSegmentation(file.size, wordSizeBits) : null),
    [file, wordSizeBits],
  );

  useEffect(() => {
    setContainerBytes(null);
    setError(null);
  }, [file, wordSizeBits]);

  useEffect(() => {
    if (!containerBytes) {
      setDownloadUrl(null);
      return;
    }

    const blob = new Blob([toArrayBuffer(containerBytes)], { type: 'application/x-bitlab' });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [containerBytes]);

  async function buildContainer() {
    if (!file) return;
    setBusy(true);
    setError(null);

    try {
      const originalBytes = new Uint8Array(await file.arrayBuffer());
      const encoded = encodeRawContainer({
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        wordSizeBits,
        originalBytes,
      });
      setContainerBytes(encoded);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible crear el contenedor.');
    } finally {
      setBusy(false);
    }
  }

  const overhead = file && containerBytes ? containerBytes.length - file.size : null;

  return (
    <section className="workbench-card">
      <div className="workbench-heading">
        <div>
          <p className="eyebrow">CODIFICAR · FASE 2</p>
          <h1>Construye un contenedor reversible.</h1>
          <p>
            Guardamos el archivo y la metadata necesaria dentro de <code>.bitlab</code>. En esta
            fase el codec es RAW: valida el formato de intercambio, no busca comprimir todavía.
          </p>
        </div>
        <span className="status-pill neutral-pill">RAW v1</span>
      </div>

      <div className="workbench-grid">
        <FilePickerPreview file={file} onFile={setFile} />

        <div className="word-config">
          <label htmlFor="encode-word-size">Palabra binaria</label>
          <p className="control-help">El valor queda registrado dentro del header BitLab.</p>
          <div className="number-control">
            <input
              id="encode-word-size"
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

          <button className="primary-button full-button" type="button" disabled={!file || busy} onClick={buildContainer}>
            {busy ? 'Construyendo…' : 'Crear .bitlab →'}
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <article><span>Tamaño original</span><strong>{file ? formatBytes(file.size) : '—'}</strong></article>
        <article><span>Palabras lógicas</span><strong>{segmentation?.symbolCount.toLocaleString('es-CO') ?? '—'}</strong></article>
        <article><span>Padding lógico</span><strong>{segmentation ? `${segmentation.paddingBits} bits` : '—'}</strong></article>
        <article><span>Codec</span><strong>RAW</strong></article>
      </div>

      <CalculationAuditCards
        file={file}
        wordSizeBits={wordSizeBits}
        containerSizeBytes={containerBytes?.length ?? null}
        idPrefix="encoder-audit"
        title="Audita el cálculo y el contenedor"
      />

      {error && <p className="error-banner">{error}</p>}

      {file && containerBytes && downloadUrl && (
        <section className="result-card success-result">
          <div>
            <span className="result-kicker">CONTENEDOR LISTO</span>
            <h2>{file.name}.bitlab</h2>
            <p>
              El payload conserva los bytes originales. El aumento de tamaño corresponde al header
              y a la metadata; no es una falla de compresión porque Huffman aún no se aplica.
            </p>
          </div>
          <div className="result-stats">
            <div><span>Contenedor</span><strong>{formatBytes(containerBytes.length)}</strong></div>
            <div><span>Overhead</span><strong>+{formatBytes(overhead ?? 0)}</strong></div>
          </div>
          <a className="primary-cta" href={downloadUrl} download={`${file.name}.bitlab`}>
            Descargar .bitlab ↓
          </a>
        </section>
      )}
    </section>
  );
}
