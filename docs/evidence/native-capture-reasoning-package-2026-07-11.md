# Native Request Capture Reasoning Selection Package - 2026-07-11

## Scope

Add an explicit, Core-owned reasoning selector to Native Request Capture for
the two native capture providers (Claude and Codex), apply the selected value
at each provider boundary, qualify every generated artifact filename with the
selected reasoning effort, prove Codex Ultra end to end, and rebuild the
unsigned macOS arm64 package after explicit user approval.

## Contract Correction

The earlier Sol/Terra raw JSONL files did not prove that Ultra was lost. Their
paired diagnostics already recorded `codex_app_server_turn_start_request` with
`effort: "ultra"`; Codex 0.144.1 then normalized the downstream
`response.create.reasoning.effort` to `max`. Raw JSONL remains the honest
provider request and is not rewritten.

The repaired capture contract keeps these layers explicit:

- the Core descriptor returns model-specific reasoning ids, labels, and
  defaults for Claude and Codex;
- `capture-native-request` validates the exact `(provider, model, reasoning)`
  selection and rejects unsupported pairs instead of silently downgrading;
- the provider-neutral command/context carries the same selected effort into
  the adapter and artifact writer;
- Claude interactive capture passes `--effort low|medium|high|xhigh|max` and
  records model/effort in its applied envelope (`ultracode` remains a separate
  orchestration mode, not an effort value);
- Codex passes the explicit selection to `turn/start.effort` before adapter
  defaults;
- the Settings card renders only Core-returned options and submits the selected
  id without renderer-owned capability maps;
- artifact stems use
  `<timestamp>-<provider>-<model>-<reasoning>-native-request.*`.

## Automated Verification

- Every implementation commit passed the enforced commit hooks: architecture,
  Ultracite, Knip, typecheck, and the full test suite.
- Final suite count: `80` test groups.
- New Codex service test starts a fake app-server with adapter default `high`,
  supplies explicit `ultra`, and verifies the emitted
  `turn/start.effort === "ultra"`, applied envelope, and diagnostic record.
- Claude PTY argv coverage verifies `--model ... --effort max`.
- Native Capture card coverage verifies Core defaults/options are rendered and
  `reasoningEffort` is submitted without importing provider capability maps.
- `npm run build`: passed.
- `npm run check:dup`: passed (`1.46%` repo and `1.96%` workspace duplicated
  lines, below configured thresholds).
- `npm run check:security`: passed, `0` production vulnerabilities.
- `npm run check:links`: passed.

## Live Capture Proof

Both captures were invoked through the freshly built runtime against the
existing authenticated provider homes and the `Test_png` workspace.

### Codex GPT-5.6 Sol Ultra

- Raw JSONL:
  `/Users/oleksandroliinyk/.harness-ai/logs/native-request-capture/2026-07-11T14-57-02-524Z-codex-gpt-5.6-sol-ultra-native-request.jsonl`
- Diagnostics:
  `/Users/oleksandroliinyk/.harness-ai/logs/native-request-capture/2026-07-11T14-57-02-524Z-codex-gpt-5.6-sol-ultra-native-request.diagnostics.jsonl`
- `capture_start.selectedReasoningEffort`: `ultra`.
- `codex_app_server_turn_start_request.payload.effort`: `ultra`.
- Captured upstream `response.create.reasoning.effort`: `max` (expected Codex
  normalization).
- Raw JSONL SHA-256:
  `0e5da75a9fa141e2430fdd5ca3bc7b1338aa41380c5a46662e3190fbc0004637`.
- Diagnostics SHA-256:
  `477fc06e5f1cb25c5f1268cfdc33f8aed947788200989b7855212b3a6e484692`.

### Claude Sonnet Max

- Raw JSONL:
  `/Users/oleksandroliinyk/.harness-ai/logs/native-request-capture/2026-07-11T14-59-29-667Z-claude-sonnet-max-native-request.jsonl`
- Diagnostics:
  `/Users/oleksandroliinyk/.harness-ai/logs/native-request-capture/2026-07-11T14-59-29-667Z-claude-sonnet-max-native-request.diagnostics.jsonl`
- `capture_start.selectedReasoningEffort`: `max`.
- Applied envelope: `model: "sonnet"`, `reasoningEffort: "max"`,
  `mode: "interactive_cli"`.
- Captured upstream model: `claude-sonnet-5`.
- Captured upstream `output_config.effort`: `max`.
- Raw JSONL SHA-256:
  `8adc95a0cb0a72e3ac7f17c1df0cfd83f77c7b43794e166675447f741906f345`.
- Diagnostics SHA-256:
  `dffa753cd788fd9d19e5c98c94b46b551a88f9c0de1cebdc930bc6cab5826a17`.

## Package Verification

- Command: `npm run package:mac`.
- App: `release/mac-arm64/Harness AI.app`.
- Archive:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Archive size: `29,881,762` bytes.
- Archive timestamp: `2026-07-11T16:57:54+0200`.
- Archive SHA-256:
  `76c15c75982d09afe7326a10fd0ce9d7a45583d1f826ca5963155fd57db5d06e`.
- Direct `@electron/asar` reads confirmed the packaged runtime contains the
  Core reasoning command, reasoning-qualified writer, Claude `--effort`, Codex
  explicit-effort precedence, and the per-model capture catalog.
- The packaged renderer bundle contains `settings.nativeCapture.reasoning`,
  `defaultReasoningEffort`, and `reasoningEfforts`.
- Packaged-app launch smoke passed; the new app main process was observed as
  PID `54670`.

## User Retest

The packaged app is ready for user acceptance in Settings -> General -> Native
Request Capture. Select provider, model, and reasoning; the returned paths must
contain `<model>-<reasoning>-native-request`, and Codex Ultra diagnostics must
show `turn/start.effort: "ultra"` even when its raw upstream body shows `max`.
