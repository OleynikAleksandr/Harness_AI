# Анатомия и композиция native-промпта

Статус: архитектурная заметка (Phase 7 — Native Profile Unification, 2026-07-03).
Источник фактов: принятые native-дампы 2026-07-03 (`docs/evidence/provider-network-capture-*`,
артефакты в `~/.harness-ai/logs/native-request-capture/`). Механика съёма —
`docs/architecture/SessionProfilesV2.md` decision 5.

Этот документ фиксирует, из чего физически состоит запрос провайдера в начале
сессии, что в нём статично, что динамично, как это кэшируется, и какую часть мы
замораживаем в управляемый native-профиль.

## 1. Из чего состоит запрос к модели

Каждый провайдерский клиент шлёт модели три вещи:

- **System prompt** — инструкция «кто ты и как работаешь» (+ описание среды).
- **Tools** — схемы инструментов, доступных модели (JSON-схемы имён/параметров).
- **Messages** — ход диалога: первый пользовательский ход, служебные
  system-reminder, содержимое проектных инструкций (`CLAUDE.md`/`AGENTS.md`).

Native-эталон, который мы снимаем и замораживаем, — это **system prompt + tools**.
Messages — это рантайм-поток конкретной сессии, в профиль он не входит.

## 2. Два слоя системного промпта

Системный промпт любого провайдера делится на два принципиально разных слоя:

- **Статичная обвязка (кусок 1).** «Ты — Claude Code / Codex / Kimi Code CLI. Вот
  правила поведения. Вот твои инструменты.» Одинакова в любой сессии и у любого
  пользователя. Именно её меняет вендор при обновлениях SDK/CLI. **Этот слой мы
  замораживаем** в native-профиль как снимок протестированной версии — обновления
  вендора на него больше не влияют (управляемость).
- **Живой контекст сессии (кусок 2).** «Рабочая папка: …, сегодня …, git показывает
  …, память/scratchpad здесь …». Меняется каждую сессию; это факт про конкретный
  запуск, а не про вендора. **Этот слой НЕ замораживается** — он формируется заново
  каждую сессию для ЛЮБОГО профиля (native и managed одинаково). Заморозить его =
  внести в каждую будущую сессию устаревшую папку/дату (дефект, а не управляемость).

Это и есть модель **B2**: обвязка заморожена и управляема нами, контекст всегда живой.

## 3. Prompt caching (почему порядок слоёв важен)

Провайдеры кэшируют статичный префикс системного промпта в рамках сессии (у Claude
это `cache_control: {type: "ephemeral", ttl: "1h"}` на блоках обвязки в дампе).
Механика: первый запрос сессии оплачивает весь промпт, а последующие ходы того же
диалога переиспользуют закэшированный префикс — токены на нём не пересчитываются.

Отсюда правило композиции: **статичная обвязка идёт первой (кэшируемый префикс),
живой контекст — последним (некэшируемый суффикс).** Claude Agent SDK даёт для
этого явный разделитель `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` в `systemPrompt: string[]`:
блоки до маркера кэшируются кросс-сессионно, после — нет. Наш native-профиль
(замороженная обвязка) — это кэшируемый префикс; генератор контекста добавляет
живой суффикс за границей.

### Инвариант формата provider-facing профилей

Общий контракт описан в `docs/architecture/SessionProfiles.md`: формат
provider-facing prompt является частью контракта для всех session profiles, не
только для Native. Если мы меняем содержимое профиля, мы должны сохранять форму,
порядок, маркеры и wrapper-структуру того канала или managed-профиля, который
реально использует провайдер. Нельзя добавлять внутрь provider-facing system
profile наши служебные заголовки, лейблы, пояснения, fenced JSON/code blocks,
diagnostic sections или provenance текст вроде `Synthetic`, `Captured`,
`Materialized`, `prompt-visible reference` и т.п. Даже если такие метки полезны
человеку, для модели и provider cache это новые токены в статичном префиксе,
которые меняют byte-level форму профиля.

Практический результат Codex rollback/cache probe 2026-07-06: когда
`codex-synthetic-native` содержал Harness diagnostic headings и captured-tools
JSON внутри prompt, cache после rollback был резко меньше ожидаемого. После
возврата к native форме provider начал видеть стабильный prefix корректно.
Вывод 2026-07-07: `codex-synthetic-native` должен быть exact baseline из
native capture (`body.instructions` в `system-prompt.md`, `body.tools` в
`tools.json`, static request fields в `request-template.json`) без custom
инструкций. Вариант с пользовательскими правилами должен быть отдельным
профилем (`codex-synthetic-native-custom`): его `custom-instructions.md`
остаётся отдельным sidecar на диске, а materializer вставляет этот текст в
final provider-facing `instructions` внутрь подходящего раздела captured
system prompt (сейчас после `# General`) без имени файла, пути, Harness
heading или provenance wrapper. `system-prompt.md` custom-профиля при этом
остаётся exact baseline; предварительно сливать туда custom text нельзя,
иначе materializer добавит инструкции повторно. Для cache-friendly
synthetic/native профилей нельзя менять формат, даже если мы сознательно
меняем содержимое; тот же принцип применяется к managed, universal и
individual профилям, чтобы не смешивать prompt payload с Harness metadata/debug
text.

