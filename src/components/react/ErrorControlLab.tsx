import { useEffect, useMemo, useRef, useState } from 'react';
import { ERROR_CODES, type ErrorCode } from '../../core/network/error-codes';
import { MAX_CHANNEL_BYTES, type ErrorSimulationOptions } from '../../core/network/error-simulation';
import type { BitLabWorkerResult } from '../../workers/protocol';
import ChannelReadout, { channelInteger, channelRunDescription } from './ChannelReadout';
import ChannelFileComparison, { type ChannelFiles } from './ChannelFileComparison';
import { makeRequestId, startWorkerTask, type WorkerTask } from './worker-client';
import '../../styles/error-control.css';

type Source = 'text' | 'file' | 'container';
type WorkerResult = Extract<BitLabWorkerResult, { operation: 'simulate-channel' }>;
type SimulationJob = { task?: WorkerTask<WorkerResult> };

interface Props {
  file: File | null;
  containerBytes: Uint8Array | null;
  codecLabel: string | null;
  onRecoverContainer: (file: File) => void;
}

interface Run extends ChannelFiles {
  name: string;
  code: ErrorCode;
  description: string;
}

const descriptors: Record<ErrorCode, string> = {
  parity: 'Añade un bit por trama. Avisa si cambia una cantidad impar de bits. Los datos llegan con los cambios del canal.',
  crc16: 'Añade 16 bits de comprobación por trama. El receptor verifica ese valor para detectar cambios. Los datos llegan con los cambios del canal.',
  hamming74: 'Añade tres bits de comprobación por cada cuatro de datos. Corrige un cambio por bloque. Con dos o más puede elegir una posición equivocada.',
};

