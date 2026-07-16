# Универсальный клиент OpenAI-shape провайдеров

Статус: research-документ Phase 1 (scope `universal-client-2026-07-04`,
задача `harness-ai.phase1.stream1.task2`). Рамочное решение уже принято
пользователем 2026-07-04 (DECISIONS в
`.harness/plans/archive/session-profiles-v2-plan-document-2026-07-02.md`).

**В одной строке.** Мы делаем СВОЙ СОБСТВЕННЫЙ клиент для ВСЕХ провайдеров,
КРОМЕ Claude и Codex (эти двое остаются на родных вендорских каналах — Claude
Agent SDK и Codex app-server). Клиентская четвёрка: Kimi, GLM, Local Models,
OpenRouter (и любой будущий OpenAI-shape вендор — тонким endpoint-модулем на
том же ядре). Пишем ОДНО Core-owned ядро, а ЧУЖИЕ open-source проекты берём
ЗА ОСНОВУ/reference (OpenCode и другие из survey ниже), чтобы не разрабатывать
заново то, что уже кем-то пройдено. Встраивание OpenCode как рантайм-ядра
ОТКЛОНЕНО (двойная зависимость, избыточность, «Codex-моменты» чужого движка);
поведение переносим, код не копируем.

Этот документ решает два вопроса ниже рамки: (a) набор возможностей/параметров
клиента и (b) какие open-source проекты берём как foundation/reference. Раздел
6 фиксирует решение пользователя.

Источники фактов: локальный разбор reference-стека Harness (перенесённый
CodeAI-Hub рантайм, живший на момент исследования в `src/reference/**`
модулей `openrouter-provider`/`local-models-provider`/`glm-native-provider`;
после консолидации в ядро эти модули удалены чисткой 2026-07-05, исходники
остаются в git-истории), разбор HEAD-клона OpenCode (MIT), веб-survey
OSS-клиентов и API-доков провайдеров (2026-07-04). Пометки UNVERIFIED
означают отсутствие публичного подтверждения.

## 1. Рамка (из решения 2026-07-04)

- Одно Core-owned ядро: agent loop, исполнение инструментов, SSE-стриминг,
  permissions, нормализация событий. Тонкие endpoint-модули поверх ядра:
  Kimi, GLM, Local Models, OpenRouter и любой будущий OpenAI-shape вендор.
- Порядок: Kimi ПЕРВЫМ на ядре; Kimi auth gate — первая проверка
  имплементационной фазы. Phase 3 visibility switch применён: видимый GLM
  теперь `glm-client` на универсальном клиенте; `glm-native` скрыт как
  legacy/internal, а embedded OpenCode runtime (`glm-opencode-provider` и
  `@opencode-ai/sdk`) удалён из production runtime этой фазы.
- Phase 4 visibility switch применён: ВСЯ клиентская четвёрка живёт на
  универсальном клиенте. Видимые OpenRouter и Local Models — endpoint-модули
  `openrouter-client-provider` и `local-models-client-provider`; legacy
  reference-адаптеры (`openrouter-provider`, `local-models-provider`,
  `glm-native-provider`) УДАЛЕНЫ из дерева вместе с поглощённым
  reference-корпусом (legacy cleanup 2026-07-05 по приказу пользователя).
  ACP `kimi-provider` ТАКЖЕ УДАЛЁН (прямой приказ пользователя 2026-07-05,
  вместе с его Kimi-capture каналом) — видимый Kimi живёт только на
  `kimi-client`; capture обслуживает лишь Claude/Codex, материал по Kimi для
  Phase R — принятые дампы 2026-07-03. Afterlife-удалений больше не осталось.
  OpenRouter Settings-таб сохранён КАК
  ЕСТЬ (ревью-фикс пользователя 2026-07-05): endpoint уважает каждое поле
  карты per turn — `apiKey`, `baseUrl`, `defaultModel` (slug search),
  `endpointTag` (не-default тег маршрутизирует ход телом запроса
  `provider: {allow_fallbacks: false, order: [tag]}`); один ключ OpenRouter
  обслуживает и coding-сессии, и движок перевода локализации. Local Models
  получил connection-карту (base URL + опциональный ключ + override длины
  контекста), живой каталог `GET {v1}/models` с настроенного URL (хардкод
  LM-Studio-URL ушёл из production-путей) и детект окна контекста
  (Ollama `/api/show`, LM Studio `/api/v0/models`, llama.cpp `/props`;
  override — последнее слово).
  subscription-backed surface: он использует Codex OAuth
  Responses-compatible backend, а не OpenAI-shape Chat Completions ядро, но
  сохраняет тот же Core-owned принцип — Harness формирует prompt/tools,
  исполняет function tools локально и отображает usage/cache telemetry.
