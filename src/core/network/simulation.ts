export type NetworkGeneration = '5G' | '6G';

export interface NetworkProfile {
  generation: NetworkGeneration;
  throughputMbps: number;
  latencyMs: number;
  note: string;
}

// Escenarios de laboratorio editables; no representan una red ni una garantía comercial.
export const NETWORK_PROFILES: NetworkProfile[] = [
  { generation: '5G', throughputMbps: 100, latencyMs: 20, note: 'Escenario ilustrativo de enlace móvil' },
  { generation: '6G', throughputMbps: 1000, latencyMs: 5, note: 'Escenario hipotético de investigación' },
];

export function estimateTransfer(bytes: number, throughputMbps: number, latencyMs: number, efficiencyPercent: number) {
  if (!Number.isFinite(bytes) || bytes < 0 || !Number.isFinite(throughputMbps) || throughputMbps <= 0 ||
      !Number.isFinite(latencyMs) || latencyMs < 0 || !Number.isFinite(efficiencyPercent) ||
      efficiencyPercent <= 0 || efficiencyPercent > 100) {
    throw new RangeError('Parámetros de simulación no válidos');
  }
  const effectiveMbps = throughputMbps * efficiencyPercent / 100;
  const transmissionMs = bytes * 8 / (effectiveMbps * 1_000_000) * 1000;
  return { effectiveMbps, transmissionMs, totalMs: latencyMs + transmissionMs };
}

export interface FileSignal {
  entropyBitsPerByte: number;
  adjacentRepeatPercent: number;
  sampledBytes: number;
  recommendation: 'raw' | 'huffman' | 'rle-huffman' | 'lz77-huffman';
  reason: string;
}

export function inspectFileSignal(bytes: Uint8Array): FileSignal {
  const counts = new Uint32Array(256);
  let repeats = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    counts[bytes[index]] += 1;
    if (index > 0 && bytes[index] === bytes[index - 1]) repeats += 1;
  }
  let entropy = 0;
  for (const count of counts) {
    if (count > 0) {
      const probability = count / bytes.length;
      entropy -= probability * Math.log2(probability);
    }
  }
  const repeatPercent = bytes.length > 1 ? repeats / (bytes.length - 1) * 100 : 0;
  let recommendation: FileSignal['recommendation'];
  let reason: string;
  if (bytes.length === 0 || entropy > 7.8) {
    recommendation = 'raw';
    reason = 'La muestra tiene entropía alta o está vacía; comprimir puede añadir sobrecarga.';
  } else if (repeatPercent >= 18) {
    recommendation = 'rle-huffman';
    reason = 'Hay muchos bytes consecutivos iguales; RLE puede aprovechar esas rachas.';
  } else if (entropy < 5.5) {
    recommendation = 'huffman';
    reason = 'La distribución de bytes es desigual; Huffman puede asignar códigos más cortos.';
  } else {
    recommendation = 'lz77-huffman';
    reason = 'La muestra puede contener patrones separados; conviene probar referencias LZ77.';
  }
  return { entropyBitsPerByte: entropy, adjacentRepeatPercent: repeatPercent, sampledBytes: bytes.length, recommendation, reason };
}
