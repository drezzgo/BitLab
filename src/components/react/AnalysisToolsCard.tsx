import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createBlendy, type Blendy } from 'blendy';
import type { HuffmanContainerMetrics } from '../../core/container';
import type { EncodeCodec } from '../../workers/protocol';
import CalculationAuditCards from './CalculationAuditCards';
import CodingMetricsPanel from './CodingMetricsPanel';
import SourceStatisticsPanel from './SourceStatisticsPanel';
import WordSizeComparator from './WordSizeComparator';

interface Props {
  file: File | null;
  wordSizeBits: number;
  codec: EncodeCodec;
  huffmanMetrics: HuffmanContainerMetrics | null;
  containerSizeBytes: number | null;
}

type ToolId = 'statistics' | 'huffman' | 'comparator' | 'audit';

const TOOL_CARD_ID = 'bitlab-analysis-tools';

export default function AnalysisToolsCard({
  file,
  wordSizeBits,
  codec,
  huffmanMetrics,
  containerSizeBytes,
}: Props) {
  const blendy = useRef<Blendy | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<Record<ToolId, boolean>>({
    statistics: false,
    huffman: false,
    comparator: false,
    audit: false,
  });

  useEffect(() => {
    setMounted(true);
    blendy.current = createBlendy({ animation: 'dynamic' });
    return () => { blendy.current = null; };
  }, []);

  useEffect(() => {
    if (!open) return;
    blendy.current?.update();
    blendy.current?.toggle(TOOL_CARD_ID);
  }, [open]);

  const activeCount = useMemo(
    () => Object.values(enabled).filter(Boolean).length,
    [enabled],
  );

  function toggle(id: ToolId) {
    setEnabled((current) => ({ ...current, [id]: !current[id] }));
  }

  function close() {
    blendy.current?.untoggle(TOOL_CARD_ID, () => setOpen(false));
  }

  return (
    <section className="adaptive-tool-section" id="analisis">
      <button
        type="button"
        className="adaptive-feature-card"
        data-blendy-from={TOOL_CARD_ID}
        onClick={() => setOpen(true)}
      >
        <div>
          <span className="adaptive-feature-index">Herramientas</span>
          <strong>Herramientas de análisis</strong>
          <p>
            Entropía, métricas Huffman, comparador de N y auditoría siguen disponibles,
            pero ya no interrumpen el flujo principal de compresión.
          </p>
        </div>
        <div className="adaptive-feature-state">
          <span>{activeCount} activas</span>
          <small>Configurar ↗</small>
        </div>
      </button>

      {enabled.audit && (
        <CalculationAuditCards
          file={file}
          wordSizeBits={wordSizeBits}
          containerSizeBytes={codec === 'raw' ? containerSizeBytes : null}
          idPrefix="adaptive-audit"
          title="Auditoría de cálculos"
        />
      )}

      {enabled.statistics && (
        <SourceStatisticsPanel file={file} wordSizeBits={wordSizeBits} />
      )}

      {enabled.huffman && huffmanMetrics && file && (
        <CodingMetricsPanel metrics={huffmanMetrics} originalSizeBytes={file.size} />
      )}

      {enabled.huffman && !huffmanMetrics && (
        <div className="adaptive-inline-note">
          <strong>Métricas Huffman</strong>
          <span>Selecciona y ejecuta Huffman para generar las métricas del baseline.</span>
        </div>
      )}

      {enabled.comparator && (
        <WordSizeComparator file={file} />
      )}

      {mounted && open && createPortal(
        <div
          className="format-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <section
            className="format-dialog adaptive-dialog"
            data-blendy-to={TOOL_CARD_ID}
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-tools-title"
          >
            <header>
              <div>
                <span>Análisis</span>
                <h3 id="analysis-tools-title">Muestra solo lo que necesitas.</h3>
              </div>
              <button type="button" onClick={close} aria-label="Cerrar">×</button>
            </header>

            <div className="adaptive-tool-picker">
              <label>
                <input
                  type="checkbox"
                  checked={enabled.statistics}
                  onChange={() => toggle('statistics')}
                />
                <span>
                  <strong>Estadística de la fuente</strong>
                  <small>Frecuencias, símbolos, entropía y distribución observada.</small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={enabled.huffman}
                  onChange={() => toggle('huffman')}
                />
                <span>
                  <strong>Métricas Huffman</strong>
                  <small>H(X), longitud media, eficiencia, payload, codebook y overhead.</small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={enabled.comparator}
                  onChange={() => toggle('comparator')}
                />
                <span>
                  <strong>Comparador de tamaño N</strong>
                  <small>Prueba el mismo archivo con distintos tamaños de palabra.</small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={enabled.audit}
                  onChange={() => toggle('audit')}
                />
                <span>
                  <strong>Auditoría de cálculos</strong>
                  <small>Revisa segmentación, padding y cómo se obtiene cada magnitud.</small>
                </span>
              </label>
            </div>

            <div className="adaptive-dialog-footer">
              <p>
                Estas herramientas explican el resultado; no modifican el archivo ni cambian
                la estrategia de compresión seleccionada.
              </p>
              <button type="button" className="primary-button" onClick={close}>
                Aplicar vista
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