## 4. Разбор по провайдерам (из принятых дампов)

### Claude (system ~11.5k символов / ~2.9k tok, 10 inline-тулов)

- **Обвязка (замораживаем):** identity «You are Claude Code, Anthropic's official
  CLI for Claude.», `# Session-specific guidance`, `# Context management`,
  `# Claude in Chrome browser automation`, список из 10 инлайн-тулов (Agent,
  AskUserQuestion, Bash, Edit, Read, ScheduleWakeup, Skill, ToolSearch, Workflow,
  Write) плюс deferred-каталог, подгружаемый через ToolSearch.
- **Живой контекст (генерим заново):** `# Environment` (~1k: рабочая папка, git,
  платформа, ОС, дата, модель, knowledge cutoff), путь в `# Memory` (~2.2k),
  `# Scratchpad Directory` (путь).
- **Вне промпта:** содержимое `CLAUDE.md`/`AGENTS.md` проекта (~14.5k) приходит
  отдельным стартовым сообщением, не системным промптом.

### Codex (instructions ~21.3k символов / ~5.3k tok, 17 inline-тулов)

- **Обвязка (замораживаем):** вся `instructions` структурно статична —
  `# Personality` (Values, Interaction Style, Escalation), `# General`
  (Engineering judgment, Frontend guidance, Editing constraints, Autonomy),
  `# Working with the user` (Formatting rules, Final answer instructions).
  Env-секций внутри `instructions` нет — контекст среды Codex приходит отдельным
  каналом (rollout/turn), не в этом поле. То есть у Codex вырезать из обвязки
  почти нечего.
- **Тулинг:** 17 нативных инструментов зашиты в app-server, включаются
  process-флагами. Промпт подменяем полностью (`baseInstructions`), но список
  тулов per-thread не урезается (см. потолки в разделе 6).

### Kimi (system ~27.1k символов / ~6.8k tok, 23 inline-тула)

- **Обвязка (замораживаем):** identity «You are Kimi Code CLI…», `# Prompt and Tool
  Use`, `# General Guidelines for Coding`, `# General Guidelines for Research and
  Data Processing`, `# Ultimate Reminders`, 23 нативных тула.
- **Живой контекст (генерим заново):** `# Working Environment` (## Operating System,
  ## Date and Time, ## Working Directory), directory listing, `# Project
  Information` (в дампе туда попал наш `AGENTS.md` — это проектный контекст,
  аналог Claude `CLAUDE.md`), `# Skills` / `## Available skills` (зависит от
  установленных скиллов).

## 5. Балласт: что выбрасываем из обвязки

Рамка (SessionProfilesV2 decision 5): выбрасываем только универсальный балласт «на
все случаи жизни», сохраняя всё, что важно для любого запроса.

- **Claude `# Memory` (~2.2k tok) — кандидат на исключение.** Это инструкции про
  файловую auto-memory Claude плюс путь. При нашем оркестрированном harness (план
  как единственный recovery owner, коммит на каждую микрозадачу, plan-first
  lifecycle) роль долговременной памяти уже выполняет план — файловая auto-memory
  избыточна и стоит ~2.2k tok на каждый запрос. Это пример балласта, а не
  несущего блока. Финальное решение по каждой секции принимается при сборке
  native-профиля (authoring), не автоматически.

## 6. Потолки применения по провайдерам (честно)

Степень подмены промпта и тулинга ограничена клиентом провайдера:

- **Claude** — полная подмена: `systemPrompt` (string / string[] с
  `DYNAMIC_BOUNDARY`) + `tools` (точный список). Обвязка и тулинг управляемы.
- **Codex** — native app-server путь полностью управляет prompt через
  `baseInstructions`, но не даёт per-thread подменять 17 app-server tools.
  Prompt-only synthetic profiles сохраняют captured `body.instructions`, но
  structured tool declarations остаются под управлением app-server.
- **Kimi** — канал подмены (agent.yaml → `system_prompt_path` + `tools:`) **не
  доказан** (verification 2026-07-02: нет подтверждённой привязки materialized
  agent.yaml к спавненному CLI). Синтетический Kimi native заблокирован, пока
  канал не починен и не доказан (порядок работ: Kimi чиним первым).

## 7. Native-профиль как управляемый снимок

- Native/synthetic baseline становится обычным профилем в
  `~/.harness-ai/ProfileStudio/Profiles/<Provider>/<profileId>/`. Для Codex текущий эталон:
  `Profiles/Codex/codex-synthetic-native/` с `profile.yaml`,
  `system-prompt.md`, `tooling.yaml`, `request-template.json` и `tools.json`.
- Кнопка **«Обновить Native Profile»** (Settings → General, рядом с Native Request
  Capture) — Core-команда: берёт свежий дамп каждого провайдера, делит
  обвязку/контекст, перезаписывает файлы native-профиля. Так «актуализировать под
  новые дампы» — один клик.
- Генератор живого контекста — общий для всех профилей (native и managed), чтобы
  «Environment/Memory-path/Scratchpad» собирались единообразно под текущую сессию.

## Связанные документы

- `docs/architecture/SessionProfilesV2.md` — контракт профилей v2 и decision 5
  (механика native-съёма).
- `docs/architecture/SessionProfiles.md` — runtime-модель выбора профиля.
