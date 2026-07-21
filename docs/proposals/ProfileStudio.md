# Profile Studio: проверенные Custom Profiles

Статус: архитектурное предложение для обсуждения, уточнено 20 июля 2026 года.

Статус UI-baseline: интерфейсный подход интерактивного прототипа принят
пользователем 20 июля 2026 года как основа для дальнейшего проектирования и
создания production-интерфейса.

Статус implementation planning: MVP-контракт принят пользователем 20 июля
2026 года и для active implementation slice перенесён в authoritative
`docs/architecture/ProfileStudio.md`. Этот proposal остаётся источником более
широкой будущей идеи; только промотированный MVP contract разрешён текущему
плану `profile-studio-mvp-2026-07-20`.

Принятая корректировка от 21 июля 2026 года: для нового Draft Profile Creator
Agent session исполняется на точных provider/model, выбранных в Studio. Это
отменяет прежний fixed `claude` / `opus` / `high` planning choice и пункт 4
раздела 16; автоматический первый user turn остаётся отдельным обсуждением
workflow.

Документ не является контрактом текущей кодовой базы или active
implementation plan. Он фиксирует согласованную продуктовую идею первого
этапа Profile Studio и отделяет её от функций, которые будут обсуждаться
только после проверки качества реальных Custom Profiles.

## 1. Решение в одной фразе

**Profile Studio позволяет специализированному Profile Creator Agent в диалоге
с пользователем собрать для выбранной пары `provider + model` читаемый Custom
Profile из сокращённого `Custom System Prompt` и релевантных
`Custom System Tools`, сверить
фактически отправленный запрос с этой сборкой и только после ручной проверки и
явного утверждения пользователя пометить профиль как `Valid`.**

Первый этап отвечает на один вопрос:

> Может ли агент с provider/model-specific системным профилем, очищенным от
> инструкций и инструментов «на все случаи жизни», надёжно и экономно выполнять
> определённый класс задач?

Пока это не доказано, Profile Studio не строит Normalizer, автоматическую
маршрутизацию, сложное версионирование, feedback analytics или универсальную
систему навыков.

## 2. Основная гипотеза

У provider-facing запроса есть два главных управляемых слоя:

1. **Custom System Prompt** — приоритетные инструкции, роль, workflow,
   ограничения и критерии результата.
2. **Custom System Tools** — структурные объявления доступных модели
   инструментов и реальные исполнители этих инструментов.

`AGENTS.md`, Skills, проектные инструкции и другие текстовые материалы часто
приходят ниже системного профиля или читаются агентом уже в процессе работы.
Это увеличивает контекст, оставляет агенту выбор, что искать и читать, и может
снижать приоритет критичных инструкций.

Custom Profile использует другую модель:

- всё, что агент обязан знать для своего класса задач, заранее включается в
  итоговый system prompt;
- итоговый Custom System Prompt собирается ровно из двух читаемых частей:
  сокращённой Native-основы и кратких Custom-дополнений;
- необходимые инструкции из `AGENTS.md`, Skills или других материалов могут
  быть перенесены в Custom-дополнения, но runtime не заставляет основного агента
  искать или читать исходные документы;
- модели объявляется только релевантный набор реально исполняемых tools;
- пользователь до запуска видит обе части Custom System Prompt и точный Custom
  System Tools set.

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

### 3.2 Native Capture donor

Конкретный принятый Native Capture, материалы которого использованы при создании
Custom Profile. Донор является provenance, а не обязательным совпадением с
целевой парой `provider + model`: в ходе экспериментов может оказаться, что
лучшим исходным материалом для целевого профиля служит capture другой модели
или провайдера.

Studio сохраняет точную identity донора — provider, model, capture id, runtime
version и fingerprints prompt/tools — и показывает её как **«Основан на Native
Capture»**. Studio не подменяет эту identity словами «последний» или «текущий».

### 3.3 Native Profile

Встроенный профиль, означающий запуск provider-native маршрута без изменения
Harness AI:

