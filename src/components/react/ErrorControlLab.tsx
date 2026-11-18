import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ERROR_CODES, type ErrorCode } from '../../core/network/error-codes';
import { MAX_CHANNEL_BYTES, type ErrorSimulationResult, type FrameExample } from '../../core/network/error-simulation';
import type { BitLabWorkerResult } from '../../workers/protocol';
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

const integer = new Intl.NumberFormat('es-CO');
const percent = new Intl.NumberFormat('es-CO', { style: 'percent', maximumSignificantDigits: 4 });
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { ignoreBOM: true });

function countPair(count: number, total: number) {
  return `${integer.format(count)} / ${integer.format(total)}`;
}

function Bits({ value, reference }: { value: string; reference?: string }) {
  return (
    <code className="channel-bits">
      {value.match(/.{1,8}/g)?.map((group, groupIndex) => (
        <span className="channel-byte" key={groupIndex}>
          {Array.from(group, (bit, index) => reference && bit !== reference[groupIndex * 8 + index]
            ? <mark key={index}>{bit}</mark>
            : bit)}
        </span>
      ))}
    </code>
  );
}

function FrameDetails({ example, code }: { example: FrameExample; code: ErrorCode }) {
  let check = example.syndrome ? 'El receptor detectó una diferencia.' : 'La comprobación pasó.';
  if (code === 'hamming74' && example.syndrome) {
    check = example.flips === 1
      ? `Corrección verificada en la posición ${example.syndrome}.`
      : `El receptor invirtió la posición ${example.syndrome} por error.`;
  }
  return (
    <details className="channel-frame">
      <summary>
        Trama {example.index + 1} · {example.flips} {example.flips === 1 ? 'inversión' : 'inversiones'} · {example.payloadErrors} {example.payloadErrors === 1 ? 'error residual' : 'errores residuales'}
      </summary>
      <p>{check}{example.flips > 0 && !example.syndrome && ' El simulador observó errores que el receptor no detectó.'}</p>
      <dl>
        <div><dt>Datos de origen</dt><dd><Bits value={example.original} /></dd></div>
        <div><dt>Trama transmitida</dt><dd><Bits value={example.sent} /></dd></div>
        <div><dt>Trama recibida</dt><dd><Bits value={example.received} reference={example.sent} /></dd></div>
        <div><dt>Datos recuperados</dt><dd><Bits value={example.recovered} reference={example.original} /></dd></div>
      </dl>
    </details>
  );
}

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

  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (job.current || sourceMissing || sizeInvalid) return;
    const current: SimulationJob = {};
    job.current = current;
    setBusy(true);
    setError('');
    setRun(null);
    const options = { code, probability: Number(probability) / 100, seed: Number(seed) };
    try {
      let bytes: ArrayBuffer;
      if (source === 'text') bytes = encoder.encode(input).buffer;
      else if (source === 'file' && file) bytes = await file.arrayBuffer();
      else if (source === 'container' && containerBytes) bytes = Uint8Array.from(containerBytes).buffer;
      else return;
      if (job.current !== current) return;
      current.task = startWorkerTask<WorkerResult>({
        id: makeRequestId('channel'),
        operation: 'simulate-channel',
        bytes,
        options,
      }, [bytes]);
      const { simulation } = await current.task.promise;
      if (job.current === current) setRun({ ...options, source, name: source === 'text' ? 'Texto UTF-8' : name, result: simulation });
    } catch (cause) {
      if (job.current === current) setError(cause instanceof Error ? cause.message : 'No se pudo simular el canal.');
    } finally {
      if (job.current === current) {
        job.current = null;
        setBusy(false);
      }
    }
  }

  function cancel() {
    job.current?.task?.cancel();
    job.current = null;
    setBusy(false);
  }

  const metrics = run?.result;
  return (
    <section className="channel-lab" id="control-errores" aria-labelledby="channel-title">
      <header className="channel-heading">
        <h3 id="channel-title">Control de errores del canal</h3>
        <p>Codifica los datos, introduce inversiones de bits y comprueba qué pudo detectar o corregir el receptor.</p>
      </header>

      <form onSubmit={simulate}>
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
            {sourceSize === undefined ? 'Carga un archivo o genera un .bitlab en el compresor.' : `${name} · ${integer.format(sourceSize)} bytes`}
            {sizeInvalid && ' La simulación requiere una entrada de 1 byte a 1 MiB.'}
          </p>}
          <p className="channel-wide channel-help" id="channel-code-help">{descriptors[code]}</p>
          <label>Probabilidad de error por bit (%)
            <input type="number" min="0" max="100" step="any" inputMode="decimal" required value={probability} onChange={(event) => setProbability(event.target.value)} />
          </label>
          <label>Semilla reproducible
            <input type="number" min="0" max="4294967295" step="1" inputMode="numeric" required value={seed} onChange={(event) => setSeed(event.target.value)} />
          </label>
        </fieldset>
        <p className="channel-help">Cada bit se invierte de forma independiente con la misma probabilidad. Repite la entrada y los parámetros para obtener el mismo resultado.</p>
        <div className="channel-actions">
          <button className="primary-button" type="submit" disabled={busy || sourceMissing || sizeInvalid}>Simular transmisión</button>
          {busy && <button className="secondary-button" type="button" onClick={cancel}>Cancelar</button>}
        </div>
      </form>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <p className="channel-status" role="status">
        {busy ? 'Simulando la transmisión…' : metrics && (metrics.residualBitErrors === 0
          ? 'Los datos recuperados coinciden con el origen.'
          : `Los datos recuperados difieren en ${integer.format(metrics.residualBitErrors)} bits.`)}
      </p>

      {run && metrics && <div className="channel-results">
        <h4>Resultado de la transmisión</h4>
        <p className="channel-help">{run.name} · {ERROR_CODES[run.code].label} · Probabilidad {percent.format(run.probability)} · Semilla {integer.format(run.seed)}</p>
        <dl className="channel-metrics">
          <div><dt>BER en el canal</dt><dd>{percent.format(metrics.channelBer)}</dd><dd>{countPair(metrics.channelBitErrors, metrics.transmittedBits)} bits</dd></div>
          <div><dt>FER en el canal</dt><dd>{percent.format(metrics.channelFer)}</dd><dd>{countPair(metrics.channelFrameErrors, metrics.frames)} tramas</dd></div>
          <div><dt>BER residual</dt><dd>{percent.format(metrics.residualBer)}</dd><dd>{countPair(metrics.residualBitErrors, metrics.payloadBits)} bits de datos</dd></div>
          <div><dt>FER residual</dt><dd>{percent.format(metrics.residualFer)}</dd><dd>{countPair(metrics.residualFrameErrors, metrics.frames)} tramas con datos erróneos</dd></div>
          <div><dt>Tasa de código</dt><dd>{percent.format(metrics.codeRate)}</dd><dd>{countPair(metrics.payloadBits, metrics.transmittedBits)} bits útiles / enviados</dd></div>
          <div><dt>Redundancia</dt><dd>{integer.format(metrics.redundancyBits)} bits</dd><dd>{percent.format(1 - metrics.codeRate)} de lo enviado</dd></div>
        </dl>
        <dl className="channel-counts">
          <div><dt>Tramas detectadas</dt><dd>{integer.format(metrics.detectedFrames)}</dd></div>
          <div><dt>Con errores sin detectar</dt><dd>{integer.format(metrics.undetectedFrames)}</dd></div>
          <div><dt>Correcciones verificadas</dt><dd>{run.code === 'hamming74' ? integer.format(metrics.correctedFrames) : 'No aplica'}</dd></div>
          <div><dt>Correcciones equivocadas</dt><dd>{run.code === 'hamming74' ? integer.format(metrics.miscorrectedFrames) : 'No aplica'}</dd></div>
        </dl>
        {run.source === 'text' && <p className="channel-text">Texto recuperado <samp>{decoder.decode(metrics.recovered)}</samp></p>}
        {run.source === 'container' && metrics.residualBitErrors === 0 &&
          <button className="secondary-button" type="button" onClick={() => onRecoverContainer(
            new File([metrics.recovered], run.name, { type: 'application/x-bitlab' }),
          )}>Abrir .bitlab recibido en recuperación</button>}
        <h4>Comparación bit a bit</h4>
        <p className="channel-help">Se muestran las primeras tramas y la primera con errores si aparece más adelante. El resaltado indica diferencias.</p>
        {metrics.examples.map((example) => <FrameDetails key={example.index} example={example} code={run.code} />)}
      </div>}

      <details className="channel-reference">
        <summary>Cómo se relaciona este laboratorio con 5G y 6G</summary>
        <p>En <a href="https://www.etsi.org/deliver/etsi_ts/138200_138299/138212/19.02.00_60/ts_138212v190200p.pdf">5G NR (3GPP TS 38.212)</a>, LDPC protege los canales compartidos de datos UL-SCH y DL-SCH. Polar se usa en BCH y DCI, y en determinados casos de UCI. BitLab ejecuta paridad, CRC-16 y Hamming con tramas didácticas. Su CRC-16 comparte el polinomio de la especificación NR.</p>
        <p>Para <a href="https://www.itu.int/rec/R-REC-M.2160-0-202311-I">6G (marco ITU-R IMT-2030)</a>, el marco define objetivos y escenarios. Las propuestas de interfaz de radio siguen un <a href="https://www.itu.int/en/ITU-R/study-groups/rsg5/rwp5d/IMT-2030/Pages/submission-eval.aspx">proceso de evaluación</a>. Los resultados del laboratorio corresponden al canal binario simulado.</p>
      </details>
    </section>
  );
}
