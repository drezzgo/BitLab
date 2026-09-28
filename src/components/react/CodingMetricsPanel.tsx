import '../../styles/interpretation.css';
import type { HuffmanContainerMetrics } from '../../core/container';
import { interpretHuffmanMetrics } from '../../core/interpretation';

interface Props {
  metrics: HuffmanContainerMetrics;
  originalSizeBytes: number;
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4 });
const integer = new Intl.NumberFormat('es-CO');

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export default function CodingMetricsPanel({ metrics, originalSizeBytes }: Props) {
  const payloadImproved = metrics.payloadSavingsPercent >= 0;
  const containerImproved = metrics.overallVariationPercent <= 0;
  const interpretation = interpretHuffmanMetrics(metrics, originalSizeBytes);

  return (
    <section className="coding-metrics" aria-labelledby="coding-metrics-title">
      <div className="coding-metrics-heading">
        <div>
          <p className="eyebrow">MÉTRICAS DE CODIFICACIÓN</p>
          <h3 id="coding-metrics-title">Huffman reduce el flujo; el contenedor decide el resultado final.</h3>
        </div>
        <span className={`metric-status ${containerImproved ? 'is-good' : 'is-warning'}`}>
          {containerImproved ? 'archivo final menor' : 'metadata supera el ahorro'}
        </span>
      </div>

      <div className="coding-metric-grid">
        <article>
          <span>Entropía H(X)</span>
          <strong>{decimal.format(metrics.entropyBitsPerSymbol)}</strong>
          <small>bit/símbolo</small>
        </article>
        <article>
          <span>Longitud media L̄</span>
          <strong>{decimal.format(metrics.averageCodeLengthBits)}</strong>
          <small>bit/símbolo</small>
        </article>
        <article>
          <span>Eficiencia η = H/L̄</span>
          <strong>{decimal.format(metrics.efficiencyPercent)} %</strong>
          <small>del código Huffman</small>
        </article>
        <article>
          <span>Símbolos distintos</span>
          <strong>{integer.format(metrics.uniqueSymbols)}</strong>
          <small>entradas en el codebook</small>
        </article>
      </div>

      <div className="compression-comparison">
        <div className="comparison-row">
          <span>Representación fija de símbolos</span>
          <strong>{integer.format(metrics.fixedLengthBits)} bits</strong>
        </div>
        <div className="comparison-row accent">
          <span>Payload Huffman</span>
          <strong>{integer.format(metrics.encodedBitLength)} bits</strong>
        </div>
        <div className="comparison-row">
          <span>Metadata del codebook</span>
          <strong>{formatBytes(metrics.codebookMetadataBytes)}</strong>
        </div>
        <div className="comparison-row">
          <span>Integridad SHA-256 + envoltura</span>
          <strong>{formatBytes(metrics.integrityMetadataBytes)}</strong>
        </div>
        <div className="comparison-row">
          <span>Archivo original</span>
          <strong>{formatBytes(originalSizeBytes)}</strong>
        </div>
        <div className="comparison-row total">
          <span>Contenedor .bitlab completo</span>
          <strong>{formatBytes(metrics.containerBytes)}</strong>
        </div>
      </div>

      <div className="coding-conclusion-grid">
        <article>
          <span>Payload</span>
          <strong>{payloadImproved ? 'reducción' : 'aumento'} de {decimal.format(Math.abs(metrics.payloadSavingsPercent))} %</strong>
          <p>
            Compara únicamente los bits Huffman con la representación fija de los símbolos. No incluye header ni codebook.
          </p>
        </article>
        <article>
          <span>Archivo completo</span>
          <strong>{containerImproved ? 'reducción' : 'aumento'} de {decimal.format(Math.abs(metrics.overallVariationPercent))} %</strong>
          <p>
            Esta es la comparación que sí incluye la estructura <code>.bitlab</code>. Un resultado mayor sigue siendo válido y reversible.
          </p>
        </article>
      </div>

      <section className="interpretation-panel" aria-label="Interpretación de la codificación Huffman">
        <div className="interpretation-heading">
          <span>LECTURA DEL RESULTADO</span>
          <strong>De la teoría al tamaño real del archivo</strong>
        </div>
        <div className="interpretation-grid">
          <article>
            <span>Huffman frente a H(X)</span>
            <strong>L̄ − H = {decimal.format(interpretation.codeGapBitsPerSymbol)} bit/símbolo</strong>
            <p>
              H(X) es el límite informacional de la fuente y L̄ es lo que usa este código en promedio.
              La diferencia muestra la separación entre ambos valores para este experimento.
            </p>
          </article>
          <article>
            <span>Payload</span>
            <strong>
              {interpretation.payloadOutcome === 'lower' && `ahorra ${integer.format(Math.abs(interpretation.payloadDeltaBits))} bits`}
              {interpretation.payloadOutcome === 'equal' && 'mantiene el mismo número de bits'}
              {interpretation.payloadOutcome === 'higher' && `añade ${integer.format(interpretation.payloadDeltaBits)} bits`}
            </strong>
            <p>
              Esta comparación todavía ignora header, nombre, MIME, codebook e integridad. Mide únicamente
              la representación fija frente al flujo Huffman.
            </p>
          </article>
          <article>
            <span>Overhead del contenedor</span>
            <strong>{formatBytes(interpretation.nonPayloadOverheadBytes)} fuera del payload</strong>
            <p>
              Es la diferencia entre el tamaño completo de <code>.bitlab</code> y los bytes ocupados por el payload.
              Incluye estructura del formato y metadata necesaria para recuperar el archivo.
            </p>
          </article>
          <article>
            <span>Resultado final</span>
            <strong>
              {interpretation.payloadOutcome === 'lower' && interpretation.containerOutcome === 'higher'
                ? 'el overhead supera el ahorro del payload'
                : interpretation.containerOutcome === 'lower'
                  ? 'el ahorro se conserva en el archivo final'
                  : interpretation.containerOutcome === 'equal'
                    ? 'el archivo final conserva el tamaño original'
                    : 'el archivo final resulta mayor'}
            </strong>
            <p>
              El contenedor cambia {formatBytes(Math.abs(interpretation.containerDeltaBytes))} frente al original.
              Que sea mayor no invalida Huffman ni la reversibilidad: describe el balance real entre payload y metadata.
            </p>
          </article>
        </div>
      </section>
    </section>
  );
}
