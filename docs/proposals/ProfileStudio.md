# Profile Studio: проверенные Custom Profiles

Статус: архитектурное предложение для обсуждения, уточнено 19 июля 2026 года.

Документ не является контрактом текущей кодовой базы или active
implementation plan. Он фиксирует согласованную продуктовую идею первого
этапа Profile Studio и отделяет её от функций, которые будут обсуждаться
только после проверки качества реальных Custom Profiles.

## 1. Решение в одной фразе

**Profile Studio берёт проверенный Native Request конкретной пары
`provider + model`, позволяет специализированному Profile Creator Agent в
диалоге с пользователем собрать из читаемых профильных документов сокращённый
Custom System Prompt и релевантный Custom System Tooling, проверяет фактически
отправленный Custom Request через capture и только после утверждения
пользователем делает профиль доступным для ручного выбора.**

Первый этап отвечает на один вопрос:

> Может ли агент с provider/model-specific системным профилем, очищенным от
> инструкций и инструментов «на все случаи жизни», надёжно и экономно выполнять
> определённый класс задач?

Пока это не доказано, Profile Studio не строит Normalizer, автоматическую
маршрутизацию, сложное версионирование, feedback analytics или универсальную
систему навыков.

## 2. Основная гипотеза

У provider-facing запроса есть два главных управляемых слоя:

1. **System Prompt** — приоритетные инструкции, роль, workflow, ограничения и
   критерии результата.
2. **System Tooling** — структурные объявления доступных модели инструментов и
   реальные исполнители этих инструментов.

`AGENTS.md`, Skills, проектные инструкции и другие текстовые материалы часто
приходят ниже системного профиля или читаются агентом уже в процессе работы.
Это увеличивает контекст, оставляет агенту выбор, что искать и читать, и может
снижать приоритет критичных инструкций.

Custom Profile использует другую модель:

- всё, что агент обязан знать для своего класса задач, заранее включается в
  итоговый system prompt;
- итоговый system prompt собирается из отдельных читаемых документов профиля;
- необходимые инструкции из `AGENTS.md`, Skills или других материалов могут
  быть перенесены в профильные компоненты, но runtime не заставляет основного
  агента искать или читать исходные документы;
- модели объявляется только релевантный набор реально исполняемых tools;
- пользователь до запуска видит точный compiled prompt и точный tool set.

Размещение самого пользовательского задания внутри system prompt, а не только
в user message, остаётся отдельным измеряемым экспериментом. Это не принятое
решение первого этапа.

## 3. Термины

### 3.1 Native Request Capture

Диагностический запуск установленного vendor CLI/клиента, который перехватывает
фактический upstream request и сохраняет:

- system prompt;
- structured tool declarations;
- developer/request context;
- model и reasoning параметры;
- безопасные структурные diagnostics.

Native Capture является источником истины только для точной пары
`provider + model` и зафиксированной версии vendor runtime.

### 3.2 Native Profile

Встроенный профиль, означающий запуск provider-native маршрута без изменения
Harness AI:

- Claude — native preset Claude Agent SDK;
- Codex — native Codex app-server;
- Kimi — установленный Kimi CLI через ACP.

Native Profile не редактируется в Profile Studio. Он используется как
доступный пользователю route и как reference для сравнения.

### 3.3 Custom Profile

Созданный для одной пары `provider + model` системный профиль:

```text
Custom Profile
  = compiled System Prompt
  + effective System Tooling
  + provider/model/route identity
```

Custom Profile не является универсальным. Одинаковая цель задачи требует
отдельного профиля для Claude, Codex и Kimi, потому что их native prompts,
tool surfaces и способы применения различаются.

### 3.4 Custom Request Capture

Capture фактического запроса, отправленного через managed/custom route с
конкретным draft или утверждённым Custom Profile.

Custom Capture должен доказать, что provider реально получил:

- ожидаемый compiled system prompt;
- ожидаемый tool set;
- правильные model/reasoning параметры;
- идентифицируемый profile artifact без silent fallback на Native.

## 4. Источник истины и цепочка доказательства

Profile Studio не строит профиль по памяти, документации UI или предположению
об adapter capability. Цепочка начинается с реального provider request:

```text
Installed provider CLI/client
  → Native Request Capture
  → accepted provider/model baseline
  → agent-authored Custom Profile draft
  → deterministic compilation
  → real managed session
  → Custom Request Capture
  → expected-vs-observed comparison
  → user approval
```

У capture есть два разных режима:

