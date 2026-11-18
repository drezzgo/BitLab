import { useEffect, useState } from 'react';
import { estimateTransfer, inspectFileSignal, NETWORK_PROFILES, type FileSignal } from '../../core/network/simulation';

interface Props {
  file: File | null;
  containerBytes: number | null;
  selectedCodecLabel: string | null;
}

const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const codecNames: Record<FileSignal['recommendation'], string> = {
  raw: 'RAW', huffman: 'Huffman', 'rle-huffman': 'RLE + Huffman', 'lz77-huffman': 'LZ77 + Huffman',
};

function duration(ms: number) {
  return ms >= 1000 ? `${number.format(ms / 1000)} s` : `${number.format(ms)} ms`;
}

export default function NetworkLab({ file, containerBytes, selectedCodecLabel }: Props) {
  const [signal, setSignal] = useState<FileSignal | null>(null);
  const [efficiency, setEfficiency] = useState(80);
  const [rates, setRates] = useState<Record<string, number>>({ '5G': 100, '6G': 1000 });
  const [latencies, setLatencies] = useState<Record<string, number>>({ '5G': 20, '6G': 5 });

  useEffect(() => {
    let active = true;
    setSignal(null);
    if (file) {
      file.slice(0, 65_536).arrayBuffer().then((buffer) => {
        if (active) setSignal(inspectFileSignal(new Uint8Array(buffer)));
      }).catch(() => { if (active) setSignal(null); });
    }
    return () => { active = false; };
  }, [file]);

  return (
    <section className="network-lab" id="redes" aria-labelledby="network-title">
      <div className="network-intro">
        <div>
          <h2 id="network-title">Laboratorio de envío 5G / 6G</h2>
          <p>Simula cuánto tardaría en transmitirse el archivo cargado. Compara los bytes originales con el contenedor comprimido cuando esté disponible.</p>
        </div>
        <span className="network-sim-label">SIMULACIÓN LOCAL</span>
      </div>

      <div className="network-source">
        <div><span>Archivo de origen</span><strong>{file ? file.name : 'Carga un archivo en el compresor'}</strong></div>
        <div><span>Tamaño original</span><strong>{file ? number.format(file.size) : '—'} bytes</strong></div>
        <div><span>Contenedor .bitlab</span><strong>{containerBytes === null ? 'Pendiente de compresión' : `${number.format(containerBytes)} bytes`}</strong></div>
      </div>

      <div className="network-controls">
        <label htmlFor="network-efficiency">Eficiencia útil del enlace <strong>{efficiency} %</strong></label>
        <input id="network-efficiency" type="range" min="10" max="100" step="5" value={efficiency} onChange={(event) => setEfficiency(Number(event.target.value))} />
        <p>El modelo aplica esta eficiencia a la velocidad configurada. Incluye una latencia fija por transferencia; no modela congestión, retransmisiones ni cobertura.</p>
      </div>

      <div className="network-comparison">
        {NETWORK_PROFILES.map((profile) => {
          const rate = rates[profile.generation];
          const latency = latencies[profile.generation];
          const valid = Number.isFinite(rate) && rate > 0 && Number.isFinite(latency) && latency >= 0;
          const original = file && valid ? estimateTransfer(file.size, rate, latency, efficiency) : null;
          const compressed = containerBytes !== null && valid ? estimateTransfer(containerBytes, rate, latency, efficiency) : null;
          const saved = original && compressed ? original.totalMs - compressed.totalMs : null;
          return (
            <article className="network-profile" key={profile.generation}>
              <div className="network-profile-head"><h3>{profile.generation}</h3><small>{profile.note}</small></div>
              <div className="network-profile-inputs">
                <label>Velocidad (Mb/s)<input type="number" min="0.1" max="100000" step="any" value={rate} onChange={(event) => setRates((current) => ({ ...current, [profile.generation]: Number(event.target.value) }))} /></label>
                <label>Latencia (ms)<input type="number" min="0" max="100000" step="any" value={latency} onChange={(event) => setLatencies((current) => ({ ...current, [profile.generation]: Number(event.target.value) }))} /></label>
              </div>
              {!valid && <p className="network-invalid" role="alert">Ingresa una velocidad mayor que cero y una latencia no negativa.</p>}
              <div className="network-times">
                <div><span>Original</span><strong>{original ? duration(original.totalMs) : '—'}</strong></div>
                <div><span>.bitlab</span><strong>{compressed ? duration(compressed.totalMs) : '—'}</strong></div>
              </div>
              <p className="network-outcome">{saved === null ? 'Comprime el archivo para comparar ambos envíos.' : saved > 0 ? `${duration(saved)} menos al transmitir .bitlab` : saved < 0 ? `${duration(-saved)} más al transmitir .bitlab` : 'Mismo tiempo estimado para ambos tamaños'}</p>
            </article>
          );
        })}
      </div>

      <div className="decision-panel">
        <div>
          <h3>Selector inspirado en IA</h3>
          <p>Árbol de decisión didáctico basado en una muestra de hasta 64 KiB. Recomienda qué codec probar; la elección automática real la hace BitLab midiendo el tamaño de cada contenedor.</p>
          <p className="decision-recovery">Al recuperar, BitLab lee del contenedor el codec usado, reconstruye los bytes y verifica SHA-256 cuando está disponible.</p>
        </div>
        {file && signal ? (
          <div className="decision-evidence">
            <div><span>Entropía de bytes</span><strong>{number.format(signal.entropyBitsPerByte)} / 8 bits</strong></div>
            <div><span>Repetición adyacente</span><strong>{number.format(signal.adjacentRepeatPercent)} %</strong></div>
            <div><span>Muestra analizada</span><strong>{number.format(signal.sampledBytes)} bytes</strong></div>
            <div><span>Sugerencia del árbol</span><strong>{codecNames[signal.recommendation]}</strong></div>
            <p>{signal.reason}</p>
            {selectedCodecLabel && <p className="decision-measured">Resultado medido: <strong>{selectedCodecLabel}</strong>. La recomendación puede diferir porque el tamaño final incluye metadatos y parámetros.</p>}
          </div>
        ) : <p className="decision-empty">Carga un archivo para ver las señales y la sugerencia.</p>}
      </div>
      <p className="network-disclaimer">5G y 6G son perfiles configurables de laboratorio. 6G representa un escenario hipotético; esta página no establece una conexión de red ni envía el archivo.</p>
    </section>
  );
}
