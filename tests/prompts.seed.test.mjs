import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const seedPath = path.join(process.cwd(), "data", "prompts.seed.json");

test("prompt seed file has valid schema and exact count", () => {
  const raw = fs.readFileSync(seedPath, "utf-8");
  const prompts = JSON.parse(raw);

  assert.ok(Array.isArray(prompts), "seed must be a JSON array");
  assert.equal(prompts.length, 50, "seed must contain exactly 50 prompts");
});

test("prompt ids are unique and match WB001..WB050", () => {
  const prompts = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const ids = prompts.map((prompt) => prompt.id);
  const uniqueIds = new Set(ids);

  assert.equal(uniqueIds.size, 50, "ids must be unique");

  const expectedIds = new Set(
    Array.from({ length: 50 }, (_, idx) => `WB${String(idx + 1).padStart(3, "0")}`),
  );

  assert.deepEqual(uniqueIds, expectedIds, "ids must match WB001..WB050");
});

test("prompt sides are non-empty strings and differ", () => {
  const prompts = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

  for (const [index, prompt] of prompts.entries()) {
    assert.equal(typeof prompt.id, "string", `id must be string at index ${index}`);
    assert.equal(
      typeof prompt.sideA,
      "string",
      `sideA must be string at index ${index}`,
    );
    assert.equal(
      typeof prompt.sideB,
      "string",
      `sideB must be string at index ${index}`,
    );

    assert.ok(prompt.sideA.trim().length > 0, `sideA must be non-empty at index ${index}`);
    assert.ok(prompt.sideB.trim().length > 0, `sideB must be non-empty at index ${index}`);
    assert.notEqual(
      prompt.sideA.trim().toLowerCase(),
      prompt.sideB.trim().toLowerCase(),
      `sideA and sideB must differ at index ${index}`,
    );
  }
});
