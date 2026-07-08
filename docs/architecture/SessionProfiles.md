# Профили сессий (Session Profiles)

## Решение

Harness AI позволит пользователю выбирать **профиль сессии** до старта
сессии. Профиль упаковывает две вещи, которые сегодня захардкожены для
каждого провайдера — **системный промпт** и **системный туллинг** — в
редактируемые пользователем документы, которые Core Runtime загружает с
диска при старте сессии, без пересборки приложения.

- Профилями владеет **новый кластер Core Runtime** (`session-profiles`).
- Контент профилей живёт в **пользовательских файлах** под
  `~/.harness-ai/Profiles/**` (`HARNESS_AI_HOME`), потому что профили
  применяются в любом workspace. Универсальные профили лежат прямо в корне,
  а профили конкретного провайдера могут лежать в отдельном namespace,
  например `~/.harness-ai/Profiles/Codex/<profileId>/` или
  `~/.harness-ai/Profiles/CodexUC/<profileId>/`; id профиля при этом
  остаётся `<profileId>`, чтобы сохранённые выборы и сессии не зависели от
  физического пути.
- Профиль — **один универсальный комплект документов** (системный промпт +
  туллинг), применяемый ко всем поддерживаемым провайдерам: разные
  контракты доставки провайдеров скрыты в провайдер-нейтральном payload и
  стратегиях применения адаптеров. Дополнительно поддерживаются
  **индивидуальные профили**, привязанные к одному провайдеру (поле
  `provider` в паспорте) — для заточки под конкретный канал.
- Виртуальный **Native-профиль** — **основной профиль продукта**: он
  существует всегда, всегда стоит первым и является fallback, когда профиль
  не выбран; он означает «не вмешиваться в дефолтное поведение канала».
- Разрешение профиля применяет Core при создании сессии. UI только передаёт
  выбор пользователя и отображает данные каталога, полученные из Core (по
  правилам Core Authority из `AGENTS.md` и
  `docs/architecture/NextSessionMode.md`).

Мотивация: пользователь должен иметь возможность начинать каждую сессию
только с теми инструкциями и инструментами, которые релевантны его задаче
(плановые документы, todo-планы, ревью, спецификации, ...). Меньше
нерелевантного текста инструкций и лишних схем инструментов в запросе —
меньше шума для модели и меньше потраченных токенов.

Согласовано с пользователем в чате 2026-07-02, включая UI-поверхность
(см. раздел «UI-поверхность»): выбор профиля встроен шагом в создание
сессии, управление профилями живёт в Settings-табе `Profile Creator`.

## Аудит возможностей провайдеров (2026-07-02)

Изначальный аудит 2026-07-02 проверял Claude, Codex, Kimi ACP и GLM Native.
После universal-client migration и legacy cleanup 2026-07-05 актуальные
каналы Kimi/GLM — `kimi-client` и `glm-client`; строки по Kimi ACP и GLM
Native ниже оставлены только как исторический материал для Phase 5
synthetic-native. Номера строк актуальны на дату исходного аудита и могут
дрейфовать.

| Провайдер | Канал | Подмена системного промпта | Подмена туллинга | Точка применения |
| --- | --- | --- | --- | --- |
| Claude | `@anthropic-ai/claude-agent-sdk` 0.3.195 (in-process) | Полная замена (`systemPrompt: string`) или пресет `claude_code` + `append` | Whitelist `tools: string[]` (`[]` отключает все), `disallowedTools`, пресет тулзов | Опции SDK-запроса на сессию |
| Codex | Подпроцесс `codex app-server`, codex-cli 0.142.5, JSON-RPC | Полная замена через `thread/start` `baseInstructions` (плюс `developerInstructions`, `config`) | Только на уровне процесса: флаги `--disable <feature>` при запуске app-server; per-thread параметров тулзов нет | Параметры `thread/start` + запуск процесса под профиль |
| Kimi (historical ACP) | Удалённый подпроцесс `kimi acp`, kimi 0.18.0, ACP JSON-RPC | Историческая гипотеза: замена через материализованный agent-файл `agent.yaml` -> `system_prompt_path: ./system.md`; верификация позже показала, что binding недоказуем | Исторически: явный список `tools:` нативных идентификаторов Kimi в `agent.yaml` | Удалено вместе с `kimi-provider`; живой Kimi — `kimi-client`, profile application входит в Phase 5 |
| GLM Native (historical) | Удалённый Harness HTTP-клиент (`fetch` -> `api.z.ai` `/chat/completions`, SSE) | Исторически: системное сообщение собирали мы сами | Исторически: собственные схемы инструментов и локальное исполнение | Удалено вместе с `glm-native-provider`; живой GLM — `glm-client`, profile application входит в Phase 5 |

Ключевые факты аудита (для реализаторов):

- **Claude** — `claude-sdk-manager.ts` `buildQueryOptions()` (строки 268-321)
  уже сегодня передаёт кастомную строку `systemPrompt`
  (`buildClaudeWorkspaceSystemPrompt()`: захардкоженный workflow-промпт +
  путь workspace + workspace `AGENTS.md`) и
  `tools: [...runtimeProfile.toolNames]`, где `toolNames` — захардкоженный
  whitelist `CODEAI_CLAUDE_WORKFLOW_TOOLS = ["Read", "Write", "Edit",
  "WebSearch"]` (`claude-runtime-profile.ts`, строки 24-33). Типы SDK
  (`sdk.d.ts`, строки 1300-1359, 1942-1947) подтверждают:
  `systemPrompt?: string | string[] | { type: 'preset'; preset:
  'claude_code'; append?; excludeDynamicSections? }` и
  `tools?: string[] | { type: 'preset'; preset: 'claude_code' }`, плюс
  `allowedTools` / `disallowedTools` / `mcpServers` / `settingSources`.
  Вывод: сегодняшний «Claude» — это уже захардкоженный managed-профиль, а не
  нативный Claude Code.
- **Codex** — адаптер запускает `codex app-server` с процесс-профилями под
  назначение (`codex-app-server-process-profile.ts`: дефолт
  `["app-server"]`; workflow добавляет `--disable multi_agent --disable
  computer_use ...`). Основной путь сессии (`codex-app-server-facade.ts`,
  `thread/start`) для raw Native шлёт только `{cwd, approvalPolicy, sandbox,
  model, persistExtendedHistory}` — поле `baseInstructions` НЕ заполняется.
  Когда выбран managed/synthetic profile, тот же путь добавляет frozen prompt
  payload в `baseInstructions`. Prompt-only synthetic baselines для этого
  канала живут как `codex-app-server-synthetic-native` и
  `codex-app-server-synthetic-native-custom`; они не содержат
  `request-template.json` или `tools.json`, потому что app-server tool registry
  не передаётся через профиль. Выбора инструментов per-thread в протоколе
  app-server нет: доступность инструментов фиксируется флагами `--disable` при
  запуске процесса. Visible reasoning для app-server Codex требует двух
  совпадающих сигналов: provider-home `config.toml` материализуется с
  top-level `model_reasoning_summary = "detailed"`, а каждый поддерживающий
  summary turn отправляет `summary: "detailed"` в `turn/start`; `none` в
  provider-home config считается suppressing regression для dialog reasoning.