export default function ErrorControlLab({ file, containerBytes, codecLabel, onRecoverContainer }: Props) {
  const [chosenSource, setChosenSource] = useState<Source | null>(null);
  const [input, setInput] = useState('BitLab · Control de errores');
  const [code, setCode] = useState<ErrorCode>('hamming74');
  const [probability, setProbability] = useState('2');
  const [seed, setSeed] = useState('42');
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const job = useRef<SimulationJob | null>(null);

  useEffect(() => {
    setChosenSource(null);
    setRun(null);
    setError('');
    setBusy(false);
    return () => {
      job.current?.task?.cancel();
      job.current = null;
    };
  }, [file, containerBytes]);

  const source = chosenSource ?? (containerBytes ? 'container' : file ? 'file' : 'text');
  const original = useMemo(() => source === 'text'
    ? new File([input], 'mensaje.txt', { type: 'text/plain' }) : file, [source, input, file]);
  const name = source === 'container' ? `${file?.name ?? 'resultado'}.bitlab` : original?.name ?? '';
  const mime = source === 'container' ? 'application/x-bitlab' : original?.type ?? '';
  const sourceSize = source === 'container' ? containerBytes?.length : original?.size;
  const sourceMissing = source !== 'text' && sourceSize === undefined;
  const sizeInvalid = sourceSize !== undefined && (sourceSize === 0 || sourceSize > MAX_CHANNEL_BYTES);

  async function runTransmission(demonstrationErrors?: 1 | 2) {
    if (job.current || sourceMissing || sizeInvalid || !original) return;
    const options: ErrorSimulationOptions = demonstrationErrors
      ? { code: 'hamming74', probability: 0, seed: 0, demonstrationErrors }
      : { code, probability: Number(probability) / 100, seed: Number(seed) };
    setCode(options.code);
    const current: SimulationJob = {};
    job.current = current;
    setBusy(true);
    setError('');
    setRun(null);
    try {
      const sent = source === 'container' && containerBytes ? containerBytes : new Uint8Array(await original.arrayBuffer());
      if (job.current !== current) return;
      const bytes = Uint8Array.from(sent).buffer;
      current.task = startWorkerTask<WorkerResult>({
        id: makeRequestId('channel'),
        operation: 'simulate-channel',
        bytes,
        restoreContainer: source === 'container',
        options,
      }, [bytes]);
      const { simulation, restoredFile } = await current.task.promise;
      if (job.current !== current) return;
      let firstChange = sent.findIndex((byte, i) => byte !== simulation.recovered[i]);
      if (firstChange < 0) firstChange = sent.findIndex((byte, i) => byte !== simulation.receivedPayload[i]);
      setRun({
        code: options.code, name, sent, result: simulation, restored: !!restoredFile,
        focusByte: Math.max(0, firstChange),
        description: demonstrationErrors ? `${name} · Hamming (7,4) · ${demonstrationErrors === 1 ? 'Una inversión' : 'Dos inversiones'} en la segunda trama`
          : channelRunDescription(name, code, options.probability, options.seed),
        received: new File([simulation.receivedPayload], name, { type: mime }),
        output: restoredFile ? new File([restoredFile.bytes], restoredFile.name, { type: restoredFile.type })
          : new File([simulation.recovered], name, { type: mime }),
      });
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
        <h3 id="channel-title">Hamming y control de errores</h3>
        <p>Transmite tu archivo, observa qué bits cambian en el canal y comprueba cuánto recupera el receptor.</p>
      </header>

      <div className="channel-workspace">
        <div className="channel-monitor">
          <ChannelFileComparison original={original} containerName={source === 'container' ? name : undefined} codec={codecLabel} files={run ?? undefined} />
          <div className="channel-examples">
            <p>Probar Hamming con esta fuente</p>
            <button className="secondary-button" type="button" disabled={busy || sourceMissing || sizeInvalid} onClick={() => void runTransmission(1)}>
              <strong>Cambiar un bit</strong><span>Observar una corrección</span>
            </button>
            <button className="secondary-button" type="button" disabled={busy || sourceMissing || sizeInvalid} onClick={() => void runTransmission(2)}>
              <strong>Cambiar dos bits</strong><span>Probar el límite en una trama</span>
            </button>
          </div>
          <p className="channel-status" data-outcome={metrics ? (metrics.residualBitErrors === 0 ? 'match' : 'changed') : undefined} role="status">
            {busy ? 'Simulando la transmisión…' : metrics && (metrics.residualBitErrors === 0
              ? 'Los datos recuperados coinciden con el original.'
              : metrics.residualBitErrors === 1
                ? 'Queda un bit diferente en los datos recuperados.'
                : `Quedan ${channelInteger.format(metrics.residualBitErrors)} bits diferentes en los datos recuperados.`)}
          </p>
            {run && metrics && source === 'container' && metrics.residualBitErrors === 0 &&
              <button className="secondary-button" type="button" onClick={() => onRecoverContainer(
                new File([metrics.recovered], run.name, { type: 'application/x-bitlab' }),
              )}>Abrir .bitlab recibido en recuperación</button>}
        </div>

        <form className="channel-form" onChange={() => { setRun(null); setError(''); }}
          onSubmit={event => { event.preventDefault(); void runTransmission(); }}>
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
          <p className="channel-help" id="channel-noise-help">Con 10% de error, cada bit tiene 1 posibilidad en 10 de cambiar. Usa la misma semilla y los mismos parámetros para repetir la prueba.</p>
          <div className="channel-actions">
            <button className="primary-button" type="submit" disabled={busy || sourceMissing || sizeInvalid}>Simular transmisión</button>
            {busy && <button className="secondary-button" type="button" onClick={cancel}>Cancelar</button>}
          </div>
          {error && <p className="error-banner" role="alert">{error}</p>}
        </form>
      </div>
      {run && metrics && <div className="channel-results">
        <ChannelReadout result={metrics} code={run.code} description={run.description} />
      </div>}

      <details className="channel-reference">
        <summary>Qué significa cada término</summary>
        <dl className="channel-glossary">
          <div><dt>Bit y trama</dt><dd>Un bit vale 0 o 1. Una trama es el grupo de bits que se envía y comprueba en conjunto.</dd></div>
          <div><dt>Redundancia</dt><dd>Bits extra que se añaden para comprobar la trama. La tasa de código es la fracción de bits enviados que corresponde a datos originales.</dd></div>
          <div><dt>Detectar y corregir</dt><dd>Detectar es advertir que una trama cambió. Corregir es recuperar el valor original. Hamming (7,4) puede hacer ambas cosas cuando cambia un solo bit por bloque.</dd></div>
          <div><dt>Error sin detectar y error residual</dt><dd>Un error sin detectar pasa la comprobación. Un error residual es una diferencia que queda en los datos después de recuperarlos.</dd></div>
        </dl>
      </details>
      <details className="channel-reference">
        <summary>Cómo se relaciona este laboratorio con 5G y 6G</summary>
        <p>En <a href="https://www.etsi.org/deliver/etsi_ts/138200_138299/138212/19.02.00_60/ts_138212v190200p.pdf">5G NR (3GPP TS 38.212)</a>, LDPC protege los canales compartidos de datos UL-SCH y DL-SCH. Polar se usa en BCH y DCI, y en determinados casos de UCI. BitLab ejecuta paridad, CRC-16 y Hamming con tramas didácticas. Su CRC-16 comparte el polinomio de la especificación NR.</p>
        <p>Para <a href="https://www.itu.int/rec/R-REC-M.2160-0-202311-I">6G (marco ITU-R IMT-2030)</a>, el marco define objetivos y escenarios. Las propuestas de interfaz de radio siguen un <a href="https://www.itu.int/en/ITU-R/study-groups/rsg5/rwp5d/IMT-2030/Pages/submission-eval.aspx">proceso de evaluación</a>. Los resultados del laboratorio corresponden al canal binario simulado.</p>
      </details>
    </section>
  );
}
