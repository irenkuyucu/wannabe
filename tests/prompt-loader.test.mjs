import test from "node:test";
import assert from "node:assert/strict";

import {
  createSessionPromptDeck,
  loadPromptSeed,
} from "../src/lib/prompt-loader.js";

test("loadPromptSeed returns the canonical 50 prompt entries", () => {
  const prompts = loadPromptSeed();
  assert.equal(prompts.length, 50);
  assert.equal(prompts[0].id, "WB001");
  assert.equal(prompts[49].id, "WB050");
});

test("createSessionPromptDeck is deterministic for the same session key", () => {
  const first = createSessionPromptDeck({
    sessionKey: "room-123456",
    roundsTotal: 10,
  });

  const second = createSessionPromptDeck({
    sessionKey: "room-123456",
    roundsTotal: 10,
  });

  assert.deepEqual(
    first.map((prompt) => prompt.id),
    second.map((prompt) => prompt.id),
  );
});

test("createSessionPromptDeck samples without replacement", () => {
  const deck = createSessionPromptDeck({
    sessionKey: "room-654321",
    roundsTotal: 10,
  });

  const ids = deck.map((prompt) => prompt.id);
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
});

test("createSessionPromptDeck throws when roundsTotal exceeds pool", () => {
  assert.throws(
    () =>
      createSessionPromptDeck({
        sessionKey: "room-overflow",
        roundsTotal: 51,
      }),
    /cannot exceed prompt pool size/i,
  );
});