- **CodexUC** — тестовый provider id `codex-uc`, отдельный от native Codex
  app-server. Он использует локальный Codex OAuth auth и
  Responses-compatible backend с `store:false`; managed/synthetic profile
  snapshot применяется как request `instructions`. Если профиль содержит
  native request bundle (`request-template.json` + `tools.json`), CodexUC
  передаёт эти captured native fields как структурный Responses payload,
  сохраняя exact sidecar на диске, но отбрасывая transport-only поля, которые
  текущий HTTP endpoint отклоняет (например captured top-level `type`); иначе
  tool surface формируется Harness function tools. При HTTP-сериализации
  CodexUC держит cache-optimized порядок: `model`, `instructions`, `tools`,
  `prompt_cache_key`, `input`, затем остальные request options. Профильные
  файлы не хранят `prompt_cache_key`: adapter вычисляет его на каждый request
  из уже собранного статического provider-facing prefix и вставляет строго
  после structured `tools` и перед динамическим `input`. Unsupported envelope
  `type` остаётся в exact sidecar на диске, но не отправляется в HTTP route.
  `prompt_cache_key` является content-addressed ключом статического
  provider-facing prefix (`model`, final materialized `instructions`,
  structured `tools` и stable request options), а не session/user-input ключом.
  HTTP request также несёт
  Codex-style cache/session routing headers (`session-id`, `session_id`,
  `x-session-affinity`, `x-client-request-id`). Original native request capture
  остаётся baseline/evidence, но для CodexUC prompt-cache экспериментов
  динамический `input` не должен находиться между системным prompt и системным
  tooling: иначе backend может распознать меньший cached prefix даже без tool
  calls и без reasoning.
  Native Request Capture для CodexUC является profile-qualified diagnostic:
  карточка Settings передаёт в Core выбранный `profileId` вместе с provider/model,
  adapter читает `~/.harness-ai/Profiles/CodexUC/<profileId>/system-prompt.md`,
  `request-template.json`, `tools.json` и optional `custom-instructions.md`.
  Для native-bundle профиля `system-prompt.md` остаётся exact captured
  `body.instructions`; если рядом есть `custom-instructions.md`, materializer
  вставляет этот текст в final `instructions` внутри native prompt body, в
  первую очередь после `# General`, без имени файла, пути или Harness wrapper.
  Поэтому custom-профиль на диске НЕ должен предварительно сливать custom text
  в `system-prompt.md`: иначе материализация добавит те же инструкции дважды.
  Capture собирает такой же managed native-bundle prompt, как обычная CodexUC
  session, добавляет adapter-owned `prompt_cache_key` после `tools`, и
  отправляет этот HTTP body через общий MITM proxy. Артефакт обязан содержать
  `applied_input_envelope.kind = "codex-uc"` и выбранный `profileId`; без этого
  cache/captured-body сравнение с app-server Codex неинтерпретируемо.
  Cache telemetry берётся
  из known Responses usage aliases (`input_tokens_details.cached_tokens`,
  `cached_input_tokens`, etc.) и означает provider-reported cached input read;
  CodexUC status panel стартует с `Cache: 0`, положительное значение становится
  cache-anchor display для активной projected session. Поздние меньшие
  значения, включая `cached: 0`, не стирают уже найденный положительный anchor
  value в UI, но raw `cached` остаётся per-request фактом: падение значения на
  следующем пользовательском turn означает, что именно этот backend request
  получил меньший cached-input read, а не что весь session cache был удалён.
  Missing cache field не превращается в новый ноль.
  Visible reasoning запрашивается через `reasoning.summary: "detailed"` вместе
  с Core-selected Codex effort для модели сессии. Если native-bundle
  `request-template.json` тоже содержит `reasoning.effort`, выбранный в Core
  effort переопределяет template effort; template effort остаётся fallback
  только когда Core не передал per-turn effort. Native sidecar остаётся
  byte/profile-exact на диске, но CodexUC HTTP route нормализует исходящий
  `reasoning.summary` в `detailed`, потому что live Codex OAuth
  Responses проверка подтвердила, что backend принимает `detailed` и
  возвращает его в `response.created` / `response.completed` feedback.
  `concise` summary events приходили, но давали слишком мало полезной
  информации для CodexUC Thinking surface. Reasoning telemetry берётся из
  direct Responses reasoning summary/text stream deltas/items, буферизуется на
  границе active Responses call и отдаётся в Core как coalesced `thinking`
  messages, а не отдельная строка на каждый provider delta. Для acceptance и
  отладки CodexUC дополнительно пишет redacted provider-feedback JSONL в
  `~/.harness-ai/logs/providers/codex-uc-response-feedback.jsonl`: requested
  `model`/`reasoning`, HTTP status, response event names и sanitized
  `response.created` / `response.completed` model/status/reasoning metadata,
  если backend вернул такие поля. Этот лог не содержит auth, prompt, input
  history или tool schemas; отсутствие response-side `reasoning` означает, что
  backend не подтвердил принятую reasoning-конфигурацию в доступном SSE
  feedback.
  Usage-limit telemetry
  берётся через проверенный Codex account-limits bridge
  (`account/rateLimits/read`) с best-effort direct response-header fast path,
  если backend отдаёт Codex session/weekly limit проценты или пары
  limit/remaining. Settings-карты у него нет: model/reasoning берутся из
  существующего Codex settings section, а OAuth auth читается из локального
  Codex login. В UI и telemetry он является
  Codex-family provider: использует Codex-style reasoning label, cache counter,
  Turns/Rollback controls и общий provider scope `codex:global`; rollback
  реализуется не через app-server `thread/rollback`, а через pruning локальной
  Responses input history, потому что `store:false` маршрут пересылает историю
  сам. В profile catalog он применяет universal profiles и индивидуальные
  `provider: codex-uc` profiles из `Profiles/CodexUC`; app-server
  `provider: codex` profiles не применимы к CodexUC, потому что их structured
  tool/request payload принадлежит другому каналу.
- **Kimi** (модуль `kimi-provider` УДАЛЁН вместе с ACP-каналом и Kimi-capture
  прямым приказом пользователя 2026-07-05 — видимый Kimi живёт на
  универсальном клиенте `kimi-client`, HTTP-endpoint по subscription-ключу;
  описание ниже сохранено как историческая проектная запись для Phase 5, где
  профили перенацеливаются на клиентскую четвёрку; исходники — в git-истории)
  — адаптер запускал `kimi acp` (`kimi-managed-agent-profile.ts`,
  строка 416), а сам ACP не имеет полей промпта/тулзов (параметры
  `session/new`: `{cwd, mcpServers}`; `session/set_config_option`
  поддерживает только `model` и `thinking` — `kimi-session-lifecycle.ts`).
  Вместо этого адаптер УЖЕ материализует managed-агента перед стартом:
  `~/.harness-ai/providers/kimi/home/codeai-managed-agent/agent.yaml` с
  `system_prompt_path: ./system.md` (workflow-промпт ~82KB) и явным списком
  `tools:` нативных идентификаторов Kimi (`kimi_cli.tools.file:ReadFile`,
  `...:Glob`, `...:Grep`, `...:WriteFile`, `...:StrReplaceFile`,
  `kimi_cli.tools.shell:Shell`). Профили встраиваются ровно в этот механизм:
  перегенерировать документы агента под профиль перед `session/new`. Точный
  механизм привязки (как CLI находит `agent.yaml` — cwd, конфиг или env)
  нужно перепроверить первым шагом реализации Kimi; параллельным сессиям с
  разными профилями понадобятся отдельные каталоги агентов на профиль.
