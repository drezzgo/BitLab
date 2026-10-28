import { describe, expect, it } from 'vitest';
import {
  buildCompressionSearchPlan,
  optimizeCompression,
} from '../../src/core/optimizer';
import { restoreBitLabContainer } from '../../src/core/container';
import { equalBytes, sha256Bytes } from '../../src/core/integrity';

function makePseudoRandom(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state = 0x12345678;

  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    bytes[index] = state >>> 24;
  }

  return bytes;
}

describe('compression optimizer', () => {
  it('evalúa el plan vigente y devuelve el menor contenedor reversible', async () => {
    const source = new TextEncoder().encode(
      'UNIVERSIDAD-DISTRITAL|INGENIERIA-TELEMATICA|REDES|'.repeat(1200),
    );
    const digest = await sha256Bytes(source);
    const plan = buildCompressionSearchPlan();

    const optimized = optimizeCompression({
      originalName: 'estructura.txt',
      mimeType: 'text/plain',
      wordSizeBits: 13,
      originalBytes: source,
    }, digest);

    expect(optimized.candidates).toHaveLength(plan.length);
    expect(optimized.candidates.map((candidate) => candidate.id))
      .toEqual(plan.map((candidate) => candidate.id));

    const minimum = Math.min(
      ...optimized.candidates.map((candidate) => candidate.containerBytes),
    );

    expect(optimized.container.length).toBe(minimum);

    const restored = restoreBitLabContainer(optimized.container);
    expect(equalBytes(restored.bytes, source)).toBe(true);
  });

  it('conserva el menor resultado incluso en una fuente de baja redundancia', async () => {
    const source = makePseudoRandom(128 * 1024);
    const digest = await sha256Bytes(source);

    const optimized = optimizeCompression({
      originalName: 'random.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 8,
      originalBytes: source,
    }, digest);

    const raw = optimized.candidates.find(
      (candidate) => candidate.codec === 'raw',
    );
    expect(raw).toBeDefined();

    const minimum = Math.min(
      ...optimized.candidates.map((candidate) => candidate.containerBytes),
    );

    expect(optimized.container.length).toBe(minimum);
  });

  it('notifica cada configuración en el orden reproducible del plan', () => {
    const source = new TextEncoder().encode('ABCABCABCABCABCABC'.repeat(100));
    const plan = buildCompressionSearchPlan();
    const seen: string[] = [];

    optimizeCompression({
      originalName: 'callbacks.txt',
      mimeType: 'text/plain',
      wordSizeBits: 8,
      originalBytes: source,
    }, undefined, (candidate) => {
      seen.push(candidate.id);
    });

    expect(seen).toEqual(plan.map((candidate) => candidate.id));
  });
});
