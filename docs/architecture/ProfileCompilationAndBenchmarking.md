# Компиляция профилей, нормалайзер запроса и benchmark workflow

Статус: расширенная архитектурная заметка для обсуждения. Документ обобщает
`docs/architecture/SessionProfiles.md`, `docs/architecture/SessionProfilesV2.md`
и `docs/architecture/NativePromptComposition.md`, добавляя слой управляемой
компиляции `system prompt + tools` и нормалайзер пользовательского запроса.

Этот документ не заменяет текущий контракт хранения профилей v2. Он фиксирует
следующий уровень: как из пользовательской задачи, роли агента, типа работы,
native-эталонов и workflow Harness AI собрать готовый runtime package для
конкретной сессии.

## 1. Рамка решения

Harness AI строит управляемую среду, в которой агент не должен самостоятельно
угадывать, какой контекст, профиль, набор инструментов или специальные знания
ему нужны.

Вместо этого до старта дорогого агента формируется готовый пакет:

- **compiled system prompt** — финальный системный промпт, который уходит
  провайдеру с самым высоким доступным приоритетом канала;
- **compiled tools** — набор системных инструментов и правила их применения;
- **runtime messages** — только то, что должно оставаться сообщениями сессии
  (например пользовательский prompt, provider-specific служебные сообщения,
  проектные инструкции, если канал не позволяет поднять их в system prompt);
- **manifest** — машинно-читаемая запись, из чего пакет собран и какие
  решения приняты.

Главная позиция: **не вводить отдельный низкоприоритетный context pack как
provider-visible слой**, если мы можем скомпилировать релевантные инструкции
прямо в system prompt.

`AGENTS.md`, архитектурные документы, native capture dumps и workflow rules —
это source materials для компилятора, а не самостоятельный слой, который модель
должна читать и интерпретировать наравне с задачей пользователя.

## 2. Почему нужен компилятор, а не просто один большой профиль

Один универсальный профиль быстро превращается в смесь всего со всем:
планирование, ревью, frontend, backend, package gate, security, git safety,
browser automation, provider adapter details, benchmark rules.

Такой профиль дорогой, шумный и хуже управляется.

Нужна другая модель:

- **profile template** задает роль и стабильные правила поведения;
- **task classification** определяет тип задачи и специализацию;
- **source materials** дают проверенные правила и знания;
- **compiler** собирает только релевантное в один system prompt;
- **tool compiler** выбирает только допустимый tool bundle;
- **manifest** делает сборку воспроизводимой и пригодной для benchmark.

Итоговая модель видит не набор “возможных знаний”, а уже собранный контракт
сессии.

## 3. Основные сущности

### 3.1 User request

Исходный пользовательский запрос.

Он может быть высоким уровнем:
“создать универсальный клиент”,
“проверить план другого агента”,
“сделать frontend fix”,
“подготовить архитектурный документ”.

User request сам по себе не должен напрямую определять все runtime параметры.
Он сначала нормализуется.

### 3.2 Normalized request

Машинно-читаемое представление пользовательского намерения.

Минимальные поля:

```json
{
  "goal": "short human-readable goal",
  "role": "architecture_author",
  "taskType": "new_core_cluster_architecture",
  "specialization": "provider_runtime",
  "requiresClarification": false,
  "clarificationQuestion": null,
  "riskLevel": "medium"
}
```

Normalizer не решает задачу пользователя.
Он только классифицирует запрос и подготавливает сборку профиля.

### 3.3 Profile template

Шаблон роли агента.

Примеры ролей:

- `architecture_author`;
- `architecture_reviewer`;
- `plan_author`;
- `plan_reviewer`;
- `implementation_agent`;
- `implementation_reviewer`;
- `frontend_implementation_agent`;
- `backend_core_agent`;
- `packaging_acceptance_agent`.

Template содержит постоянные правила роли:

- цель роли;
- что агент обязан сделать;
- что агенту запрещено делать;
- формат результата;
- expected evidence;
- default tool policy;
- benchmark rubric для этой роли.

