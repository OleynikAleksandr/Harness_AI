# Turn Timer Module

## Responsibility

Render the session turn timers as pure display: the per-turn input-row timer
(`TurnTimer`, visible only while a turn runs) and the footer-right total of
completed turns (`SessionTotalTimer`, replaces the legacy ever-running
`ElapsedTotal`). Timing truth (`activeMs`, `runningSince`) is derived in the
Core `turn-timing` module and arrives here as props; this module never derives
timing from events or provider payloads.

## Public Facade

`turn-timer-facade.tsx`

- `TurnTimer({ runningSince })` — ticks once per second while a turn is live;
  renders `null` when idle or when the timestamp is invalid.
- `SessionTotalTimer({ activeMs })` — static between turns; no interval.
- `formatElapsedMs(ms)` — shared `HHh MMm SSs` formatting (hours not capped
  at 99).

## Inputs

- `activeMs`: summed duration of every completed turn, in milliseconds.
- `runningSince`: ISO timestamp of the open turn's start, or `null`.

## Outputs

- `total: HHh MMm SSs` display (`session-input__total`).
- `turn: HHh MMm SSs` display (`session-input__turn`) while a turn runs.

## Owned Paths

- `module.md`
- `src/**`