- Key-only onboarding: у КАЖДОГО провайдера СВОЙ отдельный ключ (ключ
  OpenRouter, ключ GLM, ключ Kimi For Coding — разные, каждый берётся в
  своём кабинете); одинаков только СПОСОБ ввода (форма «вставь ключ»), не
  сам ключ. Local Models — base URL своего локального сервера + опциональный
  ключ. Ключи живут в Core settings, по одному на провайдера. Ничего не
  скачивается и не устанавливается.
- Native-профиль клиентской четвёрки = наш reference wrapper + tool set
  клиента (модель B2: замороженная обвязка + живой контекст,
  `docs/architecture/NativePromptComposition.md`).
- Фундамент был уже в репозитории: боевой CodeAI-Hub-рантайм жил в
  `src/reference/**` модулей `openrouter-provider`, `local-models-provider`,
  `glm-native-provider` — агентный цикл, инструменты, SSE-парсеры. Ядро
  универсального клиента консолидировало это поведение; сами reference-модули
  удалены чисткой 2026-07-05 (пути ниже по тексту — историческая привязка
  исследования, код доступен в git-истории).
- **Планка гибкости (требование пользователя 2026-07-04): МОДУЛЬНАЯ
  расширяемость, не готовые фичи в MVP.** MCP, skills, субагентов в MVP НЕ
  делаем. Но клиент строится так, чтобы любой из этих функционалов
  дописывался ОТДЕЛЬНЫМ МОДУЛЕМ и подключался без переделки ядра. Аналогия
  пользователя: Codex app-server несёт весь потолок возможностей
  (MCP/skills/субагенты), а мы подключаем лишь нужное — потолок заложен,
  активируется по надобности; наш клиент такой же. Практически: ядро держит
  чистые точки расширения (реестр инструментов с абстракцией источника +
  execution-граница — раздел 3.2; permission-граница в MVP pass-through),
  которые и так нужны для встроенных инструментов; спекулятивный дизайн самих
  MCP/skills/субагентов сейчас НЕ пишем (это будущие модули, образец
  устройства — OpenCode, раздел 3.10).

## 2. Что уже есть в репозитории (фундамент №1)

Перенесённый reference-рантайм (пути указывают на образцы; ядро будет жить
в новых модулях по правилам Product Tree):

- **Агентный цикл**: `openrouter-provider/src/reference/open-router-provider-adapter.ts`
  (416 строк, полный turn-цикл) и `glm-native-provider/src/reference/provider/glm-native-agent-runtime.ts`:
  потолок 64 tool-шага (`GLM_NATIVE_MAX_TOOL_STEPS`), параллельное исполнение
  tool_calls (`Promise.all`), история в памяти на сессию, остановка при
  отсутствии tool_calls, `turn_failed` при ошибке, таймаут через
  AbortController.
- **Инструменты** (единый набор GLM Native): `exec_command`, `read_file`,
  `write_file`, `edit_file`, `edit_file_by_anchor`, `read_file_anchored`,
  `apply_patch` (Codex-стиль `*** Begin Patch`), `grep_files`, `glob_files`,
  `web_search`, `web_fetch`, `write_workflow_artifact`; расширенный слой
  (`glm-native-expanded-tool-definitions`): `git_*`, `find_references`,
  `go_to_definition`, `workspace_symbols`, `run_tests`, `browser_fetch`.
  Все с лимитами вывода (клампы строк/символов/токен-бюджета).
- **SSE-парсеры** (три варианта одного и того же): OpenRouter reader
  (аккумуляция tool_calls по index), GLM parser (reasoning_content +
  cached_tokens/reasoning_tokens в usage), Local Models reader (буферизация
  reasoning с флашем по границе предложения).
- **Целевые контракты Core** (клиент обязан в них нормализоваться):
  `NormalizedProviderEvent` (`dialog_message` с tag `live`/`thinking`,
  `turn_started`, `turn_completed`, `turn_failed`, `stream_error`,
  `stream_event`, `system`), `SessionCoreEvent`
  (`session:message|turn-state|error|telemetry|provider-binding|...`),
  `ProviderUsageTelemetry` (tokenUsage, usageLimits buckets, limitRows).
- **Kimi-активы**: чтение `api_key` из `~/.kimi-code/config.toml`
  (`kimi-usage-limits-reader.ts`), reader лимитов
  `https://api.kimi.com/coding/v1/usages` (5h/weekly buckets).
- **Permissions**: все адаптеры сегодня исполняют инструменты в auto-режиме;
  MVP это СОЗНАТЕЛЬНО сохраняет (осознанный tradeoff — раздел 3.5). Ядро
  оставляет будущую permission-границу как точку расширения, но в MVP она
  сквозная-разрешающая (pass-through).