- Claude — native preset Claude Agent SDK;
- Codex — native Codex app-server;
- Kimi — установленный Kimi CLI через ACP.

Native Profile не редактируется в Profile Studio. Он используется как
доступный пользователю route и как reference для сравнения.

### 3.4 Custom Profile

Созданный для одной пары `provider + model` системный профиль:

```text
Custom Profile
  = Custom System Prompt
  + Custom System Tools
  + provider/model/route identity
```

Custom Profile не является универсальным. Одинаковая цель задачи требует
отдельного профиля для Claude, Codex и Kimi, потому что их native prompts,
tool surfaces и способы применения различаются.

### 3.5 Custom Request Capture

Capture фактического запроса, отправленного через managed/custom route с
конкретным draft или утверждённым Custom Profile.

Custom Capture механически проверяет, что provider реально получил:

- ожидаемый compiled system prompt;
- ожидаемый tool set;
- правильные model/reasoning параметры;
- идентифицируемый profile artifact без silent fallback на Native.

На первом этапе это внутренняя обязательная операция Profile Creator Agent, а
не отдельная пользовательская команда или карточка Overview. После compilation
агент сам запускает Custom Capture, сравнивает фактический request с ожидаемым
prompt/tools и исправляет несовпадения до показа готового draft пользователю.

Custom Capture не доказывает качество поведения модели. Поведенческая проверка
на первом этапе выполняется вручную: пользователь и агент формулируют задания,
проводят эксперименты в обычной сессии и обсуждают результат. Формальный
benchmark, автоматический score и автоматическая поведенческая верификация пока
не проектируются.

### 3.6 Статусы Draft и Valid

- `Draft` — профиль создаётся, исправляется или ещё не получил явного ручного
  подтверждения пользователя.
- `Valid` — пользователь после обсуждения и ручных проверок явно подтвердил
  профиль.

`Valid` означает принятое пользователем состояние профиля на этом этапе, а не
доказанную универсальную эффективность или результат формального benchmark.

## 4. Источник истины и цепочка доказательства

Profile Studio не строит профиль по памяти, документации UI или предположению
об adapter capability. Цепочка начинается с реального provider request:

```text
Installed provider CLI/client
  → Native Request Capture evidence
  → explicitly selected donor capture
  → agent-authored Custom Profile draft
  → deterministic compilation
  → agent-internal Custom Request Capture
  → mechanical request comparison and repair
  → manual behavioral experiments in the creator session
  → explicit user confirmation
  → Valid profile
```

У capture есть два разных режима:

| Режим | Что запускается | Что доказывает |
| --- | --- | --- |
| `Native` | vendor-native CLI/client route | исходный prompt, tools и request shape |
| `Custom` | реальный managed route с выбранным draft/profile | текстовое и структурное соответствие фактического request ожидаемой сборке |

Текущий `Native Request Capture` реализует только первый режим. Расширение до
Custom Capture является обязательной внутренней частью Profile Creator Agent,
но не самостоятельным пользовательским workflow.

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
- identity и fingerprint фактически выбранного Native Capture donor;
- execution route.

Пользователь сначала выбирает provider и model. После этого Studio показывает
только совместимые созданные профили и их Profile Creator Agent sessions.
Диагностические Native Captures в этот список не входят. Полный
`Synthetic Native`, созданный для universal client, может входить в список как
обычный созданный профиль. В обычном session picker отдельно остаётся доступен
Native route и совместимые `Valid` Custom Profiles.

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
- внутренне сверить prompt и tool subset через Custom Capture до передачи draft
  пользователю.

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
- Profile Creator Agent через внутренний Custom Capture обязан сверить
  применение `baseInstructions`;
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
- успешная внутренняя Custom Capture-проверка universal-client route;
- отсутствие объявленных, но неработающих tools.