- **GLM Native** (модуль `glm-native-provider` удалён legacy-чисткой
  2026-07-05 — видимый GLM живёт на универсальном клиенте `glm-client`;
  описание ниже сохранено как историческая привязка для Phase 5, когда
  профили перенацеливаются на клиентскую четвёрку; исходники — в
  git-истории) — наш клиент от и до: без подпроцесса;
  `glm-native-provider-adapter.ts` `buildRequestBody()` (строки 354-378) —
  единственная точка инъекции: строка 361 вставляет
  `buildGlmNativeSystemMessage(profile)` (системная инструкция собирается на
  каждый ход в `glm-native-agent-runtime.ts`, строки 250-286: строка роли,
  env-блок с моделью/workspace/датой, языковой контракт, правила поведения,
  workspace `AGENTS.md`), а строка 372 шлёт
  `tools: GLM_NATIVE_WORKFLOW_TOOLS` (21 схема инструментов, определены в
  `glm-native-agent-runtime.ts`, строки 30-222 /
  `glm-native-expanded-tool-definitions.ts`, исполняются локально нашим
  агентским циклом, до 64 шагов инструментов за ход). Кэша/хэширования
  промпта нет — системное сообщение пересобирается каждый ход.

Существующий шов для переиспользования: `NextSessionMode`
(`session-request-handler/src/next-session-mode.ts`) уже определяет
`invocationMode: "native" | "managed"`, `managedProfileId?`,
`managedProfileSelection?` — сейчас жёстко резолвится в `Native · Raw` и
хардкодится рендерером (`session-window-facade.tsx`, строка ~233). Provider
Registry уже отдаёт дескрипторы `ProviderInvocationProfile` (`native-raw`,
`managed-auto-normalizer`) как display-only метаданные. Эта фича активирует
существующий шов, а не изобретает параллельный.

## Модель профиля

**Профиль** — концепт верхнего уровня (каталог), идентифицируемый
kebab-case id. Базово у него есть три документа:

- **паспорт** (`profile.yaml`): отображаемое имя, описание для UI и
  опциональная область применимости (`provider: <id>` для индивидуального
  профиля; отсутствие поля = универсальный профиль);
- **системный промпт** (`system-prompt.md`): полное тело workflow-промпта;
- **туллинг** (`tooling.yaml`): переключатели категорий.

Провайдерные native/synthetic профили могут иметь дополнительные структурные
документы, которые не являются prompt text:

- **custom instructions** (`custom-instructions.md`): чистый текст кастомных
  инструкций. Materializer вставляет его внутрь наиболее подходящего раздела
  `system-prompt.md`, без имени файла, пути, provenance wrapper или отдельного
  Harness-заголовка.
- **request template** (`request-template.json`): статичные поля captured
  native request, кроме динамических `instructions`, `input`, `tools`,
  `prompt_cache_key` и `client_metadata`.
- **native tools** (`tools.json`): структурный captured tool list exactly as
  sent by the native/provider client. Эти схемы передаются структурно, а не
  сериализуются внутрь `system-prompt.md`.

Правила:

- **Универсальный профиль применим ко всем поддерживаемым провайдерам**
  (в MVP: Claude, Codex, Kimi, GLM universal client; OpenRouter и Local
  Models подключаются следующим этапом — см. дорожную карту): один и тот
  же текст промпта и одни и те же категории доставляются каждому каналу его
  собственной стратегией применения. Промежуточные файлы под провайдера в `Profiles/**` не
  создаются; физические артефакты нужны только Kimi, и их материализует
  адаптер (см. «Стратегии применения в адаптерах»).
- **Индивидуальный профиль** (`provider: <id>` в паспорте) предлагается
  только своему провайдеру. Это цельный самостоятельный профиль, а не
  переопределение части универсального: никакой резолюции приоритетов
  между профилями нет.
- **Трансляция детерминирована.** Универсальность достигается упаковкой
  одного текста в контракт канала и маппингом категорий на нативные
  инструменты/флаги — по фиксированным правилам, без LLM-переписывания
  промпта под провайдера.
- **Промпты пишутся в категориях действий**, а не в нативных именах
  инструментов («читай файлы и ищи по коду», а не «используй инструмент
  Read»): так текст остаётся честно универсальным, а конкретные имена
  инструментов модель получает из схем своего канала. Это правило авторинга
  всех seed-профилей и рекомендация автору в шаблоне.
- **Native-профиль виртуален**: у него нет каталога на диске. Он всегда
  присутствует, всегда первый в списке и означает «дефолт канала, без
  вмешательства».
- **Профиль применяется ровно один раз — в момент create новой сессии** — и
  фиксируется на всё время её жизни через неизменяемый **applied profile
  snapshot**, который Core сохраняет в состоянии сессии (см. «Контракт
  старта сессии»). Смена профиля = старт новой сессии (соответствует
  механике Codex/Kimi, где промпт/туллинг фиксируются при старте
  процесса/сессии).
- Файлы читаются с диска только при create новой сессии — **без кэша**, без
  шага пересборки. Правка файла действует со следующей новой сессии; уже
  созданные сессии (включая resume) живут на своём snapshot и текущее
  состояние файлов профиля не видят.
- Сидирование по прецеденту `UserGlossaryStore`
  (`localization-runtime/src/user-glossary-store.ts`): при первом обращении
  Core создаёт стандартный набор профилей с seed-контентом; дальше файлы
  принадлежат пользователю и Harness их никогда не перезаписывает.

### Инвариант формата provider-facing профиля

`system-prompt.md` любого профиля — это не заметка для человека, а тело prompt
payload, которое Core затем доставляет провайдеру. Поэтому формат
provider-facing prompt является частью контракта для всех профилей, не только
для Native:

- **Native / synthetic-native** сохраняют форму, порядок, маркеры и wrapper
  целевого provider-native канала. Менять можно содержимое внутри этой формы,
  но нельзя добавлять Harness-заголовки, provenance labels, diagnostic sections,
  fenced JSON/code blocks или пояснения вроде `Synthetic`, `Captured`,
  `Materialized`, `prompt-visible reference`.
- **Managed / universal / individual** профили тоже не получают служебные
  Harness-обёртки внутри `system-prompt.md`. Если профиль должен быть
  provider-agnostic, его prompt body остаётся чистым workflow-текстом; адаптер
  применяет нужную provider-specific стратегию вне пользовательского prompt
  файла.
- **Провайдерные tool contracts и structured tools** не сериализуются в prompt
  как debug/reference material, если реальный канал ожидает их отдельным
  структурным слоем. Для Codex это app-server tool registry; для других каналов
  аналогичный контракт живёт в adapter/application layer.
- **Метаданные, происхождение и диагностика** живут в `profile.yaml`
  (`description`), архитектурных документах, evidence или sidecar-артефактах,
  но не в provider-facing prompt text.

Практическая причина: провайдеры и их cache/static-prefix распознавание смотрят
на фактическую форму payload. Даже полезная человеку метка внутри prompt меняет
статичный префикс и может сломать cache reuse, routing или семантику
native/managed применения. Это было подтверждено Codex rollback/cache probe
2026-07-06: не-native Harness markers внутри `codex-synthetic-native` дали
резко меньший cache после rollback, а возврат к native-like форме восстановил
ожидаемый cache anchor.

