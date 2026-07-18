# Session Turn Timer Package Evidence (2026-07-18)

Packaged application rebuild evidence for the `turn-timer-2026-07-18` scope:
the ever-running `total:` session timer is replaced by a per-turn timer inside
the input row (starts on send, ends on turn end, folds into Total) so Total
shows the agent's summed active work time, identical for every provider.

## Change

- Core `turn-timing` module (`commit 57d77426`): a facade exposing the pure
  `deriveTurnTiming(events, sessionId)` contract over persisted
  `session:turn-state` events — closed running→idle pairs accumulate
  `activeMs`, repeated `running` events extend the same turn, and a trailing
  unclosed `running` from a previous app run is ignored.
- `turn-timer` UI module in session-interface (`commit ea0fffb6`): a facade
  with `TurnTimer` (input-row timer, rendered only while a turn runs) and
  `SessionTotalTimer` (footer-right sum of completed turns), following the
  `input-controls` small-module pattern.
- Session window wiring (`commit 0e4532bb`): `session-window-facade.tsx`
  derives per-session timing from Core events via `deriveTurnTiming`,
  `ElapsedTotal` is replaced by `SessionTotalTimer`, `TurnTimer` renders on
  the right side of the input row while the panel is disabled, plus the CSS
  and module doc sync.

## Verification

- Commit gates passed on all three implementation commits (`57d77426`,
  `ea0fffb6`, `0e4532bb`): `plan:validate`, architecture, Ultracite, Knip,
  typecheck, tests and docs-sync run enforced via `.husky/pre-commit`.
- Package: `npm run package:mac` (user-confirmed in the active plan) rebuilt
  `release/mac-arm64/Harness AI.app` on 2026-07-18 17:44 (unsigned, Electron
  42.5.0, darwin arm64). The previous app process was stopped by
  `package:stop-old`; the packaged bundle predating the final wiring commit
  (built 16:05) is replaced.
- Packaged `app.asar` SHA-256:
  `f152665e5d125ad4517854e0605b751b4c1de8c16a649243f26c52e93bb6a0c7`.
- Binary proof the new code is inside the package:
  - `deriveTurnTiming` occurs in `app.asar`, and the asar listing contains
    `/dist/runtime/product-parts/core-runtime/clusters/session-runtime/modules/turn-timing/src/turn-timing-facade.js`.
  - The renderer bundle inside `app.asar` is the fresh Vite build
    (`assets/index-JSYLBbFV.js`, `assets/index-CpkaSk-l.css`); the timer CSS
    hooks `session-input__turn` and `session-input__total` each occur twice
    (JS + CSS).

## Retest Checklist

- Open a session for every provider in the packaged app; the footer Total
  starts at `0:00` and no longer counts from session creation.
- Send a message: the input locks and the in-row turn timer starts on the
  right side of the input row.
- When the turn ends: the in-row timer disappears and its value folds into
  the footer Total; Total equals the summed active agent work time.
- Restart the app and reopen the session: Total is restored from the
  persisted turn-state events; an unclosed turn from the previous run does
  not leak into Total.