Это не тонкий provider adapter. Это provider-specific parity layer над Core
universal client и его tool registry. Создание пользовательских executable
tools через Studio при этом остаётся вне первого этапа: все 25 parity tools
реализуются как production Core capabilities.

После доказательства full Native parity Kimi Custom Profiles создаются тем же
способом, что Claude: prompt сокращается и дополняется, tools уменьшаются до
релевантного exact subset.

## 7. Двухчастный Custom System Prompt

Custom System Prompt не является монолитным текстом, зашитым в исходный код, и
не дробится на произвольное число пользовательских компонентов.

Он состоит ровно из двух читаемых документов под Harness home. Документы
создаёт и изменяет Profile Creator Agent по результатам диалога с пользователем;
пользователь может прочитать обе части, но не редактирует их вручную.

Логическая модель:

```text
Profile passport
Target provider/model identity
Native Capture donor provenance
Custom System Prompt
  1. Reduced Native foundation
  2. Custom additions
Custom System Tools selection and schemas
Creator session identity
Draft / Valid status
```

Точные имена файлов остаются решением следующего implementation planning.
Обязательные инварианты уже определены:

- Native-основа является обычным читаемым Markdown, полученным сокращением и
  переформатированием выбранного donor prompt;
- на первом шаге агент удаляет из Native-основы инструкции и workflows «на все
  случаи жизни», не относящиеся к основному назначению создаваемого профиля;
- Custom-дополнения являются вторым читаемым Markdown и содержат только то, чего
  не хватает сокращённой основе для конкретного класса задач;
- необходимые правила и навыки из `AGENTS.md`, Skills или другого source
  material кратко переносятся именно в Custom-дополнения;
- порядок фиксирован: сначала Native-основа, затем Custom-дополнения; отдельный
  composition manifest для произвольного числа блоков на первом этапе не нужен;
- итоговый prompt не содержит Harness provenance/debug labels, если они не
  являются инструкциями модели;
- compilation детерминирована и не вызывает LLM;
- один и тот же pair документов всегда даёт одинаковый compiled prompt;
- structured tools остаются отдельным request layer и не сериализуются в
  system prompt;
- managed route не должен повторно подмешивать `AGENTS.md`, Skills или другие
  instruction sources, уже материализованные в Custom System Prompt; если
  конкретный provider channel не позволяет отключить такой нижележащий контекст,
  Studio показывает его как честный fixed channel ceiling, а внутренняя
  проверка фиксирует фактическое дублирование;
- каждый профиль связан с одной сохраняемой Profile Creator Agent session;
- profile status меняется с `Draft` на `Valid` только после явного подтверждения
  пользователя;
- applied session получает immutable compiled snapshot на момент старта, как
  и текущие session profiles.

Существующий профиль
`Codex/codex-app-server-synthetic-native-custom` доказывает минимальную часть
этой модели: Core уже умеет читать отдельные `system-prompt.md` и
`custom-instructions.md`, вставлять custom instructions в captured baseline и
фиксировать hash результата. Profile Studio сохраняет эту двухчастную модель,
но делает выбор донора, сокращение Native-основы и создание Custom-дополнений
provider/model-specific работой Profile Creator Agent.

## 8. Profile Creator Agent

На первом этапе пользователь не редактирует профильные файлы вручную.

Создание профиля происходит в диалоге со специализированным Profile Creator
Agent:

1. пользователь выбирает provider и model;
2. Studio создаёт отдельную сохраняемую Profile Creator Agent session;
3. пользователь описывает назначение профиля;
4. агент вместе с пользователем выбирает Native Capture donor и изучает
   совместимый tool inventory целевой модели;
5. агент анализирует donor prompt и предлагает, какие инструкции сохранить,
   сократить, переформатировать или удалить;
6. после обсуждения агент создаёт сокращённую Native-основу;
7. агент и пользователь определяют, каких инструкций и навыков в ней не хватает
   для конкретного класса задач;
8. агент кратко формулирует их в Custom-дополнениях;
9. агент предлагает релевантный Custom System Tools set в пределах provider
   ceiling;