Template не должен включать все знания обо всех framework и провайдерах.

### 3.4 Task specialization

Уточнение типа работы внутри роли.

Примеры:

- `frontend_ui`;
- `backend_core_runtime`;
- `provider_adapter`;
- `universal_client`;
- `session_profiles`;
- `native_prompting`;
- `docs_architecture`;
- `plan_lifecycle`;
- `packaging`;
- `localization`;
- `electron_bridge`.

Specialization выбирает дополнительные source materials и tool constraints.

Это не “скилл на всякий случай”.
Это заранее выбранная направленность конкретной сессии.

### 3.5 Source materials

Внутренние материалы Harness AI, из которых компилятор собирает prompt.

Примеры:

- `AGENTS.md`;
- `.harness/plans/todo-plan.md`;
- `.harness/plans/todo-plan.template.md`;
- `docs/architecture/SessionProfiles.md`;
- `docs/architecture/SessionProfilesV2.md`;
- `docs/architecture/NativePromptComposition.md`;
- `docs/architecture/UniversalClient.md`;
- native capture dumps;
- benchmark specs;
- provider/tool inventories;
- framework-specific reference notes.

Source materials не обязаны попадать в запрос целиком.
Компилятор берет из них релевантные rules, invariants и acceptance criteria.

### 3.6 Compiled system prompt

Финальный системный промпт сессии.

Он содержит:

- identity и роль агента;
- task-specific workflow;
- релевантные правила AGENTS.md;
- provider/native prompt baseline;
- ограничения tool use;
- acceptance criteria;
- reporting format;
- safety и git/documentation rules;
- специальные знания, если они требуются задаче.

Это provider-visible artifact.
Он должен уходить в поле с максимальным приоритетом, которое доступно каналу:

- Claude: `systemPrompt` / `system`;
- Codex: `baseInstructions` / `instructions`;
- universal client providers: системное сообщение или поле request,
  определенное нашим endpoint/core contract.

### 3.7 Compiled tools

Скомпилированный набор инструментов.

Для Claude/Codex он ограничен потолками их native каналов.
Для провайдеров нашего universal client он полностью контролируется Core:
tool registry, built-in tools, будущие источники инструментов.

Tool policy должна быть role-specific.

Reviewer-профиль не должен получать тот же write/shell/git набор, что
implementation agent, если задача ревью не требует правок.

### 3.8 Prompt manifest

Машинно-читаемая запись сборки.

Пример:

```json
{
  "schema": "harness-ai-profile-compilation-v1",
  "profileTemplate": "architecture_reviewer.v1",
  "taskType": "native_prompting_architecture",
  "specialization": "session_profiles",
  "sourceMaterials": [
    "AGENTS.md",
    "docs/architecture/SessionProfilesV2.md",
    "docs/architecture/NativePromptComposition.md"
  ],
  "compiledSystemPromptHash": "sha256:...",
  "compiledToolsHash": "sha256:...",
  "toolBundle": "read_search_review",
  "requiresUserClarification": false
}
```

Manifest нужен для:

- повторяемости;
- benchmark;
- аудита;
- сравнения профилей;
- объяснения, почему агент получил именно такой prompt/tools.

### 3.9 Applied profile snapshot

Скомпилированный пакет применяется один раз при create session.

Core сохраняет immutable applied snapshot:

- какой template использован;
- какой compiled prompt ушел провайдеру;
- какие tools были доступны;
- какой manifest соответствует сессии.

Resume не перечитывает живые файлы профиля и не перекомпилирует пакет.
Это продолжение существующего invariant из `SessionProfiles.md`.

## 4. Нормалайзер запроса

Normalizer — отдельная стадия до запуска основного агента.

Его может выполнить:

- пользователь через форму при создании сессии;
- недорогая модель по запросу пользователя;
- гибрид: модель предлагает классификацию, пользователь подтверждает;
- deterministic rules, если запрос очевиден.

