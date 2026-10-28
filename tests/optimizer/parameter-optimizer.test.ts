import { describe, expect, it } from 'vitest';
import {
  buildCompressionSearchPlan,
  getCompressionSearchCandidateCount,
  HUFFMAN_WORD_SIZE_CANDIDATES,
  LZ77_PARAMETER_CANDIDATES,
  optimizeCompression,
} from '../../src/core/optimizer';
import { restoreBitLabContainer } from '../../src/core/container';
import { equalBytes, sha256Bytes } from '../../src/core/integrity';

describe('parameter optimizer', () => {
  it('construye un espacio acotado de 11 candidatos', () => {
    const plan = buildCompressionSearchPlan();

    expect(getCompressionSearchCandidateCount()).toBe(11);
    expect(plan).toHaveLength(11);
    expect(HUFFMAN_WORD_SIZE_CANDIDATES).toEqual([4, 8, 12, 16]);
    expect(LZ77_PARAMETER_CANDIDATES).toHaveLength(5);
    expect(new Set(plan.map((candidate) => candidate.id)).size).toBe(plan.length);
  });

  it('prueba varias configuraciones por codec y conserva el menor contenedor', async () => {
    const source = new TextEncoder().encode(
      'NODO=BOGOTA|SERVICIO=TELEMETRIA|ESTADO=ACTIVO|'.repeat(1800),
    );
    const digest = await sha256Bytes(source);

    const optimized = optimizeCompression({
      originalName: 'telemetria.log',
      mimeType: 'text/plain',
      wordSizeBits: 8,
      originalBytes: source,
    }, digest);

    const huffmanCandidates = optimized.candidates.filter(
      (candidate) => candidate.codec === 'huffman',
    );
    const lzCandidates = optimized.candidates.filter(
      (candidate) => candidate.codec === 'lz77-huffman',
    );

    expect(huffmanCandidates).toHaveLength(4);
    expect(lzCandidates).toHaveLength(5);

    const minimum = Math.min(
      ...optimized.candidates.map((candidate) => candidate.containerBytes),
    );

    expect(optimized.container.length).toBe(minimum);
    expect(optimized.selectedParameterLabel.length).toBeGreaterThan(0);

    const restored = restoreBitLabContainer(optimized.container);
    expect(equalBytes(restored.bytes, source)).toBe(true);
  });

  it('reporta cada combinación evaluada', () => {
    const source = new TextEncoder().encode(
      'ABCDEF|ABCDEF|ABCDEF|'.repeat(200),
    );
    const ids: string[] = [];

    optimizeCompression({
      originalName: 'callbacks.txt',
      mimeType: 'text/plain',
      wordSizeBits: 8,
      originalBytes: source,
    }, undefined, (candidate) => {
      ids.push(candidate.id);
    });

    expect(ids).toHaveLength(11);
    expect(new Set(ids).size).toBe(11);
  });
});
