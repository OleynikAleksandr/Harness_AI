# Profile Studio

Статус архитектурного контракта: **ACCEPTED / IMPLEMENTATION IN PROGRESS**.

Дата принятия: 20 июля 2026 года.

Planning source: `docs/evidence/ProfileStudioMvpImplementation.md`.

UI baseline: `.harness/runtime/prototypes/profile-studio-ui/` и раздел 10.8
`docs/proposals/ProfileStudio.md`.

Этот документ является authoritative contract для active implementation plan
`profile-studio-mvp-2026-07-20`. Пока соответствующий slice не отмечен
`APPLIED`, live code остаётся таким, как описано в local `module.md` и в
разделах `Current live state` ниже.

## 1. Product outcome

Profile Studio — отдельный single-window mode Harness AI, в котором
специализированный Profile Creator Agent создаёт provider/model-specific
Custom Profile в диалоге с пользователем.

Custom Profile содержит:

1. Custom System Prompt из двух читаемых source parts:
   - сокращённая и переформатированная Native-основа;
   - краткие Custom-дополнения;
2. Custom System Tools с честным provider capability mode.

Пользователь не редактирует profile documents вручную. Profile Creator Agent
предлагает полный draft snapshot, Core валидирует и атомарно применяет его, а
пользователь явно утверждает точный content hash.

## 2. Scope первого production slice

Target provider/model:

- Claude;
- Codex;
- Kimi (`kimi-client` production target, `kimi` capture provenance).

Profile Creator runtime:

- provider: `claude`;
- model: `opus`;
- reasoning: `high`;
- managed isolated system prompt;
- `settingSources: []`;
- no ambient `AGENTS.md`, `CLAUDE.md`, Skills;
- no unrestricted filesystem/shell/web tools;
- JSON Schema full-snapshot structured output.

Не входят:

- Normalizer и автоматический выбор профиля;
- отдельный Capture interface;
- benchmark/automatic behavioral score;
- revisions/rollback;
- automatic capture drift updates;
- custom executable tool creation;
- GLM/OpenRouter/Local Models/Grok target profiles.

## 3. Cluster boundaries

Profile Studio пересекает Core truth и UI surface, поэтому представлен двумя
Product-Part-scoped кластерами. Это не один cross-boundary module.

### 3.1 Core Runtime

Путь:

`product-parts/core-runtime/clusters/profile-studio/`

| Module | Public facade | Ownership |
| --- | --- | --- |
| `profile-studio-lifecycle` | `ProfileStudioLifecycleFacade` class | immutable Draft identity, profile↔creator-session binding, lifecycle gates, approval/content hash |
| `profile-studio-agent` | `ProfileStudioAgentFacade` class | fixed Claude/Opus/high creator configuration, inline prompt, output schema, creator session contract |
| `profile-studio-authoring` | `ProfileStudioAuthoringFacade` class | full-snapshot validation, donor containment, atomic document application |
| `profile-studio-read-model` | `ProfileStudioReadModelFacade` class | targets, compatible profiles/sessions, Overview/Prompt/Tools snapshots, capability reasons |

Core cluster composes only public facades from:

- `session-profiles`;
- `session-runtime`;
- `provider-network-capture`;
- `provider-descriptor`;
- Claude adapter through normal Core provider routing.

### 3.2 Application Shell

Путь:

`product-parts/application-shell/clusters/profile-studio/`

| Module | Public facade | Ownership |
| --- | --- | --- |
| `profile-studio-shell` | `ProfileStudioShellFacade` | single-window mode and three-column composition |
| `profile-studio-sidebar` | `ProfileStudioSidebarFacade` | provider/model target, Create, compatible Draft/Valid creator sessions, return action |
| `profile-studio-inspector` | `ProfileStudioInspectorFacade` | read-only Overview, Custom System Prompt and Custom System Tools tabs |

Application Shell forwards raw commands and renders Core snapshots. It does
not scan profile/capture files, compile prompts, classify lifecycle state or
parse agent output.

### 3.3 Shared Session Surface

`application-shell/session-interface` получает новый module
`session-surface` с `SessionSurfaceFacade`.

Он владеет уже существующей центральной композицией:

