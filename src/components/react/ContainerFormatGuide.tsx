import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { createBlendy, type Blendy } from 'blendy';

interface GuideCard {
  id: string;
  index: string;
  title: string;
  summary: string;
  content: ReactNode;
}

const cards: GuideCard[] = [
  {
    id: 'bitlab-format-signature',
    index: '01',
    title: 'Definimos una firma',
    summary: 'Los primeros bytes identifican nuestro formato antes de mirar la extensión.',
    content: (
      <>
        <p>
          La extensión <code>.bitlab</code> es una convención que elegimos para nuestros archivos, pero
          el reconocimiento real comienza con una firma binaria: <code>BTLB</code>.
        </p>
        <div className="code-explain">
          <span>src/core/container/types.ts</span>
          <code>BITLAB_MAGIC_TEXT = 'BTLB'</code>
        </div>
        <p>
          Registrar una asociación de archivos en Windows sería otro problema distinto. Para esta aplicación
          basta con definir el formato, su extensión y un parser capaz de reconocer su firma.
        </p>
      </>
    ),
  },
  {
    id: 'bitlab-format-header',
    index: '02',
    title: 'Escribimos el header',
    summary: 'Guardamos versión, codec, ancho de palabra, padding y tamaños en posiciones conocidas.',
    content: (
      <>
        <p>
          <code>encodeBitLabContainerParts()</code> reserva 36 bytes para un header fijo y usa <code>DataView</code>
          para escribir cada campo con un tamaño y posición definidos.
        </p>
        <div className="code-explain">
          <span>src/core/container/format.ts</span>
          <code>setUint8 · setUint16 · setUint32 · setBigUint64</code>
        </div>
        <p>
          Los tamaños que pueden crecer se guardan como enteros de 64 bits mediante <code>BigInt</code>.
          Así no dependemos de la precisión limitada de <code>Number</code> para esos campos.
        </p>
      </>
    ),
  },
  {
    id: 'bitlab-format-payload',
    index: '03',
    title: 'Adjuntamos metadata y payload',
    summary: 'Después del header se escriben nombre, MIME, metadata del codec y los bytes del archivo.',
    content: (
      <>
        <p>El archivo queda estructurado en este orden:</p>
        <div className="format-stack" aria-label="Estructura del contenedor BitLab">
          <span>HEADER · 36 B</span>
          <span>NOMBRE UTF-8</span>
          <span>MIME UTF-8</span>
          <span>METADATA · SHA-256 + CODEC</span>
          <span>PAYLOAD</span>
        </div>
        <p>
          La metadata nueva comienza con una envoltura identificada por <code>BIMD</code> que guarda
          SHA-256 del archivo original y, a continuación, la metadata propia del codec. RAW no necesita
          codebook; Huffman guarda allí su codebook canónico. El payload contiene los bytes RAW o el flujo
          de bits Huffman.
        </p>
      </>
    ),
  },
  {
    id: 'bitlab-format-parser',
    index: '04',
    title: 'El parser lo recupera',
    summary: 'La extensión no basta: validamos firma, versión, longitudes y coherencia antes de restaurar.',
    content: (
      <>
        <p>
          <code>parseBitLabContainer()</code> comprueba la firma, versión, codec, padding y longitud total.
          Luego <code>restoreBitLabContainer()</code> lee el identificador del codec: RAW copia el payload;
          Huffman reconstruye los símbolos usando su codebook. Finalmente calculamos SHA-256 sobre los bytes
          restaurados y, cuando el contenedor incluye un digest esperado, comprobamos si coincide.
        </p>
        <div className="code-explain">
          <span>src/core/container/format.ts</span>
          <code>parseBitLabContainer() → restoreBitLabContainer()</code>
        </div>
        <p>
          Esta validación es la razón por la que BitLab puede rechazar un archivo truncado aunque alguien
          simplemente le cambie la extensión a <code>.bitlab</code>.
        </p>
      </>
    ),
  },
];

export default function ContainerFormatGuide() {
  const blendy = useRef<Blendy | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    blendy.current = createBlendy({ animation: 'dynamic' });
    return () => { blendy.current = null; };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    blendy.current?.update();
    blendy.current?.toggle(activeId);
  }, [activeId]);

  function close() {
    if (!activeId) return;
    const id = activeId;
    blendy.current?.untoggle(id, () => setActiveId((current) => current === id ? null : current));
  }

  const active = cards.find((card) => card.id === activeId) ?? null;

  return (
    <section className="format-guide" id="formato-bitlab" aria-labelledby="format-guide-title">
      <div className="format-guide-heading">
        <p className="eyebrow">FORMATO PROPIO</p>
        <h2 id="format-guide-title">¿Cómo creamos un archivo .bitlab?</h2>
        <p>
          No inventamos una “extensión mágica”: definimos una estructura binaria, una firma y código capaz
          de escribirla y validarla. Abre cada tarjeta para recorrer la implementación.
        </p>
      </div>
      <div className="format-guide-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="format-guide-card"
            data-blendy-from={card.id}
            onClick={() => setActiveId(card.id)}
          >
            <span>{card.index}</span>
            <strong>{card.title}</strong>
            <p>{card.summary}</p>
            <small>Ver implementación ↗</small>
          </button>
        ))}
      </div>

      {mounted && active && createPortal(
        <div className="format-dialog-backdrop" onMouseDown={(event) => {
          if (event.currentTarget === event.target) close();
        }}>
          <section className="format-dialog" data-blendy-to={active.id} role="dialog" aria-modal="true">
            <header>
              <div>
                <span>{active.index}</span>
                <h3>{active.title}</h3>
              </div>
              <button type="button" onClick={close} aria-label="Cerrar">×</button>
            </header>
            <div className="format-dialog-content">{active.content}</div>
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