| Режим | Что запускается | Что доказывает |
| --- | --- | --- |
| `Native` | vendor-native CLI/client route | исходный prompt, tools и request shape |
| `Custom` | реальный managed route с выбранным draft/profile | фактически применённый Custom Profile |

Текущий `Native Request Capture` реализует только первый режим. Расширение до
Custom Capture является обязательной частью Profile Studio, а не будущей
диагностической опцией.

Raw JSONL остаётся evidence-источником. Readable Markdown и diff являются
производными представлениями. Renderer не классифицирует prompt/tools и не
делает вывод о применении профиля — это Core-owned read model.

## 5. Provider/model scope первого этапа

В первом этапе участвуют только:

- Claude;
- Codex;
- Kimi.

Grok, GLM, OpenRouter, Local Models и другие universal-client routes не входят
в этот proposal. Они могут использовать тот же механизм позже, после проверки
первых provider-specific профилей.

Profile identity обязательно включает:

- provider id;
- точный model id;
- при наличии — reasoning/effort compatibility;
- source Native Capture fingerprint;
- execution route.

Пользователь сначала выбирает provider и model. После этого UI показывает
Native Profile и только совместимые Custom Profiles.

## 6. Честные provider ceilings

### 6.1 Claude

Native route использует Claude Agent SDK и vendor preset.

Custom route должен:

- передать собранный Custom System Prompt как system prompt;
- оставить только exact subset релевантных native Claude tools;
- на первом этапе сохранять captured native tool names, descriptions и schemas
  без редактирования;
- не добавлять tools без реального исполнителя;
- отключить runtime-подмешивание workspace instruction sources, если все
  необходимые правила уже материализованы в Custom Profile;
- доказать prompt и tool subset через Custom Capture.

Продуктовая операция — **сокращение**, а не изобретение нового Claude tool
surface:

```text
Native Claude Prompt + Native Claude Tools
  → удалить нерелевантные prompt blocks
  → добавить необходимые профильные инструкции
  → оставить релевантный exact tool subset
  → Custom Claude Profile
```

Текущий adapter уже умеет передавать managed system prompt и whitelist имён
tools, но Profile Studio обязан повторно проверить фактический wire contract
для каждой поддержанной модели.

### 6.2 Codex

Codex app-server позволяет передать Custom System Prompt через
`baseInstructions`, но не позволяет управлять per-thread системным tool set.

Поэтому Codex Custom Profile является честно `prompt-only`:

- system prompt можно сократить и дополнить профильными инструкциями;
- app-server tools остаются неизменяемыми;
- Studio показывает native Codex tool declarations только для чтения;
- tool controls для Codex отсутствуют, а не выглядят рабочими;
- Custom Capture обязан доказать применение `baseInstructions`;
- фиксированный tool set также отображается в captured request для сравнения.

Мы принимаем этот потолок и не проектируем отдельный Codex client только ради
Profile Studio.

### 6.3 Kimi

Kimi CLI/ACP не даёт верифицируемо заменить system prompt или tooling.
Поэтому один provider получает два execution routes:

```text
Kimi + Native Profile
  → installed Kimi CLI
  → ACP
  → vendor prompt + vendor tools

Kimi + Custom Profile
  → Harness universal client
  → Custom System Prompt
  → Core-owned Kimi-compatible tools
```

Перед сокращением Kimi-профилей universal client должен воспроизвести полный
Kimi Native Profile.

Принятый capture содержит 25 tool declarations:

```text
Agent, AgentSwarm, AskUserQuestion, Bash, CreateGoal,
CronCreate, CronDelete, CronList, Edit, EnterPlanMode,
ExitPlanMode, FetchURL, GetGoal, Glob, Grep, Read,
SetGoalBudget, Skill, TaskList, TaskOutput, TaskStop,
TodoList, UpdateGoal, WebSearch, Write
```

Часть имеет близкие Core executors уже сейчас: Bash, Read, Write, Edit, Glob,
Grep, FetchURL и WebSearch. Для остальных нужны Kimi-compatible Core
исполнители и сервисы.

Полная Kimi parity означает:

- exact captured system prompt для выбранной модели;
- все 25 captured schemas;
- реальный executor для каждого объявленного tool;
- совместимые input, output, error и lifecycle semantics;
- working Agent/AgentSwarm, question, goal, cron, plan, task, todo и skill
  surfaces;
- успешный Custom Capture через universal-client route;
- отсутствие объявленных, но неработающих tools.