- **MCP / skills / субагентов в Harness сегодня НЕТ** (карта существующих
  возможностей 2026-07-04): в Kimi-профиле лишь зарезервированы пустые
  `mcp-empty.json` / `skills-empty/` (не исполняются и managed-профилем
  прямо запрещены); Core оркестрацией не управляет — tool-loop крутится
  ВНУТРИ каждого провайдера (OpenRouter ~15 шагов, Local Models 4). Claude
  SDK и Codex app-server имеют СВОИ вендорские MCP/субагенты на своей
  стороне, но Harness туда не вмешивается. **Следствие: MVP клиента их НЕ
  делает; но клиент — первое место в Harness, чью АРХИТЕКТУРУ надо построить
  так, чтобы MCP/skills/субагентов можно было добавить отдельными модулями
  позже (раздел 3.10), не переделывая ядро.** Образец устройства на будущее —
  OpenCode.
- **Переиспользуется из Core (не строим заново)**: session profiles
  (`profile-store`/`profile-materializer`; актуальная форма профиля — по
  `docs/architecture/SessionProfilesV2.md` (единый profile-документ +
  deny-list семантика), к конкретной файловой раскладке не привязываемся),
  event streaming (`session-event-stream`), usage telemetry
  (`usage-context-telemetry`), provider-adapter contract, settings/auth
  storage (`provider-auth-store`), provider registry.

## 3. Capability set ядра

### 3.1 Агентный цикл

- Turn: запрос → SSE-стрим (text / thinking / tool_calls) → исполнение
  инструментов → follow-up запрос с `role:"tool"` результатами → повтор,
  пока модель не завершит ход без tool_calls (`finish_reason: stop`).
- Параллельное исполнение tool_calls одного шага (уже в reference).
- Потолок шагов на ход: 64 (наследуем) + **doom-loop детект** (OpenCode):
  три подряд идентичных вызова (тот же инструмент, тот же input) —
  прерывание с честной ошибкой вместо сжигания квоты.
- Отмена: сквозной AbortController (кнопка Stop) — обрыв стрима, отмена
  исполняющихся инструментов, финализация хода как остановленного.
- Ретраи (рецепт OpenCode): экспоненциальный backoff (2s * 2^n) с уважением
  `Retry-After`; ретраятся 429 и 5xx; НЕ ретраятся переполнение контекста и
  ошибки авторизации. Подписочные каналы шлют квоты телом 429/403 — тело
  включается в сообщение об ошибке.
- История сообщений: Core-owned, append-only на сессию (user / assistant с
  tool_calls / tool-результаты), переживает перезапуск по правилам
  session-runtime; политика возврата thinking в историю — параметр диалекта
  (strip для reasoning_content-провайдеров; OpenRouter `reasoning_details`
  возвращается без изменений).

### 3.2 Реестр инструментов и встроенный слой

Ключевой архитектурный выбор под планку гибкости (раздел 1): ядро держит НЕ
фиксированный хардкод-список, а **реестр инструментов с абстракцией
источника** (образец — OpenCode `ToolRegistry`). Каждый инструмент —
дескриптор (имя + JSON Schema + исполнитель), исполнение идёт через единую
execution-границу ядра. **В MVP источник ОДИН — встроенный слой** (ниже).
Точка регистрации новых источников (будущие MCP-серверы, skills)
предусмотрена архитектурой, но сами эти источники в MVP не реализуются
(раздел 3.10). Namespacing по источнику заложен, чтобы будущие имена
(`mcp:<server>:<tool>`, `<skill>`) не сталкивались со встроенными.

**Встроенный слой** (уже реализован в reference `glm-native-tool-executors`,
имена финализируются при authoring reference wrapper вместе с решением по
snake_case):

| Инструмент | Семантика | Лимиты (reference) |
| --- | --- | --- |
| `read_file` | чтение с offset/limit | 2000 строк по умолчанию, максимум 5000 |
| `write_file` | полная запись | пути в границах workspace |
| `edit_file` | точная замена old→new | exact match, ошибка при неоднозначности |
| `apply_patch` | патч-формат Codex | многофайловые правки |
| `exec_command` | shell с таймаутом | yield_time_ms, бюджет вывода в токенах |
| `grep_files` | ripgrep-поиск | ≤500 результатов, ≤80K символов |
| `glob_files` | глоб-обход | ≤1000 результатов |
| `web_search` | поиск | short/medium/long |
| `web_fetch` | забор URL | max_chars ≤100K |

- Дополнительный встроенный слой (уже в reference, включается по профилю):
  `edit_file_by_anchor`, `read_file_anchored`, git-инструменты,
  LSP-подобные (`workspace_symbols`, `go_to_definition`, `find_references`),
  `run_tests`. `write_workflow_artifact` переезжает при переносе
  artifact-контрактов. MCP/skills/субагенты — отдельные источники реестра,
  см. раздел 3.10.
