import { restoreWithRegisteredCodec } from '../codecs/registry';
import { parseBitLabContainer } from './format';
import type { RestoredBitLabFile } from './types';

export function restoreBitLabContainer(data: Uint8Array): RestoredBitLabFile {
  const parsed = parseBitLabContainer(data);
  const restored = restoreWithRegisteredCodec(parsed.header.codecId, data);

  return {
    ...restored,
    codecId: parsed.header.codecId,
  };
}
