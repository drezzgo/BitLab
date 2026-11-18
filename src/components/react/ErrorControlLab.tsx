import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ERROR_CODES, type ErrorCode } from '../../core/network/error-codes';
import { MAX_CHANNEL_BYTES, type ErrorSimulationOptions, type ErrorSimulationResult } from '../../core/network/error-simulation';
import type { BitLabWorkerResult } from '../../workers/protocol';
import ChannelReadout, { ChannelFlow, channelInteger, channelRunDescription } from './ChannelReadout';
import { makeRequestId, startWorkerTask, type WorkerTask } from './worker-client';
import '../../styles/error-control.css';

type Source = 'text' | 'file' | 'container';
type WorkerResult = Extract<BitLabWorkerResult, { operation: 'simulate-channel' }>;
type SimulationJob = { task?: WorkerTask<WorkerResult> };

interface Props {
  file: File | null;
  containerBytes: Uint8Array | null;
  onRecoverContainer: (file: File) => void;
}

interface Run {
  source: Source;
  name: string;
  code: ErrorCode;
  probability: number;
  seed: number;
  result: ErrorSimulationResult;
}

const descriptors: Record<ErrorCode, string> = {
  parity: 'Añade un bit por trama de hasta 32 bytes. Detecta un número impar de inversiones.',
  crc16: 'Añade 16 bits por trama de hasta 32 bytes. Detecta errores mediante un resto polinómico.',
  hamming74: 'Añade tres bits por cada cuatro de datos. Corrige un bit por bloque. Con dos o más puede corregir una posición equivocada.',
};

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { ignoreBOM: true });