Это не тонкий provider adapter. Это provider-specific parity layer над Core
universal client и его tool registry. Создание пользовательских executable
tools через Studio при этом остаётся вне первого этапа: все 25 parity tools
реализуются как production Core capabilities.

После доказательства full Native parity Kimi Custom Profiles создаются тем же
способом, что Claude: prompt сокращается и дополняется, tools уменьшаются до
релевантного exact subset.

## 7. Сборный Custom Profile

Custom Profile не должен быть монолитным текстом, зашитым в исходный код.

Профиль хранится как набор пользовательских документов под Harness home. Эти
документы создают Profile Creator Agent и пользователь в диалоге; пользователь
может прочитать каждый документ и итоговую сборку.

Логическая модель:

```text
Profile passport
Native baseline reference
Ordered prompt components
Tool selection
Captured tool schemas
Composition manifest
Compiled system prompt preview
```

Точный физический формат и имена файлов остаются решением следующего
implementation planning. Обязательные инварианты уже определены:

- каждый prompt-компонент является обычным читаемым Markdown;
- порядок и placement компонентов заданы машинно-читаемым manifest;
- Profile Creator Agent может добавлять новые профильные компоненты, которых
  не было в Native prompt;
- один компонент может содержать перенесённые правила из `AGENTS.md`, Skills
  или другого source material;
- итоговый prompt не содержит Harness provenance/debug labels, если они не
  являются инструкциями модели;
- compilation детерминирована и не вызывает LLM;
- один и тот же draft всегда даёт одинаковые compiled prompt/tools;
- structured tools остаются отдельным request layer и не сериализуются в
  system prompt;
- managed route не должен повторно подмешивать `AGENTS.md`, Skills или другие
  component sources, уже материализованные в Custom Profile; если конкретный
  provider channel не позволяет отключить такой нижележащий контекст, Studio
  показывает его как честный fixed channel ceiling и Custom Capture фиксирует
  фактическое дублирование;
- applied session получает immutable compiled snapshot на момент старта, как
  и текущие session profiles.

Существующий профиль
`Codex/codex-app-server-synthetic-native-custom` доказывает минимальную часть
этой модели: Core уже умеет читать отдельные `system-prompt.md` и
`custom-instructions.md`, вставлять custom instructions в captured baseline и
фиксировать hash результата. Profile Studio обобщает этот механизм с одного
hardcoded файла и одной точки вставки до набора упорядоченных компонентов.

## 8. Profile Creator Agent

На первом этапе пользователь не редактирует профильные файлы вручную.

Создание профиля происходит в диалоге со специализированным Profile Creator
Agent:

1. пользователь выбирает provider и model;
2. пользователь описывает назначение профиля;
3. агент изучает принятый Native baseline и совместимый tool inventory;
4. агент задаёт уточняющие вопросы;
5. агент предлагает, какие prompt blocks убрать, сохранить или добавить;
6. агент предлагает релевантный tool subset в пределах provider ceiling;
7. агент создаёт или обновляет draft-компоненты;
8. пользователь читает компоненты, compiled preview и diff;
9. пользователь просит изменения или разрешает тест;
10. после реального теста и Custom Capture пользователь утверждает профиль.

Agent не получает свободный filesystem access. Он работает только через
ограниченный Core authoring API.

Минимальные возможности этого API:

- прочитать Core-owned Native baseline read model;
- прочитать явно выбранный пользователем source material через ограниченный
  Core read contract;
- создать draft для выбранных provider/model;
- перечислить и прочитать prompt components;
- создать или заменить draft component;
- выбрать exact tools из разрешённого inventory;
- запросить deterministic compilation;
- получить validation issues и compiled preview;
- запустить Draft Test;
- запросить Custom Capture;
- передать draft на явное утверждение пользователя.

Core валидирует все записи. Agent не может:

- писать вне каталога своего draft;
- менять provider/model identity;
- объявлять tool без registered executor;
- включать tool, запрещённый capability ceiling;
- публиковать профиль без явного решения пользователя;
- менять production code;
- читать произвольные, не выбранные пользователем workspace-файлы через
  authoring API.

Провайдер и модель самого Profile Creator Agent, его точный system prompt и
authoring tool schemas будут выбраны при implementation planning. Они не
меняют ownership: решения о сохранении, compilation и публикации принадлежат
Core, а не модели.

## 9. Пользовательский workflow первого этапа

```text
Provider
  → Model
  → Native Profile или совместимые Custom Profiles
```