- SessionId header;
- dialog/timeline;
- reasoning/tool/subagent entries;
- input/Stop/turn timer;
- provider interactions;
- telemetry/status panel.

Обычный `SessionWindowFacade` и Profile Studio используют один facade. Studio
не копирует session hooks, event routing или CSS из HTML-прототипа.

## 4. Profile format v2

Studio расширяет существующий `~/.harness-ai/Profiles/**` формат без
destructive migration v1 profiles.

```text
~/.harness-ai/Profiles/<provider-namespace>/<profileId>/
  profile.yaml
  system-prompt.md
  custom-instructions.md
  tools.json                 # optional/provider-dependent
```

Semantics:

- `system-prompt.md` — сокращённая Native-основа;
- `custom-instructions.md` — Custom-дополнения;
- `tools.json` — candidate/effective structured tools или provider ceiling
  record;
- `profile.yaml` — Studio passport/lifecycle/provenance.

Studio v2 passport minimum:

```yaml
schemaVersion: 2
authoring: profile-studio
name: New Profile
description: ""
provider: claude
model: opus
status: draft
creatorSessionId: session-claude-...
nativeCaptureDonor: null
```

New Studio profiles require exact `provider + model`. Existing provider-only
v1 profiles remain readable by the legacy/runtime catalog but do not appear in
Studio and never receive a fabricated model or Studio `Valid` state.

## 5. Domain lifecycle

Core record minimum:

```ts
interface ProfileStudioProfile {
  profileId: string;
  name: string;
  description: string;
  purpose: string;
  target: { providerId: string; modelId: string };
  lifecycleStatus: "draft" | "valid";
  creatorSessionId: string;
  nativeCaptureDonor: NativeCaptureDonorReference | null;
  contentHash: string;
  approvedContentHash: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}
```

Rules:

1. Create mints immutable `draft-<uuid>` id and persistent creator session.
2. Display name may change; internal id/session binding does not.
3. Compatibility is exact provider/model equality.
4. New profile starts `Draft`.
5. Missing donor/components/capability is allowed for Draft and appears as an
   honest Core reason.
6. `Valid` requires direct Core command `{ profileId, contentHash }`.
7. Agent cannot assign `Valid`.
8. Any accepted content change creates a new hash and returns profile to
   `Draft`.
9. Revision history and rollback are absent from this slice.

Existing Settings `Valid`/`Invalid` means only parse validity. It is not Studio
approval state.

## 6. Creator session contract

Creator sessions reuse normal Core session/history/provider/event pipelines.
They add optional purpose metadata without overloading structural session kind:

```ts
sessionPurpose?: {
  type: "profile-creator";
  profileId: string;
};
```

- `sessionKind` remains `primary | subagent`;
- workspace id: reserved `profile-studio`;
- workspace path: HARNESS_AI_HOME-aware
  `~/.harness-ai/ProfileStudio/workspace`;
- restart restores transcript and profile binding;
- Studio session list is independent of the currently selected user workspace.

## 7. Structured authoring

Every Claude creator turn receives target identity, current draft, donor
content when bound and authoring rules inline. The output schema is:

```ts
interface ProfileCreatorTurnResult {
  assistantResponse: string;
  draft: null | {
    name: string;
    description: string;
    purpose: string;
    systemPrompt: string;
    customInstructions: string;
    toolSelection: ProfileStudioToolSelection;
    donorReference: ProposedDonorReference | null;
  };
  nextAction: "continue" | "request-approval";
}
```

- assistant text appears through the normal dialog pipeline;
- `draft: null` is discussion only;
- a draft is a full snapshot, never an ambiguous free-text patch;
- authoring facade validates before atomic write;
- invalid output changes nothing and produces a controlled repair notice;
- `request-approval` produces a Core-owned user interaction;
- only its direct user action calls the approval command.

Renderer never parses free-form Claude text to derive document/lifecycle
truth.

## 8. Prompt materialization

Studio v2 compilation order is deterministic:

```text
system-prompt.md

custom-instructions.md
```

The compiled prompt is not stored as a third editable file. Its hash covers
both parts and effective tools/provenance fields required by the runtime
snapshot.

For Studio v2, materializer does not append:

- workspace `AGENTS.md`;
- Skills;
- generic workflow skeleton;
- normal user-workspace wrapper.