10. пользователь читает обе части Custom System Prompt и Custom System Tools;
11. агент детерминированно собирает draft, сам запускает Custom Capture и
    исправляет обнаруженные несовпадения;
12. пользователь и агент формулируют и выполняют ручные поведенческие проверки;
13. пользователь просит дальнейшие изменения или явно подтверждает профиль;
14. только после подтверждения профиль получает статус `Valid`.

Каждый профиль в списке Studio является точкой входа в собственную Profile
Creator Agent session. Выбор существующего профиля возобновляет эту сессию и
показывает связанное состояние профиля в инспекторе.

Agent не получает свободный filesystem access. Он работает только через
ограниченный Core authoring API.

Минимальные возможности этого API:

- прочитать Core-owned read model выбранного Native Capture donor;
- прочитать явно выбранный пользователем source material через ограниченный
  Core read contract;
- создать draft для выбранных provider/model;
- прочитать и заменить сокращённую Native-основу;
- прочитать и заменить Custom-дополнения;
- выбрать exact tools из разрешённого inventory;
- запросить deterministic compilation;
- получить validation issues и compiled preview;
- автоматически запустить Custom Capture и получить механический diff;
- исправить draft и повторить capture до устранения механических расхождений;
- выполнять обсуждённые с пользователем Draft Tests через production route;
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
Open Profile Studio mode
  → Provider
  → Model
  → Existing profile session or Create Profile
