export interface BenchmarkRow {
  fileName: string;
  mimeType: string;
  originalBytes: number;
  containerBytes: number;
  reductionPercent: number;
  selectedCodec: string;
  selectedCodecLabel: string;
  selectedParameterLabel: string;
  candidateCount: number;
  elapsedMs: number;
}

export interface BenchmarkSummary {
  files: number;
  originalBytes: number;
  containerBytes: number;
  reductionPercent: number;
  smallerResults: number;
  nonSmallerResults: number;
  totalElapsedMs: number;
  codecWins: Record<string, number>;
}

export function calculateReductionPercent(
  originalBytes: number,
  containerBytes: number,
): number {
  if (originalBytes <= 0) return 0;
  return (1 - containerBytes / originalBytes) * 100;
}

export function summarizeBenchmark(
  rows: BenchmarkRow[],
): BenchmarkSummary {
  const originalBytes = rows.reduce(
    (total, row) => total + row.originalBytes,
    0,
  );
  const containerBytes = rows.reduce(
    (total, row) => total + row.containerBytes,
    0,
  );

  const codecWins: Record<string, number> = {};
  for (const row of rows) {
    codecWins[row.selectedCodecLabel] =
      (codecWins[row.selectedCodecLabel] ?? 0) + 1;
  }

  return {
    files: rows.length,
    originalBytes,
    containerBytes,
    reductionPercent: calculateReductionPercent(
      originalBytes,
      containerBytes,
    ),
    smallerResults: rows.filter(
      (row) => row.containerBytes < row.originalBytes,
    ).length,
    nonSmallerResults: rows.filter(
      (row) => row.containerBytes >= row.originalBytes,
    ).length,
    totalElapsedMs: rows.reduce(
      (total, row) => total + row.elapsedMs,
      0,
    ),
    codecWins,
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (!/[",\n\r;]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function benchmarkRowsToCsv(rows: BenchmarkRow[]): string {
  const header = [
    'archivo',
    'mime',
    'bytes_originales',
    'bytes_bitlab',
    'reduccion_porcentaje',
    'codec_ganador',
    'parametros',
    'candidatos',
    'tiempo_ms',
  ];

  const lines = rows.map((row) => [
    row.fileName,
    row.mimeType,
    row.originalBytes,
    row.containerBytes,
    row.reductionPercent.toFixed(4),
    row.selectedCodecLabel,
    row.selectedParameterLabel,
    row.candidateCount,
    row.elapsedMs.toFixed(2),
  ].map(csvCell).join(','));

  return [header.join(','), ...lines].join('\n');
}

export function benchmarkRowsToJson(rows: BenchmarkRow[]): string {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary: summarizeBenchmark(rows),
    rows,
  }, null, 2);
}
