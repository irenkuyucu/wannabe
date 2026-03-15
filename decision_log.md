# Wannabe Decision Log (Append-Only)

## Purpose
This file is the canonical, append-only record of technical/product decisions made together by the agent and the user. Must be used following instructions in `AGENTS.md`. It is not a log of **all** decisions. Only append **significant** decisions, or when the user requests an entry.

---

## Entry template
- Date: YYYY-MM-DD
- Decision ID: prefixed by "DEC-", incremented by 1 per entry
- Spec/Plan reference: reference point to the concerned part(s) of spec or plan files
- Decision: brief description of the decision.
- Rationale: brief reasoning behind the decision.
- Alternatives considered: use this field to briefly describe alternative options considered only if there was a real discussion around the decision. Do not invent "alternatives considered".
- Impacted files/modules: use this field only if impacted files/modules exist, excluding docs/logs unless the decision is explicitly about docs/logs themselves.
- Related commit(s): use this field only if related commit(s) exist.

---

- Date: 2026-03-11
- Decision ID: DEC-001
- Spec/Plan reference: `SPEC.md` §§5-7 and `PLAN.md` M3-T3 callable/state requirements
- Decision: Backend round creation uses a deterministic in-functions prompt-id deck keyed by `roomId`, synchronized to the canonical `WB001`-`WB050` seed ids.
- Rationale: This keeps backend round state authoritative and repeatable without introducing a runtime dependency from the Firebase functions package to the web app's seed loader or repo-root JSON path during deploy.
- Alternatives considered: Reading the repo-root seed JSON directly from functions runtime, or deferring prompt ids entirely until frontend milestones.
- Impacted files/modules: `functions/src/domain/prompt-deck.ts`, `functions/src/domain/room-lifecycle.ts`, `functions/src/domain/round-actions.ts`

- Date: 2026-03-11
- Decision ID: DEC-002
- Spec/Plan reference: `SPEC.md` §4 and `PLAN.md` M4-T1
- Decision: The Milestone 4 frontend direction uses a warm poster-like visual system with strong accent color, rounded capsule actions, and phase-specific screen cards shown directly on the homepage as the review artifact.
- Rationale: A single direction board keeps the first UI review concrete, aligns the title/lobby/in-game surfaces under one visual language, and sets reusable patterns before wiring live Firebase data into the screens.
- Alternatives considered: Keeping the existing neutral scaffold styling longer, or building functional screens first and deferring visual direction until later polish.
- Impacted files/modules: `src/app/page.tsx`, `src/app/globals.css`, `src/components/ui/button.tsx`, `next.config.ts`

- Date: 2026-03-11
- Decision ID: DEC-003
- Spec/Plan reference: `PLAN.md` M4-T1
- Decision: Keep the M4-T1 gate open and rework the UI direction immediately toward a more toy-like, mobile-game-inspired visual system before starting M4-T2.
- Rationale: The first draft established useful structure but still read too much like a SaaS/web-product interface; correcting the core visual language now is cheaper than propagating the wrong component style through the lobby and in-game screens.
- Alternatives considered: Accepting the current direction and deferring the visual rework to a later post-implementation polish sprint.
- Impacted files/modules: `src/app/page.tsx`, `src/app/globals.css`, `src/components/ui/button.tsx`

- Date: 2026-03-11
- Decision ID: DEC-4
- Spec/Plan reference: `PLAN.md` M4-T2 and required automated scenario 16
- Decision: The entry and lobby flow live on the root route and share links use the query format `/?room=123456`, with the homepage reading the query to prefill join intent and then switching into the live lobby once a room is joined.
- Rationale: This keeps room entry friction low, avoids introducing extra route complexity before the in-game screens exist, and gives the share-link review a stable URL format that directly matches the plan.
- Alternatives considered: Separate join/create routes, a dedicated room route such as `/room/[code]`, or deferring query-format links until after the lobby UI was built.
- Impacted files/modules: `src/components/wannabe-app.tsx`, `src/lib/lobby-utils.js`, `src/lib/firebase-client.ts`

- Date: 2026-03-12
- Decision ID: DEC-005
- Spec/Plan reference: `SPEC.md` §§5, 7.2-7.5 and `PLAN.md` M4-T3
- Decision: The live in-game UI derives directly from Firestore room/round snapshots, while timed phase expiry uses a client-side staggered `tickRoom` fallback based on joined-player order to reduce duplicate timeout transitions.
- Rationale: This keeps backend state authoritative, avoids introducing a separate scheduler before it is justified, and lowers same-deadline callable races compared with having every client tick immediately.
- Alternatives considered: Host-only timeout driving, all clients ticking immediately at deadline, or building a dedicated backend timeout worker as part of M4-T3.
- Impacted files/modules: `src/components/wannabe-app.tsx`, `src/components/in-game-panel.tsx`, `src/lib/firebase-client.ts`, `src/lib/in-game-ui.js`

- Date: 2026-03-12
- Decision ID: DEC-006
- Spec/Plan reference: `SPEC.md` §7.2 and `PLAN.md` automated scenario 3
- Decision: Choice-phase timeout assignment now fills missing players toward the most balanced side split possible, using randomness only when both side assignments are equally balanced, before applying the existing empty-side force-assignment rule.
- Rationale: This matches intended gameplay better than purely uniform assignment for every missing player, reduces avoidable lopsided rounds, and still preserves randomness when the room is already balanced.
- Alternatives considered: Keeping uniform random assignment for every missing choice, or fully deterministic assignment to the smaller side with no randomness in tied cases.
- Impacted files/modules: `functions/src/domain/game-domain.ts`, `functions/tests/game-domain.test.ts`