## Схема хранения

```
~/.harness-ai/Profiles/                  <- юзерспейс-корень HARNESS_AI_HOME
  plan-document/                         <- универсальный профиль
    profile.yaml                         <- паспорт
    system-prompt.md                     <- всё тело файла = системный промпт
    tooling.yaml                         <- переключатели категорий туллинга
  todo-plan-deterministic/ ...
  review/ ...
  architecture-spec/ ...
  codeai-workflow-claude/                <- индивидуальный (provider: claude)
    profile.yaml
    system-prompt.md
    tooling.yaml
  Codex/                                <- Codex app-server namespace
    codex-app-server-synthetic-native/  <- индивидуальный (provider: codex)
      profile.yaml
      system-prompt.md                  <- exact captured body.instructions
      tooling.yaml                      <- category metadata; app-server tools are process-owned
    codex-app-server-synthetic-native-custom/
      profile.yaml
      system-prompt.md
      custom-instructions.md            <- inserted into system prompt body
      tooling.yaml
  CodexUC/                              <- Codex OAuth Responses namespace
    codex-synthetic-native/             <- индивидуальный (provider: codex-uc)
      profile.yaml
      system-prompt.md                  <- exact captured body.instructions
      tooling.yaml                      <- category metadata/fallback only
      request-template.json
      tools.json
    codex-synthetic-native-custom/
      profile.yaml
      system-prompt.md
      custom-instructions.md            <- inserted into system prompt body
      tooling.yaml
      request-template.json
      tools.json
```

`profile.yaml` (паспорт):

```yaml
# Паспорт профиля сессии. Отображается в списке выбора профиля.
name: Plan Document
description: Build a structured planning document for a feature or scope.
# provider: claude   <- только у индивидуального профиля; нет поля = универсальный
```

`tooling.yaml`:

```yaml
# Категории туллинга профиля.
# on  = адаптер включает свои нативные инструменты этой категории
# off = адаптер убирает/отключает их
categories:
  file-read: on
  file-write: on
  shell: off
  web: on
  git: off
  tests: off
```

`system-prompt.md`: чистый Markdown; всё тело файла — системный промпт
профиля. Без frontmatter, без служебных секций.

Решения по форматам (согласовано 2026-07-02, расширено для Codex native bundle
2026-07-07): YAML для паспорта и туллинга
(это вводит YAML-парсер как новую runtime-зависимость — сейчас репозиторий
только пишет YAML-строки для agent-файла Kimi и ничего не парсит); Markdown
для тела промпта и custom instruction; JSON для структурного native request
bundle. Один каталог = один профиль; применимость определяется полем
`provider` паспорта (универсальный или индивидуальный). Провайдерский
namespace (`Profiles/Codex/...`, `Profiles/CodexUC/...`) является только
физической группировкой и не входит в id профиля; один и тот же id не должен
использоваться одновременно в разных namespace.

## Словарь категорий туллинга

Профили говорят на провайдер-нейтральных **категориях**; каждый адаптер
мапит категории на свой нативный механизм. Нативные имена инструментов
никогда не появляются в документах профилей; заточка под конкретный канал
делается индивидуальным профилем (`provider: <id>`), а не специальным
синтаксисом переопределений.

Ключевой принцип: **профиль никогда не привносит в канал чужие
инструменты**. Категории только включают/выключают подмножества нативного
набора инструментов самого канала: `file-write: on` для Codex означает его
родной `apply_patch`, для Claude — его Write/Edit, для Kimi — его
StrReplaceFile. Модель каждого канала продолжает работать с инструментами,
на которых её дообучал вендор (Codex дообучен на `apply_patch`; другие
модели — нет, и наоборот), поэтому универсальный профиль не «усредняет»
туллинг, а фильтрует нативный набор каждого канала. Кастомные профили
строятся поверх нативной структуры канала, не ломая её.

Словарь v1: `file-read`, `file-write`, `shell`, `web`, `git`, `tests`.

Честная матрица применимости (что каждый адаптер реально может):

| Категория | Claude (whitelist `tools`) | Codex (флаги `--disable`) | Kimi (`tools` в `agent.yaml`) | GLM Native (наши схемы) |
| --- | --- | --- | --- | --- |
| file-read | Read, Glob, Grep | не управляется | ReadFile, ReadMediaFile, Glob, Grep | read_file, read_file_anchored, grep_files, glob_files |
| file-write | Write, Edit | не управляется | WriteFile, StrReplaceFile | write_file, edit_file, edit_file_by_anchor, apply_patch |
| shell | Bash | не управляется | Shell | exec_command |
| web | WebSearch, WebFetch | не управляется в MVP (фиче-флаги — только с будущим пулом процессов) | (сегодня нет — n/a) | web_search, web_fetch, browser_fetch |
| git | через shell (отдельных инструментов нет) | не управляется | через Shell | git_status, git_diff, git_log, git_blame |
| tests | через shell | не управляется | через Shell | run_tests |

Правила матрицы:

- Категория, которую адаптер не может контролировать, применяется как
  **no-op**, и адаптер фиксирует эффективный туллинг в своём session log;
  финальные таблицы маппинга живут в `module.md` каждого адаптера и
  фиксируются при реализации (точный список имён инструментов Claude и id
  флагов Codex нужно сверить с установленными версиями).
- Категории, существующие только через `shell` (git/tests у Claude/Kimi),
  следуют за переключателем `shell`; GLM Native может учитывать их
  независимо.
- Codex: в MVP все категории туллинга — **no-op**, применяется только промпт
  через `baseInstructions`. Причина (ревью 2026-07-02): текущий адаптер
  держит один общий `CodexAppServerProcess` на все сессии
  (`codex-app-server-facade.ts`) с общим набором thread-привязок, и
  перезапуск процесса под другой набор `--disable`-флагов инвалидировал бы
  привязки уже открытых сессий или перевёл бы их на чужой набор фич. Будущий
  путь (вне MVP): пул app-server процессов, keyed by эффективный
  туллинг-профиль, где каждая сессия привязана к процессу своего профиля с
  независимым lifecycle. Промптовая часть работает уже в MVP: она per-thread
  и перезапуска не требует.

## Слоёный системный промпт

`system-prompt.md` профиля заменяет только **workflow-слой**. Materializer в
Core всегда добавляет тонкий **слой системной обвязки**, чтобы профили
никогда не дублировали технический контекст:

- путь workspace (и содержимое workspace `AGENTS.md` там, где канал не
  инъектирует его нативно сам);
- текущая дата;
- локализационный/языковой контракт (язык чата и артефактов) — те же данные,
  что адаптеры используют сегодня.

Провайдер-специфичная prompt-механика в обвязку Core не входит. В частности,
tool-контракт GLM Native (секция, которая учит модель управлять нашим
локальным агентским циклом) принадлежит слою применения профиля в самом
GLM-адаптере: только адаптер знает эффективный набор инструментов после
фильтрации категорий, а полностью произвольный промпт без этой секции молча
деградировал бы вызовы инструментов. Авторы профилей эту секцию не пишут —
её всегда добавляет GLM-адаптер к любому managed-промпту.

