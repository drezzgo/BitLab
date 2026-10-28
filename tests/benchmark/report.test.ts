import { describe, expect, it } from 'vitest';
import {
  benchmarkRowsToCsv,
  benchmarkRowsToJson,
  calculateReductionPercent,
  summarizeBenchmark,
  type BenchmarkRow,
} from '../../src/core/benchmark';

const rows: BenchmarkRow[] = [
  {
    fileName: 'texto,repetitivo.txt',
    mimeType: 'text/plain',
    originalBytes: 1000,
    containerBytes: 400,
    reductionPercent: 60,
    selectedCodec: 'lz77-huffman',
    selectedCodecLabel: 'LZ77 + Huffman',
    selectedParameterLabel: '32 KiB · match ≥ 4 · búsqueda 64',
    candidateCount: 11,
    elapsedMs: 100,
  },
  {
    fileName: 'imagen.png',
    mimeType: 'image/png',
    originalBytes: 1000,
    containerBytes: 1100,
    reductionPercent: -10,
    selectedCodec: 'raw',
    selectedCodecLabel: 'RAW',
    selectedParameterLabel: 'N = 8',
    candidateCount: 11,
    elapsedMs: 200,
  },
];

describe('benchmark report', () => {
  it('calcula reducción con signo coherente', () => {
    expect(calculateReductionPercent(1000, 400)).toBe(60);
    expect(calculateReductionPercent(1000, 1100)).toBeCloseTo(-10);
  });

  it('resume el corpus completo y cuenta ganadores', () => {
    const summary = summarizeBenchmark(rows);

    expect(summary.files).toBe(2);
    expect(summary.originalBytes).toBe(2000);
    expect(summary.containerBytes).toBe(1500);
    expect(summary.reductionPercent).toBe(25);
    expect(summary.smallerResults).toBe(1);
    expect(summary.nonSmallerResults).toBe(1);
    expect(summary.totalElapsedMs).toBe(300);
    expect(summary.codecWins['LZ77 + Huffman']).toBe(1);
    expect(summary.codecWins.RAW).toBe(1);
  });

  it('exporta CSV escapando nombres con coma', () => {
    const csv = benchmarkRowsToCsv(rows);

    expect(csv).toContain('"texto,repetitivo.txt"');
    expect(csv).toContain('codec_ganador');
    expect(csv).toContain('LZ77 + Huffman');
  });

  it('exporta JSON con resumen y filas', () => {
    const parsed = JSON.parse(benchmarkRowsToJson(rows));

    expect(parsed.summary.files).toBe(2);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].candidateCount).toBe(11);
  });
});
