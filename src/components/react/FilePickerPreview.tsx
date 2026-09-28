import { useRef, useState, type DragEvent } from 'react';
import FilePreview from './FilePreview';

interface Props {
  file: File | null;
  onFile: (file: File | null) => void;
  accept?: string;
  hint?: string;
}

export default function FilePickerPreview({
  file,
  onFile,
  accept,
  hint = 'Imagen, PDF, ZIP, audio, texto o cualquier binario',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    onFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div
      className={`file-picker ${file ? 'has-file' : ''} ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {file ? (
        <FilePreview file={file} />
      ) : (
        <div className="empty-picker">
          <span className="pixel-upload" aria-hidden="true">⇧</span>
          <strong>Selecciona o arrastra un archivo</strong>
          <small>{hint}</small>
        </div>
      )}

      <div className="file-picker-actions">
        <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>
          {file ? 'Cambiar archivo' : 'Elegir archivo'}
        </button>
        {file && (
          <button type="button" className="ghost-button" onClick={() => onFile(null)}>
            Quitar
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        className="sr-file-input"
        type="file"
        accept={accept}
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
