# Wannabe Decision Log (Append-Only)

## Purpose
This file is the canonical, append-only record of technical/product decisions made together by the agent and the user. Must be used following instructions in `AGENTS.md`. It is not a log of **all** decisions. Only append **significant** decisions, or when the user requests an entry.

---

## Entry template
- Date: YYYY-MM-DD.
- Decision ID: prefixed by "D-", incremented by 1 per entry.
- Spec/Plan reference: reference point to the concerned part(s) of spec or plan files.
- Decision: brief description of the decision.
- Rationale: brief reasoning behind the decision.
- Alternatives considered: brief description of alternative options discussed or considered.
- Impacted files/modules: use this field only if impacted files/modules exist.
- Related commit(s): use this field only if related commit(s) exist.

---

- Date: 2026-03-11.
- Decision ID: D-1.
- Spec/Plan reference: `SPEC.md` §§5-7 and `PLAN.md` M3-T3 callable/state requirements.
- Decision: Backend round creation uses a deterministic in-functions prompt-id deck keyed by `roomId`, synchronized to the canonical `WB001`-`WB050` seed ids.
- Rationale: This keeps backend round state authoritative and repeatable without introducing a runtime dependency from the Firebase functions package to the web app's seed loader or repo-root JSON path during deploy.
- Alternatives considered: Reading the repo-root seed JSON directly from functions runtime, or deferring prompt ids entirely until frontend milestones.
- Impacted files/modules: `functions/src/domain/prompt-deck.ts`, `functions/src/domain/room-lifecycle.ts`, `functions/src/domain/round-actions.ts`.

- Date: 2026-03-11.
- Decision ID: D-2.
- Spec/Plan reference: `SPEC.md` §4 and `PLAN.md` M4-T1.
- Decision: The Milestone 4 frontend direction uses a warm poster-like visual system with strong accent color, rounded capsule actions, and phase-specific screen cards shown directly on the homepage as the review artifact.
- Rationale: A single direction board keeps the first UI review concrete, aligns the title/lobby/in-game surfaces under one visual language, and sets reusable patterns before wiring live Firebase data into the screens.
- Alternatives considered: Keeping the existing neutral scaffold styling longer, or building functional screens first and deferring visual direction until later polish.
- Impacted files/modules: `src/app/page.tsx`, `src/app/globals.css`, `src/components/ui/button.tsx`, `next.config.ts`.

