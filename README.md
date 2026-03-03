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

Copy `.env.example` to `.env.local` and fill the Firebase Web App values when frontend Firebase initialization is introduced.

```bash
cp .env.example .env.local
```

By default, the template is set for local emulator usage:

- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`
- Auth emulator host: `127.0.0.1:9099`
- Firestore emulator host: `127.0.0.1:8080`
- Functions emulator host: `127.0.0.1:5001`

## Emulator Setup

Firebase project is configured as:

- default project: `wannabe-game`
- Firestore rules file: `firestore.rules`
- Firestore indexes file: `firestore.indexes.json`

Start local emulators:

```bash
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
