import fs from "node:fs";
import path from "node:path";

/**
 * @typedef {{ id: string; sideA: string; sideB: string }} Prompt
 */

const DEFAULT_SEED_PATH = path.join(process.cwd(), "data", "prompts.seed.json");

/**
 * @param {string} sessionKey
 */
function seedFromSessionKey(sessionKey) {
  let hash = 2166136261;
  for (let i = 0; i < sessionKey.length; i += 1) {
    hash ^= sessionKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * @param {number} seed
 */
function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {Prompt[]} prompts
 */
function validatePromptArray(prompts) {
  if (!Array.isArray(prompts)) {
    throw new TypeError("Prompt seed must be an array.");
  }

  for (const prompt of prompts) {
    if (
      typeof prompt?.id !== "string" ||
      typeof prompt?.sideA !== "string" ||
      typeof prompt?.sideB !== "string"
    ) {
      throw new TypeError("Each prompt must contain string id, sideA, and sideB.");
    }
  }
}

/**
 * @param {string} [seedPath]
 * @returns {Prompt[]}
 */
export function loadPromptSeed(seedPath = DEFAULT_SEED_PATH) {
  const raw = fs.readFileSync(seedPath, "utf-8");
  /** @type {Prompt[]} */
  const parsed = JSON.parse(raw);
  validatePromptArray(parsed);
  return parsed;
}

/**
 * Deterministically samples a prompt deck per session without replacement.
 *
 * @param {{ sessionKey: string; roundsTotal: number; prompts?: Prompt[] }} params
 * @returns {Prompt[]}
 */
export function createSessionPromptDeck({ sessionKey, roundsTotal, prompts }) {
  if (typeof sessionKey !== "string" || sessionKey.trim().length === 0) {
    throw new TypeError("sessionKey must be a non-empty string.");
  }

  if (!Number.isInteger(roundsTotal) || roundsTotal <= 0) {
    throw new RangeError("roundsTotal must be a positive integer.");
  }

  const promptPool = prompts ?? loadPromptSeed();
  validatePromptArray(promptPool);

  if (roundsTotal > promptPool.length) {
    throw new RangeError("roundsTotal cannot exceed prompt pool size.");
  }

  const shuffled = promptPool.slice();
  const random = mulberry32(seedFromSessionKey(sessionKey));

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, roundsTotal);
}
