import { createChannelRandom, transmitFrame } from './error-channel';
import { decodeErrorFrame, encodeErrorFrame, ERROR_CODES, type ErrorCode } from './error-codes';

export const MAX_CHANNEL_BYTES = 1024 * 1024;

export interface ErrorSimulationOptions {
  code: ErrorCode;
  probability: number;
  seed: number;
}

export interface FrameExample {
  index: number;
  sent: string;
  received: string;
  original: string;
  recovered: string;
  syndrome: number;
  flips: number;
  payloadErrors: number;
}

export interface ErrorSimulationResult {
  recovered: Uint8Array<ArrayBuffer>;
  payloadBits: number;
  transmittedBits: number;
  redundancyBits: number;
  codeRate: number;
  frames: number;
  channelBitErrors: number;
  channelFrameErrors: number;
  residualBitErrors: number;
  residualFrameErrors: number;
  channelBer: number;
  channelFer: number;
  residualBer: number;
  residualFer: number;
  detectedFrames: number;
  undetectedFrames: number;
  correctedFrames: number;
  miscorrectedFrames: number;
  examples: FrameExample[];
}

export function simulateErrorControl(
  input: Uint8Array,
  { code, probability, seed }: ErrorSimulationOptions,
): ErrorSimulationResult {
  if (input.length === 0 || input.length > MAX_CHANNEL_BYTES) {
    throw new RangeError('La entrada debe contener entre 1 byte y 1 MiB.');
  }
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError('La probabilidad debe estar entre 0 % y 100 %.');
  }

  const random = createChannelRandom(seed);
  const config = ERROR_CODES[code];
  const payloadBits = input.length * 8;
  const frames = Math.ceil(payloadBits / config.payloadBits);
  const redundancyBits = frames * config.checkBits;
  const transmittedBits = payloadBits + redundancyBits;
  const recovered = new Uint8Array(input.length);
  const examples: FrameExample[] = [];
  let affectedExample: FrameExample | null = null;
  let channelBitErrors = 0;
  let channelFrameErrors = 0;
  let residualBitErrors = 0;
  let residualFrameErrors = 0;
  let detectedFrames = 0;
  let undetectedFrames = 0;
  let correctedFrames = 0;
  let miscorrectedFrames = 0;

  const dataBuffer = new Uint8Array(config.payloadBits);
  const decodedBuffer = new Uint8Array(config.payloadBits);
  const sentBuffer = new Uint8Array(config.payloadBits + config.checkBits);
  const receivedBuffer = new Uint8Array(sentBuffer.length);
  let data = dataBuffer;
  let decoded = decodedBuffer;
  let sent = sentBuffer;
  let received = receivedBuffer;

  for (let index = 0; index < frames; index++) {
    const start = index * config.payloadBits;
    const length = Math.min(config.payloadBits, payloadBits - start);
    if (length < dataBuffer.length) {
      data = dataBuffer.subarray(0, length);
      decoded = decodedBuffer.subarray(0, length);
      sent = sentBuffer.subarray(0, length + config.checkBits);
      received = receivedBuffer.subarray(0, sent.length);
    }
    for (let bit = 0; bit < length; bit++) {
      const offset = start + bit;
      data[bit] = (input[offset >>> 3] >>> (7 - (offset & 7))) & 1;
    }
    encodeErrorFrame(code, data, sent);
    const flips = transmitFrame(sent, received, probability, random);
    const syndrome = decodeErrorFrame(code, received, decoded);

    let payloadErrors = 0;
    for (let bit = 0; bit < length; bit++) {
      const offset = start + bit;
      recovered[offset >>> 3] |= decoded[bit] << (7 - (offset & 7));
      if (data[bit] !== decoded[bit]) payloadErrors++;
    }
    channelBitErrors += flips;
    if (flips) channelFrameErrors++;
    residualBitErrors += payloadErrors;
    if (payloadErrors) residualFrameErrors++;
    if (syndrome) detectedFrames++;
    if (flips && !syndrome) undetectedFrames++;
    if (code === 'hamming74' && syndrome) {
      if (flips === 1) correctedFrames++;
      else miscorrectedFrames++;
    }

    if (index < 3 || (flips > 0 && !affectedExample && !examples.some((example) => example.flips))) {
      const example = {
        index, sent: sent.join(''), received: received.join(''), original: data.join(''),
        recovered: decoded.join(''), syndrome, flips, payloadErrors,
      };
      if (index < 3) examples.push(example);
      else affectedExample = example;
    }
  }
  if (affectedExample) examples.push(affectedExample);

  return {
    recovered, payloadBits, transmittedBits, redundancyBits, frames,
    codeRate: payloadBits / transmittedBits,
    channelBitErrors, channelFrameErrors, residualBitErrors, residualFrameErrors,
    channelBer: channelBitErrors / transmittedBits,
    channelFer: channelFrameErrors / frames,
    residualBer: residualBitErrors / payloadBits,
    residualFer: residualFrameErrors / frames,
    detectedFrames, undetectedFrames, correctedFrames, miscorrectedFrames, examples,
  };
}