- Семантика исполнения: инструменты исполняются Core-ядром в границах
  workspace (валидация путей), результат обрезается по лимитам с пометкой
  `truncated` (+ ссылка на полный вывод на диске — паттерн OpenCode);
  ошибка инструмента возвращается модели как tool-результат с ошибкой, не
  валит ход.
- Схемы инструментов — JSON Schema в теле запроса (native tool calling).
  Текстовые fallback-форматы (XML Cline, SEARCH/REPLACE Aider) в MVP не
  строим: целевые модели четвёрки поддерживают native tools; слабые
  локальные модели без tools — честное ограничение Local Models MVP.

### 3.3 Параметры запроса и диалекты

Ядро шлёт OpenAI chat completions; endpoint-модуль объявляет декларативный
**capability-профиль диалекта**, ядро деградирует параметры по нему:

- Базовые: `model`, `messages`, `tools`, `stream: true`; `temperature`/
  `max_tokens` — по дефолтам провайдера (профиль сессии может переопределять).
- `stream_options: {include_usage: true}` — слать где заявлено, но usage
  принимать из ЛЮБОГО чанка (OpenRouter теперь шлёт usage всегда, GLM — в
  финальном чанке).
- `tool_choice`: GLM принимает только `auto`, Ollama не принимает вовсе —
  параметр опускается по профилю. `parallel_tool_calls` — только где заявлен.
- Thinking-параметры per provider: GLM `thinking: {type}` +
  `reasoning_effort` (glm-5.2) + `tool_stream: true` (стрим аргументов,
  glm-4.6+); OpenRouter `reasoning: {effort | max_tokens, exclude}`; Ollama
  `reasoning_effort`; Kimi — конвенция Moonshot `reasoning_content` (наш
  клиент собран на этой форме; live-прогон auth gate 2026-07-04 принят
  пользователем — см.
  `docs/evidence/universal-client-kimi-auth-gate-2026-07-04.md`).
- Заголовки: `Authorization: Bearer <key>`; честный User-Agent Harness AI;
  OpenRouter — `HTTP-Referer`/`X-Title`; GLM — `Accept-Language: en-US,en`.
- Особенности путей: Z.ai coding — `api.z.ai/api/coding/paas/v4` (без `/v1`);
  Kimi — `api.kimi.com/coding/v1`.

### 3.4 SSE-стриминг и нормализация thinking

- Один SSE-парсер в ядре (сплав трёх reference-парсеров): `data:`-фреймы,
  `[DONE]`, независимая аккумуляция `delta.content` + thinking +
  `delta.tool_calls` (по `index`; `id`/`function.name` приходят в первом
  чанке, аргументы конкатенируются до валидного JSON), usage из любого
  чанка, идентификатор модели.
- **Четыре формы thinking → один внутренний канал**: `reasoning_content`
  (Kimi/GLM/vLLM/llama.cpp-deepseek), `reasoning` (Ollama),
  `reasoning`+`reasoning_details[]` (OpenRouter), `<think>`-теги в content
  (сырые локальные шаблоны) — stateful-парсер тегов включается по профилю
  диалекта. Буферизация reasoning с флашем по границе предложения — из
  local-models reader.
- `finish_reason` — терпимый парсер: базовые `stop|length|tool_calls|
  content_filter` + нестандартные GLM `sensitive`,
  `model_context_window_exceeded`, `network_error`; неизвестные значения не
  валят ход.
- Таймауты стрима: idle-таймаут на заголовки/первый байт (идея OpenCode
  wrapSSE), общий таймаут хода конфигурируем.

### 3.5 Permissions — MVP: полный доступ (auto)

- **MVP: full access / auto** для ВСЕХ встроенных инструментов клиента
  (чтение, запись, правка, shell, поиск, web). Причина продуктовая: в
  one-turn coding-сессиях продукт неюзабелен без авто-исполнения — подтверждение
  на каждый шаг ломает рабочий цикл. Это текущее поведение всех адаптеров,
  сохраняем его.
- **НЕ в MVP (future work):** режим `ask`, правила allow/deny, wildcard-
  approval, in-app approval-диалог, песочница, Codex-стиль approval×sandbox.
  Никакого approval UI и ask-режима в MVP не строим.
- Архитектура может оставить будущую permission-границу (точку, куда позже
  встанет политика), но в MVP она сквозная-разрешающая. Образцы на вырост:
  OpenCode allow/deny/ask с wildcard + bash-arity, Codex approval×sandbox
  (Seatbelt/bwrap).
- Единственный активный предохранитель MVP — doom-loop прерывание (3.1):
  защита от зацикливания, а не политика доступа.

### 3.6 Аутентификация (key-based)

