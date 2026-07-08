# Claude как провайдер: точки контроля Harness и сравнение с Codex/CodexUC

Статус: архитектурная заметка (Phase 1 — Claude Provider Research, 2026-07-08).
Источник фактов:

- инспекция кода модуля `claude-provider`
  (`product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/**`)
  и Core-стороны (`session-request-handler`, `session-reasoning-display`,
  `provider-network-capture`);
- закрытый scope Codex/CodexUC (linked docs в `.harness/plans/todo-plan.md`):
  `CodexManagedPromptToolingEconomics.md`, `ProfileCompilationAndBenchmarking.md`,
  `UniversalClient.md`, `SessionProfiles.md`, `CodexCacheAnchorThread.md`,
  плюс evidence-пакеты `codex-app-server-cache-anchor-*`,
  `codex-uc-custom-tool-call-*`, `codex-uc-phase-protocol-retest-*`;
- принятые native-дампы Claude (`docs/evidence/provider-network-capture-*-2026-07-03-*`,
  артефакты в `~/.harness-ai/logs/native-request-capture/`) и
  `docs/architecture/NativePromptComposition.md`;
- reference-поведение Claude Agent SDK / Messages API (модель `claude-opus-4-8`:
  адаптивный thinking, `output_config.effort`, prompt caching как prefix-match с
  `cache_control`, tool search, memory tool, context editing, streaming-события).

Эта заметка — первый цикл research по Claude как следующей цели сравнения после
Codex/CodexUC. Она проходит по осям **system prompt, tool inventory, settings
sources, memory/context ballast, phase/event semantics, cache/context/resume,
benchmark design**. Для каждой оси фиксируются три уровня: (1) что Harness
контролирует для Claude сегодня (EXISTS/ABSENT в коде), (2) потолок Claude
native (что позволяет Agent SDK / Messages API), (3) явное сравнение с тем, что
установил закрытый scope Codex/CodexUC. Это research-заметка: она идентифицирует
точки контроля и открытые вопросы, но не предписывает реализацию.

## 1. Ориентация: место Claude в дереве

Claude — **полноценный provider adapter, а не endpoint universal client**. По
`.harness/product-tree/product-tree.md` universal client ограничен «четвёркой
OpenAI-shape провайдеров» (Kimi/GLM/Local/OpenRouter); Claude, Codex и CodexUC —
независимые адаптеры под `Provider Runtime › Provider Adapters`.

- Facade (граница Harness): `ClaudeProviderFacade`
  (`claude-provider/src/claude-provider-facade.ts`) — только isolation env,
  provider home, установщик SDK, usage-limits bridge; `extends
  ClaudeProviderAdapter`.
- Мигрированный из CodeAI-Hub адаптер: `ClaudeProviderAdapter`
  (`src/reference/provider/claude-provider-adapter.ts`) — create/resume/send/
  subscribe/close, temp→real aliasing, `captureNativeRequest`,
  `deleteSessionArtifacts`, `refreshUsageLimits`.
- Wiring: `core-provider-adapter-registration.ts`
  (`case "claude": new ClaudeProviderFacade(model, workspacePath)`); каталог —
  `provider-registry-facade.ts` (`id:"claude"`, `visibility:"visible"`).
- Turn dispatch: Core `session-request-handler-facade.ts`
  (`binding.adapter.sendMessage(...)`).

Подтверждённо отсутствуют на пути Claude импорты `client-core`,
`dialect-streaming`, `tool-registry`, `builtin-tools`, `client-contract` — это
означает, что Claude не разделяет universal-client tool-loop/нормализацию и
владеет своей wire-семантикой сам. Это тот же структурный контракт, что
`UniversalClient.md` зафиксировал для Codex/CodexUC: свой канал — свой адаптер.

## 2. System prompt

**Harness сегодня.** System prompt собирается внутри адаптера, не Core.
`buildClaudeWorkspaceSystemPrompt(workspacePath)`
(`src/reference/sdk/claude-workspace-system-prompt.ts`) склеивает
`CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT` + `# Harness Workspace Context` + inline
`AGENTS.md`. Инъекция — `claude-sdk-manager.ts buildQueryOptions()` в
`options.systemPrompt`. Override — `claude-profile-application.ts
applyClaudeSessionProfile()`: **managed** ⇒ `systemPrompt = payload.prompt`
(материализованный Core-профиль из `profile-materializer`), **native** ⇒
`{ preset: "claude_code", type: "preset" }`, **legacy** ⇒ workflow+AGENTS.md.
По умолчанию сегодня — Native raw.