- Date: 2026-03-11.
- Decision ID: D-3.
- Spec/Plan reference: `PLAN.md` M4-T1.
- Decision: Keep the M4-T1 gate open and rework the UI direction immediately toward a more toy-like, mobile-game-inspired visual system before starting M4-T2.
- Rationale: The first draft established useful structure but still read too much like a SaaS/web-product interface; correcting the core visual language now is cheaper than propagating the wrong component style through the lobby and in-game screens.
- Alternatives considered: Accepting the current direction and deferring the visual rework to a later post-implementation polish sprint.
- Impacted files/modules: `decision_log.md`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/ui/button.tsx`.

- Date: 2026-03-11.
- Decision ID: D-4.
- Spec/Plan reference: `PLAN.md` M4-T2 and required automated scenario 16.
- Decision: The entry and lobby flow live on the root route and share links use the query format `/?room=123456`, with the homepage reading the query to prefill join intent and then switching into the live lobby once a room is joined.
- Rationale: This keeps room entry friction low, avoids introducing extra route complexity before the in-game screens exist, and gives the share-link review a stable URL format that directly matches the plan.
- Alternatives considered: Separate join/create routes, a dedicated room route such as `/room/[code]`, or deferring query-format links until after the lobby UI was built.
- Impacted files/modules: `src/components/wannabe-app.tsx`, `src/lib/lobby-utils.js`, `src/lib/firebase-client.ts`, `README.md`.

- Date: 2026-03-12.
- Decision ID: D-5.
- Spec/Plan reference: `SPEC.md` §§5, 7.2-7.5 and `PLAN.md` M4-T3.
- Decision: The live in-game UI derives directly from Firestore room/round snapshots, while timed phase expiry uses a client-side staggered `tickRoom` fallback based on joined-player order to reduce duplicate timeout transitions.
- Rationale: This keeps backend state authoritative, avoids introducing a separate scheduler before it is justified, and lowers same-deadline callable races compared with having every client tick immediately.
- Alternatives considered: Host-only timeout driving, all clients ticking immediately at deadline, or building a dedicated backend timeout worker as part of M4-T3.
- Impacted files/modules: `src/components/wannabe-app.tsx`, `src/components/in-game-panel.tsx`, `src/lib/firebase-client.ts`, `src/lib/in-game-ui.js`.

- Date: 2026-03-12.
- Decision ID: D-6.
- Spec/Plan reference: `SPEC.md` §7.2 and `PLAN.md` automated scenario 3.
- Decision: Choice-phase timeout assignment now fills missing players toward the most balanced side split possible, using randomness only when both side assignments are equally balanced, before applying the existing empty-side force-assignment rule.
- Rationale: This matches intended gameplay better than purely uniform assignment for every missing player, reduces avoidable lopsided rounds, and still preserves randomness when the room is already balanced.
- Alternatives considered: Keeping uniform random assignment for every missing choice, or fully deterministic assignment to the smaller side with no randomness in tied cases.
- Impacted files/modules: `SPEC.md`, `PLAN.md`, `decision_log.md`, `functions/src/domain/game-domain.ts`, `functions/tests/game-domain.test.ts`.

- Date: 2026-03-12.
- Decision ID: D-7.
- Spec/Plan reference: `SPEC.md` §§7.2, 8.2 and `PLAN.md` automated scenario 3.
- Decision: Choice resolution keeps explicit picks fixed unless a side is empty, resolves missing picks to the most balanced final split possible, and if one side remains empty, randomly force-moves the minimum number of players needed for the most balanced non-empty split; round bonus logic is decoupled from forced players and now applies to the sole representative of a side in rounds that started with at least three players.
- Rationale: This preserves player agency for explicit picks, fixes lopsided timeout outcomes caused by the earlier single-force-player model, and aligns the bonus with the actual high-risk lone-side role rather than the implementation detail of how that player got there.
- Alternatives considered: Keeping the previous single forced-player bonus model, rebalancing all uneven explicit splits, or dropping the lone-side bonus entirely.
- Impacted files/modules: `SPEC.md`, `PLAN.md`, `decision_log.md`, `functions/src/domain/game-domain.ts`, `functions/src/domain/room-lifecycle.ts`, `functions/src/domain/round-actions.ts`.

- Date: 2026-03-12.
- Decision ID: D-8.
- Spec/Plan reference: `AGENTS.md` §§3-6 and `PLAN.md` M4-T4.
- Decision: Commit and push the current M4-T4 implementation before user-owned validation is complete, while explicitly keeping the task gate open and resuming validation after Codex relaunch with Playwright/MCP support.
- Rationale: The user needs to relaunch the Codex app to activate advanced browser-testing capabilities, and preserving the current implementation on the branch avoids losing state while still honoring that M4-T4 remains pending.
- Alternatives considered: Waiting to commit until the normal post-validation point, or leaving the changes uncommitted during the relaunch and relying on the local working tree.
- Impacted files/modules: `STATE.md`, `decision_log.md`, `package.json`, `pnpm-lock.yaml`, `src/components/wannabe-app.tsx`, `src/components/in-game-panel.tsx`, `src/components/game-over-panel.tsx`, `src/components/session-scoreboard.tsx`, `src/lib/session-summary.js`.

- Date: 2026-03-12.
- Decision ID: D-9.
- Spec/Plan reference: `PLAN.md` M4-T4 follow-up and forthcoming M4-T5/M5 validation work.
- Decision: Keep the current Playwright setup intentionally minimal and task-scoped for now, and defer broader multiplayer test architecture, stronger Playwright best-practice layering, and auditable artifact workflow design until later coverage expansion requires them.
- Rationale: The current harness already covers the delegated M4-T4 browser scenarios and unblocks immediate frontend progress; pushing further into full 4-6 player architecture, codegen-assisted selector workflow, and artifact policy now would expand scope before the responsive polish and later end-to-end needs are fully shaped.
- Alternatives considered: Expanding immediately into a larger Playwright fixture/screen-model system with richer multiplayer abstractions and audit outputs before closing M4-T4.
- Impacted files/modules: `STATE.md`, `decision_log.md`, `playwright.config.ts`, `tests/e2e/`.