- Bearer-ключ из Core settings (`provider-auth-store`), по ключу на
  провайдера; Local Models — base URL + опциональный ключ. Никаких OAuth
  device flow в MVP.
- Kimi: канонический путь — ключ подписки из Kimi Code Console (до 5 ключей,
  показывается один раз). Чтение ключа из `~/.kimi-code/config.toml` после
  `kimi login` остаётся вспомогательным источником (уже реализовано).
- **Сторонний клиент принимается по API-ключу — ПОДТВЕРЖДЕНО** (правка
  2026-07-04, скриншот пользователя + клон OpenCode): OpenCode содержит
  ОТДЕЛЬНЫЙ провайдер `kimi-for-coding` (не платформенный `moonshotai`),
  подключаемый простым «Kimi For Coding API key» (без OAuth, без заявки), и
  пользователь штатно на нём работает. То есть подписочный канал Kimi Code
  пускает сторонние клиенты по ключу — раннее предположение про блокирующий
  User-Agent allowlist ОШИБОЧНО и снято. Endpoint нам уже известен из
  собственного кода (`kimi-usage-limits-reader.ts` → `api.kimi.com/coding/v1`).
- Следствие для auth gate: это НЕ блокер, а обычная работа endpoint-модуля —
  снять точную wire-форму провайдера `kimi-for-coding` (base_url
  `api.kimi.com/coding/v1`, необходимые заголовки, id модели
  `kimi-for-coding`) и подтвердить, что канал принимает ключ подписки от
  нашего клиента; Kimi остаётся первой ЖИВОЙ целью ядра (порядок «Kimi
  first» в силе без оговорок).
- Прямой образец wire-конфигурации: провайдер `kimi-for-coding` в
  каталоге models.dev (его тянет OpenCode) и наши существующие Kimi-активы —
  готовый шаблон для нашего endpoint-модуля.
- **Критерии приёмки первой Kimi-задачи (auth gate даёт доказательство, а не
  допущение):** зафиксировать endpoint/base URL; необходимые заголовки; id
  модели; живой стриминг текста; корректный разбор `tool_calls`; поведение
  reasoning/thinking (если присутствует); чтение usage/лимитов; форму тела
  ошибки при отказе по квоте/авторизации. Это чек-лист живого прогона на
  реальном ключе подписки.

### 3.7 Каталог моделей

- Core-owned каталог в `provider-descriptor`; UI ничего не выдумывает.
- Kimi: live-каталог текущего Coding Plan ключа перепроверен 2026-07-16 через
  `GET /coding/v1/models` и содержит `kimi-for-coding` (K2.7 Coding),
  `kimi-for-coding-highspeed` (K2.7 Coding HighSpeed Stable) и `k3` (K3).
  Все три id входят в Core-каталог; неизвестное сохранённое значение
  нормализуется обратно к `kimi-for-coding`.
- GLM: статический enum из доки (glm-5.2 default, glm-5.1, glm-5-turbo,
  glm-4.7*, glm-4.6...); официального списка «моделей coding-плана» нет —
  фиксируем перечень сами, правим по фактам.
- OpenRouter: живой `GET /api/v1/models` — `context_length`, `pricing`,
  `supported_parameters` (фильтр `tools`), `top_provider`; model search UI
  уже существует в Settings и переиспользуется.
- Local Models: `GET /v1/models` для списка; длину контекста OpenAI-shape
  не отдаёт НИКТО — добираем провайдер-специфично (Ollama `/api/show`,
  LM Studio `/api/v0/models.max_context_length`, llama.cpp `/props`) с
  ручным override в настройках как последним словом.

### 3.8 Контекст и лимиты

- Подсчёт: usage из стрима (prompt/completion/total, cached_tokens,
  reasoning_tokens где есть) → `usage-context-telemetry` (tokenUsage
  used/limit против окна модели из каталога).
- Переполнение: предупреждение у порога; ошибка переполнения (в т.ч. GLM
  `finish_reason: model_context_window_exceeded`) — честная ошибка хода без
  ретрая.
- **Компакция: в MVP отложена** (рекомендация). Автосуммаризация истории —
  отдельная фаза после стабилизации ядра; рецепт OpenCode задокументирован
  (prune старых ходов с защитой хвоста, TOOL_OUTPUT обрезка до 2K,
  summary-сообщение) и ложится на наш loop без переделки.
- Квоты подписок: Kimi — программного чтения остатка нет (429/403 телом);
  наш reader `/coding/v1/usages` остаётся best-effort источником bucket'ов
  5h/weekly (UNVERIFIED контракт — уже в проде у нас). GLM — только
  недокументированный monitor-API (`api.z.ai/api/monitor/usage/*`) —
  опционально позже. OpenRouter — `GET /api/v1/key` + `/credits` +
  безусловный `usage.cost` в финальном чанке.

### 3.9 Нормализация событий