Создание нового Custom Profile:

```text
1. Select provider + model
2. Select accepted Native Capture
3. Start Profile Creator conversation
4. Describe intended class of tasks
5. Discuss prompt reduction and added instructions
6. Discuss exact tool subset
7. Inspect readable components
8. Inspect compiled prompt/tools and Native diff
9. Run Draft Test on the real route
10. Run Custom Request Capture
11. Compare expected compilation with Observed Wire
12. User approves
13. Profile appears in the manual session picker
```

Profile Studio не выбирает профиль за пользователя. При создании обычной
сессии пользователь сначала выбирает provider/model, затем Native или один из
совместимых Custom Profiles.

Классы первых профилей будут обсуждаться отдельно. Механизм не должен быть
зашит под planning, review или code profile. Он обязан позволять Profile
Creator Agent собрать любой профиль в пределах честных provider capabilities.

## 10. UI Profile Studio

Profile Studio является самостоятельной вкладкой Settings и объединяет один
видимый workflow. Это не означает слияние всех backend responsibilities.

Минимальные зоны:

### 10.1 Provider / Model

- выбор provider;
- выбор model;
- capability summary;
- Native route и Custom route;
- список совместимых профилей.

### 10.2 Request Capture

- запуск Native Capture;
- запуск Custom Capture для draft/profile;
- история артефактов;
- raw/readable/diagnostics paths;
- capture status и provider/model/runtime identity.

Существующая карточка Native Request Capture переносится из `General` и
расширяется до двух режимов. Название UI не должно утверждать `Native`, когда
запущен managed/custom route.

### 10.3 Create With Agent

- диалог с Profile Creator Agent;
- текущая цель профиля;
- вопросы и предложения агента;
- явное действие пользователя для теста и утверждения.

### 10.4 Profile Documents

- read-only для пользователя на первом этапе;
- список component documents;
- точное содержимое выбранного документа;
- tool inventory и выбранный subset.

### 10.5 Preview And Verify

- compiled system prompt;
- effective structured tools;
- diff с Native baseline;
- приблизительный размер prompt/tool schemas;
- validation issues;
- Draft Test result;
- expected-vs-observed Custom Capture diff.

На первом этапе нет ручного textarea/file editor. Пользователь изменяет draft
через диалог с Agent и проверяет точный результат до утверждения.

## 11. Core ownership

Единая вкладка Profile Studio остаётся Application Shell surface. Истина
разделена по существующим и будущим Core-модулям:

| Ответственность | Owner |
| --- | --- |
| Proxy, TLS, capture orchestration, raw artifacts | `provider-network-capture` |
| Native/Custom capture command и comparison read model | Core capture modules |
| Profile documents и validation | `session-profiles/profile-store` |
| Restricted draft mutations | Core profile-authoring API |
| Deterministic component compilation | Core profile compiler/materializer |
| Profile catalog и provider/model compatibility | Core profile catalog |
| Claude/Codex application | соответствующий provider adapter |
| Kimi Native route | `kimi-native-session` ACP backend |
| Kimi Custom route и parity tools | universal client + Kimi parity layer |
| Conversation rendering and read models | Application Shell Profile Studio |

Renderer не:

- парсит capture;
- собирает system prompt;
- выбирает tools;
- решает capability ceilings;
- пишет profile files напрямую;
- объявляет профиль проверенным.

## 12. Текущее состояние и обязательные разрывы

В кодовой базе уже есть:

- provider-scoped profile directories;
- Profile Creator с созданием базовых документов;
- file watcher и live catalog refresh;
- materializer и immutable applied snapshot;
- managed system prompt для Claude и Codex;
- Kimi Native/Custom route split;
- universal-client tool registry и девять builtin tools;
- Native Request Capture для Claude, Codex и Kimi;
- readable raw/diagnostics/Markdown capture artifacts;
- Codex synthetic native + custom precedent.

До принятого Profile Studio не хватает:

- model-scoped profile identity и filtering;
- нескольких упорядоченных prompt components вместо одного hardcoded
  `custom-instructions.md`;
- restricted Profile Creator Agent authoring API;
- agent-first Studio conversation;
- exact tool inventory/subset contract вместо шести категорий;
- Native и Custom режимов одного capture workflow;
- managed capture для Claude и Codex;
- custom universal-client capture для Kimi;
- full Kimi parity всех 25 tools;
- expected compilation vs Observed Wire comparison;
- user approval gate перед появлением профиля в picker.

