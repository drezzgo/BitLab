import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createBlendy, type Blendy } from 'blendy';
import type { Lz77HuffmanContainerMetrics } from '../../core/container';

const CARD_ID = 'bitlab-compression-evolution';

interface Props {
  lz77Metrics: Lz77HuffmanContainerMetrics | null;
  huffmanContainerBytes: number | null;
  rleContainerBytes: number | null;
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

function comparisonPercent(
  currentBytes: number,
  referenceBytes: number | null,
): number | null {
  if (!referenceBytes || referenceBytes <= 0) return null;
  return (currentBytes / referenceBytes - 1) * 100;
}

export default function CompressionEvolutionCard({
  lz77Metrics,
  huffmanContainerBytes,
  rleContainerBytes,
}: Props) {
  const blendy = useRef<Blendy | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    blendy.current = createBlendy({ animation: 'dynamic' });
    return () => { blendy.current = null; };
  }, []);

  useEffect(() => {
    if (!open) return;
    blendy.current?.update();
    blendy.current?.toggle(CARD_ID);
  }, [open]);

  function close() {
    blendy.current?.untoggle(CARD_ID, () => setOpen(false));
  }

  const versusHuffman = lz77Metrics
    ? comparisonPercent(lz77Metrics.containerBytes, huffmanContainerBytes)
    : null;
  const versusRle = lz77Metrics
    ? comparisonPercent(lz77Metrics.containerBytes, rleContainerBytes)
    : null;

  return (
    <section id="mejoras">
      <button
        type="button"
        className="adaptive-feature-card"
        data-blendy-from={CARD_ID}
        onClick={() => setOpen(true)}
      >
        <div>
          <span className="adaptive-feature-index">Mejoras</span>
          <strong>De frecuencias a secuencias repetidas</strong>
          <p>
            LZ77 busca fragmentos que ya aparecieron y los reemplaza por una referencia.
            Después Huffman codifica ese flujo.
          </p>
        </div>
        <div className="adaptive-feature-state">
          <span>LZ77 + Huffman</span>
          <small>Ver antes y ahora ↗</small>
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
            className="format-dialog adaptive-dialog adaptive-evolution-dialog"
            data-blendy-to={CARD_ID}
            role="dialog"
            aria-modal="true"
            aria-labelledby="evolution-title"
          >
            <header>
              <div>
                <span>LZ77 + Huffman</span>
                <h3 id="evolution-title">Ahora reutilizamos secuencias que ya vimos.</h3>
              </div>
              <button type="button" onClick={close} aria-label="Cerrar">×</button>
            </header>

            <div className="before-after-grid">
              <article>
                <span>Antes</span>
                <strong>Huffman trabaja con frecuencias</strong>
                <pre><code>{`for (const symbol of symbols) {
  count(symbol);
}

buildHuffmanCodes();
encode(symbols);`}</code></pre>
                <p>
                  Si una frase completa aparece muchas veces, Huffman aprovecha la frecuencia de
                  sus bytes, pero no expresa directamente “esta secuencia ya apareció antes”.
                </p>
              </article>

              <article>
                <span>Ahora</span>
                <strong>LZ77 crea referencias y Huffman las codifica</strong>
                <pre><code>{`match = findPreviousSequence();

if (match) {
  emit(match.distance, match.length);
} else {
  emit(literal);
}

huffman(tokenStream);`}</code></pre>
                <p>
                  En lugar de volver a guardar una secuencia, podemos indicar a qué distancia
                  apareció y cuántos bytes debemos copiar.
                </p>
              </article>
            </div>

            <div className="lz-example">
              <span>Ejemplo sencillo</span>
              <code>UNIVERSIDAD-DISTRITAL | UNIVERSIDAD-DISTRITAL</code>
              <b>↓</b>
              <code>UNIVERSIDAD-DISTRITAL | referencia(distancia, longitud)</code>
            </div>

            {lz77Metrics ? (
              <>
                <div className="phase4-metric-grid">
                  <article>
                    <span>Original</span>
                    <strong>{formatBytes(lz77Metrics.originalBytes)}</strong>
                  </article>
                  <article>
                    <span>Después de LZ77</span>
                    <strong>{formatBytes(lz77Metrics.lz77Bytes)}</strong>
                    <small>
                      {lz77Metrics.lz77SavingsPercent >= 0 ? '−' : '+'}
                      {formatPercent(Math.abs(lz77Metrics.lz77SavingsPercent))} %
                    </small>
                  </article>
                  <article>
                    <span>Bytes referenciados</span>
                    <strong>{formatBytes(lz77Metrics.matchedBytes)}</strong>
                    <small>{lz77Metrics.matchBlocks.toLocaleString('es-CO')} matches</small>
                  </article>
                  <article>
                    <span>Match más largo</span>
                    <strong>{lz77Metrics.longestMatch} B</strong>
                    <small>media {formatPercent(lz77Metrics.averageMatchLength)} B</small>
                  </article>
                  <article>
                    <span>Payload Huffman</span>
                    <strong>{formatBytes(lz77Metrics.huffmanPayloadBytes)}</strong>
                  </article>
                  <article>
                    <span>.bitlab final</span>
                    <strong>{formatBytes(lz77Metrics.containerBytes)}</strong>
                  </article>
                </div>

                <div className="strategy-comparison-grid">
                  <article>
                    <span>vs. Huffman</span>
                    <strong>
                      {versusHuffman === null
                        ? 'Ejecuta Huffman con N = 8'
                        : `${versusHuffman <= 0 ? '−' : '+'}${formatPercent(Math.abs(versusHuffman))} %`}
                    </strong>
                  </article>
                  <article>
                    <span>vs. RLE + Huffman</span>
                    <strong>
                      {versusRle === null
                        ? 'Ejecuta RLE + Huffman'
                        : `${versusRle <= 0 ? '−' : '+'}${formatPercent(Math.abs(versusRle))} %`}
                    </strong>
                  </article>
                </div>
              </>
            ) : (
              <div className="adaptive-inline-note">
                <strong>Prueba LZ77 + Huffman</strong>
                <span>
                  Ejecuta esta estrategia para ver coincidencias, bytes referenciados y tamaño final.
                </span>
              </div>
            )}

            <div className="adaptive-impact">
              <div>
                <span>Qué cambia frente a RLE</span>
                <strong>La repetición ya no tiene que ser consecutiva</strong>
              </div>
              <p>
                RLE funciona bien con AAAAAA. LZ77 puede aprovechar estructuras como ABC...ABC,
                palabras, registros, fragmentos JSON o patrones binarios repetidos dentro de una
                ventana de 32 KiB.
              </p>
            </div>

            <p className="next-step-note">
              BitLab ya compara codecs y parámetros, y el benchmark integrado permite medir
              el sistema final sobre varios archivos y exportar evidencia reproducible en CSV o JSON.
            </p>
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
