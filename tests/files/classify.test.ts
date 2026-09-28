import { describe, expect, it } from 'vitest';
import { classifyFile } from '../../src/core/files';

describe('file classification', () => {
  it('detecta imágenes por MIME', () => {
    expect(classifyFile('sin-extension', 'image/png').kind).toBe('image');
  });

  it('detecta PDF y ZIP por extensión cuando el navegador no entrega MIME', () => {
    expect(classifyFile('informe.PDF').kind).toBe('pdf');
    expect(classifyFile('backup.zip').kind).toBe('archive');
  });

  it('usa binario como fallback', () => {
    expect(classifyFile('firmware.unknown').kind).toBe('binary');
  });
});
