# Wannabe

Wannabe is a playful party game for people who are together in the same room.

Each round asks a simple question:

> Would you wanna be **this** or **that**?

Everyone joins on their phone, picks a side, argues for it out loud, and then votes on the winner. The app keeps the room moving with timers, scoring, and a simple round flow, but the fun still happens face to face.

## What Kind Of Game Is It

Wannabe is not meant to replace the real game. It is there to support it.

The app takes care of:
- room creation and joining,
- round flow,
- timers,
- side selection,
- voting,
- scorekeeping,
- and moving the session from lobby to final results.

The actual debating, convincing, defending, and trash talk all happen in person.

## How It Works

1. One player creates a room.
2. Everyone else joins with the room code or share link.
3. Players mark ready.
4. Each round starts with a “Would you wanna be…” prompt.
5. Everyone picks a side.
6. The two sides make their case in timed speaking turns.
7. A rebuttal phase follows.
8. Everyone votes on the outcome.
9. The game updates scores and moves to the next round.
10. After the final round, the app shows the winner and full scoreboard.

## Best For

- 2-6 players
- Friends hanging out
- Pregame or after-dinner groups
- Casual parties
- Quick, replayable group sessions

## Current Features

- No accounts needed, jump in and play
- Shared lobby with ready states
- Fixed-length game sessions with multiple rounds
- Timed round phases
- Automatic scoring and game progression
- Inactivity handling so the room does not get stuck if someone drops out

## Built With

- Next.js, React, TypeScript, and Tailwind CSS on the frontend.
- Real-time game state runs on Firebase — Firestore for sync, Cloud Functions for game logic, and Anonymous Auth so players can jump in without creating an account.
- Deployed as a static export on Firebase Hosting.