- Клиент эмитит существующий контракт `NormalizedProviderEvent`:
  `turn_started` → (`dialog_message` assistant с tag `live` на стриме,
  финальный без тега; thinking-канал → tag `thinking`) → `turn_completed` |
  `turn_failed`; `stream_error` для обрывов; usage → telemetry-канал.
  Совместимость с `session-event-stream`/`session-snapshot-projector` без
  изменений UI.
- **Ход инструментов в MVP НЕ показывается** (решение пользователя): Harness
  сегодня не отображает tool progress в диалоге сессии ни для одного
  провайдера и не имеет под это парсеров/контрактов. Исполнение инструментов
  остаётся ВНУТРИ Core; наружу проецируются только финальный ответ
  ассистента, состояние хода (turn state) и ошибки. Полноценные first-class
  tool-события — future work (расширение контракта отдельным пунктом плана).
- Таксономия ошибок ядра: `auth_failed` (401/403), `rate_limited`
  (429 + retry-after), `quota_exhausted` (тело 429/403 подписок),
  `context_overflow`, `network`, `provider_error` (5xx), `aborted` —
  маппится в `turn_failed.message` единообразно.

### 3.10 Модульная расширяемость (потолок заложен, фичи — потом)

Требование пользователя (2026-07-04): MCP, skills, субагентов в MVP НЕ
делаем. Но ядро строится так, чтобы любой из них дописывался ОТДЕЛЬНЫМ
МОДУЛЕМ и подключался без переделки ядра. Аналогия: Codex app-server несёт
весь потолок (MCP/skills/субагенты), а мы подключаем лишь нужное — потолок
заложен, активируется по надобности. Наш клиент такой же.

- **Что реально делается в MVP (и так нужно встроенным инструментам, не
  спекуляция):** реестр инструментов с абстракцией источника + единая
  execution-граница ядра (раздел 3.2). Permission-граница в MVP сквозная-
  разрешающая (pass-through, раздел 3.5) — НЕ ruleset и НЕ паттерны. Это и
  есть чистая точка расширения: новый источник инструментов РЕГИСТРИРУЕТСЯ, а
  не вшивается в цикл. Спекулятивный дизайн MCP/skills/субагентов сейчас НЕ
  пишем.
- **Будущие модули (НЕ в MVP, не проектируем сейчас):** MCP-host, skills,
  субагенты, plan mode / todo — каждый отдельным модулем, регистрирующим
  свой источник инструментов/поведение через ту же точку регистрации; ядро
  под них не переделывается. Образец устройства, когда дойдёт черёд, —
  OpenCode (`packages/opencode/src/mcp`, `core/src/skill.ts`, `tool/task.ts`,
  `tool/plan.ts`); детальный дизайн каждого — в задаче своего модуля, не в
  этом документе.
- **Не путать с Harness-уровнем:** у Harness есть СВОИ skills и своя
  plan-дисциплина (recovery-owner плана) — клиентские skills/plan mode это
  ДРУГИЕ, внутрисессионные; соотнести при планировании соответствующего
  модуля.
- **Граница по провайдерам:** будущие подсистемы клиент даёт своей четвёрке
  (Kimi/GLM/Local/OpenRouter); у Claude/Codex MCP/субагенты вендорские (их
  потолок, как у app-server), клиент их не подменяет.

### 3.11 Ownership и размещение модулей

Кто чем владеет (Core Authority, раздел 4 AGENTS.md):

- **Core Runtime** владеет ядром клиента: agent loop, реестр инструментов и
  execution-граница, исполнение встроенных инструментов, история запросов,
  SSE-парсинг, нормализация событий, permission-граница (в MVP сквозная-
  разрешающая).
- **Provider Runtime** владеет тонкими endpoint-модулями: детали auth
  провайдера, model-дескрипторы, provider-specific capability-профили
  диалекта (раздел 3.3), особенности base_url/заголовков.
- **Provider adapter phase contract** является частью Provider Runtime, а не
  универсального agent loop. Общий клиент не должен считать любой streamed
  assistant text финальным ответом. Endpoint adapter обязан привести
  provider-specific stream к Core events: progress text -> `commentary`,
  reasoning -> `thinking`, explicit completion signal -> terminal assistant
  output. Если upstream не даёт native phase marker, endpoint adapter обязан
  реализовать собственную проверяемую семантику завершения, не перенося её в
  общее ядро.
- **Application Shell** только отображает Core-события и передаёт ввод
  пользователя; не выводит provider truth и не исполняет инструменты.

## 4. OSS survey (проверено по репозиториям 2026-07-04)