**Потолок Claude native.** Полная подстановка `systemPrompt` через Agent SDK:
`string` или `string[]`. Уникальный для Claude рычаг — маркер
`SYSTEM_PROMPT_DYNAMIC_BOUNDARY` в `systemPrompt: string[]`: блоки до маркера
кэшируются кросс-сессионно, после — нет (`NativePromptComposition.md` §3). В
native-дампе присутствует `cache_control: {type:"ephemeral", ttl:"1h"}` на
блоках обвязки — значит вендорский CLI сам расставляет кэш-брейкпоинты по этой
границе.

**Сравнение с Codex/CodexUC.** Как и Codex (app-server `baseInstructions`,
CodexUC `instructions`), Claude поддерживает полную замену system prompt — то
есть тот же «рычаг качества/стоимости», что `CMPTE` зафиксировал численно (lean
CodexUC ~27.3k used против app-server ~44.8k, без потери качества). Отличие в
пользу Claude: `string[]` + `DYNAMIC_BOUNDARY` даёт **cache-aware композицию
прямо в поле prompt**, тогда как для Codex статичность префикса обеспечивается
формой payload и порядком body. Format-invariant из `SessionProfiles.md`
(«`system-prompt.md` — тело payload, не заметка; никаких Harness-заголовков») в
равной мере применим к Claude: capture доказал, что провайдер смотрит на
фактическую форму (identity `You are Claude Code`, порядок блоков, `cache_control`),
и любой нативно-чужой маркер сломает cache reuse — прямая аналогия с Codex
rollback/cache-пробой 2026-07-06.

## 3. Tool inventory

**Harness сегодня.** Только native-инструменты Claude, определяются внутри
адаптера (не universal-client `tool-registry`). Legacy fixed:
`CODEAI_CLAUDE_WORKFLOW_TOOLS = ["Read","Write","Edit","WebSearch"]`. Профильная
фильтрация — `CLAUDE_TOOL_CATEGORY_MAP` (`claude-profile-application.ts`):
`file-read→Read/Glob/Grep`, `file-write→Write/Edit`, `shell→Bash`,
`web→WebSearch/WebFetch`, `git`/`tests→[]`. **managed** ⇒
`options.tools = mapClaudeToolCategories(...)` (whitelist имён Claude), **native**
⇒ `{ preset: "claude_code" }` (полный inline-набор). Permission —
`bypassPermissions`.

**Потолок Claude native.** Точный per-session контроль tool-набора через
`tools: string[]` whitelist / `disallowedTools` без рестарта процесса. Плюс tool
search (`defer_loading`) — расширение набора, которое **дописывает** схемы, а не
свопит, сохраняя кэш. Native-дамп: 10 inline-инструментов + deferred-каталог
через ToolSearch (в интерактивном TTY 29–30).

**Сравнение с Codex/CodexUC.** Здесь Claude **превосходит Codex по контролю**:
Codex app-server фиксирует ~17 инструментов на уровне процесса (`--disable`
флаги), per-thread выбора нет (в MVP no-op, т.к. общий процесс обслуживает все
сессии); CodexUC добивается паритета, структурно прокидывая captured `tools.json`
и исполняя native `custom_tool_call`. Claude же позволяет точный per-session
whitelist прямо в query-опциях. Provider-neutral категорийная модель
`SessionProfiles.md` («Core говорит только категориями; профиль не привносит в
канал чужие инструменты») уже реализована для Claude в `CLAUDE_TOOL_CATEGORY_MAP`.
Роль-специфичные bundle из `ProfileCompilationAndBenchmarking.md`
(`read_search_review`, `implementation`, `package_acceptance` …) ложатся на
потолок Claude напрямую как whitelist.

## 4. Settings sources

**Harness сегодня.** Три источника с реальным швом:

- **Model** — на регистрации адаптера, не per-turn:
  `settingsStoreFacade.getProviderModel("claude",…)` → конструктор
  `ClaudeProviderFacade` → `workspace.defaultModel`. При смене настроек адаптеры
  пересоздаются. Каталог: `sonnet`/`opus`/`haiku`.
- **Thinking** — per-turn прямым чтением SDK-менеджером из
  `<workspace>/.harness/settings/settings.json`
  (`providers.claude.thinking.{enabled,effort,maxTokens}`, кэш 500 мс). Legacy
  numeric `maxTokens` снапится к effort-якорю.
- **Usage limits / token usage** — OAuth-проба + rate-limit-заголовки;
  `claude-usage-sync.ts` + `/context`-проба на завершении turn.