## 13. Предлагаемый порядок дальнейшего проектирования

Это discussion roadmap, а не implementation todo-plan.

### Этап A — Capture contract

- Единый `Request Capture` с режимами Native и Custom.
- Managed-route capture для Claude/Codex.
- Universal-client Custom Capture для Kimi.
- Stable provider/model/runtime/profile identity в артефактах.
- Expected-vs-observed comparison contract.

### Этап B — Profile composition contract

- Provider+model passport.
- Формат нескольких prompt components и composition manifest.
- Exact tool inventory и subset selection.
- Deterministic compiler output и validation schema.
- Applied snapshot compatibility.

### Этап C — Restricted agent authoring

- Profile Creator Agent contract.
- Core draft API без свободного filesystem access.
- Conversation, document viewer, preview и user approval.
- Draft Test через production session route.

### Этап D — Claude and Codex proof

- Claude prompt reduction и exact native tool subset.
- Claude Custom Capture для prompt/tools.
- Codex prompt-only profile и read-only tools.
- Codex Custom Capture для `baseInstructions`.
- Первые matched Native-vs-Custom experiments.

### Этап E — Kimi full parity

- Exact Kimi native system prompt on universal client.
- Все 25 schemas в provider request.
- Все 25 registered Core executors.
- Provider-compatible behavior and lifecycle tests.
- Full-profile Custom Capture and matched native parity proof.

### Этап F — Kimi reduction and first profile classes

- Создание уменьшенных Kimi profiles из доказанного full baseline.
- Согласование первых классов задач.
- Отдельные Claude/Codex/Kimi profiles для каждого класса.
- Проверка качества, стоимости, tool use и размера контекста.

Только после положительных результатов этапа F имеет смысл обсуждать
Normalizer, автоматический выбор, динамическую специализацию и feedback loop.

## 14. Критерии готовности первого этапа

- Профиль имеет точную provider+model identity.
- Native baseline получен из реального CLI/client capture.
- Profile Creator Agent создаёт draft только через Core authoring API.
- Пользователь может прочитать каждый prompt-компонент.
- Compiled system prompt детерминирован и видим до запуска.
- Effective tool set детерминирован и содержит только registered executors.
- Claude Custom Capture доказывает prompt и выбранный native tool subset.
- Codex Custom Capture доказывает prompt и честно сохраняет fixed tools.
- Kimi universal client воспроизводит полный Native Profile и все 25 tools.
- Kimi Custom Capture доказывает full profile до сокращения.
- Пользователь утверждает профиль после реального Draft Test и capture.
- Утверждённый профиль появляется только после выбора совместимых
  provider+model.
- Managed task session не получает повторно внешние Skills/AGENTS.md для
  инструкций, уже материализованных в Custom Profile, либо Studio честно
  показывает недоступность такого подавления как provider ceiling.
- Native Profile продолжает работать через исходный native route.

## 15. Что сознательно не строим сейчас

- Normalizer.
- Автоматический выбор Custom Profile.
- Автоматическое добавление инструкций под каждый user request.
- Task Recipes и Workflow Orchestrator как часть Profile Studio.
- Универсальные profiles для нескольких providers/models.
- Ручное редактирование profile files пользователем.
- Visual/no-code graph editor.
- Revision history, rollback и защита от порчи профиля.
- Usage-feedback analytics и автоматическое улучшение профиля.
- Автоматическое обновление Custom Profile после нового Native Capture.
- Редактирование captured native tool schemas/descriptions.
- Создание пользовательских executable tools через Studio.
- Runtime Skill discovery основным task agent.
- GLM, OpenRouter, Local Models и Grok integration.
- Решение, помещать ли verbatim user task в system prompt.

## 16. Оставшиеся решения перед implementation plan

1. Физический формат каталога provider+model profile.
2. Формат prompt components и composition manifest.
3. Контракт draft identity до утверждения пользователем.
4. Provider/model Profile Creator Agent для первой реализации.
5. Точные authoring tools специализированного агента.
6. Схема expected-vs-observed Custom Capture diff.
7. Как связать captured artifact с конкретным draft content hash.
8. Набор parity tests для каждого из 25 Kimi tools.
9. Первый класс Custom Profiles и matched task fixtures.
10. Отдельный эксперимент по размещению user task в system prompt.

Каждое из этих решений сначала обсуждается и фиксируется в planning document
под `docs/evidence/**`. Только после принятия документа создаётся active
implementation plan.