| Проект | Лицензия | Стек | Tool calling | Ценность как reference |
| --- | --- | --- | --- | --- |
| **pi** (earendil-works/pi, экс badlogic/pi-mono) | MIT | TypeScript | native, partial-args streaming | **5/5** — наша задача на нашем стеке: слой диалектов `openai-completions`/`openai-responses`/`anthropic-messages`, unified reasoning, agent-core отдельным пакетом |
| **OpenCode** (sst/opencode) | MIT | TypeScript (Bun) | native | **5/5 (принят вторым reference)** — ретраи+Retry-After, doom-loop, permissions wildcard, компакция, обрезка вывода, И архитектура расширяемости (реестр инструментов из источников, MCP-host, skills, субагенты через `task`, plan/todo). Их слой протоколов (`packages/llm/src/protocols`, openai/anthropic/gemini) можно ИЗУЧАТЬ как reference диалектов (он отделён от Vercel AI SDK), но рантайм-зависимость AI SDK НЕ берём — пишем свой тонкий SSE+dialect слой (раздел 5) |
| **Cline** | Apache-2.0 | TypeScript | native + XML fallback, параллельные вызовы | 4/5 — паттерн native+fallback, reasoning_content в OpenAI-compatible ветке |
| **Gemini CLI** | Apache-2.0 | TypeScript | native (Gemini) | 4/5 — структура монорепо core/cli, approvalMode; провайдерный слой Gemini-only |
| **qwen-code** | Apache-2.0 | TypeScript | native | 4/5 — «Gemini CLI, пересаженный на OpenAI-shape» — живой прототип нашей пересадки |
| **Codex CLI** | Apache-2.0 | Rust | native (только Responses; chat-ветка удалена 02.2026) | 3/5 — эталон approval×sandbox и схемы provider-конфига (base_url/env_key/http_headers) |
| **Goose** | Apache-2.0 | Rust | native + toolshim (экспериментальный, ≤41%) | 3/5 — `kimicode.rs` (Kimi Code конкретика), permission-режимы с LLM-судьёй |
| **Continue** | Apache-2.0 | TypeScript | native + fallback | 3/5 — пакет `openai-adapters` как справочник диалектов; проект read-only (куплен Cursor 06.2026) |
| **octofriend** | MIT | TypeScript | native + ML-автопочинка вызовов | 3/5 — компактный мультидиалектный TS-агент; идея repair-слоя |
| **Aider** | Apache-2.0 | Python | текстовые edit-форматы | 2/5 — SEARCH/REPLACE/udiff как fallback-формат правок (если понадобится для слабых моделей) |
| **gptme** | MIT | Python | markdown/xml/native переключаемые | 2/5 — модель «один tool set, три сериализации» |
| **mini-swe-agent** | MIT | Python | нет (bash в тексте) | 2/5 — эталон минимализма цикла |
| **Crush** | FSL-1.1-MIT | Go | native (через fantasy, Apache-2.0) | 2/5 — идеи (каталог провайдеров Catwalk, LSP-контекст); **код заимствовать нельзя** (FSL, MIT через 2 года на версию) |

Факты, влияющие на решение:

- **Codex CLI chat-ветка мертва**: `wire_api = "chat"` депрекейтнут 12.2025 и
  удалён ~02.2026 (`responses` — единственное значение) — Codex как
  reference «универсального chat-клиента на Rust» отпал; смотреть можно
  только исторические теги.
- **Continue заморожен навсегда** (приобретение Cursor, репо read-only) —
  `openai-adapters` остаётся полезным, но безжизненным справочником.
- **kimi-cli — Apache-2.0, open source** (Python+TS) — прямой образец
  официального клиента нашего первого целевого канала.