```

Создание нового Custom Profile:

```text
1. Select provider + model
2. Create a persistent Profile Creator Agent session
3. Describe intended class of tasks
4. Select and record the Native Capture donor
5. Reduce and reformat the Native foundation
6. Identify missing task-specific instructions and write concise Custom additions
7. Discuss exact Custom System Tools
8. Inspect both prompt parts and the effective tools
9. Agent runs Custom Capture and repairs request mismatches internally
10. User and agent devise and run manual behavioral checks
11. User explicitly confirms the profile
12. Profile status changes from Draft to Valid
13. Valid profile appears in the compatible manual session picker
```

Profile Studio не выбирает профиль за пользователя. При создании обычной
сессии пользователь сначала выбирает provider/model, затем Native или один из
совместимых Custom Profiles.

Классы первых профилей будут обсуждаться отдельно. Механизм не должен быть
зашит под planning, review или code profile. Он обязан позволять Profile
Creator Agent собрать любой профиль в пределах честных provider capabilities.

## 10. UI Profile Studio

Profile Studio является отдельным режимом единственного основного окна Harness
AI, а не вкладкой Settings и не вторым открепляемым окном.

### 10.1 Вход и возврат

- постоянная кнопка `Profile Studio` находится внизу главного левого sidebar
  рядом с `Settings`;
- одно нажатие переводит всё основное окно из режима workspaces/sessions в
  режим Profile Studio;
- в Studio на месте нижних действий находится кнопка `Вернуться к рабочим
  пространствам и сессиям`;
- возврат восстанавливает обычное назначение окна.

### 10.2 Sidebar Studio

Sidebar содержит:

- выбор provider;
- выбор model;
- действие `Создать профиль`;
- список созданных профилей, совместимых с выбранной парой provider/model;
- status badge `Draft` или `Valid` у каждого профиля.

Диагностические Native Profiles/Captures из vendor CLI в этот список не входят.
`Synthetic Native`, созданный как полный аналог для universal client, может
появиться как обычный созданный профиль. Нажатие `Создать профиль` создаёт новую
Profile Creator Agent session. Нажатие существующего профиля возобновляет его
собственную сессию.

### 10.3 Центральная сессия

Центральная, более широкая часть экрана использует без переизобретения обычный
интерфейс сессии Harness AI: header, timeline, reasoning/tool/subagent entries,
composer, execution controls и telemetry. Меняется специализированный агент и
контекст сессии, но не базовый session interface.

### 10.4 Правый инспектор

Справа от сессии находится компактный инспектор выбранного профиля с вкладками:

- `Overview`;
- `Custom System Prompt`;
- `Custom System Tools`.

`Components` не является отдельной пользовательской вкладкой: Custom System
Prompt имеет только две фиксированные части. `Capture` также не является
вкладкой инспектора. Capture требует отдельного диагностического интерфейса;
его точка входа, возможно кнопка в `Overview`, будет обсуждаться отдельно.

### 10.5 Overview

Overview показывает только краткое состояние, которое нужно для ориентации:

- назначение профиля;
- краткое состояние Native-основы и Custom-дополнений;
- количество и краткую сводку Custom System Tools;
- provenance-карточку **«Основан на Native Capture»** с точной identity реально
  выбранного донора;
- текущий status `Draft` или `Valid`.

В Overview нет:

- кнопки или карточки `Custom Capture`;
- действия `Запустить Custom Capture`;
- автоматического verification result;
- процента соответствия или benchmark score.

Механическая Custom Capture-проверка выполняется агентом автоматически.
Диагностические artifacts при необходимости открываются в отдельном Capture
interface, а не внутри вкладок Profile Studio. Поведенческая валидация проходит
вручную в центральной сессии, а итоговое подтверждение пользователь даёт в
диалоге.

### 10.6 Custom System Prompt

Вкладка показывает в режиме чтения ровно две части:

1. сокращённую Native-основу с provenance выбранного donor capture;
2. краткие Custom-дополнения для конкретного класса задач.

Обсуждение и изменение обеих частей происходит в центральной сессии с Profile
Creator Agent. Отдельный экран механически склеенного prompt не нужен: он не
содержит информации сверх этих двух согласованных частей.

### 10.7 Custom System Tools

Вкладка показывает effective structured tool set создаваемого профиля и честные
provider ceilings. Её точный состав и визуализация обсуждаются следующим
отдельным шагом на прототипе.

На первом этапе нет ручного textarea/file editor. Пользователь изменяет draft
через диалог с Agent и проверяет точный результат до подтверждения.

### 10.8 Принятый интерактивный прототип

Интерактивный прототип принят пользователем 20 июля 2026 года как UI-baseline
для дальнейшего создания интерфейса Profile Studio. Принят именно
**интерфейсный подход и его информационная архитектура**, а не все примерные
значения, тексты и детали будущей production-реализации.

Локальная исполняемая копия сохранена в ignored runtime state проекта:

- корень: `.harness/runtime/prototypes/profile-studio-ui/`;
- основной экран: `src/App.jsx`;
- визуальные стили: `src/styles.css`;
- отчёт визуальной проверки: `design-qa.md`;
- принятые состояния: `artifacts/overview.png`,
  `artifacts/custom-system-prompt.png` и
  `artifacts/custom-system-tools.png`;
- сопоставление с исходным визуальным направлением:
  `artifacts/qa-comparison.png`.

Запуск прототипа из корня repository:

```bash
cd .harness/runtime/prototypes/profile-studio-ui
npm ci
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

В прототипе работают переключение трёх вкладок, выбор и создание profile
session, открытие полного текста prompt и перевод обсуждения выбранной части в
composer центральной сессии.

Зафиксированный UI-baseline включает:

1. единый main-window mode вместо отдельного окна или Settings flow;
2. provider/model-scoped sidebar со списком самостоятельных Profile Creator
   Agent sessions и статусами `Draft`/`Valid`;
3. неизменённую по базовой структуре обычную Harness AI session в центре;
4. компактный правый inspector ровно с тремя вкладками `Overview`,
   `Custom System Prompt` и `Custom System Tools`;
5. две read-only части Custom System Prompt: сокращённую Native-основу и
   краткие Custom-дополнения;
6. изменение профиля только через диалог с Profile Creator Agent;
7. отсутствие вкладок `Components` и `Capture`; Capture остаётся отдельным
   диагностическим интерфейсом.