**Шов (EXISTS-но-не-стыкуется).** Core строит **плоский** объект turn-options
(`provider-turn-options.ts`: `{ model, reasoningEffort?, thinkingEnabled,
thinkingDisplaySyncEnabled }`) и передаёт в `sendMessage(...)`. Но
мигрированный reader `readAppliedClaudeTurnConfig()` принимает только **вложенный**
конверт `turnOptions.__codeaiAppliedTurnConfig` с `providerId==="claudeCodeCli"`,
которого Core не эмитит. Итог: плоский per-turn payload инертен; thinking
применяется через собственное чтение SDK-менеджера, model — через конструктор.
Функционально настройки действуют (тот же файл), но **не через тот канал
turn-options, который подразумевает контракт**.

**Потолок Claude native.** Per-turn через Agent SDK: `model`, `output_config.effort`
(`low`|`medium`|`high`|`xhigh`|`max`), адаптивный thinking (`budget_tokens` на
Opus 4.8 удалён — только `{type:"adaptive"}`), опционально `task_budget`;
`settingSources` управляет обнаружением настроек.

**Сравнение с Codex/CodexUC.** `SessionProfiles.md` зафиксировал для CodexUC
чёткое правило приоритета: выбранный в Core effort переопределяет template
effort. У Claude потолок богаче (per-turn effort/thinking/model в одном
query-вызове), но текущий Harness применяет их в обход Core turn-options —
это прямое расхождение с Core Authority (`AGENTS.md` §4: settings truth
принадлежит Core, не собственному чтению адаптера). Для объективного benchmark
нужен чистый per-turn канал Core → adapter, аналогичный правилу приоритета
effort в CodexUC.

## 5. Memory / context ballast

**Harness сегодня.** Режим определяет механизм:

- **cwd-балласт** — SDK всегда с активным workspace как `cwd` +
  `additionalDirectories:[workspacePath]`.
- **managed / legacy** — SDK-изоляция (`settingSources: []`), поэтому
  workspace-`CLAUDE.md` намеренно не автозагружается; балласт инжектится
  **inline в system prompt** (путь + полный `AGENTS.md`).
- **native** — `settingSources: ["user","project","local"]` восстановлены, SDK
  нативно грузит `CLAUDE.md` (project scope); `user` читает изолированный
  provider home, не OS `~` (Native restoration contract, acceptance 2026-07-02).
- Балласта в стиле `CLAUDE.md`, собираемого Core, нет; `AGENTS.md` читает
  provider runtime.

**Потолок Claude native.** Уникально для Claude: native memory tool
(`/memories`, кросс-сессионно), context editing (`clear_tool_uses_20250919` /
`clear_thinking_20251015`), compaction (`compact_20260112`). `settingSources`
управляет discovery `CLAUDE.md`. Плюс на Opus 4.8 — mid-conversation system
messages (`role:"system"` в `messages`), которые **не** инвалидируют кэшированный
префикс и служат безопасным операторским каналом.

**Сравнение с Codex/CodexUC.** `CodexCacheAnchorThread.md` разделил
*балласт-как-static-prefix* и *операционную память* (`todo-plan.md` — динамичная,
намеренно вне static prefix; история диалога — не источник истины). B2-модель
`NativePromptComposition.md` (замороженная обвязка vs live per-session контекст)
— это Claude-реализация того же split, а решение отправлять `AGENTS.md`/`CLAUDE.md`
отдельным start-message (не в system prompt) в точности повторяет правило CCAT
«не встраивать динамику в static prefix». Отличие в пользу Claude: native memory
tool + context editing — управляемая операционная память, которой у Codex нет
(в UC compaction отложена). Это делает Claude более богатой площадкой для
экспериментов с operational memory, чем Codex.

## 6. Phase / event semantics

**Harness сегодня.** Adapter-owned. Claude **не** использует общий
`provider-event-normalizer` (импортируется только client-core + четвёркой UC +
codex-uc). `claude-stream-event-router.ts` классифицирует SDK-стрим в
`assistant`/`thinking`/`stream_event`; `claude-message-finish-handler.ts` эмитит
`turn_started`/`turn_completed`/`turn_failed`; live vs final reconciliation
(`claude-content-stream-handler.ts`, `-live-buffer.ts`) дедуплицирует `text_delta`
против собранного финального блока, tool-use-преамбулы флашатся как `thinking`.
Это удовлетворяет контракту `provider-adapter-contract` (progress → commentary,
reasoning → thinking, только явное завершение → terminal).

