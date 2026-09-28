export type FileKind =
  | 'image'
  | 'pdf'
  | 'archive'
  | 'text'
  | 'audio'
  | 'video'
  | 'office'
  | 'binary';

export interface FilePresentation {
  kind: FileKind;
  badge: string;
  label: string;
  extension: string;
}

const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'log', 'ini']);
const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif']);

export function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === name.length - 1) return '';
  return name.slice(lastDot + 1).toLowerCase();
}

export function classifyFile(name: string, mimeType = ''): FilePresentation {
  const extension = getFileExtension(name);
  const mime = mimeType.toLowerCase();

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {
    return { kind: 'image', badge: extension.toUpperCase() || 'IMG', label: 'Imagen', extension };
  }

  if (mime === 'application/pdf' || extension === 'pdf') {
    return { kind: 'pdf', badge: 'PDF', label: 'Documento PDF', extension };
  }

  if (
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('archive') ||
    ARCHIVE_EXTENSIONS.has(extension)
  ) {
    return { kind: 'archive', badge: extension.toUpperCase() || 'ZIP', label: 'Archivo comprimido', extension };
  }

  if (mime.startsWith('text/') || TEXT_EXTENSIONS.has(extension)) {
    return { kind: 'text', badge: extension.toUpperCase() || 'TXT', label: 'Archivo de texto', extension };
  }

  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) {
    return { kind: 'audio', badge: extension.toUpperCase() || 'AUD', label: 'Archivo de audio', extension };
  }

  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) {
    return { kind: 'video', badge: extension.toUpperCase() || 'VID', label: 'Archivo de video', extension };
  }

  if (OFFICE_EXTENSIONS.has(extension) || mime.includes('officedocument') || mime.includes('msword')) {
    return { kind: 'office', badge: extension.toUpperCase() || 'DOC', label: 'Documento de oficina', extension };
  }

  return { kind: 'binary', badge: extension.toUpperCase() || 'BIN', label: 'Archivo binario', extension };
}
