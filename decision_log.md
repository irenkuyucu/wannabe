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

- Date: 2026-03-15
- Decision ID: DEC-013
- Spec/Plan reference: UI polish follow-up on `PLAN.md` M4-T5
- Decision: Express frontend sizing with explicit px values across the app, including typography and animation distance values, while keeping responsive `clamp(...)` usage only where helpful and using px endpoints there too.
- Rationale: The ongoing localhost/Figma polish pass needs literal, low-friction sizing values so UI corrections can be made directly from screenshots without rem-to-px conversion or mixed Tailwind scale mental math.
- Alternatives considered: Keeping rem for typography only, continuing with the mixed rem/Tailwind-scale system, or limiting the conversion to the entry screen instead of the full app surface.
- Impacted files/modules: `src/app/globals.css`, `src/components/wannabe-app.tsx`, `src/components/in-game-panel.tsx`, `src/components/game-over-panel.tsx`, `src/components/session-scoreboard.tsx`, `src/components/ui/button.tsx`, `src/components/floating-avatar-field.tsx`

- Date: 2026-03-15
- Decision ID: DEC-014
- Spec/Plan reference: UI polish workflow follow-up on `PLAN.md` M4-T5
- Decision: Use webpack as the default local `pnpm dev` compiler path and keep Turbopack behind an explicit opt-in `pnpm dev:turbo` script.
- Rationale: A controlled reproduction on the bugfix branch showed that a global CSS edit in `src/app/globals.css` can trigger Fast Refresh under Turbopack without invalidating the compiled CSS chunk, while webpack dev mode reflected the same edit correctly on the same app and browser session.
- Alternatives considered: Keeping Turbopack as the default and relying on cache-clearing restarts, or pausing UI polish until the upstream Next/Turbopack issue is investigated externally.
- Impacted files/modules: `package.json`, `src/app/globals.css`

- Date: 2026-03-15
- Decision ID: DEC-015
- Spec/Plan reference: `PLAN.md` M4-T2 and M5 automated scenarios 16-17
- Decision: Separate invite and live room navigation into dedicated routes, using `/join/[roomCode]` for pre-join entry and `/rooms/[roomCode]` for an active joined room, while keying canonical room documents directly by the 6-digit room code.
- Rationale: Query-param routing conflated invite intent with active membership, which caused lobby refreshes to fall back into the join flow. Dedicated routes make invite and live-room state explicit, restore the lobby correctly on refresh, and remove the no-longer-needed room-code indirection.
- Alternatives considered: Keeping query-param routing, adding query-param variants for join/live state, or preserving a separate room-id to room-code mapping layer.
- Impacted files/modules: `src/app/page.tsx`, `src/app/join/[roomCode]/page.tsx`, `src/app/rooms/[roomCode]/page.tsx`, `src/components/wannabe-app.tsx`, `src/lib/lobby-utils.js`, `functions/src/domain/room-lifecycle.ts`, `functions/src/data/firestore-room-store.ts`, `tests/e2e/home.spec.ts`

- Date: 2026-03-19
- Decision ID: DEC-016
- Spec/Plan reference: M4 ongoing frontend polish pass on the dedicated route-driven UI
- Decision: Consolidate the live dedicated game surfaces around shared structural layers (`MenuScreen`, `Scoreboard`, `GameSyncScreen`, shared `.game-screen*` and `.game-meta*` classes, and shared skeleton blocks), while keeping only truly phase-specific body blocks separated by screen.
- Rationale: The remaining frontend complexity had shifted from feature logic to duplicated structural CSS and stale naming. Flattening those layers reduces maintenance cost, makes later spacing/rhythm polish easier, and aligns the active route-driven UI around shared primitives instead of repeated per-screen scaffolding.
- Alternatives considered: Continuing to polish each phase screen independently with separate shell/header/timer class families, or renaming stale structures without consolidating them.
- Impacted files/modules: `src/app/globals.css`, `src/components/menu-screen.tsx`, `src/components/scoreboard.tsx`, `src/components/game-sync-screen.tsx`, `src/components/choice-screen.tsx`, `src/components/argument-screen.tsx`, `src/components/rebuttal-screen.tsx`, `src/components/verdict-screen.tsx`, `src/components/resolution-screen.tsx`, `src/components/end-game-screen.tsx`, `src/components/floating-avatar-field.tsx`, `src/components/wannabe-app.tsx`

