import type { HuffmanContainerMetrics } from '../../core/container';

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
    </section>
  );
}
