import nextEnv from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { loadEnvConfig } = nextEnv;

const REQUIRED_PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const EMULATOR_HOST_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST",
  "NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST",
  "NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST",
];

export function validateReleaseEnv(env) {
  const issues = [];

  for (const key of REQUIRED_PUBLIC_ENV_KEYS) {
    const value = env[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      issues.push(`${key} is required for release builds.`);
      continue;
    }

    if (value.startsWith("replace-")) {
      issues.push(`${key} still uses a placeholder value.`);
    }
  }

  if (env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== "false") {
    issues.push(
      "NEXT_PUBLIC_USE_FIREBASE_EMULATORS must be exactly 'false' for release builds.",
    );
  }

  for (const key of EMULATOR_HOST_ENV_KEYS) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      issues.push(`${key} must be unset for release builds.`);
    }
  }

  if (
    typeof env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "string" &&
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "wannabe-game"
  ) {
    issues.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID must equal 'wannabe-game' for release builds.");
  }

  return issues;
}

export function runPredeployCheck({ cwd = process.cwd() } = {}) {
  loadEnvConfig(cwd, false);
  return validateReleaseEnv(process.env);
}

function main() {
  const cwd = process.cwd();
  const issues = runPredeployCheck({ cwd });

  if (issues.length > 0) {
    console.error("Release preflight failed.");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Release preflight passed for ${cwd}.`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentFilePath = fileURLToPath(import.meta.url);

if (entrypointPath === currentFilePath) {
  main();
}