- Date: 2026-03-31
- Decision ID: DEC-017
- Spec/Plan reference: `PLAN.md` M4-T5
- Decision: Finish the UI refactor as a CSS-first shared-primitive pass, promoting reusable field and modal-shell infrastructure while keeping the React `Button` behavior-only and leaving screen-specific layout/rhythm local to each surface.
- Rationale: The strongest remaining duplication lived in visual/control shells rather than business logic. Extracting shared field, modal, avatar-frame, progress, and shell-adjacent primitives reduced duplication without introducing a prop-heavy component library or flattening genuinely distinct screen layouts into one abstraction.
- Alternatives considered: Continuing with only per-screen CSS cleanup, or pushing further into a broader React design-system rewrite with more generalized component APIs.
- Impacted files/modules: `src/app/globals.css`, `src/components/menu-screen.tsx`, `src/components/avatar-picker-modal.tsx`, `src/components/menu-avatar.tsx`, `src/components/ui/button.tsx`, `src/components/ui/field.tsx`, `src/components/ui/modal-shell.tsx`, `src/components/game-sync-screen.tsx`, `src/components/lobby-screen.tsx`, `src/components/floating-avatar-field.tsx`
- Related commit(s): `3c6b4e8`

- Date: 2026-03-31
- Decision ID: DEC-018
- Spec/Plan reference: `PLAN.md` M4-T5 and M5 validation work
- Decision: Cover transient loading and fallback UI with a split validation strategy: keep seeded/legitimate fallback states in Playwright, but test bootstrapping/loading-only surfaces such as the lobby skeleton at the component-test layer instead of forcing brittle network-failure E2E scenarios.
- Rationale: Real multiplayer/browser tests are the right fit for seeded room states like the in-game sync fallback, but bootstrapping transients proved sensitive to unrelated transport and auth timing. Moving those checks to component tests gives stable structural coverage without overfitting Playwright to failure mechanics.
- Alternatives considered: Forcing all loading/fallback coverage through Playwright by sabotaging network/emulator traffic, or leaving the new skeleton surfaces untested.
- Impacted files/modules: `tests/e2e/loading-surfaces.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/ui-primitives.test.tsx`
- Related commit(s): `3c6b4e8`

- Date: 2026-03-31
- Decision ID: DEC-019
- Spec/Plan reference: `SPEC.md` §§7.1, 10.1, 11.1 and `PLAN.md` pre-M5 follow-up / M5 automated scenarios
- Decision: Implement disconnect handling as a heartbeat-based presence layer inside the existing Firestore + Cloud Functions stack, using a `15s` callable heartbeat, `45s` stale-player eviction window, automatic host promotion/empty-room ending, and a `1 minute` scheduled cleanup sweep rather than adding RTDB presence or direct Firestore client writes.
- Rationale: This is the smallest complete solution that fully closes the disconnect gap without introducing a second datastore, relaxing Firestore security rules, or leaving the “everyone disappeared” case unresolved.
- Alternatives considered: Client-triggered cleanup only, or adding Firebase Realtime Database `onDisconnect` presence alongside Firestore.
- Impacted files/modules: `SPEC.md`, `PLAN.md`, `functions/src/domain/room-lifecycle.ts`, `functions/src/domain/round-actions.ts`, `functions/src/data/firestore-room-store.ts`, `functions/src/index.ts`, `src/lib/firebase-client.ts`, `src/components/wannabe-app.tsx`

- Date: 2026-04-02
- Decision ID: DEC-020
- Spec/Plan reference: `presence_spec.md`, `presence_plan.md`, `SPEC.md` §§7.1 and 11.1, `PLAN.md` pre-M5 follow-up
- Decision: Presence handling now uses a two-tier heartbeat model with `15s` callable heartbeats, `45s` soft timeout to inactive, `3m` hard timeout to removal, automatic host promotion from active players, and a lightweight client-side foreground recovery gate instead of immediate `45s` eviction.
- Rationale: The original single-threshold eviction model was too aggressive for common mobile backgrounding cases such as phone calls or short app switches. Splitting inactivity from removal preserves game continuity for short interruptions while still cleaning up truly abandoned players without adding RTDB presence or a larger reconnect subsystem.
- Alternatives considered: Keeping the original `45s` hard-eviction model, accepting a foreground return race without a recovery gate, or adding RTDB `onDisconnect` presence.
- Impacted files/modules: `presence_spec.md`, `presence_plan.md`, `SPEC.md`, `PLAN.md`, `functions/src/domain/room-lifecycle.ts`, `functions/src/domain/round-actions.ts`, `functions/src/data/firestore-room-store.ts`, `functions/src/index.ts`, `src/components/wannabe-app.tsx`, `src/lib/room-presence.ts`

- Date: 2026-04-02
- Decision ID: DEC-021
- Spec/Plan reference: `presence_plan.md` `P-T4`, `STATE.md` current status
- Decision: Defer the required real-device/mobile validation of presence/disconnect handling until after M5, when a deployed environment is available for honest phone testing, instead of blocking current progress on LAN/local-device setup.
- Rationale: The remaining unchecked risk is specifically real mobile browser background/foreground behavior. Agent-owned validation is already green, there are no live users yet, and deployed-environment phone testing is materially simpler and more representative than investing time now in local network setup.
- Alternatives considered: Blocking M5 on immediate LAN-based phone testing, or treating the feature as fully validated without any real-device follow-up.
- Impacted files/modules: `presence_plan.md`, `STATE.md`
