import type {
  CompressionCandidateResult,
} from '../../core/optimizer';

interface Props {
  originalBytes: number;
  selectedCandidateId: string;
  selectedCodecLabel: string;
  selectedParameterLabel: string;
  candidates: CompressionCandidateResult[];
}

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

export default function AutoOptimizerPanel({
  originalBytes,
  selectedCandidateId,
  selectedCodecLabel,
  selectedParameterLabel,
  candidates,
}: Props) {
  const winner = candidates.find(
    (candidate) => candidate.id === selectedCandidateId,
  );
  const sorted = candidates
    .slice()
    .sort((a, b) => a.containerBytes - b.containerBytes);

  return (
    <section className="optimizer-panel" aria-labelledby="optimizer-title">
      <div className="optimizer-heading">
        <div>
          <span>Optimización automática</span>
          <h3 id="optimizer-title">
            {selectedCodecLabel} encontró el menor resultado.
          </h3>
          <p>
            BitLab comparó {candidates.length} combinaciones de codec y parámetros,
            contando el `.bitlab` completo y no solo su payload.
          </p>
          <code className="optimizer-parameter-line">
            {selectedParameterLabel}
          </code>
        </div>
        <div className="optimizer-winner">
          <span>Menor .bitlab</span>
          <strong>{winner ? formatBytes(winner.containerBytes) : '—'}</strong>
        </div>
      </div>

      <div className="optimizer-evolution">
        <article>
          <span>Antes</span>
          <strong>Una configuración por codec</strong>
          <p>La decisión era cuál algoritmo producía menos bytes con parámetros fijos.</p>
        </article>
        <article>
          <span>Ahora</span>
          <strong>Codec + configuración</strong>
          <p>También exploramos N de Huffman y perfiles de búsqueda LZ77.</p>
        </article>
      </div>

      <div className="optimizer-candidates parameter-candidates">
        {sorted.map((candidate, index) => {
          const isWinner = candidate.id === selectedCandidateId;
          const deltaBytes = candidate.containerBytes - originalBytes;

          return (
            <article
              key={candidate.id}
              className={isWinner ? 'winner' : ''}
            >
              <div>
                <strong>{index + 1}. {candidate.label}</strong>
                {isWinner && <span>elegido</span>}
              </div>
              <em>{candidate.parameterLabel}</em>
              <b>{formatBytes(candidate.containerBytes)}</b>
              <small>
                {deltaBytes <= 0 ? '−' : '+'}
                {formatBytes(Math.abs(deltaBytes))}
                {' · '}
                {candidate.variationPercent > 0 ? '+' : ''}
                {formatPercent(candidate.variationPercent)} %
              </small>
            </article>
          );
        })}
      </div>

      {winner && winner.containerBytes >= originalBytes && (
        <p className="optimizer-warning">
          Ninguna combinación consiguió un `.bitlab` menor que el archivo original.
          Aun así se conserva la combinación que produjo el menor contenedor BitLab.
        </p>
      )}
    </section>
  );
}
