import { useEffect, useMemo, useState } from 'react';
import { classifyFile } from '../../core/files';

interface Props {
  file: File;
  compact?: boolean;
}

export default function FilePreview({ file, compact = false }: Props) {
  const presentation = useMemo(() => classifyFile(file.name, file.type), [file.name, file.type]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (presentation.kind !== 'image') {
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, presentation.kind]);

  if (presentation.kind === 'image' && imageUrl) {
    return (
      <div className={`file-preview image-preview ${compact ? 'compact' : ''}`}>
        <img src={imageUrl} alt={`Vista previa de ${file.name}`} />
        <div className="file-preview-meta">
          <span className="file-type-badge">{presentation.badge}</span>
          <div>
            <strong>{file.name}</strong>
            <small>{presentation.label}</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`file-preview icon-preview kind-${presentation.kind} ${compact ? 'compact' : ''}`}>
      <div className="file-glyph" aria-hidden="true">
        <span className="file-fold" />
        <strong>{presentation.badge.slice(0, 5)}</strong>
      </div>
      <div className="file-preview-meta centered">
        <strong>{file.name}</strong>
        <small>{presentation.label}</small>
      </div>
    </div>
  );
}