V1 behavior remains unchanged.

## 9. Native Capture donor

The final Capture interface is out of scope. The initial functional route is:

1. Draft starts with no donor.
2. User can paste an existing capture artifact path into the creator dialog.
3. Agent proposes a donor reference in structured output.
4. Core accepts only artifacts under the known Native Capture root.
5. Core reads raw JSONL truth, validates capture identity and stores immutable
   provenance plus request hash.
6. Overview shows the donor or an honest missing state.

Readable Markdown is display evidence, not capture truth.

## 10. Provider capability contract

| Target | Prompt | Tools | Validation |
| --- | --- | --- | --- |
| Claude | two-part full replacement | validated subset of donor native tool ids | `Valid` allowed after Core validation + user approval |
| Codex | two-part `baseInstructions` replacement | provider-fixed/read-only | prompt-only `Valid` allowed with explicit fixed ceiling |
| Kimi | authorable candidate | current universal client has 9 executors vs captured 25 | Draft-only; `Valid` blocked until 25/25 parity |

UI cannot show 25 effective Kimi tools while runtime executes nine. The block
reason comes from Core.

## 11. Application mode

- `Profile Studio` button lives beside `Settings` in the ordinary sidebar;
- one click replaces workspace/session navigation with Studio mode in the same
  window;
- Studio sidebar provides `Вернуться к рабочим пространствам и сессиям`;
- detached session windows do not expose Studio mode;
- center uses `SessionSurfaceFacade`;
- right inspector has exactly:
  - `Overview`;
  - `Custom System Prompt`;
  - `Custom System Tools`;
- `Components` and `Capture` are not tabs;
- inspector is read-only; changes happen through creator dialog;
- raw Native profiles/captures are absent from Studio profile rows;
- Studio-managed Synthetic Native may appear as a normal compatible profile.

Honest empty/blocked examples:

- no profile selected;
- Native foundation not produced;
- Custom additions absent;
- donor not selected;
- Kimi validation blocked by 9/25 executor parity.

## 12. Core bridge

Required typed intents/read models:

- list target provider/models;
- list exact-compatible Studio profiles;
- get one inspector snapshot;
- create Draft and creator session;
- send/resume through normal session commands;
- approve exact content hash;
- receive `profile-studio:updated` events.

Preload validates transport shapes only. All lifecycle decisions remain in
Core.

## 13. Legacy transition

- v1 files are not deleted or rewritten;
- v1 profiles keep working in ordinary sessions;
- Studio lists only v2 records;
- old Settings Profile Creator may coexist only during intermediate source
  slices;
- final acceptance package removes the old Settings authoring entry;
- no existing profile is automatically promoted to Studio `Valid`;
- manual legacy/synthetic migration is a later scope.

## 14. Current live state

At the start of plan `profile-studio-mvp-2026-07-20`:

- both `profile-studio` clusters are **NOT APPLIED**;
- Studio v2 storage parsing is **APPLIED**: exact provider/model passports,
  creator-session/donor metadata and Draft-tolerant two-part sources are live;
- Studio v2 atomic Draft authoring and exact provider/model catalog are
  **APPLIED** through existing session-profile facades;
- Studio v2 materialization is **NOT APPLIED**;
- fixed creator agent/session is **NOT APPLIED**;
- reusable `SessionSurfaceFacade` is **NOT APPLIED**;
- accepted HTML prototype exists only in ignored runtime state;
- current v1 Session Profiles and Settings Profile Creator remain live.

This section is updated in the same commits that apply each slice.

## 15. Acceptance boundary

The feature is ready for package testing only when:

1. normal sessions are unchanged;
2. Studio opens/returns in one window;
3. targets and compatibility come from Core;
4. Create produces one Draft and one persistent Claude creator session;
5. structured output updates real two-part documents atomically;
6. inspector updates from Core events;
7. approval binds exact hash and edits return it to Draft;
8. valid Claude/Codex profiles appear only for exact model and apply prompts;
9. Codex fixed tools and Kimi Draft-only block are honest;
10. no ambient workspace instructions or unrestricted tools reach creator;
11. old Settings authoring entry is absent;
12. Custom Capture/benchmark/Normalizer are not simulated.
