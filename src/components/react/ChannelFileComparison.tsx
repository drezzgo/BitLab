import { useEffect, useState } from 'react';
import { classifyFile } from '../../core/files';
import type { ErrorSimulationResult } from '../../core/network/error-simulation';
import { channelInteger } from './ChannelReadout';

export interface ChannelFiles {
  sent: Uint8Array;
  received: File;
  output: File;
  restored: boolean;
  result: ErrorSimulationResult;
  focusByte: number;
}

function ByteBits({ value, original, position, container }: { value: number; original: number; position: number; container: boolean }) {
  const bits = value.toString(2).padStart(8, '0');
  const reference = original.toString(2).padStart(8, '0');
  return <div className="channel-focus-byte">
    <small>Byte {channelInteger.format(position + 1)} {container ? 'del .bitlab' : 'del mensaje'}</small>
    <samp aria-label={`${bits}, original ${reference}`}>{Array.from(bits, (bit, i) =>
      <span key={i} data-changed={bit !== reference[i] || undefined}>{bit}</span>)}</samp>
  </div>;
}

function ByteView({ bytes, reference, offset }: { bytes: Uint8Array; reference?: Uint8Array; offset: number }) {
  const sample = bytes.subarray(offset, offset + 16);
  return <div className="channel-byte-view">
    <small>HEX · desde 0x{offset.toString(16).toUpperCase().padStart(4, '0')}</small>
    <div>{Array.from(sample, (byte, index) => {
      const changed = reference !== undefined && reference[offset + index] !== byte;
      return <span key={index} data-changed={changed || undefined} title={`Byte ${offset + index + 1}${changed ? ' · modificado' : ''}`}>
        {byte.toString(16).toUpperCase().padStart(2, '0')}
      </span>;
    })}</div>
  </div>;
}

function ContentPreview({ file, stage, binary }: { file: File; stage: string; binary?: React.ReactNode }) {
  const kind = classifyFile(file.name, file.type).kind;
  const media = kind === 'image' || kind === 'audio' || kind === 'video';
  const hasBinary = Boolean(binary);
  const [sample, setSample] = useState<{ file: File; bytes: Uint8Array }>();
  const [resource, setResource] = useState<{ file: File; url: string }>();
  const [failed, setFailed] = useState<File>();
  const url = resource?.file === file ? resource.url : undefined;
  useEffect(() => {
    if (media && failed !== file) {
      const url = URL.createObjectURL(file);
      setResource({ file, url });
      return () => URL.revokeObjectURL(url);
    }
    if (kind !== 'text' && hasBinary) return;
    let active = true;
    file.slice(0, 512).arrayBuffer().then(buffer => {
      if (active) setSample({ file, bytes: new Uint8Array(buffer) });
    }).catch(() => { if (active) setFailed(file); });
    return () => { active = false; };
  }, [file, kind, media, failed, hasBinary]);

  if (media && failed !== file && url) {
    const props = { src: url, onError: () => setFailed(file) };
    if (kind === 'image') return <img {...props} alt={`${stage} · ${file.name}`} />;
    if (kind === 'video') return <video {...props} controls preload="metadata" aria-label={stage} />;
    return <audio {...props} controls preload="metadata" aria-label={stage} />;
  }
  if (kind === 'text' && sample?.file === file) {
    const preview = new TextDecoder().decode(sample.bytes, { stream: file.size > sample.bytes.length });
    return <pre>{preview}{file.size > sample.bytes.length && '…'}</pre>;
  }
  const fallback = binary ?? (sample?.file === file && <ByteView bytes={sample.bytes} offset={0} />);
  return <>{failed === file && <small>Vista previa no disponible.</small>}{fallback}</>;
}

export default function ChannelFileComparison({ original, containerName, codec, files }: {
  original: File | null;
  containerName?: string;
  codec?: string | null;
  files?: ChannelFiles;
}) {
  const [view, setView] = useState<'content' | 'bytes'>('content');
  const bytesView = !!files && view === 'bytes';
  const result = files?.result;
  const receivedErrors = result?.receivedPayloadErrors ?? 0;
  const residual = result?.residualBitErrors ?? 0;
  function difference(count: number) {
    return count === 0 ? 'Datos idénticos' : `${channelInteger.format(count)} ${count === 1 ? 'bit distinto' : 'bits distintos'}`;
  }
  const stages = [
    { title: 'Original', file: original, bytes: files?.sent, status: 'Referencia', pending: 'Selecciona una fuente.' },
    { title: 'Antes de corregir', file: files?.received, bytes: result?.receivedPayload, status: difference(receivedErrors), pending: 'Pendiente de transmisión' },
    { title: 'Recuperado', file: files?.output, bytes: result?.recovered, status: difference(residual), pending: 'Pendiente de recuperación' },
  ];
  return <section className="channel-comparison" aria-labelledby="channel-comparison-title">
    <div className="channel-comparison-head">
      <h4 id="channel-comparison-title">Recorrido del archivo</h4>
      {files && <div className="channel-view-switch" role="group" aria-label="Vista de la comparación">
        <button type="button" aria-pressed={!bytesView} onClick={() => setView('content')}>Contenido</button>
        <button type="button" aria-pressed={bytesView} onClick={() => setView('bytes')}>Bytes</button>
      </div>}
    </div>
    <p className="channel-route">{containerName
      ? `Se transmite ${containerName}${codec ? ` · ${codec}` : ''}. La vista en bytes compara el contenedor.`
      : 'El canal transmite los datos de la fuente seleccionada.'}</p>
    <div className="channel-stages">{stages.map((stage, index) => {
      const changed = index === 1 ? receivedErrors : index === 2 ? residual : 0;
      const hex = stage.bytes && files && <ByteView bytes={stage.bytes} reference={index ? files.sent : undefined} offset={files.focusByte - files.focusByte % 16} />;
      const name = bytesView && containerName ? containerName : stage.file?.name;
      return <figure key={stage.title} className="channel-stage" data-state={changed ? 'changed' : index === 2 && files ? 'restored' : undefined}>
        <figcaption><span aria-hidden="true">0{index + 1}</span><strong>{stage.title}</strong></figcaption>
        <div className="channel-stage-content">{stage.file
          ? bytesView ? hex : <ContentPreview file={stage.file} stage={stage.title} binary={containerName && (index === 0 || (index === 2 && files?.restored)) ? undefined : hex} />
          : <span className="channel-stage-pending">{stage.pending}</span>}</div>
        {name && <div className="channel-stage-meta"><strong>{name}</strong><small>{channelInteger.format(bytesView ? stage.bytes!.length : stage.file!.size)} B · {stage.status}</small></div>}
        {stage.bytes && files && <ByteBits value={stage.bytes[files.focusByte]} original={files.sent[files.focusByte]} position={files.focusByte} container={!!containerName} />}
      </figure>;
    })}</div>
    {files && <p className="channel-help">{bytesView
      ? 'Los bytes subrayados difieren de la fuente transmitida. Las tres muestras empiezan en la misma posición.'
      : containerName && files.restored ? 'La última vista muestra el archivo descomprimido desde el contenedor corregido.'
      : containerName && residual ? 'Quedan errores en el contenedor. La última vista muestra sus bytes después de la corrección.'
      : 'La vista intermedia reúne los bits de datos recibidos, sin los bits de comprobación.'}</p>}
  </section>;
}
