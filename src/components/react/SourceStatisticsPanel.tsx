import { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/interpretation.css';
import { interpretSourceStatistics } from '../../core/interpretation';
import type { SourceStatistics } from '../../core/statistics';
import type { BitLabWorkerResult } from '../../workers/protocol';
import { makeRequestId, startWorkerTask, type WorkerTask } from './worker-client';

interface Props {
  file: File | null;
  wordSizeBits: number;
}

const integerFormatter = new Intl.NumberFormat('es-CO');
const decimalFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

type AnalyzeResult = Extract<BitLabWorkerResult, { operation: 'analyze' }>;

export default function SourceStatisticsPanel({ file, wordSizeBits }: Props) {
  const [result, setResult] = useState<SourceStatistics | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<WorkerTask<AnalyzeResult> | null>(null);

  useEffect(() => {
    taskRef.current?.cancel();
    taskRef.current = null;
    setResult(null);
    setStatus(null);
    setError(null);
    setBusy(false);
  }, [file, wordSizeBits]);

  useEffect(() => () => taskRef.current?.cancel(), []);

  async function analyze() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setStatus('Preparando archivo');

    try {
      const buffer = await file.arrayBuffer();
      const task = startWorkerTask<AnalyzeResult>({
        id: makeRequestId('analyze'),
        operation: 'analyze',
        bytes: buffer,
        wordSizeBits,
      }, [buffer], (progress) => setStatus(progress.label));
      taskRef.current = task;
      const response = await task.promise;
      taskRef.current = null;
      setResult(response.statistics);
      setStatus(null);
    } catch (cause) {
      taskRef.current = null;
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        setStatus(null);
        return;
      }
      setResult(null);
      setStatus(null);
      setError(cause instanceof Error ? cause.message : 'No fue posible analizar la fuente.');
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    taskRef.current?.cancel();
    taskRef.current = null;
    setBusy(false);
    setStatus(null);
  }

  const entropyWidth = useMemo(() => {
    if (!result || result.theoreticalBitsPerSymbol <= 0) return 0;
    return Math.min(100, Math.max(0, result.entropyUtilizationPercent));
  }, [result]);

  const interpretation = useMemo(
    () => (result ? interpretSourceStatistics(result) : null),
    [result],
  );

  return (
    <section className="source-analysis" aria-labelledby="source-analysis-title">
      <div className="source-analysis-heading">
        <div>
          <p className="eyebrow">ESTADÍSTICA DE LA FUENTE</p>
          <h3 id="source-analysis-title">¿Qué tan predecibles son tus símbolos?</h3>
          <p>
            El conteo se ejecuta en un Web Worker para que la interfaz permanezca disponible
            mientras se recorren los símbolos del archivo.
          </p>
        </div>
        <div className="analysis-actions">
          <button className="console-button gold-button" type="button" disabled={!file || busy} onClick={analyze}>
            {busy ? status ?? 'Analizando…' : result ? 'Recalcular análisis' : 'Analizar distribución'}
          </button>
          {busy && <button className="console-button" type="button" onClick={cancel}>Cancelar</button>}
        </div>
      </div>

      {!result ? (
        <div className="analysis-empty">
          <span aria-hidden="true">0101</span>
          <p>
            El análisis es bajo demanda. Así evitamos recalcular cada vez que cambias un parámetro y,
            al usar un Worker, el cálculo no monopoliza el hilo principal.
          </p>
        </div>
      ) : (
        <>
          <div className="analysis-metrics">
            <article><span>Símbolos totales</span><strong>{integerFormatter.format(result.totalSymbols)}</strong></article>
            <article><span>Símbolos distintos</span><strong>{integerFormatter.format(result.uniqueSymbols)}</strong></article>
            <article><span>Entropía H(X)</span><strong>{decimalFormatter.format(result.entropyBitsPerSymbol)} bit/símbolo</strong></article>
            <article><span>Redundancia teórica</span><strong>{decimalFormatter.format(result.redundancyBitsPerSymbol)} bit/símbolo</strong></article>
          </div>

          <div className="entropy-console">
            <div className="entropy-copy">
              <span>H(X) frente al ancho fijo de {result.wordSizeBits} bits</span>
              <strong>{decimalFormatter.format(result.entropyUtilizationPercent)} %</strong>
            </div>
            <div className="entropy-track" aria-hidden="true"><span style={{ width: `${entropyWidth}%` }} /></div>
            <p>
              H(X) = −Σ p(xᵢ) log₂ p(xᵢ). Una entropía menor al ancho fijo indica redundancia
              estadística potencialmente aprovechable por una codificación de fuente.
            </p>
          </div>

          <div className="frequency-panel">
            <div className="frequency-head"><strong>Símbolos más frecuentes</strong><span>top {result.topSymbols.length}</span></div>
            <div className="frequency-list">
              {result.topSymbols.map((symbol, index) => (
                <div className="frequency-row" key={symbol.key}>
                  <span className="frequency-rank">{String(index + 1).padStart(2, '0')}</span>
                  <code title={symbol.key}>{symbol.display}</code>
                  <div className="frequency-bar" aria-hidden="true"><span style={{ width: `${Math.max(2, symbol.probability * 100)}%` }} /></div>
                  <span>{integerFormatter.format(symbol.count)}</span>
                  <strong>{decimalFormatter.format(symbol.probability * 100)} %</strong>
                </div>
              ))}
            </div>
          </div>

          {interpretation && (
            <section className="interpretation-panel" aria-label="Interpretación de la fuente">
              <div className="interpretation-heading">
                <span>LECTURA DEL RESULTADO</span>
                <strong>Qué significan estas métricas para esta fuente</strong>
              </div>
              <div className="interpretation-grid">
                <article>
                  <span>Entropía frente al ancho fijo</span>
                  <strong>
                    {decimalFormatter.format(result.entropyBitsPerSymbol)} de {result.wordSizeBits} bit/símbolo
                  </strong>
                  <p>
                    La diferencia es {decimalFormatter.format(interpretation.entropyGapBitsPerSymbol)} bit/símbolo.
                    Es redundancia estadística respecto a la representación fija; no son bits que ya hayan sido comprimidos.
                  </p>
                </article>
                <article>
                  <span>Distribución observada</span>
                  <strong>
                    {interpretation.dominantSymbolProbabilityPercent === null
                      ? 'Sin símbolos observados'
                      : interpretation.singleObservedSymbol
                        ? 'Un único símbolo observado'
                        : `${decimalFormatter.format(interpretation.dominantSymbolProbabilityPercent)} % en el símbolo más frecuente`}
                  </strong>
                  <p>
                    La entropía depende de toda la distribución. La frecuencia dominante ayuda a leer la concentración,
                    pero no sustituye el cálculo completo de H(X).
                  </p>
                </article>
                <article>
                  <span>Al cambiar N</span>
                  <strong>{integerFormatter.format(result.uniqueSymbols)} símbolos distintos con N = {result.wordSizeBits}</strong>
                  <p>
                    Cambiar el tamaño de palabra redefine los símbolos y el alfabeto observado. Por eso las probabilidades
                    y la entropía deben recalcularse para cada N.
                  </p>
                </article>
              </div>
            </section>
          )}
        </>
      )}

      {error && <p className="error-banner">{error}</p>}
    </section>
  );
}