Кастомный профиль (универсальный или индивидуальный) заменяет только
workflow-текст; остальная экосистема канала — нативные инструменты с их
схемами и описаниями (модель получает их от своего же канала),
provider-specific добавки адаптера, процессные политики — остаётся
нативной. Индивидуальные профили существуют ровно для точечной подстройки
workflow-текста под канальные особенности (сильные стороны туллинга канала,
его форматы), а не для замены его экосистемы.

Результат склейки «workflow-слой + обвязка», реально отправленный провайдеру
при create, целиком входит в applied profile snapshot сессии и после этого
не пересобирается из живых данных (см. «Контракт старта сессии»).

Режим промпта в v1 — **только полная замена** (каждый канал по аудиту
поддерживает полную замену; `append` к пресету Claude остаётся доступным
будущему полю профиля без слома формата).

## Семантика Native-профиля (по провайдерам)

«Native» = дефолтное поведение канала без вмешательства Harness.

**Контракт восстановления Native.** Выбор Native обязан возвращать
поведение провайдера в первозданный vendor-вид — как если бы канал
запустили напрямую через vendor CLI/SDK с настройками по умолчанию. Любое
отклонение адаптера от vendor-дефолтов (флаги, опции SDK, фильтры) при
Native либо восстанавливается до vendor-значения, либо явно документируется
в `module.md` адаптера как процессная политика Harness. Процессной
политикой считаются только вещи, без которых запуск внутри Harness
невозможен: изоляция provider home, авторизация и permission bypass (в GUI
некому отвечать на интерактивные разрешения CLI). Урок acceptance
(2026-07-02): у Claude изоляционный `settingSources: []` ошибочно числился
процессной политикой и отключал загрузку workspace `CLAUDE.md` — по
контракту SDK загрузка `CLAUDE.md` требует источника `project`, а пресет
`claude_code` заодно заменяет и старую inline-инжекцию `AGENTS.md`, так что
Native не видел ни того, ни другого. Применённые Native-настройки каждого
адаптера фиксируются в applied snapshot.

Per provider:

- **Claude**: `systemPrompt: { type: 'preset', preset: 'claude_code' }`,
  `tools: { type: 'preset', preset: 'claude_code' }` (полный нативный набор
  инструментов) и `settingSources: ["user", "project", "local"]` —
  vendor-набор источников файловых настроек, включающий загрузку workspace
  `CLAUDE.md` (SDK: «Must include 'project' to load CLAUDE.md files»;
  пустой массив — режим изоляции, он остаётся только для managed/legacy;
  источник `user` читает изолированный provider home, а не домашний каталог
  пользователя ОС). Процессные решения Harness (permission mode, изоляция
  provider home, авторизация) остаются продуктовой политикой, а не
  контентом профиля.
- **Codex**: не передавать `baseInstructions`/`developerInstructions`;
  запускать app-server с дефолтным (без `--disable`) набором аргументов.
- **Kimi**: не материализовать managed-агента; CLI использует свой
  встроенный дефолтный агент (точный путь запуска «без кастомного агента»
  проверить при реализации).
- **GLM Native**: наша встроенная системная инструкция и полный набор из 21
  инструмента — по определению, поскольку внешнего дефолта для нашего
  собственного клиента не существует.

Native существует в двух видах, и ни один провайдер не отбрасывается.
**Vendor-native** — у канала есть собственный нативный промпт/туллинг, и
Native означает невмешательство (Claude, Codex, Kimi). Его текст мы к себе
не копируем: замороженная копия разошлась бы с вендором при первом
обновлении CLI/SDK — против политики сопровождения ниже.
**Harness-defined native** — у канала нативного промпта/туллинга в природе
нет (чистые API: сегодня GLM universal client, следующим этапом OpenRouter
и Local Models), и native создаём мы: пишем кандидатов, тестируем, с каким
промптом и туллингом канал работает лучше, выбираем лучший и объявляем его
native этого провайдера. Создание и приёмка — совместная работа с
пользователем (следующий этап после MVP, см. дорожную карту).

**Сопровождение Native (политика).** Native — основной профиль продукта, и
он обязан всегда соответствовать актуальному нативному поведению канала:
если у провайдера меняется его системный Native Prompt или Tooling
(обновление CLI/SDK/API), наша реализация Native в адаптере обновляется
вслед. Для Claude это отслеживается автоматически через пресеты SDK
(`claude_code`); для Codex/Kimi — автоматически, потому что натив означает
невмешательство в бинарь вендора; для GLM Native, где натив — наш
собственный встроенный промпт и туллинг, поддержание актуальности при
изменениях API/моделей — прямая обязанность сопровождения адаптера. Способ
получения реального текста нативного системного промпта и туллинга
провайдера (для сверки или показа) — отдельная тема, сознательно вне scope
этого документа.

Примечание — **breaking-переход с отдельной приёмкой**: для Claude и Kimi
Native — это изменение поведения относительно сегодняшнего (сейчас они
всегда работают на захардкоженном CodeAI workflow-промпте/whitelist).
Политика миграции: (1) текущее поведение сохраняется как выбираемые
индивидуальные seed-профили `codeai-workflow-*` (по одному на
Claude/Kimi/GLM Native, точные текущие тексты), прежний режим не теряется;
(2) переключение
дефолта «нет выбора ⇒ Native» включается только вместе с резолюцией профилей
и проходит отдельный user acceptance gate с packaged-app evidence (Фаза F
дорожной карты); (3) сессии, созданные до фичи, работают в legacy-режиме
через миграционный контракт snapshot (см. «Контракт старта сессии»).

## Новый кластер: `session-profiles` (Core Runtime)

`product-parts/core-runtime/clusters/session-profiles/`, четыре модуля,
каждый за своим фасадом:

1. **`profile-store`** — правда диска. Резолвит корень `Profiles/` внутри
   harness home (тот же подход к резолву home, что и у
   `resolveCoreLocalizationRootDirectory()`), сканирует каталоги профилей,
   парсит паспорт/туллинг/промпт, валидирует с человекочитаемыми ошибками
   (неизвестная категория, отсутствующий файл, синтаксис YAML), сидирует
   стандартный набор профилей при первом обращении, отдаёт пути файлов для
   открытия в редакторе. Владеет YAML-зависимостью.
2. **`profile-catalog`** — правда выбора. Строит каталог (read model) для UI
   (паспорта + тип универсальный/индивидуальный + применимость по
   провайдерам + статус валидности), всегда добавляет виртуальный Native
   первым, резолвит `(profileId, providerId)` → документы применимого
   профиля, резолвит «нет выбора» → Native и определяет контракт ошибки для
   выбранного-но-битого профиля (см. «Контракт старта сессии»).
3. **`profile-materializer`** — правда payload. Превращает разрешённый
   профиль в провайдер-нейтральный `SessionProfilePayload`: тело промпта
   + слой системной обвязки (workspace, дата, язык, политика `AGENTS.md`)
   + категории туллинга. Payload полностью провайдер-нейтрален;
   провайдер-специфичные добавки (например tool-контракт GLM Native) делает
   слой применения профиля в адаптере. Адаптеры получают payload; сами файлы
   профилей они никогда не читают.