Прототип не является production-кодом и сам по себе не переводит весь этот
proposal в `docs/architecture/**`. До implementation plan отдельно предстоит
согласовать точное содержимое `Custom System Tools`, отдельный Capture
interface, реальные Core read models/commands, окончательный copy и адаптацию
принятой композиции к production design tokens и размерам окна.

## 11. Core ownership

Единый режим Profile Studio остаётся Application Shell surface. Истина
разделена по существующим и будущим Core-модулям:

| Ответственность | Owner |
| --- | --- |
| Proxy, TLS, capture orchestration, raw artifacts | `provider-network-capture` |
| Native capture command и evidence read model | Core capture modules |
| Agent-internal Custom Capture и mechanical comparison | Core capture modules |
| Profile documents и validation | `session-profiles/profile-store` |
| Restricted draft mutations | Core profile-authoring API |
| Deterministic two-part prompt compilation | Core profile compiler/materializer |
| Profile catalog и provider/model compatibility | Core profile catalog |
| Profile ↔ creator session identity, Draft/Valid state | Core profile lifecycle |
| Native Capture donor identity и provenance | Core profile lifecycle/capture read model |
| Claude/Codex application | соответствующий provider adapter |
| Kimi Native route | `kimi-native-session` ACP backend |
| Kimi Custom route и parity tools | universal client + Kimi parity layer |
| Studio mode switch, standard session rendering, inspector | Application Shell |

Renderer не:

- парсит capture;
- собирает system prompt;
- выбирает tools;
- решает capability ceilings;
- пишет profile files напрямую;
- самостоятельно объявляет профиль `Valid` без Core-команды, следующей за
  явным подтверждением пользователя.

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
- связь каждого профиля с собственной сохраняемой Profile Creator Agent session;
- Core-owned статусы `Draft` и `Valid` с явным user confirmation gate;
- provider/model-specific сокращённой Native-основы и Custom-дополнений вместо
  одного hardcoded `custom-instructions.md`;
- restricted Profile Creator Agent authoring API;
- agent-first Studio conversation в стандартном session interface;
- единый Application Shell mode с Studio sidebar и компактным inspector;
- exact tool inventory/subset contract вместо шести категорий;
- явная Native Capture donor provenance, отдельная от target provider/model;
- managed capture для Claude и Codex;
- custom universal-client capture для Kimi;
- full Kimi parity всех 25 tools;
- agent-internal expected compilation vs Observed Wire comparison и repair;
- user approval gate перед появлением профиля в picker.

## 13. Предлагаемый порядок дальнейшего проектирования

Это discussion roadmap, а не implementation todo-plan.

### Этап A — UI contract на прототипе (интерфейсный подход принят)

- Приняты single-window Studio mode и возврат к workspaces/sessions.
- Приняты provider/model-scoped sidebar и profile-to-session mapping.
- Приняты вкладки `Overview`, `Custom System Prompt` и `Custom System Tools`,
  а также двухчастное read-only представление prompt.
- Предстоит согласовать точное содержимое `Custom System Tools`.
- Отдельный Capture interface и его точка входа вне inspector tabs.
- Явный пользовательский переход `Draft` → `Valid` через диалог.

### Этап B — Capture contract

- Native Capture evidence и явный выбор donor capture.
- Managed-route capture для Claude/Codex.
- Universal-client Custom Capture для Kimi.
- Stable provider/model/runtime/profile identity в артефактах.
- Agent-internal expected-vs-observed comparison и repair contract.

### Этап C — Profile composition contract

- Provider+model passport.
- Формат сокращённой Native-основы и Custom-дополнений с фиксированным порядком.
- Exact tool inventory и subset selection.
- Deterministic compiler output и validation schema.
- Applied snapshot compatibility.

### Этап D — Restricted agent authoring

