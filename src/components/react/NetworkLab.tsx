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
  if (ms > 0 && ms < 0.01) return '< 0,01 ms';
  return ms >= 1000 ? `${number.format(ms / 1000)} s` : `${number.format(ms)} ms`;
}

function TimeBar({ label, time, scale }: {
  label: string;
  time: ReturnType<typeof estimateTransfer> | null;
  scale: number;
}) {
  return (
    <div className="network-time">
      <div className="network-time-label"><span>{label}</span><strong>{time ? duration(time.totalMs) : 'Sin estimación'}</strong></div>
      <div className="network-time-track" aria-hidden="true">
        {time && scale > 0 && <>
          <span className="network-time-latency" style={{ width: `${(time.totalMs - time.transmissionMs) / scale * 100}%` }} />
          <span className="network-time-transfer" style={{ width: `${time.transmissionMs / scale * 100}%` }} />
        </>}
      </div>
      {time && <small>{duration(time.totalMs - time.transmissionMs)} de latencia · {duration(time.transmissionMs)} de transferencia</small>}
    </div>
  );
}

export default function NetworkLab({ file, containerBytes, selectedCodecLabel }: Props) {
  const [signal, setSignal] = useState<FileSignal | null>(null);
  const [efficiency, setEfficiency] = useState(80);
  const [rates, setRates] = useState(() => Object.fromEntries(NETWORK_PROFILES.map((profile) => [profile.generation, String(profile.throughputMbps)])));
  const [latencies, setLatencies] = useState(() => Object.fromEntries(NETWORK_PROFILES.map((profile) => [profile.generation, String(profile.latencyMs)])));

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

  if (!file) {
    return (
      <section className="network-lab network-lab-empty" id="redes" aria-labelledby="network-title">
        <div className="network-intro">
          <div>
            <h3 id="network-title">Simula el envío por 5G y 6G</h3>
            <p>Carga un archivo o elige un ejemplo. Después podrás comparar el tiempo estimado de envío del original y del contenedor .bitlab.</p>
          </div>
        </div>
        <div className="network-links">
          <a href="#archivo">Elegir archivo</a>
          <a href="#control-errores">Probar el canal con texto</a>
        </div>
      </section>
    );
  }

  const estimates = NETWORK_PROFILES.map((profile) => {
    const rate = Number(rates[profile.generation]);
    const latency = Number(latencies[profile.generation]);
    const valid = rate >= 0.1 && rate <= 100000 && latencies[profile.generation] !== '' && latency >= 0 && latency <= 100000;
    const original = valid ? estimateTransfer(file.size, rate, latency, efficiency) : null;
    const compressed = valid && containerBytes !== null ? estimateTransfer(containerBytes, rate, latency, efficiency) : null;
    return { ...profile, original, compressed, valid };
  });
  const scale = Math.max(...estimates.flatMap(({ original, compressed }) => [original?.totalMs ?? 0, compressed?.totalMs ?? 0]));

  return (
    <section className="network-lab" id="redes" aria-labelledby="network-title">
      <div className="network-intro">
        <div>
          <h3 id="network-title">Laboratorio de envío 5G / 6G</h3>
          <p>Simula cuánto tardaría en transmitirse el archivo cargado. Compara los bytes originales con el contenedor comprimido cuando esté disponible.</p>
        </div>
        <a className="network-jump" href="#control-errores">Experimentar con errores de bit</a>
      </div>

      <div className="network-source">
        <div><span>Archivo de origen</span><strong>{file.name}</strong></div>
        <div><span>Tamaño original</span><strong>{number.format(file.size)} bytes</strong></div>
        <div><span>Contenedor .bitlab</span><strong>{containerBytes === null ? 'Pendiente de compresión' : `${number.format(containerBytes)} bytes`}</strong></div>
      </div>

      <div className="network-controls">
        <label htmlFor="network-efficiency">Eficiencia útil del enlace <strong>{efficiency} %</strong></label>
        <input id="network-efficiency" type="range" min="10" max="100" step="5" value={efficiency} onChange={(event) => setEfficiency(Number(event.target.value))} />
        <p>El modelo aplica esta eficiencia a la velocidad configurada. Incluye una latencia fija por transferencia; no modela congestión, retransmisiones ni cobertura.</p>
      </div>

      <div className="network-chart-heading">
        <h4>Tiempo total de envío</h4>
        {scale > 0 && <p>Escala común de 0 a {duration(scale)}</p>}
        <div className="network-chart-legend"><span>Latencia fija</span><span>Transferencia de datos</span></div>
      </div>
      <div className="network-comparison">
        {estimates.map(({ generation, note, original, compressed, valid }) => {
          const saved = original && compressed ? original.totalMs - compressed.totalMs : null;
          return (
            <article className="network-profile" key={generation}>
              <div className="network-profile-head"><h5>{generation}</h5><small>{note}</small></div>
              <div className="network-times">
                <TimeBar label="Archivo original" time={original} scale={scale} />
                <TimeBar label="Contenedor .bitlab" time={compressed} scale={scale} />
              </div>
              <p className="network-outcome">
                {!valid ? 'Corrige los parámetros para calcular el tiempo.' : saved === null ? 'Comprime el archivo para comparar ambos envíos.' : saved > 0 ? `${duration(saved)} menos al transmitir .bitlab` : saved < 0 ? `${duration(-saved)} más al transmitir .bitlab` : 'Mismo tiempo estimado para ambos tamaños'}
              </p>
              <fieldset className="network-profile-inputs">
                <legend>Parámetros de {generation}</legend>
                <label>Velocidad (Mb/s)<input type="number" min="0.1" max="100000" step="any" value={rates[generation]} onChange={(event) => setRates((current) => ({ ...current, [generation]: event.target.value }))} /></label>
                <label>Latencia (ms)<input type="number" min="0" max="100000" step="any" value={latencies[generation]} onChange={(event) => setLatencies((current) => ({ ...current, [generation]: event.target.value }))} /></label>
              </fieldset>
              {!valid && <p className="network-invalid" role="alert">Indica una velocidad entre 0,1 y 100.000 Mb/s y una latencia entre 0 y 100.000 ms.</p>}
            </article>
          );
        })}
      </div>

      <div className="decision-panel">
        <div>
          <h4>Selector inspirado en IA</h4>
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