- **Позиция по OpenCode (единая, без противоречий):** OpenCode = reference
  ПОВЕДЕНИЯ и РАСШИРЯЕМОСТИ; его рантайм-зависимость Vercel AI SDK НЕ берём
  (двойная зависимость — против рамочного решения); его protocol/dialect КОД
  можно изучать как reference, но пишем СВОЙ тонкий SSE+dialect слой (наш
  reference-стек уже говорит с endpoint'ами напрямую, без AI SDK).

## 5. Рекомендация

1. **Фундамент кода — наш перенесённый CodeAI-Hub-рантайм** (agent loop,
   инструментальный набор, SSE-парсеры): он боевой, уже в репозитории и уже
   в правильной wire-форме. Ядро собирается как новые Core-модули
   консолидацией трёх reference-копий в один клиент.
2. **Поведенческий и extensibility reference №2 — OpenCode (MIT)**:
   переносим ПОВЕДЕНИЕ — ретраи (backoff + Retry-After, retryable-
   классификация), doom-loop, обрезки вывода с `truncated`+outputPath,
   permission-модель (на вырост), компакцию (отложенная фаза), устройство
   реестра инструментов и модульной расширяемости. Их protocol/dialect код
   изучаем как reference, но рантайм-зависимость Vercel AI SDK НЕ берём —
   пишем свой тонкий слой (п.4).
3. **Точечные reference**: pi (MIT, TS) — дизайн слоя диалектов, streaming
   partial tool args, unified thinking; Continue `openai-adapters`
   (Apache-2.0) — справочник провайдер-нюансов; Cline — трактовка
   reasoning_content и native+fallback; Codex CLI — модель
   approval/sandbox на будущее; Goose `kimicode.rs` + kimi-cli
   (Apache-2.0) — конкретика Kimi Code канала.
4. **Не тянем в ядро рантайм-зависимости диалектов** (Vercel AI SDK,
   litellm-аналоги): свой тонкий SSE+dialect слой (~уже написан в
   reference) + декларативные capability-профили диалектов на
   endpoint-модуль.
5. **Не заимствуем код**: Crush (FSL до истечения 2 лет), Codex chat-ветка
   (удалена из main); поведение — можно, код — нет (правило AGENTS.md и так
   запрещает копирование).
6. **Модульная расширяемость (потолок заложен, фичи потом)**: MVP НЕ
   содержит MCP/skills/субагентов; ядро лишь держит чистые точки расширения
   (реестр инструментов с абстракцией источника + execution-граница, разделы
   3.2/3.10; permission-граница в MVP pass-through), и так нужные встроенным
   инструментам, чтобы каждый такой функционал дописывался ОТДЕЛЬНЫМ МОДУЛЕМ
   и подключался без переделки ядра (аналог Codex app-server: потолок есть,
   активируем по надобности). Спекулятивный дизайн самих подсистем сейчас не
   делаем.
7. **Переиспользуем инфраструктуру Core** (не дублируем): session profiles,
   event streaming, usage telemetry, provider-adapter contract,
   auth/settings storage, provider registry. Клиент = reference-ядро +
   facade + эти контракты.
8. MVP-срез первого живого релиза — раздел 3: базовый цикл + встроенный слой
   инструментов + full-auto permissions (3.5) + отложенная компакция (3.8) +
   без tool progress (3.9); MCP / skills / субагенты заложены архитектурно
   (точка расширения) и добавляются позже отдельными модулями.

## 6. Решение пользователя

СТАТУС: ПРИНЯТО (2026-07-04, уточнено по ревью документа). Зафиксированные
решения:

1. **Foundation roles — приняты.** Фундамент кода — наш перенесённый
   CodeAI-Hub-рантайм; OpenCode — reference поведения и расширяемости (его
   рантайм-зависимость Vercel AI SDK НЕ берём; protocol/dialect код — только
   как reference, пишем свой тонкий слой); pi / Continue-adapters / Cline /
   Codex CLI / Goose / kimi-cli — точечные reference.
2. **Kimi — первый провайдер** на новом ядре.
3. **Модульная расширяемость — принята как граница, БЕЗ реализации.** MVP =
   ядро клиента с чистой точкой расширения (реестр инструментов из
   источников + tool-дескриптор + execution-граница + точка регистрации
   будущих источников). MCP-host, skills, субагенты — БУДУЩИЕ МОДУЛИ, в MVP
   не реализуются и здесь не проектируются (аналог Codex app-server: потолок
   заложен, активируем по надобности).
4. **Permissions MVP = полный доступ / auto.** Все встроенные инструменты
   исполняются автоматически (one-turn coding неюзабелен без auto). Режим
   `ask`, allow/deny, песочница, approval UI — future work.
5. **Компакция — отложена в MVP** (предупреждение + честная ошибка
   переполнения); авто-суммаризация позже.
6. **Kimi endpoint — принят как достаточно доказанный** (работает в
   стороннем клиенте OpenCode по API-ключу, проверено пользователем);
   реализация первой Kimi-задачи снимает и валидирует точную wire-форму по
   чек-листу приёмки (раздел 3.6), давая доказательство, а не допущение.
7. **Tool progress — НЕ в MVP.** Ход инструментов в диалоге сессии не
   показывается (Harness и сейчас его не показывает ни для одного
   провайдера); исполнение внутри Core, наружу — финальный ответ / turn
   state / ошибки. First-class tool-события — future work.

## Связанные документы

- `.harness/plans/archive/session-profiles-v2-plan-document-2026-07-02.md` —
  DECISIONS 2026-07-04 (рамочное решение: in-house клиент, порядок Kimi
  first, key-only onboarding, миграция GLM).
- `docs/architecture/NativePromptComposition.md` — модель B2 (замороженная
  обвязка + живой контекст) для native-профилей четвёрки.
- `docs/architecture/SessionProfilesV2.md` — контракт профилей v2 и capture.
- `docs/architecture/CodeAIHubProviderRuntimeAlignment.md` — карта миграции
  provider-runtime из CodeAI-Hub.