4. **`profile-authoring`** — правда создания и редактирования. Владеет
   шаблонами трёх документов, создаёт новый профиль (универсальный или
   индивидуальный: имя → kebab-case id каталога + паспорт + два документа
   из шаблонов), отдаёт пути документов для открытия во внешнем редакторе и
   предоставляет статус валидности каждого профиля (через `profile-store`)
   для Settings-таба. Создание из шаблона валидно по построению; валидность
   после внешнего редактирования — постоянный статус каталога,
   пересчитываемый при каждом сканировании, а не разовый акт при создании.

Маппинг «категория → нативные инструменты» живёт в **адаптерах**
(Provider Runtime), а не в этом кластере: имена инструментов — знание
провайдера. Core говорит только категориями.

## Контракт старта сессии

- Рендерер передаёт выбор пользователя через существующее поле
  `NextSessionMode` `managedProfileId` (`invocationMode: "managed"`) или
  `invocationMode: "native"`. Никакой новой правды на стороне UI.
- `session-request-handler` перестаёт жёстко резолвить `Native · Raw`: он
  резолвит полученный режим через `profile-catalog`, получает
  `SessionProfilePayload` из `profile-materializer`, сохраняет неизменяемый
  **applied profile snapshot** в состоянии сессии (владелец — Session
  Runtime; видимость в событиях/read model) и передаёт payload в адаптер
  через расширенный `provider-adapter-contract` (опции
  `createSession`/`resumeSession`).
- **Нет выбора ⇒ Native.** Сессия всегда может стартовать; Native —
  гарантированный fallback. (UI сделает выбор явным шагом, но Core никогда
  не блокируется на отсутствии выбора.) Для Claude/Kimi это осознанный
  breaking-переход относительно сегодняшнего дефолта — политика миграции
  описана в «Семантике Native-профиля».
- **Выбран, но битый ⇒ ошибка, а не тихий fallback.** Если выбранный профиль
  не удаётся загрузить/распарсить/разрешить для провайдера сессии, Core
  отклоняет создание сессии со структурированной ошибкой для UI. Молча
  стартовать с другими инструкциями, чем выбрал пользователь, хуже, чем
  видимо упасть.
- **Applied profile snapshot (неизменяемый).** В момент create Core
  фиксирует полный применённый contract: `profileId`, `providerId`,
  отображаемое имя профиля; материализованный системный промпт целиком —
  workflow-слой профиля плюс добавленный при старте Core/system wrapper;
  эффективные категории туллинга; provider-specific application details
  (whitelist инструментов Claude, ключ процесс/туллинг-профиля Codex,
  ключ/путь материализованных agent-артефактов Kimi, идентификаторы
  tool-схем GLM); hash/версию применённого материала для диагностики.
  Provider-specific details Core получает из результата применения адаптера
  (`ProviderSessionStartResult`), а не вычисляет сам. Snapshot после
  создания не меняется. Порядок внедрения: персист snapshot реализуется
  раньше активации managed-резолюции — managed-сессия не может стартовать
  раньше, чем её snapshot переживает рестарт Core.
- **Resume работает только со snapshot.** Возобновление никогда не
  перечитывает user-editable файлы из `~/.harness-ai/Profiles/**`: payload
  восстанавливается из snapshot и провайдер-нативного персистентного
  состояния сессии/треда (thread id, session id, agent-артефакты). Причина:
  провайдер-сторона long-lived сессии (thread/cache/context у Claude, Codex,
  Kimi) создана с исходным системным промптом и исходным набором
  инструментов; перечитывание изменённого профиля дало бы рассинхронизацию —
  Core считал бы contract новым, а провайдер продолжал бы жить со старым,
  ломая кэш, поведение инструментов и воспроизводимость сессии. Правка,
  поломка или удаление файлов профиля после старта сессии не меняет и не
  ломает эту сессию; текущее состояние `Profiles/**` влияет только на новые
  сессии. Нужны изменённые инструкции или другой туллинг — пользователь
  начинает новую сессию (тем же профилем после правки либо другим).
  Контракт ошибки «выбран, но битый» применяется только на create.
- **Wrapper входит в snapshot.** Снапшотится применённый материал целиком,
  включая добавленную при create системную обвязку (дата старта, языковой
  контракт, workspace-контекст): у Claude/Codex/Kimi исходный промпт и так
  вморожен на стороне провайдера в thread, и Core обязан отражать эту
  реальность, а не пересобирать «живую» версию, которой провайдер не видел.
  Следствие для GLM Native: наш клиент по-прежнему шлёт системное сообщение
  на каждый ход, но собирает его из snapshot (та же дата старта, тот же
  языковой контракт), а не из живых Core-данных — ради воспроизводимости
  сессии и единой семантики со всеми каналами. Смена языка в Settings
  действует с новой сессии.
- **Миграция legacy-сессий.** Сессии, созданные до этой фичи, snapshot не
  имеют: они резолвятся в legacy-поведение «без payload» (адаптер работает
  ровно как сегодня) и помечаются в read model как `legacy` — без ошибок и
  без тихой смены инструкций.

## Стратегии применения в адаптерах

Из трёх пользовательских документов профиля до формы конкретного канала
работают два слоя в реалтайме при create: `profile-materializer` (Core)
собирает провайдер-нейтральный payload, а **слой применения профиля в
адаптере** (отдельные файлы `*-profile-application`) переводит payload в
точную форму своего канала — опции SDK, `baseInstructions`, agent-файлы,
тело запроса. Форму канала не пишет ни пользователь, ни Core: она
закодирована только в коде адаптера и генерируется детерминированно,
поэтому пользовательские документы не могут её нарушить; ошибки их
содержимого ловит валидация `profile-store` до старта сессии.

Контракт: `provider-adapter-contract` получает опциональный
`SessionProfilePayload` в опциях создания сессии, а результат
`createSession`/`resumeSession` расширяется аддитивно до
`string | ProviderSessionStartResult`
(`{ providerSessionId, appliedProfileApplication? }`): адаптер возвращает
Core фактически применённые provider-specific details (whitelist Claude,
ключ процесс-профиля Codex, ключ/путь immutable agent-артефактов Kimi,
идентификаторы tool-схем GLM), потому что Core не может их угадать —
особенно путь Kimi-артефактов, который создаёт сам адаптер. Существующие
адаптеры продолжают возвращать строку, Core нормализует; snapshot с details
персистится до публикации сессии. Отсутствие payload ⇒ ровно текущее
поведение (безопасность перехода), пока не приземлится Native-семантика
каждого адаптера; затем отсутствие payload = Native.

- **Claude**: `buildQueryOptions()` принимает payload: managed ⇒
  `systemPrompt = payload.prompt`,
  `tools = mapCategories(payload.categories)`; native ⇒ оба пресета.
  Захардкоженные `CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT` /
  `CODEAI_CLAUDE_WORKFLOW_TOOLS` перестают быть достижимыми дефолтами, их
  контент переезжает в seed-профили.
- **GLM Native**: `buildRequestBody()`/`streamTurn()` принимают текст
  промпта и отфильтрованное подмножество схем инструментов; слой применения
  профиля в адаптере добавляет к managed-промпту GLM-специфичный
  tool-контракт под эффективный набор инструментов; native ⇒ встроенная
  инструкция + полный набор.
