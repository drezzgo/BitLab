import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { createBlendy, type Blendy } from 'blendy';
import { calculateSegmentation } from '../../core/bits';
import { BITLAB_FIXED_HEADER_BYTES } from '../../core/container';
import { INTEGRITY_ENVELOPE_OVERHEAD_BYTES } from '../../core/integrity';

interface CalculationAuditCardsProps {
  file: File | null;
  wordSizeBits: number;
  containerSizeBytes?: number | null;
  idPrefix?: string;
  title?: string;
}

interface AuditCard {
  id: string;
  step: string;
  title: string;
  value: string;
  summary: string;
  detail: ReactNode;
}

const integerFormatter = new Intl.NumberFormat('es-CO');
const textEncoder = new TextEncoder();

function integer(value: number): string {
  return integerFormatter.format(value);
}

export default function CalculationAuditCards({
  file,
  wordSizeBits,
  containerSizeBytes = null,
  idPrefix = 'bitlab-audit',
  title = '¿De dónde salen estos números?',
}: CalculationAuditCardsProps) {
  const blendy = useRef<Blendy | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const cards = useMemo<AuditCard[]>(() => {
    if (!file) return [];

    const segmentation = calculateSegmentation(file.size, wordSizeBits);
    const { originalBitLength, symbolCount, paddingBits } = segmentation;
    const mime = file.type || 'application/octet-stream';

    const items: AuditCard[] = [
      {
        id: `${idPrefix}-bytes`,
        step: '01',
        title: 'Tamaño original',
        value: `${integer(file.size)} bytes`,
        summary: 'Es la cantidad exacta de bytes que el navegador recibe del archivo.',
        detail: (
          <div className="audit-detail-stack">
            <p>
              BitLab obtiene este valor desde <code>File.size</code>. No necesita interpretar si el
              archivo es una imagen, PDF, ZIP o texto.
            </p>
            <div className="audit-check-box">
              <strong>Cómo comprobarlo en Windows</strong>
              <ol>
                <li>Busca el archivo original.</li>
                <li>Clic derecho → <b>Propiedades</b>.</li>
                <li>Usa el valor de <b>Tamaño</b>, no “Tamaño en disco”.</li>
              </ol>
              <code>(Get-Item ".\\{file.name}").Length</code>
            </div>
          </div>
        ),
      },
      {
        id: `${idPrefix}-bits`,
        step: '02',
        title: 'Bits originales',
        value: `${integer(originalBitLength)} bits`,
        summary: 'Cada byte contiene exactamente 8 bits.',
        detail: (
          <div className="audit-detail-stack">
            <div className="formula-card">
              <span>Fórmula</span>
              <strong>bits = bytes × 8</strong>
            </div>
            <div className="substitution-card">
              <span>Sustitución</span>
              <strong>
                {integer(file.size)} × 8 = {integer(originalBitLength)} bits
              </strong>
            </div>
            <p>
              Esta conversión es exacta. Aquí no se está estimando el tamaño ni convirtiendo el
              archivo a texto.
            </p>
          </div>
        ),
      },
      {
        id: `${idPrefix}-words`,
        step: '03',
        title: 'Palabras binarias',
        value: integer(symbolCount),
        summary: `Agrupamos el flujo en palabras lógicas de ${wordSizeBits} bits.`,
        detail: (
          <div className="audit-detail-stack">
            <div className="formula-card">
              <span>Fórmula</span>
              <strong>palabras = ⌈bits originales / N⌉</strong>
            </div>
            <div className="substitution-card">
              <span>Sustitución</span>
              <strong>
                ⌈{integer(originalBitLength)} / {integer(wordSizeBits)}⌉ = {integer(symbolCount)} palabras
              </strong>
            </div>
            <p>
              Usamos techo matemático porque si el último grupo queda incompleto sigue siendo una
              palabra lógica y se completa temporalmente con padding.
            </p>
          </div>
        ),
      },
      {
        id: `${idPrefix}-padding`,
        step: '04',
        title: 'Padding lógico',
        value: `${integer(paddingBits)} bits`,
        summary: 'Son los bits de relleno necesarios únicamente para completar la última palabra.',
        detail: (
          <div className="audit-detail-stack">
            <div className="formula-card">
              <span>Fórmula</span>
              <strong>padding = palabras × N − bits originales</strong>
            </div>
            <div className="substitution-card">
              <span>Sustitución</span>
              <strong>
                {integer(symbolCount)} × {integer(wordSizeBits)} − {integer(originalBitLength)} = {integer(paddingBits)} bits
              </strong>
            </div>
            <p>
              El padding no pertenece al archivo original. BitLab conserva cuántos bits fueron
              añadidos para poder descartarlos durante la reconstrucción.
            </p>
          </div>
        ),
      },
    ];

    if (containerSizeBytes !== null) {
      const nameBytes = textEncoder.encode(file.name).length;
      const mimeBytes = textEncoder.encode(mime).length;
      const codecMetadataBytes = 0;
      const integrityMetadataBytes = INTEGRITY_ENVELOPE_OVERHEAD_BYTES;
      const expected =
        BITLAB_FIXED_HEADER_BYTES +
        file.size +
        nameBytes +
        mimeBytes +
        codecMetadataBytes +
        integrityMetadataBytes;
      const overhead = containerSizeBytes - file.size;

      items.push({
        id: `${idPrefix}-container`,
        step: '05',
        title: 'Tamaño del .bitlab',
        value: `${integer(containerSizeBytes)} bytes`,
        summary: `RAW conserva el payload y añade ${integer(overhead)} bytes de estructura y metadata.`,
        detail: (
          <div className="audit-detail-stack">
            <div className="container-breakdown">
              <div><span>Header fijo</span><strong>{BITLAB_FIXED_HEADER_BYTES} B</strong></div>
              <div><span>Nombre UTF-8</span><strong>{integer(nameBytes)} B</strong></div>
              <div><span>MIME UTF-8</span><strong>{integer(mimeBytes)} B</strong></div>
              <div><span>Metadata RAW</span><strong>{codecMetadataBytes} B</strong></div>
              <div><span>SHA-256 + envoltura</span><strong>{integrityMetadataBytes} B</strong></div>
              <div><span>Payload original</span><strong>{integer(file.size)} B</strong></div>
            </div>
            <div className="substitution-card">
              <span>Total esperado</span>
              <strong>
                {BITLAB_FIXED_HEADER_BYTES} + {integer(nameBytes)} + {integer(mimeBytes)} + 0 + {integrityMetadataBytes} + {integer(file.size)} = {integer(expected)} bytes
              </strong>
            </div>
            <p>
              Un editor de texto cuenta caracteres interpretados, no palabras binarias de BitLab.
              Para auditar un archivo binario compara su tamaño en bytes. RAW no comprime: el aumento
              corresponde al formato, el nombre, el MIME y la metadata de integridad.
            </p>
          </div>
        ),
      });
    }

    return items;
  }, [containerSizeBytes, file, idPrefix, wordSizeBits]);

  useEffect(() => {
    setMounted(true);
    blendy.current = createBlendy({ animation: 'dynamic' });
    return () => {
      blendy.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeId) return;

    blendy.current?.update();
    blendy.current?.toggle(activeId);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeActive();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId]);

  function closeActive() {
    if (!activeId) return;
    const closingId = activeId;

    blendy.current?.untoggle(closingId, () => {
      setActiveId((current) => (current === closingId ? null : current));
    });
  }

  if (!file || cards.length === 0) return null;

  const active = cards.find((card) => card.id === activeId) ?? null;

  return (
    <section className="audit-section" aria-labelledby={`${idPrefix}-title`}>
      <div className="audit-section-heading">
        <div>
          <p className="eyebrow">AUDITORÍA DEL CÁLCULO</p>
          <h3 id={`${idPrefix}-title`}>{title}</h3>
        </div>
        <p>Abre una tarjeta para ver la fórmula, la sustitución y cómo comprobar el dato.</p>
      </div>

      <div className="audit-card-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="audit-card"
            data-blendy-from={card.id}
            aria-haspopup="dialog"
            onClick={() => setActiveId(card.id)}
          >
            <div>
              <span className="audit-step">{card.step}</span>
              <strong className="audit-card-title">{card.title}</strong>
              <span className="audit-card-value">{card.value}</span>
              <span className="audit-card-summary">{card.summary}</span>
              <span className="audit-card-open">Ver cálculo ↗</span>
            </div>
          </button>
        ))}
      </div>

      {mounted && active && createPortal(
        <div
          className="audit-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeActive();
          }}
        >
          <section
            className="audit-dialog"
            data-blendy-to={active.id}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${active.id}-dialog-title`}
          >
            <div className="audit-dialog-shell">
              <header className="audit-dialog-header">
                <div>
                  <span className="audit-step">{active.step}</span>
                  <h3 id={`${active.id}-dialog-title`}>{active.title}</h3>
                  <strong>{active.value}</strong>
                </div>
                <button
                  ref={closeButtonRef}
                  className="audit-close-button"
                  type="button"
                  aria-label={`Cerrar detalle de ${active.title}`}
                  onClick={closeActive}
                >
                  ×
                </button>
              </header>
              <div className="audit-dialog-content">{active.detail}</div>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
