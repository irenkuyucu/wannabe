const PROMPT_IDS = Array.from({ length: 50 }, (_, index) =>
  `WB${String(index + 1).padStart(3, "0")}`,
);

function seedFromSessionKey(sessionKey: string): number {
  let hash = 2166136261;

  for (let index = 0; index < sessionKey.length; index += 1) {
    hash ^= sessionKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSessionPromptIdDeck(params: {
  sessionKey: string;
  roundsTotal: number;
}): string[] {
  const { sessionKey, roundsTotal } = params;

  if (typeof sessionKey !== "string" || sessionKey.trim().length === 0) {
    throw new TypeError("sessionKey must be a non-empty string.");
  }

  if (!Number.isInteger(roundsTotal) || roundsTotal <= 0) {
    throw new RangeError("roundsTotal must be a positive integer.");
  }

  if (roundsTotal > PROMPT_IDS.length) {
    throw new RangeError("roundsTotal cannot exceed prompt pool size.");
  }

  const shuffled = PROMPT_IDS.slice();
  const random = mulberry32(seedFromSessionKey(sessionKey));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, roundsTotal);
}