export default function ErrorControlLab({ file, containerBytes, onRecoverContainer }: Props) {
  const [chosenSource, setChosenSource] = useState<Source | null>(null);
  const [input, setInput] = useState('BitLab · Control de errores');
  const [code, setCode] = useState<ErrorCode>('hamming74');
  const [probability, setProbability] = useState('2');
  const [seed, setSeed] = useState('42');
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const job = useRef<SimulationJob | null>(null);

  useEffect(() => () => {
    job.current?.task?.cancel();
    job.current = null;
  }, []);

  const source = chosenSource ?? (containerBytes ? 'container' : file ? 'file' : 'text');
  const name = source === 'container' ? `${file?.name ?? 'resultado'}.bitlab` : file?.name ?? '';
  const sourceSize = source === 'file' ? file?.size : containerBytes?.length;
  const sourceMissing = source !== 'text' && sourceSize === undefined;
  const sizeInvalid = sourceSize !== undefined && source !== 'text' && (sourceSize === 0 || sourceSize > MAX_CHANNEL_BYTES);

  async function runTransmission(
    runSource: Source,
    runName: string,
    options: ErrorSimulationOptions,
    readBytes: () => ArrayBuffer | Promise<ArrayBuffer>,
  ) {
    if (job.current) return;
    const current: SimulationJob = {};
    job.current = current;
    setBusy(true);
    setError('');
    setRun(null);
    try {
      const bytes = await readBytes();
      if (job.current !== current) return;
      current.task = startWorkerTask<WorkerResult>({
        id: makeRequestId('channel'),
        operation: 'simulate-channel',
        bytes,
        options,
      }, [bytes]);
      const { simulation } = await current.task.promise;
      if (job.current === current) setRun({ ...options, source: runSource, name: runName, result: simulation });
    } catch (cause) {
      if (job.current === current) setError(cause instanceof Error ? cause.message : 'No se pudo simular el canal.');
    } finally {
      if (job.current === current) {
        job.current = null;
        setBusy(false);
      }
    }
  }

  function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sourceMissing || sizeInvalid) return;
    const options = { code, probability: Number(probability) / 100, seed: Number(seed) };
    if (source === 'text') void runTransmission(source, 'Texto UTF-8', options, () => encoder.encode(input).buffer);
    if (source === 'file' && file) void runTransmission(source, name, options, () => file.arrayBuffer());
    if (source === 'container' && containerBytes) {
      void runTransmission(source, name, options, () => Uint8Array.from(containerBytes).buffer);
    }
  }

  function cancel() {
    job.current?.task?.cancel();
    job.current = null;
    setBusy(false);
  }

  function simulateExample(exampleSeed: '1' | '3') {
    setChosenSource('text');
    setInput('Z');
    setCode('hamming74');
    setProbability('10');
    setSeed(exampleSeed);
    void runTransmission('text', 'Texto UTF-8', { code: 'hamming74', probability: 0.1, seed: Number(exampleSeed) }, () => encoder.encode('Z').buffer);
  }

  const metrics = run?.result;
  return (
    <section className="channel-lab" id="control-errores" aria-labelledby="channel-title">
      <header className="channel-heading">
        <h3 id="channel-title">Control de errores del canal</h3>
        <p>Codifica los datos, introduce inversiones de bits y comprueba qué pudo detectar o corregir el receptor.</p>
      </header>

      <div className="channel-workspace">
        <form className="channel-form" onSubmit={simulate}>
          <fieldset className="channel-fields" disabled={busy}>
            <legend>Configurar la transmisión</legend>
            <label>Datos de entrada
              <select value={source} onChange={(event) => setChosenSource(event.target.value as Source)}>
                <option value="text">Texto UTF-8</option>
                <option value="file" disabled={!file}>Archivo original</option>
                <option value="container" disabled={!containerBytes}>Contenedor .bitlab</option>
              </select>
            </label>
            <label>Algoritmo
              <select value={code} aria-describedby="channel-code-help" onChange={(event) => setCode(event.target.value as ErrorCode)}>
                {Object.entries(ERROR_CODES).map(([id, option]) => <option key={id} value={id}>{option.label}</option>)}
              </select>
            </label>
            {source === 'text' && <label className="channel-wide">Texto a transmitir
              <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} maxLength={8192} required />
            </label>}
            {source !== 'text' && <p className="channel-wide channel-help">
              {sourceSize === undefined ? 'Carga un archivo o genera un .bitlab en el compresor.' : `${name} · ${channelInteger.format(sourceSize)} bytes`}
              {sizeInvalid && ' La simulación requiere una entrada de 1 byte a 1 MiB.'}
            </p>}
            <p className="channel-wide channel-help" id="channel-code-help">{descriptors[code]}</p>
            <div className="channel-field-pair channel-wide">
              <label>Error por bit (%)
                <input type="number" min="0" max="100" step="any" inputMode="decimal" required value={probability} onChange={(event) => setProbability(event.target.value)} aria-describedby="channel-noise-help" />
              </label>
              <label>Semilla
                <input type="number" min="0" max="4294967295" step="1" inputMode="numeric" required value={seed} onChange={(event) => setSeed(event.target.value)} aria-describedby="channel-noise-help" />
              </label>
            </div>
          </fieldset>
          <p className="channel-help" id="channel-noise-help">El canal aplica esta probabilidad a cada bit. La semilla permite repetir el mismo experimento.</p>
          <div className="channel-actions">
            <button className="primary-button" type="submit" disabled={busy || sourceMissing || sizeInvalid}>Simular transmisión</button>
            {busy && <button className="secondary-button" type="button" onClick={cancel}>Cancelar</button>}
          </div>
          {error && <p className="error-banner" role="alert">{error}</p>}
        </form>

        <div className="channel-monitor">
          <ChannelFlow />
          <div className="channel-examples">
            <p>Ejemplos de Hamming</p>
            <button className="ghost-button" type="button" disabled={busy} onClick={() => simulateExample('1')}>Simular un bit invertido</button>
            <button className="ghost-button" type="button" disabled={busy} onClick={() => simulateExample('3')}>Simular dos bits en un bloque</button>
          </div>
          <p className="channel-status" data-outcome={metrics ? (metrics.residualBitErrors === 0 ? 'match' : 'changed') : undefined} role="status">
            {busy ? 'Simulando la transmisión…' : metrics && (metrics.residualBitErrors === 0
              ? 'Los datos recuperados coinciden con el origen.'
              : metrics.residualBitErrors === 1
                ? 'Queda un bit diferente en los datos recuperados.'
                : `Quedan ${channelInteger.format(metrics.residualBitErrors)} bits diferentes en los datos recuperados.`)}
          </p>
          {!run && !busy && <div className="channel-empty">
            <h4>¿Qué recuperará el receptor?</h4>
            <p>Simula la transmisión para ver una trama paso a paso y medir cuántos errores llegaron a los datos recuperados.</p>
          </div>}
          {run && metrics && <div className="channel-results">
            <ChannelReadout result={metrics} code={run.code} description={channelRunDescription(run.name, run.code, run.probability, run.seed)} />
            {run.source === 'text' && <p className="channel-text">Texto recuperado <samp>{decoder.decode(metrics.recovered)}</samp></p>}
            {run.source === 'container' && metrics.residualBitErrors === 0 &&
              <button className="secondary-button" type="button" onClick={() => onRecoverContainer(
                new File([metrics.recovered], run.name, { type: 'application/x-bitlab' }),
              )}>Abrir .bitlab recibido en recuperación</button>}
          </div>}
        </div>
      </div>

      <details className="channel-reference">
        <summary>Cómo se relaciona este laboratorio con 5G y 6G</summary>
        <p>En <a href="https://www.etsi.org/deliver/etsi_ts/138200_138299/138212/19.02.00_60/ts_138212v190200p.pdf">5G NR (3GPP TS 38.212)</a>, LDPC protege los canales compartidos de datos UL-SCH y DL-SCH. Polar se usa en BCH y DCI, y en determinados casos de UCI. BitLab ejecuta paridad, CRC-16 y Hamming con tramas didácticas. Su CRC-16 comparte el polinomio de la especificación NR.</p>
        <p>Para <a href="https://www.itu.int/rec/R-REC-M.2160-0-202311-I">6G (marco ITU-R IMT-2030)</a>, el marco define objetivos y escenarios. Las propuestas de interfaz de radio siguen un <a href="https://www.itu.int/en/ITU-R/study-groups/rsg5/rwp5d/IMT-2030/Pages/submission-eval.aspx">proceso de evaluación</a>. Los resultados del laboratorio corresponden al canal binario simulado.</p>
      </details>
    </section>
  );
}