Примеры дешевых моделей для такой роли обсуждаются отдельно; принцип важнее
конкретного вендора: normalizer должен быть дешевле основного агента и не
должен решать саму engineering-задачу.

## 5. Контракт нормалайзера

Normalizer обязан:

- классифицировать роль агента;
- определить task type;
- определить specialization;
- выбрать profile template только из зарегистрированного каталога;
- выбрать source materials только из зарегистрированного каталога;
- выбрать tool bundle только из зарегистрированного каталога;
- вернуть manifest draft;
- поставить `requiresClarification: true`, если данных недостаточно;
- не писать код;
- не редактировать repo;
- не принимать архитектурные решения вместо пользователя;
- не добавлять новые правила от себя.

Normalizer не имеет права:

- давать агенту “прочитай все, что найдешь”;
- подключать MCP/skills “на всякий случай”;
- выбирать tools, не разрешенные ролью;
- оставлять важный контекст в низкоприоритетном message, если его можно
  скомпилировать в system prompt;
- подменять acceptance criteria собственными догадками.

## 6. Роли стандартного workflow Harness AI

Текущий workflow уже существует в `AGENTS.md` и в рабочей практике проекта.
Профили должны быть построены вокруг этих ролей, а не вокруг абстрактного
“универсального coding agent”.

### 6.1 Architecture Author

Создает архитектурный или планировочный документ из большой пользовательской
задачи.

Основные обязанности:

- прочитать recovery owner и релевантные architecture docs;
- выделить scope, invariants, ownership, boundaries;
- записать implementation-ready document;
- отметить open questions;
- не начинать реализацию;
- подготовить документ так, чтобы reviewer мог проверять конкретные claims.

Default tools:

- read;
- search;
- web search, если факты внешние или могут устареть;
- write Markdown.

### 6.2 Architecture Reviewer

Проверяет архитектурный документ.

Основные обязанности:

- искать contradictions;
- искать missing invariants;
- проверять Core Authority;
- проверять provider boundaries;
- проверять implementability;
- давать findings first;
- не переписывать документ вместо автора без отдельного запроса.

Default tools:

- read;
- search;
- web/reference search при необходимости.

Write tools могут быть выключены.

### 6.3 Plan Author

Преобразует утвержденный architecture doc в active plan по шаблону
`.harness/plans/todo-plan.template.md`.

Основные обязанности:

- сохранить plan-first lifecycle;
- разбить scope на микрозадачи;
- дать каждой микрозадаче paired `Git Commit`;
- удерживать лимит функциональных файлов;
- добавить package/user acceptance task, если изменение видно пользователю;
- не дублировать quality gates отдельной задачей.

Default tools:

- read;
- search;
- write plan;
- `npm run plan:status`;
- `npm run plan:validate`.

### 6.4 Plan Reviewer

Проверяет active plan перед implementation.

Основные обязанности:

- проверить task granularity;
- проверить scope каждого task;
- проверить expected commits;
- проверить документацию и package acceptance;
- проверить, что plan не смешивает user-input normalization с provider output
  event normalization;
- выдать blocking findings до начала реализации.

Default tools:

- read;
- search;
- `npm run plan:validate`.

Write tools выключены по умолчанию.

### 6.5 Implementation Agent

Исполняет active plan по текущей микрозадаче.

Основные обязанности:

- читать `.harness/plans/todo-plan.md` и `npm run plan:status` на старте;
- следовать только `Current Task`;
- не трогать файлы вне scope без добавления микрозадачи;
- делать code changes;
- обновлять релевантную документацию;
- запускать targeted tests;
- коммитить через `npm run plan:commit -- "<expected commit message>"`;
- не архивировать scope без прямого приказа пользователя.

Default tools:

- read;
- search;
- write/patch;
- shell;
- tests;
- git через plan workflow.

### 6.6 Implementation Reviewer

Проверяет результат implementation task или серии микрозадач.