- **Codex**: `thread/start`/`thread/resume` получают `baseInstructions` из
  payload (managed) или не получают его (native); категории туллинга в MVP —
  no-op (см. правила матрицы); эффективный ключ процесс-профиля фиксируется
  в snapshot как задел под будущий пул процессов.
- **Kimi**: материализация agent-артефактов (`agent.yaml` + `system.md` +
  список tools) перед `session/new` в **immutable каталог, ключуемый
  content-hash применённого материала**: артефакты никогда не
  перезаписываются (сегодняшний код пишет в фиксированный каталог и
  перезаписывает файлы — так нельзя: правка профиля и новая сессия молча
  сменили бы agent-контракт старых сессий при resume); одинаковый контент
  дедуплицируется в один каталог; ключ/путь возвращается в
  `ProviderSessionStartResult`, живёт в snapshot, и resume переиспользует
  ровно этот путь; native ⇒ дефолтный агент без кастомных артефактов.
  Сборка мусора неиспользуемых каталогов — вне MVP. Первый шаг:
  верифицировать привязку каталога агента и изоляцию параллельных сессий.

## RPC-поверхность Core (MVP)

Следует ровно четырёхслойной схеме, проверенной на `ensure-glossary-file`
(диспетчер `core-runtime-api.ts` → `IPC_TO_RPC` в
`core-process-bridge-facade.mjs` → `preload.cjs` → типы `vite-env.d.ts`):

- `list-session-profiles` → каталог (read model) для пикера и Settings-таба
  (при первом вызове триггерит сидирование): профили с именем/описанием,
  типом универсальный/индивидуальный, применимостью по провайдерам и
  статусом валидности; Native первым.
- `create-session-profile` → создать профиль из шаблонов (имя + тип +
  `providerId` для индивидуального), вернуть пути созданных документов.
- `open-session-profile-file` → ensure + вернуть абсолютный путь конкретного
  документа профиля для действия «редактировать в VS Code» (тот же UX, что
  у кнопки глоссария).
- Запоминание последнего выбора: последний выбранный профиль и флаг
  AutoNormalizer запоминаются per provider в Core settings (settings truth,
  не renderer state); Core отдаёт предвыбор в рид-модели и фиксирует выбор
  при create.
- RPC создания сессии: нового метода нет — `createSession` уже несёт
  `nextSessionMode`; меняется только Core-резолюция, как описано выше.

Снапшот/рид-модель сессии получает применённый id/имя профиля, чтобы UI мог
показать, с каким профилем работает сессия.

## UI-поверхность (согласовано 2026-07-02)

**Выбор профиля при создании сессии (wizard).**

- Панель `Next Session Mode` в левом сайдбаре и её диалог (Provider
  startup / User request / Managed profile с Preview-заглушками) удаляются.
- Flow создания: `Start New Session` → карточка выбора провайдера
  (существующая) → шаг выбора профиля: выпадающий список применимых
  профилей (Native первым, затем универсальные и индивидуальные профили
  этого провайдера) + подтверждение старта.
- Предвыбор — последний выбранный профиль этого провайдера из Core
  settings; если его больше нет — Native. Для провайдеров, чья поддержка
  профилей выходит следующим этапом (OpenRouter, Local Models), список в
  MVP содержит только Native — flow единообразен и при их подключении не
  меняется.
- Шаг нельзя пропустить: требование «сессия не начинается без выбора
  профиля» выполняется структурой flow; Core при этом сохраняет
  fallback-контракт «нет выбора ⇒ Native».
- Применённый профиль текущей сессии отображается мелкой меткой в шапке
  сессии из applied profile snapshot (например `Review` или `Native`).

**AutoNormalizer (нормализация запроса).** Контракт закладывается сейчас:
`requestMode` уже существует в `NextSessionMode`, флаг запоминается per
provider в Core settings. Видимая галочка появляется только вместе с
реальной реализацией нормализатора (отдельный будущий scope, где сначала
определяется его поведение) — до этого UI её не показывает, чтобы не
нарушать правило AGENTS.md §7 о неработающих контролах, и всегда шлёт
`requestMode: "raw"`.

**Settings-таб `Profile Creator`** (новый UI-модуль `profile-settings-ui` в
кластере `settings-surface`, таб справа от General):

- Кнопка `New Profile` → выбор типа: **общий (универсальный)** — провайдер
  не спрашивается; **индивидуальный** — дополнительно выбирается провайдер
  → in-app ввод имени профиля (без native prompt, правило §7) → Core
  создаёт каталог с тремя документами из шаблонов
  (`create-session-profile`) → редактируемые документы открываются в
  VS Code (`vscode-link-opener`). Профиль автоматически появляется во всех
  списках при следующем сканировании — кэша нет; наполнять документы может
  сам пользователь или его агент, для системы это просто файлы.
- Список всех созданных профилей с типом, областью применимости и
  **статусом валидности** каждого (валиден / человекочитаемая ошибка
  парсинга или схемы); выбор профиля открывает его документы в VS Code;
  сохранение во внешнем редакторе просто перезаписывает файлы — следующее
  сканирование подхватывает.
- Native в списке отсутствует (файлов нет). Переименование/удаление
  профилей в MVP не входит в UI (files-first: каталог можно удалить руками,
  snapshot-контракт делает это безопасным для уже созданных сессий).

## Seed-профили

Seed-профили — стандартный стартовый набор, который приложение создаёт при
первом обращении (как глоссарий создаётся с предзаполненными терминами);
контент пишется на английском при реализации и ревьюится пользователем
(после этого файлы принадлежат пользователю):

1. `plan-document` (универсальный) — построение структурированного
   планового документа.
2. `todo-plan-deterministic` (универсальный) — детерминированный
   machine-managed todo-план.
3. `review` (универсальный) — ревью кода/архитектуры.
4. `architecture-spec` (универсальный) — спецификации product parts /
   clusters / modules (один профиль; разница между уровнями спецификаций —
   содержание запроса, а не другой туллинг).
5. `codeai-workflow-claude` (индивидуальный) — активное managed-поведение
   Claude с точным workflow-промптом. Старые `codeai-workflow-kimi` и
   `codeai-workflow-glm-native` больше не сидируются, потому что их provider
   ids (`kimi`, `glm-native`) удалены; Kimi/GLM client-four profiles
   переопределяются в Phase 5 synthetic-native через новые live ids.
6. `codex-synthetic-native` (индивидуальный CodexUC, физически
   `Profiles/CodexUC/codex-synthetic-native`) — ручной Codex probe из
   принятого native request capture 2026-07-05 для Responses-compatible
   CodexUC route: `system-prompt.md` является точной копией captured
   `body.instructions`, `tools.json` является точной копией captured
   `body.tools`, а `request-template.json` хранит статичные поля запроса. В
   этом baseline нет workspace/custom instructions.
7. `codex-synthetic-native-custom` (индивидуальный CodexUC, физически
   `Profiles/CodexUC/codex-synthetic-native-custom`) — тот же exact native
   baseline плюс `custom-instructions.md`. На диске `system-prompt.md`
   остаётся exact captured baseline, а custom text хранится только в sidecar;
   materializer вставляет sidecar text в final `instructions` после `# General`
   как обычную часть system instructions, без имени `AGENTS.md`, пути,
   отдельного раздела или Harness wrapper. Для CodexUC после materialization
   adapter добавляет `prompt_cache_key` в HTTP payload после `tools` и перед
   динамическим `input`; profiles не должны хранить этот key в
   `request-template.json`.
