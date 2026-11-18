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
          <svg className="upload-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M24 31V8m0 0-9 9m9-9 9 9M9 30v8a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3v-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
        aria-label="Seleccionar archivo"
        accept={accept}
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />
    </div>
  );
}
