# Session Profiles

## Decision

Harness AI will let the user select a **session profile** before a session
starts. A profile packages the two things that today are hardcoded per
provider — the **system prompt** and the **system tooling** — into
user-editable documents that Core Runtime loads from disk at session start,
without rebuilding the app.

- Profiles are owned by a **new Core Runtime cluster** (`session-profiles`).
- Profile content lives in **user-space files** under
  `~/.harness-ai/Profiles/**` (`HARNESS_AI_HOME`), because profiles apply to
  every workspace.
- Every provider gets its **own pair of documents per profile** (system
  prompt + tooling), because prompt/tooling application mechanics differ per
  provider.
- A virtual **Native profile** always exists, is always first, and is the
  fallback when no profile is selected: it means "do not interfere with the
  channel's default behavior".
- Core enforces profile resolution at session creation. UI only submits the
  user's selection and renders Core-provided catalog data (per the Core
  Authority rules in `AGENTS.md` and `docs/architecture/NextSessionMode.md`).

Motivation: the user should be able to start each session with only the
instructions and tools relevant to the task at hand (plan documents, todo
plans, reviews, specifications, ...). Less irrelevant instruction text and
fewer irrelevant tool schemas per request means less noise for the model and
fewer wasted tokens.

Agreed with the user in chat on 2026-07-02. UI surface design is explicitly
deferred to a separate discussion after this document is approved.

## Audited Provider Capabilities (2026-07-02)

The four providers in scope were audited in code and against their installed
binaries/SDKs. Line numbers are as of the audit date and may drift.

| Provider | Channel | System prompt override | Tooling override | Application point |
| --- | --- | --- | --- | --- |
| Claude | `@anthropic-ai/claude-agent-sdk` 0.3.195 (in-process) | Full replace (`systemPrompt: string`) or preset `claude_code` + `append` | `tools: string[]` whitelist (`[]` disables all), `disallowedTools`, tools preset | SDK query options per session |
| Codex | `codex app-server` subprocess, codex-cli 0.142.5, JSON-RPC | Full replace via `thread/start` `baseInstructions` (plus `developerInstructions`, `config`) | Process-level only: `--disable <feature>` flags at app-server spawn; no per-thread tool params | `thread/start` params + per-profile process launch |
| Kimi | `kimi acp` subprocess, kimi 0.18.0, ACP JSON-RPC | Full replace via materialized agent file: `agent.yaml` → `system_prompt_path: ./system.md` | Explicit `tools:` list of Kimi-native tool ids in `agent.yaml` | Agent files materialized on disk before `session/new` |
| GLM Native | Our own HTTP client (`fetch` → `api.z.ai` `/chat/completions`, SSE) | Full control: we compose the system message ourselves | Full control: we send our own tool schemas (21 tools) and execute them locally | Our request builder per turn |

Key audited facts (for implementers):

- **Claude** — `claude-sdk-manager.ts` `buildQueryOptions()` (lines 268-321)
  already passes a custom `systemPrompt` string
  (`buildClaudeWorkspaceSystemPrompt()`: hardcoded workflow prompt + workspace
  path + workspace `AGENTS.md`) and `tools: [...runtimeProfile.toolNames]`
  where `toolNames` is the hardcoded whitelist
  `CODEAI_CLAUDE_WORKFLOW_TOOLS = ["Read", "Write", "Edit", "WebSearch"]`
  (`claude-runtime-profile.ts` lines 24-33). The SDK type
  (`sdk.d.ts` lines 1300-1359, 1942-1947) confirms:
  `systemPrompt?: string | string[] | { type: 'preset'; preset: 'claude_code';
  append?; excludeDynamicSections? }` and `tools?: string[] | { type:
  'preset'; preset: 'claude_code' }` plus `allowedTools` / `disallowedTools` /
  `mcpServers` / `settingSources`. Conclusion: today's "Claude" is already a
  hardcoded managed profile, not native Claude Code.
