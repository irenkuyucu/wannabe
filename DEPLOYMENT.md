# Wannabe Deployment Runbook

## Production Shape

- Frontend: static Next.js export served by standard Firebase Hosting
- Backend compute: Firebase Cloud Functions v2 in `europe-west1`
- Data: Cloud Firestore
- Auth: Firebase Anonymous Auth

This repo does not use Firebase App Hosting. The frontend is exported to `out/` during `pnpm build`, and Firebase Hosting serves that output directly.

## Required Environment Variables

The frontend build needs the Firebase web app config:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`

Production release builds also require:

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID=wannabe-game`
- no `replace-...` placeholder values in any required `NEXT_PUBLIC_FIREBASE_*` variable
- no emulator host overrides set in the release shell (`NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`, `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST`, `NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST`)

For local emulator work, keep those same web-app values and override the emulator flags in `.env.local`:

- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`
- `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
- `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`
- `NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001`

## One-Time Project Setup

1. Use Node.js 22 locally when running the final release-validation/deploy path so the Functions package matches its declared runtime target.
2. Confirm the Firebase project is selected:
   `firebase use wannabe-game`
3. Confirm the required Firestore index file is present:
   [firestore.indexes.json](/Users/irencankuyucu/wannabe/firestore.indexes.json)
4. Confirm Firebase Authentication has the **Anonymous** sign-in provider enabled for `wannabe-game`.
5. Confirm Blaze billing is enabled before deploying Cloud Functions and the scheduled cleanup job.
6. Confirm the Functions/Scheduler-related deployment APIs are enabled already, or allow the Firebase CLI to auto-enable them during dry-run/deploy.

## Release Checklist

1. Run the production-env preflight:

```bash
pnpm predeploy:check
```

2. Run the deterministic release build:

```bash
pnpm build:release
```

3. Run the deployment dry run:

```bash
pnpm deploy:dry-run
```

4. Run the production deploy:

```bash
pnpm deploy
```

5. Complete the post-deploy smoke checks below.

Do not use raw `firebase deploy` as the primary operator path for production releases; the package scripts above are the supported entrypoints because they enforce preflight and rebuild both Hosting and Functions artifacts.

## Dry Run

Run the deployment dry run from the repo root:

```bash
pnpm deploy:dry-run
```

This command:

1. runs `pnpm predeploy:check` against the effective Next.js production env
2. builds the static frontend export with `pnpm build:web`
3. rebuilds Functions output with `pnpm build:functions`
4. validates Firebase Hosting output from `out/`
5. validates Functions and Firestore index deployment against `wannabe-game`

## Production Deploy

Deploy the frontend, functions, and Firestore indexes together:

```bash
pnpm deploy
```

The root deploy scripts pin the Firebase project explicitly with `--project wannabe-game`, and [firebase.json](/Users/irencankuyucu/wannabe/firebase.json) now pins the default Hosting site as `wannabe-game`, so the first production release does not depend on CLI alias inference.

## Post-Deploy Checks

1. Open the deployed site and create a room successfully from a fresh browser session.
2. Join from a second browser/device using the copied share link.
3. Confirm the live URL uses the root route with explicit query state:
   `/?join=123456` for invite entry and `/?live=123456` for active room restoration.
4. Confirm callable room actions succeed in the deployed environment: create, join, ready toggle, start game, phase actions, and return-to-main.
5. Confirm the scheduled cleanup job is present in the Firebase console after deploy.
6. Run the deferred real-device/mobile presence checklist from `P-T4`, including background/foreground recovery and inactivity removal behavior.
