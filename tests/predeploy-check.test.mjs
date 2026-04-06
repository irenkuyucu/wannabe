import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  runPredeployCheck,
  validateReleaseEnv,
} from "../scripts/predeploy-check.mjs";

const PREDEPLOY_SCRIPT_PATH = fileURLToPath(
  new URL("../scripts/predeploy-check.mjs", import.meta.url),
);

const VALID_RELEASE_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "firebase-web-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "wannabe-game.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "wannabe-game",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "wannabe-game.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:abcdef123456",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "false",
};

function runCli(cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [PREDEPLOY_SCRIPT_PATH], {
      cwd,
      env: {},
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test("validateReleaseEnv accepts a valid production Firebase config", () => {
  assert.deepEqual(validateReleaseEnv(VALID_RELEASE_ENV), []);
});

test("validateReleaseEnv rejects missing Firebase config", () => {
  const issues = validateReleaseEnv({
    ...VALID_RELEASE_ENV,
    NEXT_PUBLIC_FIREBASE_APP_ID: "",
  });

  assert.ok(issues.includes("NEXT_PUBLIC_FIREBASE_APP_ID is required for release builds."));
});

test("validateReleaseEnv rejects placeholder values", () => {
  const issues = validateReleaseEnv({
    ...VALID_RELEASE_ENV,
    NEXT_PUBLIC_FIREBASE_API_KEY: "replace-with-firebase-web-api-key",
  });

  assert.ok(issues.includes("NEXT_PUBLIC_FIREBASE_API_KEY still uses a placeholder value."));
});

test("validateReleaseEnv rejects emulator mode", () => {
  const issues = validateReleaseEnv({
    ...VALID_RELEASE_ENV,
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
  });

  assert.ok(
    issues.includes(
      "NEXT_PUBLIC_USE_FIREBASE_EMULATORS must be exactly 'false' for release builds.",
    ),
  );
});

test("validateReleaseEnv rejects emulator hosts and mismatched project ids", () => {
  const issues = validateReleaseEnv({
    ...VALID_RELEASE_ENV,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "wrong-project",
    NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST: "127.0.0.1:5001",
  });

  assert.ok(
    issues.includes("NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST must be unset for release builds."),
  );
  assert.ok(
    issues.includes(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID must equal 'wannabe-game' for release builds.",
    ),
  );
});

test("runPredeployCheck loads Next-style env files before validation", async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "wannabe-predeploy-success-"));
  const originalEnv = { ...process.env };

  try {
    await writeFile(
      path.join(fixtureDir, ".env.local"),
      `${Object.entries(VALID_RELEASE_ENV)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")}\n`,
      "utf8",
    );

    assert.deepEqual(runPredeployCheck({ cwd: fixtureDir }), []);
  } finally {
    process.env = originalEnv;
    await rm(fixtureDir, { recursive: true, force: true });
  }
});

test("predeploy CLI reports actionable failures from env files", async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "wannabe-predeploy-fail-"));

  try {
    await writeFile(
      path.join(fixtureDir, ".env.local"),
      `${Object.entries({
        ...VALID_RELEASE_ENV,
        NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
        NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST: "127.0.0.1:5001",
      })
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")}\n`,
      "utf8",
    );

    const { code, stdout, stderr } = await runCli(fixtureDir);

    assert.equal(code, 1);
    assert.equal(stdout, "");
    assert.match(stderr, /Release preflight failed\./);
    assert.match(stderr, /NEXT_PUBLIC_USE_FIREBASE_EMULATORS must be exactly 'false'/);
    assert.match(stderr, /NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST must be unset/);
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});