**Потолок Claude native.** У Claude есть **нативный терминальный сигнал**: SDK
завершает turn на `end_turn`/`result`; Messages API даёт `stop_reason`
(`end_turn`/`tool_use`/`max_tokens`/`refusal`/`pause_turn`) и явные
`thinking`-блоки в стриме (`message_start` → `content_block_*` →
`message_delta` → `message_stop`).

**Сравнение с Codex/CodexUC.** Ключевой вывод: **Claude подобен Codex app-server,
а не CodexUC**. App-server имеет native phase marker (`agentMessage.phase`:
`commentary`/`final_answer`); CodexUC его не имеет и адаптер вынужден добавлять
route-owned инструмент `final_answer` + continuation-item (`codex-uc-phase-*`,
commit `2a0309d5`). Claude, как app-server, получает терминальность из native
результата SDK и **не нуждается** в синтетическом `final_answer`. Граница
владения из `E-phase`/`UC §3.11` («профиль — static prompt/tool surface; адаптер
— protocol semantics; Core не выводит финальность из текста assistant») уже
соблюдена в коде Claude: адаптер владеет фазами сам, Core (`session-reasoning-
display`) лишь проецирует уже размеченные события.

## 7. Cache / context / resume

**Harness сегодня.** `cache_control`/prompt-caching в модуле **ОТСУТСТВУЕТ**
(grep по `cache_control|prompt_cache|ephemeral|cache_read|cache_creation` пуст):
адаптер вызывает SDK `query()`, который строит wire-запрос внутри, и Harness не
трогает Anthropic cache-блоки напрямую. Resume — SDK-native по session id
(`options.resume`, temp→real promotion). **Rollback для Claude НЕ реализован**
(это Codex-family-only; Core отвергает rollback для Claude). Context-window —
отдельная проба `claude -p … /context`. Cleanup — `deleteSessionArtifacts()`
удаляет `home/.claude/projects/**/<id>.jsonl`. Stop turn — нет отдельного
interrupt: `stopTurn` → `closeSession()` прерывает in-flight query.

**Потолок Claude native.** Prompt caching — prefix-match: `cache_control:
{type:"ephemeral"}` (TTL 5 мин по умолчанию / 1 ч), максимум 4 брейкпоинта,
минимальный кэшируемый префикс на Opus 4.8 = 4096 токенов, окно просмотра назад
20 блоков, иерархия инвалидации `tools → system → messages` (смена tool-набора
или модели рушит весь кэш). Диагностика — `usage.cache_read_input_tokens` /
`cache_creation_input_tokens`. Косвенные рычаги Harness даже без прямого доступа
к `cache_control`: (a) `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` в `systemPrompt: string[]`
задаёт, что попадёт в кэшируемый префикс; (b) byte-exact стабильность static
wrapper (format-invariant SP); (c) стабильный порядок/состав `tools`. Resume —
только вперёд; **нативного rollback уровня Codex `thread/rollback` у Claude нет**.

**Сравнение с Codex/CodexUC.** Здесь самый большой контраст контроля.
Для Codex/CodexUC Harness имеет **прямой** доступ к кэшу: CodexUC сам строит HTTP
body в cache-оптимальном порядке (`model`, `instructions`, `tools`,
`prompt_cache_key`, `input`) и вычисляет content-addressed `prompt_cache_key`
префикса; для app-server найден флаг `persistExtendedHistory: false` как условие
стабильного second-turn cache-anchor (commit `13a38bb4`, evidence
`codex-app-server-cache-anchor-*`, метрика `cache_ratio =
cached_tokens/prompt_tokens`). Для Claude через Agent SDK Harness управляет кэшем
**косвенно** — через форму префикса, границу `string[]` и стабильность tool-набора.
Плюс у Claude нет native rollback, на котором Codex строил rollback/cache-пробу,
поэтому эксперимент cache-anchor для Claude придётся ставить иначе (сравнением
`usage.cache_read_input_tokens` по видимым turn через resume). Resume-инвариант
из `SessionProfiles.md` (resume только из immutable snapshot, никогда не
перечитывать живой профиль) применим к Claude в той же мере: провайдерская
сессия создана исходными prompt+tools, повторное чтение изменённого профиля
рассинхронизирует Core и провайдера и сломает кэш.

## 8. Benchmark design

**Harness сегодня.** Есть token/context-usage sync (`claude-usage-sync.ts`,
`/context`-проба). Managed lean/parity Claude-профилей ещё нет — по умолчанию
Native raw.

**Потолок Claude native.** `count_tokens` для точного подсчёта; `usage` с
`cache_read_input_tokens`/`cache_creation_input_tokens` для замера кэш-экономии.

