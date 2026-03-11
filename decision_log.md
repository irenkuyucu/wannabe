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