- Profile Creator Agent contract.
- Core draft API без свободного filesystem access.
- Persistent creator session, document viewer, preview и user approval.
- Автоматическая mechanical capture-проверка перед показом draft.
- Ручные behavioral Draft Tests через production session route.

### Этап E — Claude and Codex proof

- Claude prompt reduction и exact native tool subset.
- Claude agent-internal Custom Capture для prompt/tools.
- Codex prompt-only profile и read-only tools.
- Codex agent-internal Custom Capture для `baseInstructions`.
- Первые согласованные с пользователем ручные Native-vs-Custom experiments.

### Этап F — Kimi full parity

- Exact Kimi native system prompt on universal client.
- Все 25 schemas в provider request.
- Все 25 registered Core executors.
- Provider-compatible behavior and lifecycle tests.
- Full-profile agent-internal Custom Capture and matched native parity proof.

### Этап G — Kimi reduction and first profile classes

- Создание уменьшенных Kimi profiles из доказанного full baseline.
- Согласование первых классов задач.
- Отдельные Claude/Codex/Kimi profiles для каждого класса.
- Ручная проверка качества, стоимости, tool use и размера контекста.

Только после положительных результатов этапа G имеет смысл обсуждать
Normalizer, автоматический выбор, динамическую специализацию и feedback loop.

## 14. Критерии готовности первого этапа

- Профиль имеет точную provider+model identity.
- Выбранный Native Capture donor получен из реального CLI/client capture и его
  provenance не подменяется identity целевой модели.
- Profile Creator Agent создаёт draft только через Core authoring API.
- Каждый профиль связан с собственной сохраняемой creator session.
- Пользователь может отдельно прочитать сокращённую Native-основу и
  Custom-дополнения.
- Compiled Custom System Prompt детерминирован и состоит только из этих двух
  согласованных частей.
- Effective tool set детерминирован и содержит только registered executors.
- Claude Profile Creator Agent автоматически сверяет prompt и выбранный native
  tool subset с Custom Capture и исправляет расхождения.
- Codex Profile Creator Agent автоматически сверяет prompt и честно сохраняет
  fixed tools.
- Kimi universal client воспроизводит полный Native Profile и все 25 tools.
- Kimi Profile Creator Agent механически сверяет full profile до сокращения.
- Пользователь и агент проводят ручные поведенческие проверки в creator session.
- Профиль остаётся `Draft` до явного подтверждения пользователя и только после
  него получает status `Valid`.
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
- Формальный benchmark, автоматический behavioral score и автоматическая
  поведенческая верификация.
- Автоматическое обновление Custom Profile после нового Native Capture.
- Редактирование captured native tool schemas/descriptions.
- Создание пользовательских executable tools через Studio.
- Runtime Skill discovery основным task agent.
- GLM, OpenRouter, Local Models и Grok integration.
- Решение, помещать ли verbatim user task в system prompt.

## 16. Оставшиеся решения перед implementation plan

1. Физический формат каталога provider+model profile.
2. Точные имена и provider-specific placement двух частей Custom System Prompt.
3. Контракт draft identity до утверждения пользователем.
4. Принять или скорректировать точную creator runtime configuration:
   `claude` / `opus` / `high`.
5. Принять предложенную structured full-snapshot authoring boundary вместо
   unrestricted filesystem tools.
6. Точный Core contract команды, переводящей профиль из `Draft` в `Valid` после
   подтверждения пользователя в диалоге.
7. Состав и визуализация вкладки `Custom System Tools`.
8. Отдельный Capture interface и точка входа в него, возможно из `Overview`.
9. Схема внутреннего expected-vs-observed Custom Capture diff для агента.
10. Как связать captured artifact с конкретным draft content hash.
11. Набор parity tests для каждого из 25 Kimi tools.
12. Первый класс Custom Profiles и ручные task fixtures.
13. Отдельный эксперимент по размещению user task в system prompt.

Каждое из этих решений сначала обсуждается и фиксируется в planning document
под `docs/evidence/**`. Только после принятия документа создаётся active
implementation plan.
