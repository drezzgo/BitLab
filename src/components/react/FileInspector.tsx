import { useMemo, useState } from 'react';
import {
  calculateSegmentation,
  MAX_WORD_SIZE_BITS,
  MIN_WORD_SIZE_BITS,
} from '../../core/bits';
import FilePickerPreview from './FilePickerPreview';
import CalculationAuditCards from './CalculationAuditCards';

const QUICK_SIZES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

export default function FileInspector() {
  const [file, setFile] = useState<File | null>(null);
  const [wordSizeBits, setWordSizeBits] = useState(8);

  const summary = useMemo(
    () => (file ? calculateSegmentation(file.size, wordSizeBits) : null),
    [file, wordSizeBits],
  );

  return (
    <section className="engine-card" aria-labelledby="engine-title">
      <div className="engine-heading">
        <div>
          <p className="eyebrow">FASE 2 · CONTENEDOR REVERSIBLE</p>
          <h2 id="engine-title">Inspecciona antes de codificar</h2>
          <p>
            La vista previa solo ayuda a reconocer el archivo. El motor sigue tratándolo como
            bytes; su formato no cambia la segmentación binaria.
          </p>
        </div>
        <span className="status-pill">local</span>
      </div>

      <div className="engine-layout">
        <FilePickerPreview file={file} onFile={setFile} />

        <div className="word-config">
          <label htmlFor="word-size">Tamaño de palabra</label>
          <p className="control-help">Define el ancho lógico de los símbolos: 2–2048 bits.</p>
          <div className="number-control">
            <input
              id="word-size"
              type="number"
              min={MIN_WORD_SIZE_BITS}
              max={MAX_WORD_SIZE_BITS}
              value={wordSizeBits}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (
                  Number.isInteger(value) &&
                  value >= MIN_WORD_SIZE_BITS &&
                  value <= MAX_WORD_SIZE_BITS
                ) {
                  setWordSizeBits(value);
                }
              }}
            />
            <span>bits</span>
          </div>
          <div className="quick-sizes">
            {QUICK_SIZES.map((size) => (
              <button
                type="button"
                key={size}
                className={size === wordSizeBits ? 'active' : ''}
                onClick={() => setWordSizeBits(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="metric-grid">
        <article><span>Bits originales</span><strong>{summary?.originalBitLength.toLocaleString('es-CO') ?? '—'}</strong></article>
        <article><span>Palabras</span><strong>{summary?.symbolCount.toLocaleString('es-CO') ?? '—'}</strong></article>
        <article><span>Padding lógico</span><strong>{summary ? `${summary.paddingBits} bits` : '—'}</strong></article>
        <article><span>Ancho</span><strong>{wordSizeBits} bits</strong></article>
      </div>

      <CalculationAuditCards
        file={file}
        wordSizeBits={wordSizeBits}
        idPrefix="inspector-audit"
        title="Comprueba los resultados paso a paso"
      />

      <div className="next-action-band">
        <div>
          <strong>¿Quieres generar el primer contenedor BitLab?</strong>
          <span>La Fase 2 usa payload RAW: reversible, pero todavía sin compresión.</span>
        </div>
        <a className="primary-cta" href="/codificar">Ir a Codificar →</a>
      </div>
    </section>
  );
}