Основные обязанности:

- сравнить diff с plan и architecture doc;
- искать bugs, regressions, missing tests;
- проверять docs-sync по смыслу, не только по факту изменения;
- проверять package/evidence, если task user-visible;
- не превращать review в новую реализацию без прямого запроса.

Default tools:

- read;
- search;
- test commands по необходимости.

Write tools выключены по умолчанию.

### 6.7 Frontend/Product Implementation Agent

Специализированный implementation profile для UI/product-facing задач.

Основные обязанности:

- наследовать Implementation Agent workflow;
- проверять visible behavior, а не только code diff;
- соблюдать дизайн-конвенции Harness AI;
- проводить browser/screenshot/visual QA, когда применимо;
- помнить, что packaged app требует `npm run package:mac` после explicit user
  confirmation.

Default tools:

- implementation tool bundle;
- browser/screenshot tools, если задача требует визуальной проверки.

### 6.8 Backend/Core Agent

Специализированный implementation profile для Core Runtime, provider runtime,
contracts, adapters, storage и orchestration.

Основные обязанности:

- держать Core Authority;
- не переносить workflow truth в UI;
- менять shared contracts только с тестами и документацией;
- удерживать provider boundaries;
- проверять session/resume/applied snapshot invariants.

Default tools:

- implementation tool bundle;
- targeted contract tests;
- architecture/docs search.

## 7. Tool bundles

Tool bundles должны быть role-specific и benchmarkable.

Начальный каталог:

| Bundle | Назначение | Инструменты |
| --- | --- | --- |
| `read_search_review` | reviewer roles | read, search, optional web |
| `read_write_docs` | architecture author | read, search, web, write Markdown |
| `plan_author` | plan writing | read, search, write plan, plan status/validate |
| `implementation` | code work | read, search, patch/write, shell, tests, git/plan commit |
| `frontend_implementation` | UI work | implementation + browser/screenshot checks |
| `package_acceptance` | packaging evidence | shell, package command after confirmation, evidence write |

Для Claude и Codex bundle применяется с учетом потолков native канала.

Для universal client providers bundle должен компилироваться в точный tool
registry selection.

### 7.2 Phase / completion contract

Provider benchmark не считается объективным, если канал может завершить turn
обычным progress text. Для каждого direct/custom provider adapter должен быть
явно описан и протестирован phase contract:

- provider progress/status text отображается как `commentary`;
- provider reasoning/thinking отображается как `thinking`;
- terminal assistant answer появляется только после явного completion signal;
- отсутствие tool call и отсутствие completion signal не закрывает turn, а
  возвращает adapter в продолжение agent loop или в честный blocked state.

Native Codex app-server даёт такой сигнал как `agentMessage.phase`
(`commentary` / `final_answer`). Это не compiler/profile artifact: compiler
задаёт prompt и tool surface, а provider adapter отвечает за wire-level
semantics завершения. Для custom providers нужен собственный adapter-level
mechanism, а не текстовая эвристика общего universal client.

## 8. Провайдерские потолки

### Claude

Claude лучше всего подходит для управляемого profile/tools эксперимента:
канал позволяет задавать system prompt и tool set.

Но captured `body.system` смешивает статичную обвязку и live context.
Compiler обязан отделять:

- identity и постоянные behavior rules;
- tool/runtime discipline;
- live environment;
- scratchpad paths;
- memory paths;
- project messages.

### Codex

Codex удобен для prompt experiments:
`instructions` / `baseInstructions` структурно статичны.

Но inline toolset в app-server фиксирован.
Per-thread отключение отдельных tools capture не подтверждает.

Compiler может управлять prompt,
но tool experiments для Codex ограничены process flags и самим app-server.

### Universal client providers

Kimi, GLM, Local Models и OpenRouter через наш client должны стать полной
управляемой средой.

Для них Core владеет:

- compiled system prompt;
- tool registry selection;
- tool execution semantics;
- dialect request shaping;
- thinking normalization;
- event normalization;
- applied profile snapshot.

