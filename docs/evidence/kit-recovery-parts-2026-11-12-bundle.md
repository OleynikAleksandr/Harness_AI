# Workflow Kit 2.2.3 bundle — 2026-11-12

Scope: `kit-recovery-parts-2026-11-12`, round R1, delivery task `D1`. Source
commit: `3e860d87` (`docs: reconcile documentation for R1`). Confirmation:
the user's words «И выполни и пересобери новый релиз… Harness AI, а потом и
нашего Workflow Kit» and «Я все принимаю. Дальше делай все как положено».

## Build

- `npm run build:workflow-kit` → exit 0; `dist/workflow-kit/workflow.mjs`
  (424 KB, 10 801 lines, sha256
  `8891de2ff127deae1819f132123ca12cbd98af77dec666c44209366ea925497e`),
  `KIT_VERSION = "2.2.3"`.

## Smoke on temporary projects

With a temporary `GIT_CONFIG_GLOBAL` holding a test identity:

- `install` into a new git project: `.claude/settings.json` has six
  SessionStart groups `"$CLAUDE_PROJECT_DIR/scripts/workflow" hook
  session-start --client claude --part 1/6` … `6/6`; `.codex/hooks.json` has
  one entry `scripts/workflow hook session-start --client codex` with
  `"additionalContextLimit": 65536`; the managed `AGENTS.md` section has the
  new rule «The recovery packet arrives at session start (Claude: in parts
  K/N)…».
- A project installed with the 2.2.2 bundle (one Claude group): `inspect`
  with the new bundle → `KIT_OUTDATED`, version 2.2.2, action `update`;
  `install --update` → commit `chore: update workflow kit to 2.2.3`, six
  Claude groups, `inspect` `KIT_OK` 2.2.3, `doctor` ok.
- `hook session-start --client claude --part K/6` in this repository (packet
  15 145 characters): parts 1/2 (9 412) and 2/2 (5 915) with one digest,
  parts 3–6 without `additionalContext`; the parts without their first lines
  join to the whole packet. `--part 9/6` → stderr line, answer without
  `additionalContext`, exit 0.
- A project with a scope and two required documents of ~22 KB (packet 49 741
  characters, over the budget): six parts of 9 443, 9 439, 9 426, 9 495,
  9 497 and 2 975 characters, one digest.

## Live provider runs

- Claude Code 2.1.322 (`claude -p`, no tools) in that project: the transcript
  has six `hook_additional_context` items, all inline (no
  `<persisted-output>`); the agent names all six parts (they arrive out of
  order), the one digest and the opening and closing codes of both required
  documents.
- Codex 0.167.2 (`codex exec`, hooks approved through `codex app-server` as
  Workflow Kit does it, `~/.codex/config.toml` restored byte for byte
  afterwards): the 49 795-byte packet arrives whole in one hook; the agent
  names all four codes and sees no truncation marker.
- Unit of `additionalContextLimit`: a hook of 30 000 bytes with
  `"additionalContextLimit": 20000` arrives whole, so the limit counts
  Codex's token estimate (bytes / 4), not bytes; 65 536 covers about
  256 KB.

## Left to the user's check

- A new Claude and a new Codex session from the Workflow Kit panel once its
  bundle is updated to 2.2.3 (Workflow Kit scope `m21-recovery-one-turn`,
  task T002).