- **Codex** — the adapter spawns `codex app-server` with per-purpose process
  profiles (`codex-app-server-process-profile.ts`: default `["app-server"]`;
  workflow adds `--disable multi_agent --disable computer_use ...`). The main
  session path (`codex-app-server-facade.ts` line 161 `thread/start`) sends
  only `{cwd, approvalPolicy, sandbox, model, persistExtendedHistory}` — it
  does NOT populate `baseInstructions`, but the protocol accepts it, and the
  diagnostic/translation path already sends it
  (`codex-native-request-capture-service.ts` lines 212-237 with
  `codex-workflow-instruction-profile.ts` / `codex-translation-prompt-profile.ts`).
  There is no per-thread tool selection in the protocol: tool availability is
  fixed by `--disable` flags at process spawn.
- **Kimi** — the adapter runs `kimi acp` (`kimi-managed-agent-profile.ts`
  line 416) and ACP itself has no prompt/tool fields (`session/new` params:
  `{cwd, mcpServers}`; `session/set_config_option` supports only `model` and
  `thinking` — `kimi-session-lifecycle.ts`). Instead the adapter ALREADY
  materializes a managed agent before start:
  `~/.harness-ai/providers/kimi/home/codeai-managed-agent/agent.yaml` with
  `system_prompt_path: ./system.md` (an ~82KB workflow prompt) and an explicit
  `tools:` list of Kimi-native ids (`kimi_cli.tools.file:ReadFile`, `...:Glob`,
  `...:Grep`, `...:WriteFile`, `...:StrReplaceFile`, `kimi_cli.tools.shell:Shell`).
  Profiles plug into exactly this mechanism: regenerate the agent documents
  per profile before `session/new`. The precise binding mechanism (how the
  CLI locates `agent.yaml` — cwd, config, or env) must be re-verified as the
  first Kimi implementation step; parallel sessions with different profiles
  will need per-profile agent directories.
- **GLM Native** — our own client end to end: no subprocess;
  `glm-native-provider-adapter.ts` `buildRequestBody()` (lines 354-378) is the
  single injection point — line 361 injects
  `buildGlmNativeSystemMessage(profile)` (system instruction built per turn in
  `glm-native-agent-runtime.ts` lines 250-286: role line, env block with
  model/workspace/date, language contract, behavior rules, workspace
  `AGENTS.md`) and line 372 sends `tools: GLM_NATIVE_WORKFLOW_TOOLS` (21 tool
  schemas defined in `glm-native-agent-runtime.ts` lines 30-222 /
  `glm-native-expanded-tool-definitions.ts`, executed locally by our agentic
  loop, up to 64 tool steps per turn). No prompt caching/hashing exists — the
  system message is rebuilt every turn.

Existing seam to reuse: `NextSessionMode`
(`session-request-handler/src/next-session-mode.ts`) already defines
`invocationMode: "native" | "managed"`, `managedProfileId?`,
`managedProfileSelection?` — currently hard-resolved to `Native · Raw` and
hardcoded by the renderer (`session-window-facade.tsx` line ~233). Provider
Registry already exposes `ProviderInvocationProfile` descriptors
(`native-raw`, `managed-auto-normalizer`) as display-only metadata. This
feature activates that seam instead of inventing a parallel one.

## Profile Model

A **profile** is a top-level concept (directory) identified by a kebab-case
id. It has:

- one **passport** (`profile.yaml`): display name and description for the UI;
- one **document pair per provider**: `system-prompt.md` (the full system
  prompt body) and `tooling.yaml` (tooling category switches).

Rules:

- Missing `<profile>/<providerId>/` pair ⇒ the profile is **not offered** for
  that provider. No cross-provider fallback, no content synthesis.
- The **Native profile is virtual**: it has no directory on disk. It is always
  present, always listed first, and means "channel default, no interference".
- Profiles are **fixed for the lifetime of a session**. Changing profile means
  starting a new session (matches Codex/Kimi mechanics where prompt/tooling
  are fixed at process/session start).
- Files are read from disk at session start — **no cache**, no rebuild step.
  Editing a file affects the next session.
- Seeding follows the `UserGlossaryStore` precedent
  (`localization-runtime/src/user-glossary-store.ts`): on first access Core
  creates the standard profile set with seeded content; after that the files
  belong to the user and are never overwritten by Harness.

## Storage Layout