Именно на них позже можно полноценно тестировать разные `compiled prompt +
compiled tools`.

## 9. Benchmark как contract, а не субъективное сравнение

Benchmark должен проверять роли workflow, а не абстрактное качество модели.

Единица benchmark:

```json
{
  "provider": "codex",
  "model": "gpt-5.5",
  "profileTemplate": "plan_reviewer.v1",
  "taskType": "universal_client_plan_review",
  "toolBundle": "read_search_review",
  "compiledSystemPromptHash": "sha256:...",
  "taskFixture": "phase4-plan-review-001",
  "expectedArtifacts": [
    "review_findings"
  ]
}
```

Оценивать нужно:

- соблюдение роли;
- следование workflow Harness AI;
- точность finding или implementation;
- отсутствие scope creep;
- корректность tool use;
- отсутствие выдуманных фактов;
- качество артефакта;
- прохождение plan/docs/tests/package acceptance, если применимо;
- количество user interventions;
- токены, время, tool calls;
- воспроизводимость.

Codex и Claude используются сначала как calibrators:
их native prompts/tools зрелые и позволяют понять, какие rules полезны, а
какие являются балластом.

После калибровки те же fixtures и rubrics применяются к Kimi, GLM, Local
Models и OpenRouter на нашем universal client.

## 10. Prompt authoring policy

Compiled system prompt должен быть task-specific.

Запрещено:

- включать все правила на все случаи жизни без отбора;
- давать агенту список skills/MCP/reference packs “на выбор”;
- оставлять важный workflow только в `AGENTS.md`, если он является контрактом
  этой сессии;
- смешивать live context с frozen native wrapper;
- смешивать role rules и benchmark rubric без manifest.

Разрешено и ожидается:

- копировать релевантные правила AGENTS.md в compiled system prompt;
- включать task-specific knowledge прямо в system prompt;
- удалять нерелевантные native sections;
- сохранять provider-native behavioral core;
- явно указывать tool policy;
- явно указывать acceptance criteria;
- писать коротко, если роль узкая.

## 11. Хранение и воспроизводимость

Для каждой compiled session Core должен уметь записать:

- normalized request;
- selected profile template;
- selected task type;
- selected specialization;
- source material ids;
- compiled system prompt;
- compiled tool manifest;
- prompt/tool hashes;
- provider/model;
- applied snapshot id;
- benchmark labels, если сессия benchmarked.

Эти данные являются runtime state.
Tracked architecture docs фиксируют только контракт.

## 12. Открытые вопросы

1. Где физически хранить compiled prompt artifacts:
   только в session runtime state или еще в пользовательской папке профилей?

2. Должен ли пользователь всегда подтверждать normalizer output перед стартом
   дорогого агента, или только для high-risk / ambiguous задач?

3. Какой минимальный набор role templates нужен для первого benchmark:
   4 роли или сразу полный набор из 8?

4. Нужно ли делать отдельные provider-specific variants для Claude/Codex
   managed profiles, или сначала держать общий role template и provider
   adapter appendices?

5. Как хранить benchmark fixtures: tracked docs/evidence, runtime state или
   отдельный benchmark corpus?

6. Какие tool bundles считаются обязательными для reviewer roles:
   read/search only или допустимы targeted shell checks?

7. Какой normalizer должен быть первым:
   deterministic UI form, cheap model, или гибрид?

## 13. Предлагаемый следующий шаг

Следующий документ или раздел должен зафиксировать benchmark spec:

- список первых role templates;
- 5-6 стартовых fixtures;
- scoring rubric;
- формат benchmark report;
- правила повторного прогона;
- минимальный набор провайдеров для калибровки: Claude и Codex;
- перенос той же матрицы на universal client providers.

После этого можно проектировать реализацию Profile Compiler и Normalizer как
Core-owned modules, не смешивая их с текущей Phase 4 миграцией universal client.
