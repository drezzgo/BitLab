import { getRealFormatFixture, makeUncompressedBmp } from './format-fixtures';

export type DemoSourceId =
  | 'repetitive'
  | 'varied-text'
  | 'structured'
  | 'random'
  | 'bmp'
  | 'png'
  | 'jpeg'
  | 'pdf'
  | 'zip';

export interface DemoSourceDefinition {
  id: DemoSourceId;
  title: string;
  fileName: string;
  mimeType: string;
  description: string;
  hypothesis: string;
}

export interface GeneratedDemoSource {
  definition: DemoSourceDefinition;
  bytes: Uint8Array;
}

export const DEMO_SOURCES: readonly DemoSourceDefinition[] = [
  {
    id: 'repetitive',
    title: 'Texto repetitivo',
    fileName: 'texto-repetitivo.txt',
    mimeType: 'text/plain',
    description: 'Patrones cortos que se repiten miles de veces.',
    hypothesis: 'Esperamos una distribución concentrada en pocos símbolos y oportunidades claras para que Huffman asigne códigos cortos a los más frecuentes.',
  },
  {
    id: 'varied-text',
    title: 'Texto variado',
    fileName: 'texto-variado.txt',
    mimeType: 'text/plain',
    description: 'Texto determinista con vocabulario, números y estructuras más diversas.',
    hypothesis: 'Esperamos una distribución menos concentrada que en el texto repetitivo. El resultado permite observar cómo cambia la entropía al aumentar la diversidad de la fuente.',
  },
  {
    id: 'structured',
    title: 'JSON estructurado',
    fileName: 'telemetria-estructurada.json',
    mimeType: 'application/json',
    description: 'Registros de telemetría con claves y valores que siguen patrones.',
    hypothesis: 'La sintaxis de JSON y los campos repetidos introducen estructura. Queremos comprobar cuánto de ese patrón resulta aprovechable para cada tamaño de palabra.',
  },
  {
    id: 'bmp',
    title: 'Imagen BMP sin compresión',
    fileName: 'patron-sin-compresion.bmp',
    mimeType: 'image/bmp',
    description: 'Raster RGB de 128×128 píxeles almacenado sin compresión.',
    hypothesis: 'Los píxeles siguen patrones espaciales repetidos. Queremos medir si esa estructura también produce redundancia en los símbolos binarios para distintos tamaños de palabra.',
  },
  {
    id: 'png',
    title: 'Imagen PNG',
    fileName: 'patron-comprimido.png',
    mimeType: 'image/png',
    description: 'La misma clase de patrón visual codificada como un PNG válido con compresión interna.',
    hypothesis: 'PNG ya transforma y comprime sus datos. Esperamos menos redundancia adicional que en BMP, pero el resultado debe comprobarse con las métricas reales.',
  },
  {
    id: 'jpeg',
    title: 'Imagen JPEG',
    fileName: 'patron-fotografico.jpg',
    mimeType: 'image/jpeg',
    description: 'Imagen JPEG válida codificada con compresión con pérdida.',
    hypothesis: 'JPEG ya elimina y codifica redundancia durante su creación. Huffman externo puede encontrar poco margen adicional; BitLab debe medirlo sin asumirlo por la extensión.',
  },
  {
    id: 'pdf',
    title: 'Documento PDF',
    fileName: 'documento-bitlab.pdf',
    mimeType: 'application/pdf',
    description: 'PDF válido de una página con texto y estructura de objetos/xref.',
    hypothesis: 'Un PDF puede combinar estructura textual y datos codificados. Su comportamiento depende del contenido interno, por lo que no esperamos una regla universal.',
  },
  {
    id: 'zip',
    title: 'Archivo ZIP',
    fileName: 'muestras-comprimidas.zip',
    mimeType: 'application/zip',
    description: 'ZIP válido con dos archivos realmente comprimidos mediante DEFLATE.',
    hypothesis: 'El contenido ya pasó por una etapa de compresión. Queremos observar cuánto margen adicional encuentra Huffman y cuánto pesa la metadata del contenedor.',
  },
  {
    id: 'random',
    title: 'Datos pseudoaleatorios',
    fileName: 'datos-pseudoaleatorios.bin',
    mimeType: 'application/octet-stream',
    description: '96 KiB generados con una semilla fija para repetir exactamente el experimento.',
    hypothesis: 'Esperamos una distribución más uniforme que en las fuentes textuales y, por tanto, menos ventaja para Huffman. La medición real debe confirmar cuánto cambia.',
  },
] as const;

const textEncoder = new TextEncoder();

function definitionFor(id: DemoSourceId): DemoSourceDefinition {
  const definition = DEMO_SOURCES.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Fuente de demostración desconocida: ${id}`);
  return definition;
}

function makeDeterministicRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state = 0x12345678;

  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    bytes[index] = state & 0xff;
  }

  return bytes;
}

function makeVariedText(): string {
  const sentences = [
    'Una red telemática transporta datos entre servicios con requisitos distintos de latencia y confiabilidad.',
    'La entropía describe la incertidumbre promedio de una fuente a partir de la probabilidad de sus símbolos.',
    'Huffman asigna palabras de código más cortas a símbolos frecuentes sin perder la posibilidad de decodificación exacta.',
    'Un archivo puede interpretarse como una secuencia de bits sin depender de su extensión o del programa que lo creó.',
    'Cambiar el tamaño de palabra modifica el alfabeto observado y puede alterar frecuencias, entropía, metadata y tamaño final.',
    'Los formatos previamente comprimidos pueden conservar poca redundancia adicional para una segunda etapa de codificación.',
    'El contenedor BitLab conserva información suficiente para reconstruir los bytes y verificar su integridad con SHA-256.',
    'Una medición útil distingue el tamaño del payload codificado del tamaño completo del contenedor que también incluye metadata.',
  ];

  return Array.from({ length: 1024 }, (_, index) => {
    const sentence = sentences[index % sentences.length];
    const node = (index * 7) % 31;
    const sample = (index * 13) % 997;
    return `${String(index + 1).padStart(4, '0')} | nodo-${node.toString().padStart(2, '0')} | muestra-${sample.toString().padStart(3, '0')} | ${sentence}`;
  }).join('\n');
}

export function generateDemoSource(id: DemoSourceId): GeneratedDemoSource {
  const definition = definitionFor(id);

  if (id === 'repetitive') {
    return {
      definition,
      bytes: textEncoder.encode('BITLAB|UD|TEORIA-DE-LA-INFORMACION|'.repeat(4096)),
    };
  }

  if (id === 'varied-text') {
    return {
      definition,
      bytes: textEncoder.encode(makeVariedText()),
    };
  }

  if (id === 'structured') {
    const records = Array.from({ length: 700 }, (_, index) => ({
      id: index,
      sensor: `nodo-${index % 8}`,
      state: index % 3 === 0 ? 'activo' : 'espera',
      value: (index % 17) * 5,
    }));

    return {
      definition,
      bytes: textEncoder.encode(JSON.stringify(records, null, 2)),
    };
  }

  if (id === 'bmp') {
    return {
      definition,
      bytes: makeUncompressedBmp(),
    };
  }

  if (id === 'png' || id === 'jpeg' || id === 'pdf' || id === 'zip') {
    return {
      definition,
      bytes: getRealFormatFixture(id),
    };
  }

  return {
    definition,
    bytes: makeDeterministicRandomBytes(96 * 1024),
  };
}
