import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createBlendy, type Blendy } from 'blendy';

const CARD_ID = 'bitlab-compact-format';

export default function CompactFormatCard() {
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

  return (
    <section id="formato-bitlab">
      <button
        type="button"
        className="adaptive-feature-card"
        data-blendy-from={CARD_ID}
        onClick={() => setOpen(true)}
      >
        <div>
          <span className="adaptive-feature-index">.bitlab</span>
          <strong>Cómo guardamos el resultado</strong>
          <p>
            La firma, el codec y la metadata necesaria para recuperar exactamente el archivo
            siguen ahí, pero sin competir visualmente con el compresor.
          </p>
        </div>
        <div className="adaptive-feature-state">
          <span>BTLB · v1</span>
          <small>Ver estructura ↗</small>
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
            className="format-dialog adaptive-dialog"
            data-blendy-to={CARD_ID}
            role="dialog"
            aria-modal="true"
            aria-labelledby="format-compact-title"
          >
            <header>
              <div>
                <span>Formato .bitlab</span>
                <h3 id="format-compact-title">Lo necesario para volver al archivo original.</h3>
              </div>
              <button type="button" onClick={close} aria-label="Cerrar">×</button>
            </header>

            <div className="adaptive-format-flow" aria-label="Estructura resumida de .bitlab">
              <span>BTLB</span>
              <span>versión</span>
              <span>codecId</span>
              <span>N + padding</span>
              <span>tamaño original</span>
              <span>nombre + MIME</span>
              <span>metadata + SHA-256</span>
              <span>payload</span>
            </div>

            <div className="adaptive-format-copy">
              <article>
                <span>Codecs actuales</span>
                <strong>Un identificador, una forma de reconstruir</strong>
                <div className="codec-id-list">
                  <code>0 · RAW</code>
                  <code>1 · Huffman</code>
                  <code>2 · RLE + Huffman</code>
                  <code>3 · LZ77 + Huffman</code>
                </div>
              </article>

              <article>
                <span>Por qué se conserva</span>
                <strong>La compresión debe ser reversible</strong>
                <p>
                  El decoder lee el <code>codecId</code>, encuentra su implementación en el registry
                  y utiliza la metadata específica para reconstruir los mismos bytes.
                </p>
              </article>
            </div>

            <div className="adaptive-impact">
              <div>
                <span>Comparación real</span>
                <strong>Cuenta el archivo completo</strong>
              </div>
              <p>
                No elegimos un método por el payload aislado. La comparación útil incluye payload,
                codebook, metadata, integridad y header del contenedor.
              </p>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
