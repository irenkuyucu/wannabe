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