- Date: 2026-03-12
- Decision ID: DEC-007
- Spec/Plan reference: `SPEC.md` §§7.2, 8.2 and `PLAN.md` automated scenario 3
- Decision: Choice resolution keeps explicit picks fixed unless a side is empty, resolves missing picks to the most balanced final split possible, and if one side remains empty, randomly force-moves the minimum number of players needed for the most balanced non-empty split; round bonus logic is decoupled from forced players and now applies to the sole representative of a side in rounds that started with at least three players.
- Rationale: This preserves player agency for explicit picks, fixes lopsided timeout outcomes caused by the earlier single-force-player model, and aligns the bonus with the actual high-risk lone-side role rather than the implementation detail of how that player got there.
- Alternatives considered: Keeping the previous single forced-player bonus model, rebalancing all uneven explicit splits, or dropping the lone-side bonus entirely.
- Impacted files/modules: `functions/src/domain/game-domain.ts`, `functions/src/domain/room-lifecycle.ts`, `functions/src/domain/round-actions.ts`

- Date: 2026-03-12
- Decision ID: DEC-008
- Spec/Plan reference: `AGENTS.md` §§3-6 and `PLAN.md` M4-T4
- Decision: Commit and push the current M4-T4 implementation before user-owned validation is complete, while explicitly keeping the task gate open and resuming validation after Codex relaunch with Playwright/MCP support.
- Rationale: The user needs to relaunch the Codex app to activate advanced browser-testing capabilities, and preserving the current implementation on the branch avoids losing state while still honoring that M4-T4 remains pending.
- Alternatives considered: Waiting to commit until the normal post-validation point, or leaving the changes uncommitted during the relaunch and relying on the local working tree.
- Impacted files/modules: `package.json`, `pnpm-lock.yaml`, `src/components/wannabe-app.tsx`, `src/components/in-game-panel.tsx`, `src/components/game-over-panel.tsx`, `src/components/session-scoreboard.tsx`, `src/lib/session-summary.js`

- Date: 2026-03-12
- Decision ID: DEC-009
- Spec/Plan reference: `PLAN.md` M4-T4 follow-up and forthcoming M4-T5/M5 validation work
- Decision: Keep the current Playwright setup intentionally minimal and task-scoped for now, and defer broader multiplayer test architecture, stronger Playwright best-practice layering, and auditable artifact workflow design until later coverage expansion requires them.
- Rationale: The current harness already covers the delegated M4-T4 browser scenarios and unblocks immediate frontend progress; pushing further into full 4-6 player architecture, codegen-assisted selector workflow, and artifact policy now would expand scope before the responsive polish and later end-to-end needs are fully shaped.
- Alternatives considered: Expanding immediately into a larger Playwright fixture/screen-model system with richer multiplayer abstractions and audit outputs before closing M4-T4.
- Impacted files/modules: `playwright.config.ts`, `tests/e2e/`

- Date: 2026-03-12
- Decision ID: DEC-010
- Spec/Plan reference: `PLAN.md` M4-T5 validation requirement (`pnpm verify`)
- Decision: Root ESLint now ignores generated `functions/lib/**` output so repository validation runs against maintained source files and no longer fails on compiled CommonJS artifacts.
- Rationale: `pnpm verify` is the required agent-owned check for M4-T5, and linting generated build output created noise unrelated to source correctness; excluding compiled artifacts is the simpler and more correct validation boundary.
- Alternatives considered: Converting compiled files to ESM-compatible lint output, or continuing to treat the generated-file lint noise as an unresolved known issue.
- Impacted files/modules: `eslint.config.mjs`

- Date: 2026-03-13
- Decision ID: DEC-011
- Spec/Plan reference: `PLAN.md` M4-T5
- Decision: Milestone 4 Task 5 now treats the default UI as a player-facing game surface and moves non-essential state inspection behind an explicit optional details/debug reveal.
- Rationale: The oversized layout problem came from presenting too much debugging/state information by default. Fixing that required a product-direction change, not just more size tuning.
- Alternatives considered: Continuing with incremental spacing and typography tweaks while preserving the same always-visible dashboard-style layout.
- Impacted files/modules: `PLAN.md`, `src/components/wannabe-app.tsx`, `src/components/in-game-panel.tsx`, `src/components/game-over-panel.tsx`, `src/components/session-scoreboard.tsx`, `src/app/globals.css`

- Date: 2026-03-15
- Decision ID: DEC-012
- Spec/Plan reference: `SPEC.md` §§4.2-4.4 and `PLAN.md` avatar data notes
- Decision: Replace the temporary CSS/emoji avatar stand-ins with the shipped local SVG avatar set, and let players pick their avatar from a simple popup grid during the entry/join flow before entering the lobby.
- Rationale: The placeholder avatar treatment is below the quality bar for the current UI polish pass, while the new local SVG set is already available in-repo and can be applied consistently without introducing external dependencies or changing backend data shape.
- Alternatives considered: Keeping the CSS-drawn entry avatar longer, limiting the new assets to the entry screen only, or deferring avatar selection until a later milestone.
- Impacted files/modules: `public/avatars/`, `src/lib/avatar-options.ts`, `src/components/entry-avatar.tsx`, `src/components/entry-screen.tsx`, `src/components/wannabe-app.tsx`