```
~/.harness-ai/Profiles/                  <- HARNESS_AI_HOME userspace root
  plan-document/
    profile.yaml                         <- passport (one per profile)
    claude/
      system-prompt.md                   <- whole body = the system prompt
      tooling.yaml                       <- tooling category switches
    codex/
      system-prompt.md
      tooling.yaml
    kimi/
      system-prompt.md
      tooling.yaml
    glm-native/
      system-prompt.md
      tooling.yaml
  todo-plan-deterministic/ ...
  review/ ...
  architecture-spec/ ...
```

`profile.yaml` (passport):

```yaml
# Session profile passport. Shown in the profile picker.
name: Plan Document
description: Build a structured planning document for a feature or scope.
```

`tooling.yaml` (per provider pair):

```yaml
# Tooling categories for this profile/provider pair.
# on  = the adapter enables its native tools of this category
# off = the adapter removes/disables them
categories:
  file-read: on
  file-write: on
  shell: off
  web: on
  git: off
  tests: off
```

`system-prompt.md`: plain Markdown; the entire file body is the profile's
system prompt. No frontmatter, no service sections.

Format decisions (agreed 2026-07-02): YAML for passport and tooling (this
introduces a YAML parser as a new runtime dependency — the repo currently only
writes YAML strings for the Kimi agent file, never parses any); Markdown for
the prompt body. Directory grouping is profile → providers (one passport per
profile, applicability by presence of provider subdirectories).

## Tooling Category Vocabulary

Profiles speak provider-neutral **categories**; each adapter maps categories
to its native mechanism. Native tool names never appear in profile documents
(a future extension may add per-provider overrides, out of MVP scope).

Vocabulary v1: `file-read`, `file-write`, `shell`, `web`, `git`, `tests`.

Honest applicability matrix (what each adapter can actually do):

| Category | Claude (tools whitelist) | Codex (`--disable` flags) | Kimi (`agent.yaml` tools) | GLM Native (our schemas) |
| --- | --- | --- | --- | --- |
| file-read | Read, Glob, Grep | not controllable | ReadFile, ReadMediaFile, Glob, Grep | read_file, read_file_anchored, grep_files, glob_files |
| file-write | Write, Edit | not controllable | WriteFile, StrReplaceFile | write_file, edit_file, edit_file_by_anchor, apply_patch |
| shell | Bash | not controllable | Shell | exec_command |
| web | WebSearch, WebFetch | maps to feature flags (verify exact ids, e.g. `tool_search`) | (none today — n/a) | web_search, web_fetch, browser_fetch |
| git | via shell (no distinct tools) | not controllable | via Shell | git_status, git_diff, git_log, git_blame |
| tests | via shell | not controllable | via Shell | run_tests |

Matrix rules:

- A category an adapter cannot control is applied as a **no-op** and the
  adapter reports its effective tooling in its session log; the final
  per-adapter mapping tables live in each adapter's `module.md` and are
  fixed during implementation (the exact Claude tool-name list and Codex flag
  ids must be verified against the installed versions).
- Categories that only exist via `shell` (git/tests on Claude/Kimi) follow the
  `shell` switch there; GLM Native can honor them independently.
- Codex additionally keeps its existing purpose-specific `--disable` sets; a
  profile's categories translate into the closest process profile, and the
  app-server instance is (re)launched per tooling profile (agreed
  2026-07-02: acceptable cost; the prompt part stays per-thread and needs no
  process restart).

## Layered System Prompt

A profile's `system-prompt.md` replaces only the **workflow layer**. Core's
materializer always adds a thin **system framing layer** so profiles never
have to duplicate technical context:

- workspace path (and workspace `AGENTS.md` contents where the channel does
  not already inject it natively);
- current date;
- localization/language contract (chat and artifact language), same data the
  adapters use today;
- for **GLM Native only**: the tool-contract section that teaches the model
  how to drive our local agentic loop. A fully arbitrary prompt without this
  section would silently degrade tool calling, so the materializer owns it,
  not the profile author.

Prompt mode is **replace-only** in v1 (every audited channel supports full
replace; Claude's preset+`append` stays available to a future profile field
without breaking the format).

## Native Profile Semantics (per provider)

"Native" = the channel's default behavior with no Harness interference:

- **Claude**: `systemPrompt: { type: 'preset', preset: 'claude_code' }` and
  `tools: { type: 'preset', preset: 'claude_code' }` (full native toolset).
  Harness process-level decisions (permission mode, setting sources, provider
  home isolation) remain product policy, not profile content.
