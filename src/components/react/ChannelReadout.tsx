import { useState } from 'react';
import { ERROR_CODES, type ErrorCode } from '../../core/network/error-codes';
import type { ErrorSimulationResult, FrameExample } from '../../core/network/error-simulation';

export const channelInteger = new Intl.NumberFormat('es-CO');
export const channelPercent = new Intl.NumberFormat('es-CO', { style: 'percent', maximumSignificantDigits: 4 });

const steps = [
  ['Entrada', 'Texto, archivo o .bitlab'],
  ['Codificación', 'Añade redundancia'],
  ['Canal', 'Invierte bits'],
  ['Recepción', 'Comprueba y recupera'],
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

function Bits({ value, reference, isRedundant }: {
  value: string;
  reference?: string;
  isRedundant?: (position: number) => boolean;
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
              <span className="channel-bit" key={index} data-role={redundant ? 'redundancy' : undefined} data-changed={changed || undefined}>
                {changed ? <mark>{bit}</mark> : bit}
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
  if (!example.syndrome) return 'La comprobación pasó aunque el canal invirtió bits.';
  if (code !== 'hamming74') return 'El receptor detectó la alteración de la trama.';
  if (example.flips === 1) return `El receptor corrigió el bit de la posición ${example.syndrome}.`;
  return `El síndrome llevó al receptor a invertir por error el bit de la posición ${example.syndrome}.`;
}

function FrameInspector({ examples, code }: { examples: FrameExample[]; code: ErrorCode }) {
  const [selected, setSelected] = useState(() => (examples.find((example) => example.flips > 0) ?? examples[0]).index);
  const frame = examples.find((example) => example.index === selected) ?? examples[0];
  const isRedundant = (position: number) => code === 'hamming74'
    ? position === 0 || position === 1 || position === 3
    : position >= frame.original.length;
  const flips = `${channelInteger.format(frame.flips)} ${frame.flips === 1 ? 'bit invertido' : 'bits invertidos'}`;
  const residual = `${channelInteger.format(frame.payloadErrors)} ${frame.payloadErrors === 1 ? 'error residual' : 'errores residuales'}`;

  return (
    <section className="channel-inspector" aria-labelledby="channel-inspector-title">
      <div className="channel-inspector-head">
        <h4 id="channel-inspector-title">Comparación bit a bit</h4>
        <label>Trama mostrada
          <select value={selected} onChange={(event) => setSelected(Number(event.target.value))}>
            {examples.map((example) => (
              <option key={example.index} value={example.index}>Trama {channelInteger.format(example.index + 1)}{example.flips ? ' · con inversiones' : ''}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="channel-legend">
        <span className="channel-legend-check">Bit de redundancia</span>
        <span className="channel-legend-error">Bit diferente</span>
      </div>
      <dl className="channel-frames">
        <div><dt>Datos de origen</dt><dd><Bits value={frame.original} /></dd></div>
        <div><dt>Trama transmitida</dt><dd><Bits value={frame.sent} isRedundant={isRedundant} /></dd></div>
        <div><dt>Trama recibida</dt><dd><Bits value={frame.received} reference={frame.sent} isRedundant={isRedundant} /></dd></div>
        <div><dt>Datos recuperados</dt><dd><Bits value={frame.recovered} reference={frame.original} /></dd></div>
      </dl>
      <p className="channel-frame-note"><strong>{flips} · {residual}.</strong> {inspectFrame(frame, code)}</p>
    </section>
  );
}

function MetricValue({ rate, count, total }: { rate: number; count: number; total: number }) {
  return <><strong>{channelPercent.format(rate)}</strong><small>{channelInteger.format(count)} / {channelInteger.format(total)}</small></>;
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
        <h4>Resultado de la transmisión</h4>
        <p className="channel-help">{description}</p>
      </div>
      <FrameInspector examples={result.examples} code={code} />
      <div className="channel-results-grid">
        <table className="channel-metrics">
          <caption>Errores antes y después de la decodificación</caption>
          <thead><tr><th scope="col">Métrica</th><th scope="col">En el canal</th><th scope="col">Residuales</th></tr></thead>
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
  return `${name} · ${ERROR_CODES[code].label} · P de error ${channelPercent.format(probability)} · Semilla ${channelInteger.format(seed)}`;
}
