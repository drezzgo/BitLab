import { useEffect, useMemo, useState } from 'react';
import { parseBitLabContainer, restoreRawContainer, BitLabCodecId } from '../../core/container';
import FilePickerPreview from './FilePickerPreview';
import FilePreview from './FilePreview';

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

interface DecodeResult {
  restoredFile: File;
  wordSizeBits: number;
  paddingBits: number;
  originalSize: number;
  codecLabel: string;
}

export default function ContainerDecoder() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [file]);

  useEffect(() => {
    if (!result) {
      setDownloadUrl(null);
      return;
    }
    const url = URL.createObjectURL(result.restoredFile);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  async function decode() {
    if (!file) return;
    setError(null);

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const parsed = parseBitLabContainer(data);
      const restored = restoreRawContainer(data);
      const restoredFile = new File([toArrayBuffer(restored.bytes)], restored.fileName, { type: restored.mimeType });

      setResult({
        restoredFile,
        wordSizeBits: parsed.header.wordSizeBits,
        paddingBits: parsed.header.paddingBits,
        originalSize: Number(parsed.header.originalSizeBytes),
        codecLabel: parsed.header.codecId === BitLabCodecId.Raw ? 'RAW' : String(parsed.header.codecId),
      });
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : 'No fue posible leer el contenedor.');
    }
  }

  const inputHint = useMemo(() => 'Contenedor .bitlab generado por BitLab', []);

  return (
    <section className="workbench-card">
      <div className="workbench-heading">
        <div>
          <p className="eyebrow">DECODIFICAR · FASE 2</p>
          <h1>Recupera el archivo original.</h1>
          <p>
            El decodificador lee la firma, versión y metadata del contenedor. Por ahora acepta el
            codec RAW v1; Huffman se integrará en una fase posterior.
          </p>
        </div>
        <span className="status-pill neutral-pill">parser v1</span>
      </div>

      <div className="decoder-layout">
        <FilePickerPreview file={file} onFile={setFile} accept=".bitlab,application/x-bitlab" hint={inputHint} />
        <div className="decode-action-panel">
          <strong>Validaciones realizadas</strong>
          <ul>
            <li>Firma <code>BTLB</code></li>
            <li>Versión del formato</li>
            <li>Longitud del payload</li>
            <li>Padding vs. tamaño original</li>
          </ul>
          <button className="primary-button full-button" type="button" disabled={!file} onClick={decode}>
            Decodificar →
          </button>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {result && downloadUrl && (
        <section className="decoded-result">
          <div className="decoded-preview">
            <FilePreview file={result.restoredFile} compact />
          </div>
          <div className="decoded-info">
            <span className="result-kicker">ARCHIVO RECUPERADO</span>
            <h2>{result.restoredFile.name}</h2>
            <div className="decoded-metrics">
              <div><span>Tamaño</span><strong>{formatBytes(result.originalSize)}</strong></div>
              <div><span>Palabra</span><strong>{result.wordSizeBits} bits</strong></div>
              <div><span>Padding</span><strong>{result.paddingBits} bits</strong></div>
              <div><span>Codec</span><strong>{result.codecLabel}</strong></div>
            </div>
            <p>
              En Fase 2 la recuperación es byte a byte desde un payload RAW. La verificación
              criptográfica SHA-256 llegará en la fase de integridad.
            </p>
            <a className="primary-cta" href={downloadUrl} download={result.restoredFile.name}>
              Descargar original ↓
            </a>
          </div>
        </section>
      )}
    </section>
  );
}
