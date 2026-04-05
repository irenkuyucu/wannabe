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

For local emulator work, keep those same web-app values and override the emulator flags in `.env.local`:

- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`
- `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
- `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`
- `NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001`

## One-Time Project Setup

1. Confirm the Firebase project is selected:
   `firebase use wannabe-game`
2. Confirm the required Firestore index file is present:
   [firestore.indexes.json](/Users/irencankuyucu/wannabe/firestore.indexes.json)
3. Confirm billing is enabled if deploying Cloud Functions and the scheduled cleanup job.

## Dry Run

Run the deployment dry run from the repo root:

```bash
pnpm deploy:dry-run
```

This command:

1. builds the static frontend export with `pnpm build`
2. validates Firebase Hosting output from `out/`
3. validates Functions and Firestore index deployment against `wannabe-game`

## Production Deploy

Deploy the frontend, functions, and Firestore indexes together:

```bash
pnpm deploy
```

The root deploy scripts pin the Firebase project explicitly with `--project wannabe-game`, and [firebase.json](/Users/irencankuyucu/wannabe/firebase.json) now pins the default Hosting site as `wannabe-game`, so the first production release does not depend on CLI alias inference.

## Post-Deploy Checks

1. Open the deployed site and create a room.
2. Join from a second browser/device using the copied share link.
3. Confirm the live URL uses the root route with explicit query state:
   `/?join=123456` for invite entry and `/?live=123456` for active room restoration.
4. Confirm callable actions succeed in the deployed environment.
5. Run the deferred real-device/mobile presence checklist from `P-T4`.
