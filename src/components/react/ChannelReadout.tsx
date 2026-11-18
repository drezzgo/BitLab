import { useState } from 'react';
import { ERROR_CODES, type ErrorCode } from '../../core/network/error-codes';
import type { ErrorSimulationResult, FrameExample } from '../../core/network/error-simulation';

export const channelInteger = new Intl.NumberFormat('es-CO');
export const channelPercent = new Intl.NumberFormat('es-CO', { style: 'percent', maximumSignificantDigits: 4 });

const steps = [
  ['Datos originales', 'Se separan en grupos de bits.'],
  ['Emisor', 'Añade bits de comprobación.'],
  ['Canal', 'Puede cambiar un 0 por un 1, o al revés.'],
  ['Receptor', 'Comprueba y recupera los datos.'],
] as const;

export function ChannelFlow() {
  return (
    <ol className="channel-flow" aria-label="Etapas de la transmisión">
      {steps.map(([label, description]) => (
        <li key={label}><strong>{label}</strong><span>{description}</span></li>
      ))}
    </ol>
  );
}

function Bits({ value, reference, isRedundant, inspectedPosition }: {
  value: string;
  reference?: string;
  isRedundant?: (position: number) => boolean;
  inspectedPosition?: number;
}) {
  return (
    <code className="channel-bits" aria-label={value.split('').join(' ')}>
      {value.match(/.{1,8}/g)?.map((group, groupIndex) => (
        <span className="channel-byte" key={groupIndex}>
          {Array.from(group, (bit, index) => {
            const position = groupIndex * 8 + index;
            const changed = reference !== undefined && bit !== reference[position];
            const redundant = isRedundant?.(position);
            return (
              <span className="channel-digit" key={index}>
                {value.length <= 8 && <span className="channel-bit-position" aria-hidden="true">{position + 1}</span>}
                <span
                  className="channel-bit"
                  data-role={redundant ? 'redundancy' : undefined}
                  data-changed={changed || undefined}
                  data-inspected={inspectedPosition === position + 1 || undefined}
                >
                  {changed ? <mark>{bit}</mark> : bit}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </code>
  );
}

function inspectFrame(example: FrameExample, code: ErrorCode) {
  if (!example.flips) return 'La trama llegó intacta.';
  if (!example.syndrome) return 'Las comprobaciones dieron por válida la trama. Al compararla con la original, el simulador sí ve que cambió.';
  if (code !== 'hamming74') return 'La comprobación falló. Este algoritmo avisa que la trama cambió y entrega los datos recibidos tal como llegaron.';
  if (example.flips === 1) return `Las comprobaciones señalaron la posición ${example.syndrome}. Al invertir ese bit, el receptor corrigió el error.`;
  return `Las comprobaciones señalaron la posición ${example.syndrome}. Había varios bits alterados y Hamming invirtió un bit equivocado.`;
}

function frameOutcome(frame: FrameExample, code: ErrorCode) {
  if (!frame.flips) return 'Trama intacta';
  if (!frame.syndrome) return 'Error sin detectar';
  if (code !== 'hamming74') return 'Error detectado';
  return frame.flips === 1 ? 'Error corregido' : 'Corrección equivocada';
}

function FrameInspector({ examples, code }: { examples: FrameExample[]; code: ErrorCode }) {
  const [selected, setSelected] = useState(() => (examples.find((example) => example.flips > 0) ?? examples[0]).index);
  const frame = examples.find((example) => example.index === selected) ?? examples[0];
  const isRedundant = (position: number) => code === 'hamming74'
    ? position === 0 || position === 1 || position === 3
    : position >= frame.original.length;
  const correctedPosition = code === 'hamming74' && frame.syndrome ? frame.syndrome : undefined;
  const outcome = frameOutcome(frame, code);

  return (
    <section className="channel-inspector" aria-labelledby="channel-inspector-title">
      <div className="channel-inspector-head">
        <h4 id="channel-inspector-title">Comparación bit a bit</h4>
        <label>Trama (grupo de bits)
          <select value={selected} onChange={(event) => setSelected(Number(event.target.value))}>
            {examples.map((example) => (
              <option key={example.index} value={example.index}>Trama {channelInteger.format(example.index + 1)}{example.flips ? ' · con inversiones' : ''}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="channel-legend">
        <span className="channel-legend-check">Dorado · bit de comprobación</span>
        <span className="channel-legend-error">Rojo · bit que cambió</span>
        {correctedPosition !== undefined && <span className="channel-legend-action">Subrayado · posición que Hamming intentó corregir</span>}
      </div>
      <dl className="channel-frames">
        <div><dt>1. Datos originales</dt><dd><Bits value={frame.original} /></dd></div>
        <div><dt>2. Trama enviada</dt><dd><Bits value={frame.sent} isRedundant={isRedundant} /></dd></div>
        <div><dt>3. Trama recibida <small>Comparada con la enviada</small></dt><dd><Bits value={frame.received} reference={frame.sent} isRedundant={isRedundant} inspectedPosition={correctedPosition} /></dd></div>
        <div><dt>4. Datos recuperados <small>Comparados con los originales</small></dt><dd><Bits value={frame.recovered} reference={frame.original} /></dd></div>
      </dl>
      <p className="channel-frame-note">
        <strong>{outcome}.</strong> {inspectFrame(frame, code)} El canal cambió {channelInteger.format(frame.flips)} de los {channelInteger.format(frame.sent.length)} bits enviados en esta trama. Al recuperar, {channelInteger.format(frame.payloadErrors)} de los {channelInteger.format(frame.original.length)} bits de datos quedaron distintos.
      </p>
    </section>
  );
}

function MetricValue({ rate, count, total }: { rate: number; count: number; total: number }) {
  return (
    <>
      <strong>{channelPercent.format(rate)}</strong>
      <small>{channelInteger.format(count)} de {channelInteger.format(total)}</small>
      <span className="channel-rate-track" aria-hidden="true"><span style={{ width: `${rate * 100}%` }} /></span>
    </>
  );
}

function PresentationGuide({ result, corrects }: { result: ErrorSimulationResult; corrects: boolean }) {
  const format = (value: number) => channelInteger.format(value);
  const quantity = (value: number, singular: string, plural: string) =>
    `${format(value)} ${value === 1 ? singular : plural}`;
  return (
    <details className="channel-reading">
      <summary>Guion para explicar este resultado</summary>
      <ol>
        <li>«De los {format(result.transmittedBits)} bits que envié, {format(result.redundancyBits)} eran de comprobación y {format(result.payloadBits)} eran datos originales».</li>
        <li>«El canal cambió {quantity(result.channelBitErrors, 'bit', 'bits')} en {quantity(result.channelFrameErrors, 'trama', 'tramas')}. El receptor señaló un problema en {quantity(result.detectedFrames, 'trama', 'tramas')}».</li>
        <li>
          {corrects && <>«Verifiqué {quantity(result.correctedFrames, 'corrección', 'correcciones')} y encontré {quantity(result.miscorrectedFrames, 'intento equivocado', 'intentos equivocados')}». </>}
          «Al comparar los datos recuperados con los originales, conté {quantity(result.residualBitErrors, 'bit distinto', 'bits distintos')} en {quantity(result.residualFrameErrors, 'trama', 'tramas')}».
        </li>
      </ol>
      <p><strong>BER</strong> cuenta la proporción de bits con error. Al recibir se incluyen los bits de comprobación. Al recuperar se comparan solo los datos con el original. <strong>FER</strong> cuenta la proporción de tramas que contienen algún error.</p>
    </details>
  );
}

export default function ChannelReadout({ result, code, description }: {
  result: ErrorSimulationResult;
  code: ErrorCode;
  description: string;
}) {
  const format = (value: number) => channelInteger.format(value);
  const corrects = code === 'hamming74';
  return (
    <>
      <div className="channel-result-heading">
        <h4>Resumen de la transmisión</h4>
        <p className="channel-help">{description}</p>
      </div>
      <div className="channel-run-path" role="group" aria-label="Qué pasó en toda la transmisión">
        <div><strong>{format(result.channelBitErrors)} de {format(result.transmittedBits)}</strong><span>bits cambiaron en el canal</span></div>
        <div><strong>{format(result.detectedFrames)} de {format(result.frames)}</strong><span>tramas dieron una señal de error</span></div>
        <div data-changed={result.residualBitErrors > 0 || undefined}><strong>{format(result.residualBitErrors)} de {format(result.payloadBits)}</strong><span>bits de datos quedaron distintos</span></div>
      </div>
      <FrameInspector examples={result.examples} code={code} />
      <PresentationGuide result={result} corrects={corrects} />
      <div className="channel-results-grid">
        <table className="channel-metrics">
          <caption>Errores antes y después de la decodificación</caption>
          <thead><tr><th scope="col">Métrica</th><th scope="col">Al recibir</th><th scope="col">Al recuperar</th></tr></thead>
          <tbody>
            <tr>
              <th scope="row">BER <small>Bits con error</small></th>
              <td><MetricValue rate={result.channelBer} count={result.channelBitErrors} total={result.transmittedBits} /></td>
              <td><MetricValue rate={result.residualBer} count={result.residualBitErrors} total={result.payloadBits} /></td>
            </tr>
            <tr>
              <th scope="row">FER <small>Tramas con error</small></th>
              <td><MetricValue rate={result.channelFer} count={result.channelFrameErrors} total={result.frames} /></td>
              <td><MetricValue rate={result.residualFer} count={result.residualFrameErrors} total={result.frames} /></td>
            </tr>
          </tbody>
        </table>
        <div className="channel-efficiency">
          <h4>Bits enviados</h4>
          <div className="channel-code-strip" aria-hidden="true">
            <span style={{ width: `${result.codeRate * 100}%` }} />
          </div>
          <dl>
            <div><dt>Tasa de código</dt><dd>{channelPercent.format(result.codeRate)} útiles</dd></div>
            <div><dt>Redundancia</dt><dd>{format(result.redundancyBits)} bits · {channelPercent.format(1 - result.codeRate)}</dd></div>
          </dl>
        </div>
      </div>
      <dl className="channel-counts">
        <div><dt>Tramas detectadas</dt><dd>{format(result.detectedFrames)}</dd></div>
        <div><dt>Con errores sin detectar</dt><dd>{format(result.undetectedFrames)}</dd></div>
        <div><dt>Correcciones verificadas</dt><dd>{corrects ? format(result.correctedFrames) : 'No aplica'}</dd></div>
        <div><dt>Correcciones equivocadas</dt><dd>{corrects ? format(result.miscorrectedFrames) : 'No aplica'}</dd></div>
      </dl>
    </>
  );
}

export function channelRunDescription(name: string, code: ErrorCode, probability: number, seed: number) {
  return `${name} · ${ERROR_CODES[code].label} · ${channelPercent.format(probability)} de probabilidad de error por bit · Semilla ${channelInteger.format(seed)}`;
}