8. `codex-app-server-synthetic-native` (индивидуальный Codex app-server,
   физически `Profiles/Codex/codex-app-server-synthetic-native`) — prompt-only
   baseline с тем же captured `body.instructions`; `request-template.json` и
   `tools.json` отсутствуют, потому что список инструментов и их описания
   приходят из native app-server tool registry, а не из профиля.
9. `codex-app-server-synthetic-native-custom` (индивидуальный Codex
   app-server, физически
   `Profiles/Codex/codex-app-server-synthetic-native-custom`) — тот же
   prompt-only baseline плюс `custom-instructions.md`; структурные native tool
   declarations по-прежнему не хранятся в профиле и не передаются через
   `baseInstructions`.

Плюс виртуальная запись `native` (не на диске).

## Вне scope (этого цикла)

- Реализация AutoNormalizer (нормализация пользовательского запроса):
  контракт `requestMode` и запоминание per provider закладываются сейчас,
  поведение и видимая галочка — отдельный будущий scope.
- LLM-адаптация текста профиля под провайдера: трансляция всегда
  детерминированная, «умное» переписывание промпта сознательно не делаем.
- In-app переименование/удаление профилей (в MVP — files-first).
- Сборка мусора (GC) неиспользуемых immutable Kimi agent-артефактов.
- Workspace-уровень переопределений профилей
  (`<workspace>/.harness/settings/**`).
- Инъекция кастомных/MCP-инструментов через профили; per-provider
  переопределения нативных имён инструментов в `tooling.yaml`; режим
  `append` промпта.
- Смена профиля посреди сессии.
- Пул app-server процессов Codex под туллинг-профили (в MVP категории
  туллинга Codex — no-op).
- Механизм получения реального текста нативного системного промпта и
  туллинга провайдера (для сверки/показа) — отдельная будущая тема.
- Профили для OpenRouter / Local Models / GLM universal client — не отброшены, а
  вынесены в следующий этап после MVP-четвёрки (решение пользователя,
  2026-07-02; см. «Следующий этап» в дорожной карте): эти провайдеры
  получают Native (для каналов без вендорского натива — Harness-defined) и
  те же универсальные профили.

## Риски и ограничения

- **Гранулярность туллинга Codex грубая** (фиче-флаги, а не инструменты);
  один общий app-server процесс на все сессии делает смену флагов
  небезопасной для уже открытых сессий, поэтому в MVP категории Codex —
  no-op, а изоляция через пул процессов по туллинг-профилям — отдельная
  будущая работа.
- **Верификация привязки агента Kimi (2026-07-02) провалила допущение**:
  материализованный `agent.yaml` не привязан к запуску CLI никаким
  доказуемым каналом (запуск — голый `kimi acp` без agent-флага, env несёт
  только `KIMI_MODEL_*`, cwd сессии — workspace/provider home, а не каталог
  агента). Применять профиль, который доказуемо не доходит до модели, — это
  тихая подмена, поэтому managed-профили Kimi отложены: в MVP Kimi исключён
  из `PROFILE_SUPPORTED_PROVIDER_IDS` (в пикере только Native = сегодняшнее
  поведение), адаптер защитно отклоняет managed-опции, а следующий этап
  сначала верифицирует реальный канал привязки; артефакты тогда — immutable
  и content-hash keyed (каталог на применённый контракт, не «на профиль»),
  потому что перезапись общих файлов ломала бы resume старых сессий.
- **Кастомные промпты GLM Native обязаны сохранять tool-контракт** — им
  владеет слой применения профиля в GLM-адаптере, а не авторы профилей и не
  Core materializer (Core payload остаётся провайдер-нейтральным).
- **Native для Claude/Kimi меняет сегодняшнее дефолтное поведение**;
  переключение происходит только с приземлением резолюции профилей, старый
  контент выживает в сидах.
- Новая YAML-зависимость: выбор пакета (например `yaml`) — при реализации;
  использование парсера остаётся внутри `profile-store`.
- Лимит 500 строк на файл реализации: адаптеры получают отдельные файлы
  `*-profile-application`, а не растят существующие менеджеры.
- Номера строк аудита в этом документе дрейфуют при рефакторингах; это
  свидетельства аудита, а не живые ссылки.

## Дорожная карта фаз реализации (вход для будущего todo-plan)

Порядок важен; каждая фаза — commit-sized микро-задачи (не более 3
функциональных файлов) в будущем todo-plan:

- **Фаза A — фундамент кластера**: `profile-store`
  (резолв/скан/парсинг/валидация/сидирование + YAML-зависимость), затем
  `profile-catalog` (read model, Native, резолюция, контракт ошибок), затем
  `profile-materializer` (payload + обвязка), затем `profile-authoring`
  (шаблоны, создание профиля, пути для редактора, статус валидности).
  Product tree + документы кластера/модулей в тех же коммитах.
- **Фаза B — контракт и проводка Core**: расширить
  `provider-adapter-contract` полем `SessionProfilePayload` и аддитивным
  результатом `ProviderSessionStartResult`; СНАЧАЛА персистентное хранение
  неизменяемого applied profile snapshot как части session identity/evidence
  (переживает рестарт Core вместе с сессией, а не живёт как UI-метаданные;
  реальный путь персистенции — session store, не in-memory объект), и
  ТОЛЬКО ЗАТЕМ активация managed-резолюции `NextSessionMode` в
  `session-request-handler` — инвариант: managed-сессия не может стартовать
  раньше, чем её snapshot персистится; проекция в рид-модель; resume из
  snapshot и legacy-контракт для сессий без snapshot; структурированный
  контракт ошибок; запоминание последнего выбранного профиля и
  AutoNormalizer-флага per provider в Core settings (settings-store).
- **Фаза C — адаптеры, по одному на stream**: Claude → Codex →
  CodexUC test surface → client-four synthetic-native (`kimi-client`,
  `glm-client`, `openrouter-client`, `local-models-client`). `module.md`
  каждого адаптера получает таблицу маппинга категорий; старые GLM Native/Kimi
  ACP привязки не реанимируются.
- **Фаза D — RPC/мост/типы**: `list-session-profiles`,
  `create-session-profile`, `open-session-profile-file`, поле снапшота — по
  четырёхслойному паттерну `ensure-glossary-file`.
- **Фаза E — UI** (по разделу «UI-поверхность»): E1 — шаг выбора профиля в
  wizard создания сессии + удаление панели/диалога `Next Session Mode` +
  метка применённого профиля в шапке сессии; E2 — Settings-таб
  `Profile Creator` (новый модуль `profile-settings-ui` в
  `settings-surface`).
- **Фаза F — упаковка и приёмка пользователем**: `npm run package:mac` (по
  подтверждению пользователя) + evidence-документ; отдельный acceptance gate
  на synthetic-native application и Native-поведение live provider ids.
- **Следующий этап (после MVP)** — профили для остальных провайдеров:
  Harness-defined native для OpenRouter и Local Models (кандидаты промпта и
  туллинга пишутся при реализации, тестируются и выбираются совместно с
  пользователем, лучший объявляется native канала); Harness-defined native для
  GLM universal client (промпт/туллинг принадлежат нашему клиенту, не embedded
  OpenCode); затем те же универсальные профили для всех трёх.