- **Codex**: omit `baseInstructions`/`developerInstructions`; launch the
  app-server with the default (no `--disable`) argument profile.
- **Kimi**: do not materialize a managed agent; let the CLI use its built-in
  default agent (verify the exact "no custom agent" launch path during
  implementation).
- **GLM Native**: our built-in system instruction and the full 21-tool set —
  by definition, since no external default exists for our own client.

Note: for Claude and Kimi, Native is a **behavior change vs today** (today
they always run the hardcoded CodeAI workflow prompt/tool whitelist). The
current hardcoded content becomes seed material for managed profiles instead
of being silently lost.

## New Cluster: `session-profiles` (Core Runtime)

`product-parts/core-runtime/clusters/session-profiles/` with three modules,
each behind its facade:

1. **`profile-store`** — disk truth. Resolves the `Profiles/` root inside the
   harness home (same home-resolution approach as
   `resolveCoreLocalizationRootDirectory()`), scans profile directories,
   parses passport/tooling/prompt files, validates with human-readable errors
   (unknown category, missing file, YAML syntax), seeds the standard profile
   set on first access, exposes file paths for editor opening. Owns the YAML
   dependency.
2. **`profile-catalog`** — selection truth. Builds the catalog read model for
   UI (passports + per-provider applicability), always injects the virtual
   Native profile first, resolves `(profileId, providerId)` → document pair,
   resolves "no selection" → Native, and defines the error contract for a
   selected-but-broken profile (see Session Start Contract).
3. **`profile-materializer`** — payload truth. Turns a resolved document pair
   into the provider-neutral `SessionProfilePayload`: prompt body + system
   framing layer (workspace, date, language, AGENTS.md policy flag, GLM tool
   contract) + tooling categories. Adapters receive this payload; they never
   read profile files themselves.

Category→native-tool mapping lives in the **adapters** (Provider Runtime),
not in this cluster: tool names are provider knowledge. Core speaks
categories only.

## Session Start Contract

- The renderer submits the user's selection through the existing
  `NextSessionMode` field `managedProfileId` (`invocationMode: "managed"`)
  or `invocationMode: "native"`. No new UI-side truth.
- `session-request-handler` stops hard-resolving `Native · Raw`: it resolves
  the received mode through `profile-catalog`, obtains a
  `SessionProfilePayload` from `profile-materializer`, stores the applied
  profile id/name on the Core session (event/read-model visibility), and
  passes the payload into the adapter via the extended
  `provider-adapter-contract` (`createSession`/`resumeSession` options).
- **No selection ⇒ Native.** The session always can start; Native is the
  guaranteed fallback. (UI will make selection an explicit step, but Core
  never deadlocks on a missing selection.)
- **Selected but broken ⇒ error, not silent fallback.** If the selected
  profile fails to load/parse/resolve for the session's provider, Core
  rejects session creation with a structured error for the UI. Silently
  starting with different instructions than the user chose is worse than
  failing visibly.
- Resumed sessions keep their original profile binding; if its files are now
  broken, resume follows the same error contract.

## Adapter Application Strategies

Contract: `provider-adapter-contract` gains an optional
`SessionProfilePayload` in session-creation options. Absent payload ⇒ exact
current behavior (transition safety) until each adapter's Native semantics
land; then absent payload = Native.

- **Claude**: `buildQueryOptions()` accepts the payload: managed ⇒
  `systemPrompt = payload.prompt`, `tools = mapCategories(payload.categories)`;
  native ⇒ both presets. The hardcoded
  `CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT` / `CODEAI_CLAUDE_WORKFLOW_TOOLS`
  stop being reachable defaults and their content moves into seed profiles.
- **GLM Native**: `buildRequestBody()`/`streamTurn()` accept prompt text and
  a filtered tool-schema subset; native ⇒ built-in instruction + full set.
- **Codex**: `thread/start`/`thread/resume` gain `baseInstructions` from the
  payload (managed) or omit it (native); tooling categories select the
  app-server process profile (spawn args), reusing the existing process
  profile mechanism.