**Сравнение с Codex/CodexUC.** `ProfileCompilationAndBenchmarking.md` §9 **прямо
назначает Claude первым калибратором наравне с Codex** («их native prompts/tools
зрелые и позволяют понять, какие rules полезны, а какие балласт»). Two-mode
дисциплина `CMPTE` (parity-профиль для head-to-head vs task-specific lean) и
lean-success gate (сэкономить prompt/cache-токены И не регрессировать ни одну
проверяемую метрику, без ручных подталкиваний) переносятся на Claude напрямую —
все точки контроля уже идентифицированы (full replace `systemPrompt`, whitelist
`tools`, категорийная карта в коде). Более того, Claude — **сильнейший кандидат
воспроизвести lean-экономию `CMPTE`** (там lean 27.3k против app-server 44.8k),
т.к. контроля у него больше, чем у Codex: per-session tools без рестарта и
`string[]`-граница кэша. Benchmark-as-contract (`schema:
harness-ai-profile-compilation-v1`, `compiledSystemPromptHash`/`compiledToolsHash`)
применим как есть, но метрику кэша нужно унифицировать: Claude отдаёт
`cache_read_input_tokens`, тогда как Codex — `usage.prompt_tokens_details.cached_tokens`.

## 9. Сводка EXISTS / ABSENT и открытые вопросы

**EXISTS (реализовано для Claude):** adapter+facade вне universal client;
композиция system prompt (workflow+AGENTS.md / managed `payload.prompt` / native
`claude_code` preset); tool-наборы (fixed / категорийный whitelist / preset);
thinking из `settings.json`; SDK-native resume по session id; per-session
transcript cleanup; usage/`/context` пробы; native request capture (interactive
pty); adapter-owned phase/event с live↔final reconciliation.

**ABSENT / gaps:**

1. Прямой контроль `cache_control` — делегирован SDK; управление только косвенное
   (граница `string[]`, byte-exact префикс, стабильный tool-набор).
2. Turn rollback — не реализован (Codex-only); Claude resume только вперёд.
3. Живой per-turn канал Core → adapter для model/effort/thinking — плоские
   turn-options инертны (шов flat vs `__codeaiAppliedTurnConfig`, §4).
4. Managed lean/parity Claude-профили — ещё нет (по умолчанию Native raw).
5. Унифицированная кэш-метрика в benchmark record (`cache_read_input_tokens`
   Claude против `cached_tokens` Codex).

**Открытые research-вопросы для следующих циклов:**

1. Cache-anchor: даёт ли Claude Agent SDK resume стабильный second-turn кэш
   (аналог Codex-пробы)? Измерить `usage.cache_read_input_tokens` по видимым
   turn на одинаковом static-префиксе.
2. Глубина контроля кэша: управляемы ли placement/TTL `cache_control` через Agent
   SDK, или только косвенно через `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` + стабильный
   префикс?
3. Turn-options шов: подключить чистый Core per-turn канал model/effort/thinking
   (устранить рассинхрон `__codeaiAppliedTurnConfig`) ради Core Authority над
   settings truth.
4. Managed-профили: воспроизвести parity/lean `CMPTE` для Claude и измерить
   token/cache-экономию против native-baseline.
5. Отсутствие rollback: как ставить cache-anchor-эксперименты для Claude без
   native `thread/rollback` (resume-only сравнение по turn).
6. Benchmark-метрика: унифицировать Claude `cache_read_input_tokens` с Codex
   `cached_tokens` в едином benchmark record.

## 10. Вывод одной фразой

Codex/CodexUC scope закрепил split «профиль владеет статической (кэшируемой,
byte-exact native) поверхностью prompt+tools, адаптер владеет wire-семантикой
(tool-loop, фаза `commentary`/`final_answer`, cache/rollback/telemetry)», с
измеренным выигрышем ~40% контекста при паритете завершения. Для Claude тот же
split применим и уже частично реализован: контроля prompt/tools у Claude
**больше**, чем у Codex (полная замена `systemPrompt` со `string[]`-границей
кэша, точный per-session whitelist `tools`, native memory tool), фаза/turn уже
adapter-owned и опирается на нативный терминальный сигнал SDK (ближе к Codex
app-server, чем к CodexUC). Главный разрыв — **кэш и per-turn settings-канал**:
кэшем Claude Harness управляет косвенно (через SDK), rollback отсутствует, а
per-turn model/effort/thinking сегодня обходят Core turn-options. Это и есть
приоритетные направления следующих циклов Claude research.
