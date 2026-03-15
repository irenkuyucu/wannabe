# Wannabe

Wannabe is a synchronous, room-based party game companion web app.

## Prerequisites

- Node.js 20.x
- pnpm 10.x
- Firebase CLI
- Java Runtime (required by Firestore emulator)

## Install

```bash
pnpm install
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill the Firebase Web App values for the local frontend.

```bash
cp .env.example .env.local
```

By default, the template is set for local emulator usage:

- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`
- `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
- `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`
- `NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001`

## Frontend Local Review

The entry, lobby, and in-game phase UI now use Firebase Anonymous Auth, Functions callables, and Firestore subscriptions in the browser.

For local review:

```bash
cp .env.example .env.local
pnpm --dir functions build
firebase emulators:start --only auth,firestore,functions
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

For `M4-T3` review, use at least two browser windows/devices so you can:

- create and join a room,
- ready both players and start the game,
- validate choice, argument, rebuttal, and verdict timers,
- validate the 2-second hold controls for end-turn and host rebuttal advance.

Share links use dedicated join paths:

```text
/join/482901
```

## Emulator Setup

Firebase project is configured as:

- default project: `wannabe-game`
- Firestore rules file: `firestore.rules`
- Firestore indexes file: `firestore.indexes.json`

Start local emulators:

```bash
pnpm --dir functions build
firebase emulators:start --only auth,firestore,functions
```

Run a quick smoke test:

```bash
firebase emulators:exec --only auth,firestore "echo emulators-ok"
```

Emulator UI will be available at [http://127.0.0.1:4000](http://127.0.0.1:4000).

## Quality Checks

```bash
pnpm verify
```

## Playwright

Playwright is configured for repo-local browser checks with Chromium.

Run the default e2e suite:

```bash
pnpm test:e2e
```

Useful variants:

```bash
pnpm test:e2e:headed
pnpm test:e2e:ui
```

Notes:

- The config starts both the Firebase emulator trio (`auth`, `firestore`, `functions`) and `pnpm dev`, and expects the app at `http://localhost:3000` by default.
- Override the target URL with `PLAYWRIGHT_BASE_URL` if you want Playwright to attach to an already-running server.
- The suite includes a main-entry smoke spec plus emulator-backed `M4-T4` resolution/game-over coverage.