- **Kimi**: materialize a per-profile agent directory (agent.yaml +
  system.md + tools list) before `session/new`; native ⇒ default agent.
  First step: verify agent-directory binding and parallel-session isolation.

## Core RPC Surface (MVP)

Follows the exact four-layer shape proven by `ensure-glossary-file`
(`core-runtime-api.ts` dispatch → `IPC_TO_RPC` in
`core-process-bridge-facade.mjs` → `preload.cjs` → `vite-env.d.ts` types):

- `list-session-profiles` → catalog read model for the picker (triggers
  seeding on first call): profiles with name/description/applicable
  providers, Native first.
- `open-session-profile-file` → ensure + return absolute path of a given
  profile document for the "edit in VS Code" action (same UX as the glossary
  button).
- Session creation RPC: no new method — `createSession` already carries
  `nextSessionMode`; Core-side resolution changes as described above.

Session snapshot/read model gains the applied profile id/name so the UI can
display what a session is running with.

## Seed Profiles

Created on first access; content authored in English during implementation
and reviewed by the user (the files are user-owned afterwards):

1. `plan-document` — build a structured planning document.
2. `todo-plan-deterministic` — produce a deterministic machine-managed todo
   plan.
3. `review` — code/architecture review.
4. `architecture-spec` — specifications for product parts / clusters /
   modules (one profile; the differences between spec levels are request
   content, not different tooling).

Plus the virtual `native` entry (not on disk). Each seed profile ships pairs
for all four providers; the current hardcoded Claude workflow prompt and the
Kimi `system.md` content are the raw material for the seeds.

## Out of Scope (this cycle)

- **UI surface** — separate discussion after this document is approved
  (picker layout, mandatory-selection UX, profile editing entry points).
- Workspace-level profile overrides (`<workspace>/.harness/settings/**`).
- Custom/MCP tool injection through profiles; per-provider native tool-name
  overrides in `tooling.yaml`; prompt `append` mode.
- Mid-session profile switching.
- OpenRouter / Local Models / GLM OpenCode profile support ("a separate
  conversation" per user, 2026-07-02).

## Risks And Constraints

- **Codex tooling granularity is coarse** (feature flags, not tools) and
  partially unverifiable until implementation; the matrix marks most
  categories "not controllable". Restarting the app-server per tooling
  profile is the accepted cost.
- **Kimi agent binding mechanism is unverified** (how the CLI locates
  `agent.yaml`); implementation starts with that verification, and parallel
  sessions need per-profile agent directories.
- **GLM Native custom prompts must keep the tool contract** — owned by the
  materializer's framing layer, not by profile authors.
- **Native for Claude/Kimi changes today's default behavior**; the switch
  happens only when profile resolution lands, and the old content survives as
  seeds.
- New YAML dependency: package choice (e.g. `yaml`) happens at
  implementation; parser usage stays inside `profile-store`.
- 500-line implementation file cap: adapters get separate
  `*-profile-application` files rather than growing existing managers.
- Audited line numbers in this document drift with refactors; treat them as
  audit evidence, not live references.

## Implementation Phase Roadmap (input for the future todo-plan)

Order matters; each phase is commit-sized micro-tasks (≤3 functional files)
in the eventual todo-plan:

- **Phase A — cluster foundation**: `profile-store` (resolve/scan/parse/
  validate/seed + YAML dep), then `profile-catalog` (read model, Native,
  resolution, error contract), then `profile-materializer` (payload +
  framing). Product tree + cluster/module docs in the same commits.
- **Phase B — contract and Core wiring**: extend
  `provider-adapter-contract` with `SessionProfilePayload`; activate
  `NextSessionMode` managed resolution in `session-request-handler`; applied
  profile in session state/read model; structured error contract.
- **Phase C — adapters, one per stream**: Claude → GLM Native → Codex →
  Kimi (Kimi starts with the binding verification task). Each adapter's
  `module.md` gets its category-mapping table.
- **Phase D — RPC/bridge/types**: `list-session-profiles`,
  `open-session-profile-file`, snapshot field, following the
  `ensure-glossary-file` four-layer pattern.
- **Phase E — UI**: deferred; planned after the separate UI discussion.
- **Phase F — package & user acceptance**: `npm run package:mac`
  (user-confirmed) + evidence document.
