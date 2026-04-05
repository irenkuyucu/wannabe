# Wannabe

Wannabe is a playful party game for people who are already in the same room.

Each round asks a simple question:

> Would you wanna be **this** or **that**?

Everyone joins on their phone, picks a side, argues for it out loud, and then votes on the winner. The app keeps the game moving with room codes, timers, scoring, and round flow.

## What Kind Of Game Is It

Wannabe is not meant to replace the fun part. It is there to support it.

The app takes care of:
- room creation and joining,
- round flow,
- timers,
- side selection,
- voting,
- scorekeeping,
- and moving the session from lobby to final results.

The real game happens between the players in person.

## How It Works

1. One player creates a room.
2. Everyone else joins with the room code or share link.
3. Players mark ready.
4. Each round starts with a “Would you rather be…” prompt.
5. Everyone picks a side.
6. The two sides make their case in timed speaking turns.
7. A rebuttal phase follows.
8. Everyone votes on the outcome.
9. The game updates scores and moves to the next round.
10. After the final round, the app shows the winner and full scoreboard.

## Best For

- friends hanging out in person
- party settings
- quick, replayable group sessions

## What The Current Version Includes

The current version is intentionally focused and lightweight:

- 6-digit room codes
- no account creation
- shared lobby with ready states
- fixed-length game sessions with multiple rounds
- timed round phases
- automatic scoring and game progression
- inactivity handling so the room does not get stuck if someone drops out

The goal is a clean, reliable social game loop, not a giant feature list.

## Deployment

The frontend is deployed as a static export on standard Firebase Hosting, while game actions and cleanup logic stay on Firebase Cloud Functions.

Use `pnpm deploy:dry-run` to validate the first release against `wannabe-game`, then `pnpm deploy` for the actual production deployment.

See [DEPLOYMENT.md](/Users/irencankuyucu/wannabe/DEPLOYMENT.md) for the environment variables and full deploy runbook.
