# Profile Studio: Native Capture, профили и Normalizer

Статус: архитектурное предложение для обсуждения, 10 июля 2026 года.
Документ не является контрактом текущей кодовой базы или active
implementation plan. После согласования решения должны быть приведены в
соответствие с live runtime truth и перенесены в `docs/architecture/**` до
создания implementation scope.

Документ соединяет сильные стороны:

- `ProfileCreator-Research-2026-07-10.md` (Fable-5, внешний research
  snapshot): практическую
  последовательность A → B → C, раннее наполнение каталога, профиль из
  сессии, токен-метр и usage-feedback loop;
- `profile-creator-target-system-research.md` (GPT-5.6, внешний research
  snapshot, объединённый в этот документ): capability truth,
  Core-owned typed contract, deterministic compiler, provider-specific
  variants, immutable revisions, staged preview, privacy и eval/publish
  lifecycle.
- Реализованный `Native Request Capture`: фактические provider/model-specific
  system prompts, tool declarations и developer context, полученные только из
  Native CLI соответствующего provider family. Из них строятся проверенный
  Native baseline, полный эталон tool surface и стартовый draft профиля.

Это целевая архитектура и порядок развития, а не active implementation plan.
Перед реализацией каждая фаза должна быть разложена в
`.harness/plans/todo-plan.md` на отдельные микро-задачи.

## 1. Решение в одной фразе

**Profile Studio захватывает фактический Native request, превращает его в
проверенный provider/model-specific baseline и ведёт библиотеку опубликованных
профилей, skills, instruction blocks и tool policies; Session Normalizer
превращает произвольную пользовательскую задачу и текущее состояние workspace
в `TaskSpec`, выбирает только релевантные опубликованные материалы, а Core
детерминированно компилирует единый system prompt, минимально достаточный tool
set и immutable Applied Snapshot до первого хода основного агента.**

AI помогает сформулировать профиль и предлагает semantic diff, но не владеет
файлом, не меняет published revision и не участвует в компиляции.

Система развивается последовательно:

1. **Native Source Foundation** — получить фактические Native system prompt,
   tool declarations и developer context, проверить и принять их как baseline.
2. **Truth foundation** — доказать, что каждый канал действительно применяет
   обещанные prompt/tools/options.
3. **Authoring и наполнение библиотеки** — создать draft из baseline, добавить
   typed policy, сиды, профиль из сессии, curated Skill Library и AI-ассист.
4. **Verification и publication** — preview, revision-bound managed capture
   там, где route его поддерживает, tests, revisions и rollback.
5. **Task-first Normalizer** — reuse готового профиля либо композиция из
   опубликованных profile/skill/tool revisions до bind основной сессии.
6. **Complexity routing и user control** — разные модели нормализации,
   автоматический, review и manual режимы, а для больших задач — отдельные
   task-level и session-level snapshots.

Главная причинная цепочка:

```text
Native Request Capture
  → проверенный Native Baseline
  → честные capabilities
  → стартовый draft с реальными формулировками и tools
  → дешёвое производство профилей
  → наполненная и проверенная библиотека профилей, skills и tool policies
  → matched benchmarks
  → task-first Normalizer
  → готовый релевантный контекст в первом provider request
```

Изначальные формулировки и важные инструкции берутся не из пустого AI-запроса:
после curation и source→target mapping принятый Native system prompt становится
стартовым static body, captured tool schemas — исходной reference surface, а
developer context проходит классификацию на стабильные правила, runtime
references и непереносимые session/workspace данные.

Normalizer без опубликованных и проверенных материалов бесполезен. Библиотека
без Capture-based baseline, curated skills и удобного производства профилей не
наполнится. Красивый UI без adapter truth будет обещать несуществующий контроль.

## 2. Принятые архитектурные решения

### 2.1 Единственный источник истины

- Редактируемый профиль принадлежит Core и хранится на диске.
- Profile Studio, AI Creator и VS Code являются тремя редакторами одного
  canonical profile draft, а не независимыми источниками этого layer.
- Native Source Packs, Published Skill Revisions и workspace policies имеют
  собственных явных владельцев и immutable revisions; они не копируются в
  mutable profile draft скрыто.
- AI предлагает изменения только через per-field diff для typed metadata и
  точный текстовый diff для prompt body с `Accept / Dismiss`.
- Published revision immutable. Изменение canonical файла создаёт новый draft
  и не меняет старую revision.
- Профиль materialize-ится один раз при создании сессии. Resume использует
  сохранённый applied snapshot и не перечитывает изменившийся draft.
- `ApprovedComposition` является единственной истиной о том, какие profile,
  skill, tool и policy revisions вошли в конкретную сессию.

### 2.2 Form-first MVP, conversational authoring как опция

Главный Build flow — структурированный редактор, а не постоянный чат:

- обычный режим показывает понятные поля и capabilities;
- AI доступен через действия `Создать из описания`, `Улучшить` и
  `Профиль из сессии`;
- при необходимости может открываться conversational drawer, но он не
  становится владельцем профиля и не занимает обязательную половину экрана;
- постоянный chat-first split view остаётся проверяемой продуктовой гипотезой,
  а не обязательством MVP.

Так сохраняется сила natural-language bootstrap без chat-owned profile и без
дублирования полноценной session-поверхности внутри редактора.

### 2.3 Profile Studio — самостоятельная вкладка Settings

- `Profile Creator` переименовывается в `Profile Studio`.
- Текущая карточка `Native Request Capture` переносится из `General` в эту же
  вкладку и становится первой стадией workflow.
- Вкладка получает собственную внутреннюю навигацию:
  `Native Sources`, `Skills / Instructions`, `Profiles`, `Build`,
  `Inspect / Evaluate` и `Normalizer Materials`.
- Это одна широкая design-time поверхность внутри Settings, а не отдельное
  окно приложения.
- Пробный запуск профиля выполняется в обычной session-поверхности с бейджем
  `Draft test`, а не в урезанном runtime внутри Studio.
- UI-объединение не объединяет Core ownership: capture proxy/artifacts остаются
  в `provider-network-capture`, профили — в `session-profiles`, а runtime
  Normalizer остаётся отдельным Core preflight-компонентом.

### 2.4 Task-first, reuse-first Normalizer

Harness AI остаётся task-first системой: пользователь может принести любую
задачу в новый или уже существующий workspace и не обязан начинать проект с
нулевого product workflow. Normalizer является preflight selector/assembler,
который создаёт `NormalizationProposal`; deterministic Profile Compiler
materialize-ит утверждённую композицию. Normalizer не является подготовительным
собеседником основного агента.

Порядок выбора:

1. построить `TaskSpec` из verbatim request и дешёвого Workspace Fingerprint;
2. найти точную Published Revision и переиспользовать её, если она полностью
   подходит;
3. иначе предложить точные revision ids Native Kernel, Skill Revision,
   Instruction Block и Tool Policy для будущего Effective Profile;
4. при неоднозначности вернуть review/clarification, а не генерировать
   недоказанные инструкции;
5. передать `ApprovedComposition` deterministic Profile Compiler/Materializer,
   который до bind собирает единый system prompt, tools и Task Context Pack.

Основной агент не получает каталог descriptions и не читает `SKILL.md` во
время старта. Skill discovery и dependency resolution происходят до его
первого provider request. Reuse-first остаётся экономичным быстрым путём, но
готовый профиль не является обязательным условием для каждой произвольной
задачи.

### 2.5 Harness AI и Code AI Hub решают разные задачи

Code AI Hub является workflow-first системой: проект начинается внутри
заранее известного процесса, поэтому текущая стадия, роль агента и профиль
обычно определяются обычным script-orchestrator.

Harness AI не требует владеть всем жизненным циклом проекта:

```text
Code AI Hub:
Project → known workflow node → known role/profile → task

Harness AI:
Arbitrary task + current workspace → TaskSpec → Effective Profile
```

Детерминированные workflows, роли и artifact contracts из Code AI Hub могут
использоваться как опубликованные task recipes, когда задача им соответствует.
Они не становятся обязательным greenfield-процессом Harness AI. Для большой
задачи в существующем проекте оркестратор может построить временный task-local
workflow и отдельные Effective Profiles для его микрозадач, не реконструируя
весь lifecycle проекта.

### 2.6 Normalizer, Orchestrator и Compiler не дублируют ownership

| Компонент | Единственная ответственность |
| --- | --- |
| `Session Normalizer` | Строит `TaskSpec` и предлагает точные profile/skill/tool/policy revision ids |
| `Workflow Orchestrator` | Опционально владеет task-local plan, стадиями, gates и artifact handoffs |
| `Profile Compiler / Materializer` | Единолично собирает system prompt/tools/input package и Applied Snapshot одной session/stage |
| `Provider Adapter / SDK` | Применяет package и исполняет полный provider-family tool capability set |

Normalizer не пишет prompt, Orchestrator не компилирует profile, а Compiler не
решает, какие стадии нужны задаче.

## 3. Native Source Pipeline: от Capture к профилю

Native Request Capture — не вспомогательная диагностика сбоку от Profile
Creator. Это источник исходного материала для профиля и позднее — доказательство
того, что managed revision действительно дошла до provider.

### 3.1 Что уже реализовано

Текущий Core capture route умеет:

- выбрать provider и model; для diagnostic route также может выбрать профиль;
- перехватить фактический provider-facing request;
- для Codex forward/WebSocket path пропустить запрос к реальному provider и
  извлечь нужный request frame;
- замаскировать credential-bearing headers до записи;
- сохранить три локальных артефакта:

```text
<timestamp>-<provider>-<model>-native-request.jsonl
<timestamp>-<provider>-<model>-native-request.diagnostics.jsonl
<timestamp>-<provider>-<model>-native-request.md
```

Назначение артефактов:

- raw `*.jsonl` — захваченный upstream request, evidence-источник;
- `*.diagnostics.jsonl` — proxy lifecycle, applied Harness/profile envelope и
  provider diagnostics;
- readable `*.md` — человеческая проекция с группами:
  - `System Prompt`;
  - `Tool Declarations`;
  - `Developer Context: Permissions, Skills, Plugins`;
  - Request Context / Parameters;
  - Applied Harness/Profile Envelope;
  - Diagnostics.

Capture является sensitive локальной операцией. Для forward-transit routes
probe-запрос реально достигает provider; Studio должна говорить это прямо и
запрашивать явное действие пользователя, а не обещать offline capture.

Capture сегодня создаёт evidence-файлы, но ещё не создаёт Core-owned
`NativeSourcePackRevision` и не умеет одной командой построить из него draft.
Именно этот мост добавляет Profile Studio.

### 3.2 Объекты source pipeline

Нельзя превращать raw request непосредственно в published profile. Между ними
нужны два явных объекта:

| Объект | Содержимое | Статус |
| --- | --- | --- |
| `CapturedRequestEvidence` | Ссылки на raw/diagnostics/readable artifacts, capture source fingerprint, timestamp и hashes | Immutable evidence |
| `NativeSourcePackRevision` | Проверенный static prompt, tool schemas, stable request shape, developer context map и versioned source→target mapping | Immutable approved baseline source |
| `Profile Variant Draft` | User-owned specialization, tool policy, permissions, routing metadata и tests поверх baseline | Editable author source |

Полный flow:

```text
Capture Native request
  → extract provider-neutral sections
  → inspect and classify
  → accept NativeSourcePackRevision
  → Create Profile from Baseline
  → edit / specialize / reduce tools
  → compile + Draft test
  → revision-bound managed verification capture, где route это поддерживает
  → evaluate + publish
```

Importer читает canonical raw request JSONL. Readable Markdown используется для
человеческого review и никогда не становится машинным source of truth.

`CapturedRequestEvidence` хранит:

- `captureId` и пути всех трёх артефактов;
- `captureSourceFingerprint`: provider, selected/actual model,
  source route/entry mode, reasoning mode и client/adapter versions;
- provider client / adapter / Harness versions;
- capture time и признак `sent upstream`;
- hashes system prompt, tools, developer context и raw request;
- JSON pointers исходных секций и список исключённых dynamic полей;
- `captureMode`: native baseline или managed verification;
- для managed capture: `revisionId` или `draftArtifactHash`,
  `appliedSnapshotHash` и application target fingerprint;
- sensitivity/redaction status;
- ссылку на applied envelope и capture diagnostics.

`NativeSourcePackRevision` получает собственный `baselineId/revisionId` и не
меняется после принятия. Новый capture создаёт новую baseline revision и
compatibility diff, а не переписывает старые drafts.

Source Pack отдельно хранит:

- `captureSourceFingerprint` — где и чем были получены исходные данные;
- совместимые `sourcePackTargetFingerprints` или явный статус
  `reference-only`;
- versioned transformation/mapping contract для cross-route переноса;
- hashes результата после классификации.

Source→target mapping может менять transport/placement и реализацию handler,
но не понижает нормативный Native Tool Set: для Native-derived execution route
отсутствующий tool остаётся parity blocker до реализации.

Источник и target нельзя обозначать одним полем `route`: Claude CLI capture и
Claude SDK application, а также Codex app-server capture и CodexUC application
являются разными маршрутами.

Предлагаемая read-only serialization:

```text
ProfileSources/<Provider>/<sourcePackId>/
  provenance.json
  system-prompt.md
  tools.json
  developer-context.json
  developer-context.md
  request-template.json
  source-map.json
```

`provenance.json` связывает pack с capture, target fingerprint и hashes.
`source-map.json` фиксирует, какие JSON pointers стали static material, какие
остались runtime references, а какие были исключены.

### 3.3 Baseline curation

Core-owned importer извлекает provider-neutral группы, но пользователь
подтверждает, какой capture становится Native baseline. Автоматическая
публикация запрещена.

При принятии материалы классифицируются:

1. **Frozen static prompt** — фактические стабильные Native-инструкции,
   пригодные как стартовое тело профиля.
2. **Tool surface** — точные tool ids, descriptions и schemas; сверяются с
   live inventory.
3. **Stable developer rules** — подтверждённые переносимые правила поведения.
4. **Captured capability references** — permissions, skill descriptions,
   plugins и MCP из Native Developer Context; они являются evidence о
   Native-среде, но не автоматически опубликованным skill-текстом.
5. **Workspace orchestration policy** — текущие `AGENTS.md`/`CLAUDE.md`
   классифицируются на machine-enforced rules, инструкции оркестратора,
   архитектурные policies и task-relevant правила. Полный файл не копируется
   основному агенту автоматически.
6. **Workspace/session material** — пути, sandbox, дата, git/environment,
   текущий user request и task-local artifacts; остаются runtime inputs.
7. **Adapter-owned contract** — locked wrapper, phase/tool-loop/completion
   protocol; показывается в Inspector, но не становится редактируемым body.
8. **Sensitive или непереносимый материал** — исключается из reusable source и
   остаётся только в локальном evidence.

Request parameters импортируются только по provider-specific allowlist.
`previous_response_id`, `prompt_cache_key`, session/client metadata, diagnostic
probe и текущие сообщения не переносятся в reusable `request-template.json`.

Developer Context нельзя копировать целиком. Списки permissions, skill
descriptions, plugins, workspace paths и live policy часто динамичны. Importer
предлагает классификацию, secret scan и diff; пользователь подтверждает
переносимые элементы. Полный текст выбранного и отдельно проверенного
`PublishedSkillRevision` может позднее целиком материализоваться в system
prompt конкретной задачи — это отдельный Skill Library pipeline, а не прямой
импорт списка skills из Capture.

### 3.4 Откуда берётся первый профиль

Команда `Create Profile from Native Baseline` создаёт не пустой шаблон:

- exact Native static prompt становится начальным prompt body;
- captured tool schemas создают canonical `NativeToolSetRevision`; Claude SDK
  подтверждает соответствующий full capability set, а CodexUC проходит
  declaration/schema/execution/lifecycle parity до публикации target revision;
- editable tool policy появляется только после full-capability conformance и
  служит исключительно для task-specific исключений; при
  `deferred/unknown/out-of-parity` Studio показывает reference/diff и блокирует
  runnable target вместо молчаливого уменьшения набора;
- стабильные developer rules становятся явно помеченными author blocks;
- captured permissions/skill descriptions/plugins/MCP становятся typed
  provenance references; отдельно выбранные `PublishedSkillRevision` получают
  typed dependency refs и materialize-ятся в итоговый system prompt;
- adapter-owned и live-context части остаются внешними materialization layers;
- `baselineRef`, `captureRef` и все hashes записываются в provenance.

После этого пользователь или AI Creator добавляет только специализацию:

- роль и тип работы;
- workflow;
- ограничения;
- output/done contract;
- `whenToUse / whenNotToUse`;
- risk и required capabilities;
- positive/negative/ambiguous tests.

AI не придумывает Native основу заново и не удаляет Native-инструкции молча.
`Improve` и `Make Lean` показывают diff против baseline; отключение
поведенческого блока или tool требует явного решения.

Дополнительные входы остаются:

- clone существующего draft/revision;
- профиль из успешной сессии;
- seed/template;
- описание пользователя;
- blank expert profile.

Но рекомендованный default — Native Source Pack с явной совместимостью или
versioned mapping к выбранному application target.

### 3.5 Capture Workbench внутри Profile Studio

Зона `Sources` объединяет:

- `Native Capture` — запуск нового provider/model capture;
- `Capture History` — evidence, status, versions и artifact paths;
- `Native Source Packs` — принятые и superseded baseline revisions;
- `Native ↔ Managed Compare` — prompt/tools/developer context и wire diff.

Состояния capture:

```text
Captured → Reviewed → Accepted as Baseline → Superseded
                     ↘ Rejected / Invalid
```

Действия:

- открыть raw/readable/diagnostics artifacts;
- принять capture как baseline;
- создать профиль из baseline;
- сравнить с предыдущим Native baseline;
- recapture после provider/model/client update;
- запустить revision-bound managed verification capture, если route его
  поддерживает; иначе честно оставить wire status `unverified`;
- увидеть `profile is behind Native baseline` без автоматической мутации.

Native Capture используется дважды:

1. **До authoring** — даёт реальные исходные формулировки, tools и developer
   context.
2. **После compilation/test** — revision-bound Observed Wire доказывает, что
   prompt/tools конкретного `revisionId/artifactHash` реально применились.

### 3.6 Core ownership

Единая вкладка не означает один backend-модуль:

| Зона | Владелец |
| --- | --- |
| Proxy, capture orchestration, raw/diagnostic/readable artifacts | существующий Core-кластер `provider-network-capture` |
| Baseline import, curation, registry и provenance | новый Core-owned module в домене `session-profiles` |
| Skill import/quarantine, approval, registry и eval provenance | Core Skill/Instruction Library modules |
| Draft, canonical file и history | `profile-authoring/profile-store` |
| Compiler, manifests и revisions | Core session-profile compiler modules |
| Workspace Fingerprint, policy resolution и Task Context Pack candidates | read-only Core Workspace Policy/Context Resolver |
| TaskSpec, routing proposal и exact revision selection | Core Session Normalizer |
| Optional task-local stages, gates и artifact handoffs | Core Workflow Orchestrator |
| Applied application details | provider adapters |
| Observed Wire | `provider-network-capture` |
| Формы, навигация и отображение read models | Application Shell `Profile Studio` |

Renderer не парсит capture, не решает, что является system/developer context, и
не собирает prompt. Он отправляет команды и отображает Core-owned read models.

### 3.7 Provider-specific смысл Capture

Native authority и execution route являются разными полями. Native system
prompt, developer instructions и Native Tool Set могут быть получены только из
фактического CLI соответствующего provider family. SDK, Universal Client и
Harness-generated request не создают Native baseline; они только применяют
Native-derived profile и дают application/Observed Wire evidence.

- **Claude:** Claude CLI является единственным Native authority. Claude Agent
  SDK является execution route и уже владеет полным System Tooling, tool schemas
  и tool loop этого managed channel. Profile выбирает подмножество полного
  набора, а не компенсирует недостающие SDK tools.
- **Codex:** Codex CLI через app-server является Native authority и может
  остаться capture-only route внутри Profile Studio, даже если пользовательские
  Codex-сессии запускаются только через CodexUC. CodexUC adapter обязан сначала
  реализовать полный Native Tool Set принятой Codex baseline revision; только
  после этого Profile Studio имеет право исключать ненужные tools.
- **CodexUC managed capture:** capture выбранной Published Revision является
  Observed Wire verification, а не новым Native source. Целевой contract
  принимает `revisionId/artifactHash`, использует тот же
  compiled/materialized payload, что обычная сессия, и записывает
  `appliedSnapshotHash`.
- **Kimi/GLM/OpenRouter/Local routes:** если для provider family нет доступного
  Native CLI capture, Studio не создаёт и не показывает `native` или
  `synthetic-native` baseline. Возможен отдельный `core-authored` provider
  profile с честным provenance, но он не является Native truth.

Для CodexUC capability matrix является conformance gate, а не разрешением
навсегда поддерживать урезанный набор:

```text
Adapter Capability Set @ baseline revision
  = Native Tool Set @ baseline revision

Effective Profile Tool Set
  = Native Tool Set − явно исключённые task-irrelevant capabilities
```

Если новый Native capture добавил или изменил tool, CLI-derived baseline
revision всё равно принимается и версионируется как source truth. Отдельный
CodexUC target-compatibility record получает `Out of parity` до обновления
adapter и matched execution tests. Последняя полностью поддержанная target
revision может продолжать работать; молчаливое исключение отсутствующего tool
запрещено.

## 4. Truth foundation: обязательный первый слой

До включения working Build controls Core должен вернуть честную capability
matrix для каждого сочетания:

```text
provider
+ route / entry mode
+ model family
+ adapter/client version
+ compiler version
+ tool inventory hash
```

Каждая capability получает состояние:

- `controllable` — Core может установить и проверить значение;
- `fixed-native` — канал фиксирует значение и не принимает override;
- `adapter-owned` — значение принадлежит adapter lifecycle;
- `deferred` — контракт предусмотрен, но применение ещё не реализовано;
- `unavailable` — канал не поддерживает возможность;
- `unknown` — фактическое применение пока не доказано.

UI не показывает активный control, если соответствующая capability не имеет
состояние `controllable`.

Для execution route, который заявляет применение Native-derived profile,
matrix дополнительно является parity gate. `Deferred/unavailable` для Native
tool означает незавершённый adapter и блокирует publish/bind соответствующей
target revision, но не создание Native Source Pack. Это не легитимный
постоянный target profile. Полный capability set принадлежит adapter/SDK, а
профиль только уменьшает его для конкретной задачи.

### 4.1 Проверяемый путь применения

Для каждой capability проверяется полный маршрут:

```text
canonical draft
  → compiled static package
  → ProviderSessionStartOptions
  → adapter application
  → applied details
  → provider-facing request
  → observed wire, если capture доступен
```

Наличие поля в UI или Core snapshot не доказывает, что оно дошло до модели.

### 4.2 Снимок текущего состояния

На текущем checkout `75012faf`:

- Claude применяет managed prompt через Agent SDK; SDK владеет полным System
  Tooling, а profile layer выбирает необходимое подмножество;
- Codex app-server применяет prompt, но per-thread tool selection недоступен;
- CodexUC контролирует prompt и native sidecars, сохраняя locked
  adapter-owned phase protocol;
- `kimi-client`, `glm-client`, `openrouter-client` и
  `local-models-client` получают provider-scoped selection на уровне каталога,
  но их `createSession/resumeSession` не применяют profile start options;
  system prompt и profile-owned tool policy не попадают в universal-client
  request.

Этот снимок является диагностикой текущего кода, а не вечным provider
ограничением. Перед implementation scope он проверяется повторно по актуальному
маршруту, а не по старым номерам строк.

Первый engineering slice должен либо реализовать применение, либо честно
пометить capability как `deferred/unavailable`. Для route без Native authority
это ограничивает доступные Core-authored profiles; для CodexUC отсутствие
Codex Native tool является parity blocker. Silent no-op запрещён.

## 5. Целевая модель данных

Нужно разделить объекты с разными жизненными циклами:

| Объект | Назначение | Жизненный цикл |
| --- | --- | --- |
| `Captured Request Evidence` | Raw request, diagnostics, readable projection и capture provenance | Immutable sensitive evidence |
| `Native Source Pack Revision` | Принятые static prompt/tools/developer materials с source map | Immutable approved baseline |
| `Skill Source Revision` | Неизменённый imported skill bundle с repository/ref/hash/license provenance | Immutable quarantine/evidence source |
| `Published Skill Revision` | Проверенный instruction body, compatibility, tool/runtime dependencies, security review и eval results | Immutable approved material |
| `TaskSpec` | Цель, deliverables, ограничения, complexity, риск, workspace fingerprint и неизвестные данные одной задачи | Временный, на одну задачу; может породить несколько session specs |
| `Execution Decision` | `direct` или `orchestrated`, decision source, normalizer/routing revisions, confidence/risk/complexity | Immutable для выбранного task start |
| `Task Program Revision` | Для orchestrated path: user-approved task-local plan либо pinned optional recipe, stages/gates/handoffs | Immutable revision; новый план создаёт новую revision |
| `Workflow Run Snapshot` | Pinned program revision, stage states, exact stage compositions и append-only handoff/gate history | Runtime state только orchestrated path |
| `Profile Variant Draft` | Редактируемый provider/route-specific source | Mutable draft на диске |
| `Profile Family` | Необязательная группировка вариантов одной роли | Authoring metadata |
| `Published Revision` | Runnable package плюс frozen routing metadata и fixture refs | Immutable, versioned |
| `Catalog Routing Record Revision` | Routing index из Published Revision и immutable eval results | Generated, immutable |
| `Normalizer Revision` | TaskSpec/output schemas, rules/prompt, model/privacy policy, thresholds, routing-index set и eval hash | Immutable executable contract |
| `Normalization Proposal` | Предложенная композиция profile/skills/tools/context, confidence, risk, complexity и объяснение | Mutable до auto/user approval |
| `Routing Decision` | Фактически использованные normalizer/routing revisions, mode/source, confidence/risk/complexity и объяснение | Immutable decision evidence |
| `Approved Composition` | Принятая пользователем или policy композиция с точными revision ids | Immutable compiler input одной session/stage |
| `Effective Profile / Applied Snapshot` | Реально применённый static package плюс materialized session state | Pinned на срок сессии |

Identity:

```text
captureId
  → baselineId / sourcePackRevisionId

skillSourceRevisionId
  → publishedSkillRevisionId

baseline/source + optional publishedSkillRevisionId[]
  → familyId (optional grouping)
  → variantId / profileId (provider + route target)
  → revisionId (immutable artifact hash)
  → CatalogRoutingRecordRevision

TaskSpec + NormalizerRevision + routing records
  → NormalizationProposal
  → RoutingDecision
  → ExecutionDecision
      ├─ direct
      │    → ApprovedComposition
      │    → session AppliedSnapshot
      └─ orchestrated
           → TaskProgramRevision
           → WorkflowRunSnapshot
           → stage ApprovedComposition[]
           → stage AppliedSnapshot[]
```

Общий `Profile Family` не является универсальным runnable prompt. Клон под
другого provider/route создаёт новый variant и требует отдельную compatibility
проверку.

Routing metadata и fixture refs замораживаются при publish внутри
`Published Revision`. `CatalogRoutingRecordRevision` не редактируется отдельно:
он строится только из immutable Published Revision, immutable
`EvalResultSetRevision` и версии routing schema. Новые eval results или
изменение draft создают новую record revision, не меняя прошлые routing
decisions.

`NormalizerRevision` фиксирует исполняемый Normalizer contract. Каждый
`RoutingDecision` сохраняет `normalizerRevisionId` и
`routingRecordRevisionId`, чтобы выбор профиля можно было воспроизвести.

Для большой произвольной задачи `TaskSpec` может породить task-local plan и
несколько session-level compositions. Каждая сессия получает собственный
immutable Applied Snapshot; уже начатая сессия не расширяет skills/tools молча.
Обнаруженный capability gap возвращается оркестратору как структурированный
сигнал и при необходимости создаёт новую Approved Composition.

## 6. Формат хранения: typed author file + Native Source Packs

### 6.1 Авторский профиль

Canonical authoring source — один provider-scoped Markdown-файл:

`Profiles/<Provider>/<profileId>.md`.

- YAML frontmatter — typed envelope: identity, purpose, target, routing hints,
  tool policy, permissions, model constraint и baseline provenance.
- Всё после frontmatter — Core-managed profile body, которым author управляет
  как точным byte-preserved instruction layer. Итоговый system prompt может
  дополнительно включать exact bodies выбранных Published Skill Revisions и
  task/session contract из Approved Composition.
- Core не делает `trim`, не перестраивает Markdown по заголовкам и не пытается
  поддерживать второй скрытый prompt AST.
- Тело является byte-exact только для управляемого profile layer, а не
  обещанием точного полного wire request. Materialized system prompt также
  byte-exact и получает отдельный hash/provenance manifest.

Минимальная форма:

```yaml
---
schemaVersion: 2
id: plan-reviewer-claude
familyId: plan-reviewer
name: Plan Reviewer
description: Проверяет active plan до реализации
whenToUse: План готов и требует ревью до кодирования
whenNotToUse:
  - План ещё не сформирован
taskTypes:
  - plan-review
riskCeiling: medium
requiredCapabilities:
  - repository-read
sourceType: captured-baseline
baselineRef: claude-native-opus
captureRef: capture-2026-07-10-claude-opus
captureSourceRoute: claude-cli-native
sourceMappingVersion: claude-cli-to-sdk-v1
baselineHash: sha256:...
provider: claude
applicationRoute: claude-sdk-managed
model: opus
tools:
  mode: native-compatible
  denied:
    - Write
    - Edit
  inventoryHash: sha256:...
skills:
  pinned:
    - id: plan-review-method
      revisionId: sha256:...
permissions:
  write: forbidden
  execute: forbidden
---
Точное управляемое тело системного промпта.
```

В MVP `profileId` одновременно является `variantId`. `familyId` опционален и
только группирует родственные provider-specific варианты. Отдельное mutable
Family-хранилище не требуется.

`sourceType` является обязательным provenance discriminator:
`captured-baseline`, `clone-revision`, `session-derived`, `template`,
`description` или `blank-expert`. `captureRef/baselineRef` обязательны только
для capture-based профиля; остальные источники фиксируют собственные refs и
hashes. `captureSourceRoute` и `applicationRoute` никогда не схлопываются в
одно неоднозначное поле.

`skills.pinned` фиксирует только skills, неотъемлемые от reusable profile.
Task-specific skills Normalizer добавляет в `ApprovedComposition` без
перезаписи profile draft или Published Revision. Оба пути используют только
immutable `PublishedSkillRevision`.

### 6.2 One-way scaffold и compiler

Scaffold и compiler — разные операции:

- Scaffold один раз создаёт полный static prompt body из принятого
  `NativeSourcePackRevision`, а не из raw capture, и записывает
  `captureRef/baselineRef/baselineHash`.
- Повторное применение scaffold возможно только как явный diff.
- После сохранения файл становится истиной.
- Если hash Native baseline изменился, существующий draft/revision не
  переписывается: Studio показывает baseline diff и `Needs review` для нового
  target.
- Compiler не переписывает и не «улучшает» component bodies. Он валидирует
  target, capabilities, skill dependencies и permissions, резолвит
  tools/options и детерминированно собирает exact profile/skill/task layers в
  единый system prompt runnable artifact.
- Compiler не добавляет Native baseline поверх body повторно: baseline уже
  вошёл в него на стадии scaffold. Каждый выбранный skill/task-policy слой
  имеет отдельный provenance, фиксированный placement и появляется ровно один
  раз.

Markdown-заголовки не являются стабильными section IDs. Skill/block refs
типизированы и указывают на immutable revisions; свободная правка profile body
не должна silently расходиться с параллельным editable AST. Состав финального
prompt хранится в generated manifest, а не во втором пользовательском source.

### 6.3 Native Source Packs и runtime bundles

Нужно различать authoring input и runnable artifact:

- `ProfileSources/<Provider>/<sourcePackId>/` — принятый capture-derived
  Native Source Pack; read-only источник scaffold и сравнения;
- `SkillSources/<skillId>/<sourceRevisionId>/` — immutable imported bundle с
  provenance/license/security evidence;
- `PublishedSkills/<skillId>/<revisionId>/` — проверенный instruction body и
  dependency/eval manifest, доступный Normalizer и compiler;
- `Profiles/<Provider>/<profileId>.md` — единственный user-editable draft;
- Published Revision/runtime bundle — generated read-only результат compiler.

Для routes, которым нужны структурные sidecars, compiler сохраняет форму:

```text
PublishedRevisions/<Provider>/<revisionId>/
  system-prompt.md
  tools.json
  request-template.json
  input-prefix.json          # если применимо
  selected-skills.json
  materialization-manifest.json
```

- Source Pack и generated runtime bundle не сплющиваются насильно в один
  Markdown.
- Frozen baseline и user specialization не pre-merge-ятся до явного scaffold
  или compilation step.
- User-owned custom instructions живут в canonical `profile.md`; совместимость
  с текущими `custom-instructions.md` sidecars мигрируется отдельно.
- Каталог показывает Native Source Packs, drafts и Published Revisions
  единообразно, но честно маркирует их природу и runnable status.
- Provider payloads, manifests и published revisions не редактируются вручную.

Draft history и published revision history не должны стать двумя конкурирующими
rollback-системами: первая восстанавливает незапубликованное редактирование,
вторая — запускаемый immutable package.

## 7. Deterministic compiler

Compiler получает:

```text
canonical profile bytes
+ pinned PublishedSkillRevision bodies, если они есть в profile
+ explicit target capability fingerprint
+ resolved tool inventory
+ compiler version
```

и выдаёт:

```text
reusable managed prompt layer bytes
+ resolved tools/options
+ target fingerprint
+ source/body/skill/baseline/inventory hashes
+ provenance manifest
```

Одинаковые входы обязаны давать одинаковый artifact hash. LLM в компиляции не
участвует.

Published Revision фиксирует только reusable static contract:

1. полный managed static body, который может включать Native scaffold,
   role/workflow, reusable specialization, pinned skill instructions и
   acceptance/completion rules;
2. resolved tools/options/permissions;
3. target capability fingerprint, compiler version и provenance hashes.

Session materialization принимает `ApprovedComposition` и отдельно добавляет:

1. verbatim request и подтверждённый session-local `TaskSpec`;
2. exact bodies task-specific `PublishedSkillRevision`, ещё не pinned в
   reusable profile;
3. artifact references и Task Context Pack;
4. сформированный оркестратором Task Execution Contract: только релевантные
   архитектурные/workspace policies, а не полный `AGENTS.md`/`CLAUDE.md`;
5. live environment/date/git context.

Результат materialization — один целостный system prompt, выбранные tool
schemas/options и input пользователя в первом provider request. Основной агент
не видит descriptions остальных skills и не выполняет skill discovery.

Adapter отдельно добавляет locked wrapper, phase/tool-loop protocol и другие
adapter-owned части. Compiler не замораживает `TaskSpec` или workspace policy в
reusable revision и не добавляет Native baseline поверх body повторно.

Applied Snapshot хранит `revisionId/artifactHash`,
`approvedCompositionHash`, ids/hashes всех skill revisions, hash
подтверждённого `TaskSpec`, источники/hashes выбранных workspace-policy blocks,
live-materialization manifest и adapter-returned application details. Это
позволяет воспроизвести, что именно было применено в конкретной сессии, не
превращая dynamic truth в часть постоянного профиля.

Provider compiler/materializer/adapter выбирают placement profile, skill и
dynamic layers: system, developer, start/runtime message или native channel.
Composed mode использует типизированный manifest и правило single-placement.
Этот маршрут обязан:

- сохранять native request shape и cache boundary;
- не дублировать полный `AGENTS.md`/`CLAUDE.md` и не передавать task agent
  orchestration rules, которые уже исполняются Core/scripts;
- хранить provenance/debug metadata вне provider-facing payload;
- не позволять профилю удалить adapter-owned `commentary`, `final_answer`,
  tool loop, telemetry или completion semantics;
- честно обозначать неизвестные adapter/provider additions.

## 8. Tools, skills, plugins и permissions

### 8.1 Два tool policy

1. **`native-compatible`** — vendor set минус explicit disables.
   Подходит для parity baseline и обновления вслед за Native.
2. **`lean-pinned`** — exact allowlist, привязанный к inventory hash.
   Подходит task-specific профилям ради воспроизводимости, least privilege и
   экономии.

Published revision всегда хранит resolved tool set и inventory hash.

- Capability set execution adapter/SDK сначала обязан совпасть с полным Native
  Tool Set принятой baseline revision; профиль не используется как компенсация
  отсутствующего handler.
- Новые native tools не расширяют permissions существующей revision молча.
- Изменение inventory создаёт compatibility diff/new draft и статус
  `Needs review`.
- Для draft неизвестный tool id является warning.
- Для публикации `lean-pinned` неизвестный tool id является blocker.
- Для публикации `native-compatible` неизвестный id в `denied` также является
  blocker: его нельзя молча проигнорировать и тем самым включить capability,
  которую пользователь считал запрещённой. Нужен явный compatibility diff.
- Codex app-server может оставаться capture-only Native authority и не
  появляться в обычном session picker; CodexUC получает full-parity gate.

Task-specific набор является минимально достаточным dependency closure, а не
механическим совпадением слов запроса:

```text
Effective Tools =
  task requirements
  ∪ selected skill dependencies
  ∪ completion/verification requirements
  − explicit policy exclusions
```

Если выбранный skill или completion contract требует запрещённый tool,
composition не materialize-ится до review/clarification.

### 8.2 Skills, plugins и MCP

Skills являются третьим исходным материалом Profile Studio наряду с Native
Source Packs и user-authored specialization. Их не нужно каждый раз придумывать
заново, но внешний `SKILL.md` не становится trusted system instruction только
из-за популярности.

Design-time pipeline:

```text
Discover
  → immutable Skill Source Revision / quarantine
  → provenance + license + security review
  → compatibility и tool/runtime dependency manifest
  → positive/negative/matched evals
  → human approval
  → Published Skill Revision
```

Selection metadata (`description`, task types, stack/version compatibility,
required tools, permissions, token size и eval status) индексируется при
publication. Runtime Normalizer читает компактный versioned index, выбирает
skill ids и передаёт compiler точные immutable revisions; он не перечитывает
весь интернет-каталог и не устанавливает skills во время пользовательской
задачи.

Если skill целиком релевантен конкретному `TaskSpec`, его полный проверенный
instruction body materialize-ится в system prompt. Это предпочтительнее
дополнительного низкоприоритетного сообщения или требования основному агенту
самостоятельно прочитать `SKILL.md`. Сокращение допустимо только как отдельная
reviewed revision составного skill, а не как обязательная автоматическая
декомпозиция каждого источника.

Нужно различать:

1. **Instruction skill** — весь выбранный релевантный текст входит в system
   prompt до первого хода основного агента.
2. **References/assets** — требуемые task-specific материалы заранее входят в
   Task Context Pack либо materialized prompt; основной агент не занимается
   catalog discovery.
3. **Scripts, plugins и MCP** — остаются executable runtime dependencies с
   отдельными schemas, auth и permissions; один prompt не создаёт физический
   tool.

UI показывает provenance, exact revision/hash, license, совместимость,
required tools, auth state, permission impact, token cost и eval evidence.
Установка plugin/MCP, external data transfer и расширение
`write/execute/network/credentials` требуют явного решения пользователя.

### 8.3 `AGENTS.md` и orchestration policy

Текущий `AGENTS.md` Harness AI в основном описывает не предметный навык
конкретного task agent, а управление работой: recovery owner, plan lifecycle,
scope, ownership, quality gates, release/user-authority gates и closeout. Этот
текст не импортируется целиком в Skill Library и не добавляется каждому
основному агенту.

При миграции каждое правило получает одного владельца:

- проверяемый predicate → Core script/hook/gate;
- решение о scope, стадиях, approvals и recovery → system contract
  оркестратора;
- canonical product architecture → versioned workspace policy/reference;
- правило, релевантное текущей микрозадаче → компактный Task Execution
  Contract, скомпилированный оркестратором;
- методика выполнения типа задач → отдельный Published Skill Revision.

Поэтому session materialization использует не `AGENTS.md` как монолит, а
выбранные policy blocks с source hashes. Даже если один физический агент
временно совмещает роль оркестратора и исполнителя, модель данных сохраняет эти
authority layers раздельно.

## 9. Profile Studio

### 9.1 Profile Library

Library начинает с поиска и повторного использования:

- purpose, provider/route и model;
- `Draft / Tested / Published / Needs review / Archived`;
- revision, capability warnings и последнее тестирование;
- capture/source-pack provenance и baseline freshness;
- approximate static context и дельта против Native;
- create, duplicate, clone to provider, rename, archive и rollback;
- Native-derived Full как видимый baseline и escape hatch на выбранном
  execution route; это не означает показ capture-only CLI/app-server в session
  picker;
- empty-state CTA:
  `создать из Native baseline / из сессии / из описания / из шаблона`.

Library показывает draft и published состояния. Обычный session picker
показывает только Native и Published Revisions. Draft запускается исключительно
через `Draft test` и не может попасть в обычную сессию как будто он опубликован.

### 9.2 Skill / Instruction Library

Отдельная зона управляет source и published revisions навыков:

- discovery/search только как design-time импорт кандидатов;
- quarantine preview без runtime installation;
- repository/ref/commit SHA, content hash, author и license;
- compatibility по языку/framework/version/provider route;
- required tools, scripts, MCP/plugins и permission manifest;
- security review, matched evals и publish/revoke lifecycle;
- diff/update как новая immutable revision;
- routing descriptions и negative triggers для Normalizer;
- preview exact instruction body, который войдёт в system prompt.

Stars/downloads используются только как слабый discovery signal. Normalizer
видит только опубликованный routing index, а основной task agent — только тела
выбранных skills, уже materialized в его first request.

### 9.3 Build

Основной экран — двухпанельный редактор одного canonical файла:

- слева: source-pack/baseline selector, typed metadata —
  Purpose/description, whenToUse/routing hints, capabilities, tools,
  permissions, pinned skill revisions, provider/model и test references;
- справа: exact profile body, composed system-prompt preview, baseline/skill
  provenance, token estimate и текстовый diff.

`Workflow` и `Output/Done` доступны как scaffold templates и именованные
AI-трансформации prompt body. Они не хранятся как параллельное представление
того же текста и не обещают round-trip после свободной правки в VS Code.

Обычный режим показывает понятные capabilities. Expert mode раскрывает native
tool ids, schemas, inventory hash, block provenance, provider limits и compiled
artifact.

Authoring-действия:

1. **Создать из Native Baseline** — рекомендованный точный scaffold из
   принятого Source Pack.
2. **Создать из описания** — 1–3 фразы → draft; не более одного короткого
   пакета уточнений.
3. **Улучшить / Make Lean** — именованная трансформация или свободный
   feedback → diff против current draft и baseline.
4. **Профиль из сессии** — успешная сессия → предзаполненный draft.
5. **Добавить проверенный skill** — выбрать Published Skill Revision, увидеть
   полный materialized text, dependencies и composed-prompt diff.

Изменения metadata принимаются по полям, изменения prompt — по текстовым
hunks или целиком. AI не пишет published revision.

### 9.4 Token meter

Core показывает приблизительно:

- static profile body;
- materialized selected skill instructions;
- resolved tool schemas;
- task/workspace policy и Task Context Pack;
- plugin/MCP runtime descriptions;
- ожидаемый live-context диапазон;
- абсолютный input estimate;
- дельту против Native и предыдущей revision;
- unknown adapter/provider overhead отдельно.

Оценка всегда называется approximate, пока wire capture не доказал полную
форму запроса.

### 9.5 Preview / Inspector

Четыре уровня истины:

1. **Static Compilation** — exact profile/pinned-skill bytes/hashes,
   tools/options и target fingerprint.
2. **Session Materialization** — static package плюс task-selected skill
   revisions, Task Execution Contract, Task Context Pack и помеченный live
   context.
3. **Applied Snapshot** — что adapter сообщил Core как фактически применённое.
4. **Observed Wire** — что реально ушло provider; только из capture,
   криптографически связанного с `revisionId/draftArtifactHash` и
   `appliedSnapshotHash`.

Если capture недоступен или не связан с immutable artifact, wire state остаётся
`unverified` либо `profile-qualified diagnostic`. Friendly editor preview не
выдаётся за provider receipt.

Перед этими уровнями Inspector показывает source provenance и
`NativeSourcePackRevision → Draft/Published Revision` diff, чтобы было видно,
какие исходные инструкции и tools сохранены, изменены или удалены. Отдельный
composition diff показывает каждый materialized skill/policy block и его
placement ровно один раз.

### 9.6 Test, Evaluate и Versions

Lifecycle:

```text
Draft
  → Static validation
  → Sandbox / Draft test
  → Tested
  → Local publish
  → Deprecated / Archived
```

Каждая правка published-профиля создаёт новый draft. Старые сессии остаются
pinned к прежней revision.

## 10. Раннее наполнение каталога

Этот этап идёт до полного Studio и до Normalizer.

### 10.1 Seed variants

Начальный каталог получает четыре роли:

- `architecture_author`;
- `plan_reviewer`;
- `implementation_agent`;
- `implementation_reviewer`.

Это независимые starter profiles, а не обязательная цепочка
Architecture → Plan → Implementation для каждой задачи. В task-first режиме
обычная задача bind-ится напрямую к одному подходящему Effective Profile;
многостадийный task-local plan создаётся только по смыслу задачи или выбору
пользователя.

Сиды создаются только для routes с доказанной capability truth. Первый
практический target — Claude Agent SDK и Native-complete CodexUC. Codex
app-server остаётся Native capture authority и не обязан появляться как
пользовательский session target. Client-four подключаются после
profile-application slice и только с честным `core-authored` provenance, если
для них нет Native CLI capture.

Сид — стартовый draft, а не сертифицированный универсальный профиль. В
session picker он попадает только после static validation, `Draft test` и
явного local publish. Phase 4 публикует первые проверенные seed revisions через
минимальный publish primitive из Phase 3; полный fixture-based publish gate
добавляется в Phase 5.

### 10.2 Профиль из сессии

Это самый дешёвый путь к task-specific lean draft, но он требует:

- достоверной tool-call history;
- applied-profile и provider/route identity;
- redaction и secret scan;
- явного согласия на использование session data;
- удаления project-specific артефактов, которые нельзя переносить;
- обязательного review перед сохранением.

Одна успешная сессия не доказывает, что неиспользованные инструменты лишние.
Импорт:

- предзаполняет форму;
- помечает confidence/provenance;
- предлагает tool policy;
- ничего не отключает автоматически;
- никогда не публикует профиль сам.

### 10.3 Usage-feedback loop

Core накапливает по revision:

- попытки вызова запрещённых tools;
- реально использованные tools;
- стабильно неиспользуемые enabled tools;
- input/cache tokens;
- latency, failures и user interventions;
- completion/artifact result.

Данные создают рекомендации и новый draft diff, но не silent mutation.

## 11. AI Creator contract

AI Creator — authoring service, не compiler и не Normalizer.

- Вход ограничен текущим draft, capability registry и явно разрешёнными
  `NativeSourcePackRevision`/reference materials; raw capture по умолчанию
  недоступен.
- Выход — typed metadata proposal плюс точный text diff для prompt body.
- Модель выбирается policy `economy / standard / strong`, а не фиксированным
  vendor id.
- Local/same-provider обработка предпочтительна.
- Native captures, developer context и session artifacts не отправляются
  внешней модели автоматически.
- Перед external provider выполняются secret scan и explicit consent.
- Snapshot history позволяет отменить неудачное AI-улучшение.

## 12. Arbitrary-task preflight и Session Normalizer

`New Task` означает новую задачу, а не новый greenfield-проект. Workspace может
быть существующим, пустым, legacy или отсутствовать. До bind дорогой provider
session Normalizer получает verbatim request и read-only Workspace Fingerprint,
но не заставляет основного агента собирать собственный контекст:

Workspace Fingerprint и initial Task Context Pack строит отдельный read-only
Core `Workspace Policy / Context Resolver`. Он читает manifests, версии стека,
структуру, recognised policy/instruction files и task-relevant artifact
references, но не изменяет workspace. Для legacy/unstructured `AGENTS.md` или
аналогичного policy source применимые фрагменты передаются verbatim с
provenance либо как user-reviewed projection; неизвестное правило нельзя молча
отбросить.

```text
verbatim request + optional Workspace Fingerprint
  → TaskSpec: intent, deliverables, constraints, risk, complexity
  → task/profile/skill fit и optional clarification
  → Normalization Proposal:
       base Published Revision или Native baseline
       Published Skill Revisions
       tool dependency closure
       task/workspace policy blocks
       Task Context Pack
       provider/model policy
       proposed executionMode: direct / orchestrated
  → Auto / Review / Manual approval
  → RoutingDecision + ExecutionDecision
      ├─ direct
      │    → Approved Composition
      │    → deterministic materialization
      │    → specialist bind + immutable Applied Snapshot
      └─ orchestrated
           → TaskProgramRevision / optional pinned recipe
           → WorkflowRunSnapshot
           → Approved Composition + Applied Snapshot per stage
```

Вся discovery/selection работа завершается до первого provider request
основного агента. Он сразу получает итоговый system prompt, выбранные tools,
Task Context Pack и пользовательскую задачу; descriptions остальных skills и
подготовительный диалог в specialist context не попадают.

Preflight снижает bootstrap cost, но не обещает заранее знать каждый факт
существующего repository. Specialist сохраняет обычные выбранные read/search
tools для исследования кода и artifacts, которые проявятся уже при решении
задачи; запрещён только повторный catalog/skill discovery.

### 12.1 Что Profile Studio строит для Normalizer

Внутренняя зона `Normalizer Materials` является design-time редактором и
evaluation workbench. Runtime classification остаётся в Core.

Для profiles Studio публикует:

- `purpose`, `whenToUse`, `whenNotToUse`, `taskTypes`, `specializations`,
  `requiredCapabilities` и `riskCeiling`;
- positive, negative и ambiguous routing fixtures;
- provider/route/model compatibility, permission class, token estimate и
  immutable eval results;
- `CatalogRoutingRecordRevision`, построенный только из Published Revision.

Для skills Studio публикует:

- `SkillRoutingRecordRevision`: description, task types, domain/stack/version
  compatibility и negative triggers;
- required tools/runtime dependencies, permission impact и token size;
- security/eval status и exact `publishedSkillRevisionId`;
- positive, negative, composition и conflict fixtures.

Для deterministic composition Studio публикует:

- `ToolPolicyRevision`/Tool Bundle с exact capability ids и Native inventory
  fingerprint;
- typed policy blocks и Task Context Pack selectors;
- placement/cache rules и защиту от дублирования baseline, skill и workspace
  policy;
- разрешённые composition patterns и их eval results.

`NormalizerRevision` фиксирует:

- версии `TaskSpec`, proposal и output schemas;
- deterministic rules и/или classifier prompt;
- model cascade, privacy policy и complexity policy;
- confidence/risk/auto-review thresholds и fallback policy;
- точные sets profile, skill, tool и policy routing-record revisions;
- routing/composition fixture и eval hashes.

Normalizer читает только эти versioned indices. Он не читает raw capture,
mutable drafts, случайные internet skills или весь repository. Полные bodies
выбранных revisions раскрывает deterministic compiler после routing decision.
Любой материал из capture, внешнего skill, profile или session становится
доступным только после human promotion, secret/security checks и eval.

### 12.2 Complexity, model routing и user control

`task fit`, `risk`, `complexity` и `normalization mode` являются независимыми
осями:

- task fit отвечает, какие profile/skills нужны;
- risk/permissions определяют approvals и hard gates;
- complexity выбирает мощность модели, reasoning/budget и возможную
  декомпозицию;
- normalization mode определяет, кто подтверждает composition.

Complexity нельзя определять длиной запроса. Учитываются scope, неоднозначность,
cross-domain coupling, новизна, количество artifacts/sessions, архитектурный и
security impact. Большая механическая миграция может быть простой, а короткая
задача авторизации — сложной.

Model cascade:

```text
deterministic workspace preflight
  → Manual: classifier не вызывается
  → deterministic-only: остановиться после rules/index match
  → Review/Auto при разрешённой classifier policy:
       cheap classifier/selector
       → confidence + risk gate
       → strong normalizer и/или review model только при необходимости
```

Режимы запуска:

1. **Auto** — proposal bind-ится автоматически только при высокой confidence,
   полной compatibility и если composition остаётся внутри заранее
   авторизованного user/host/provider permission-and-risk envelope; иначе режим
   деградирует в Review.
2. **Review** — Normalizer предлагает composition, пользователь может изменить
   profile, skills, tools, model, context и instructions до bind.
3. **Manual** — пользователь сам собирает composition или начинает с Native;
   classifier не вызывается. Core записывает
   `NormalizationProposal(source=manual)` и
   `RoutingDecision(source=manual, routingRecordIds=[])`, затем выполняет тот же
   compatibility/dependency/permission/risk validation и final preview.

Любое изменение Auto proposal в Review/Manual повторно проходит validation
перед созданием `ApprovedComposition`. Пользователь может изменить soft routing
choice, но не обойти отсутствующий handler, host policy или невыданное
разрешение.

Manual и Review позволяют увидеть полный composed system prompt, причины
включения/исключения материалов, dependencies, token estimate и diff против
proposal/Native baseline. Raw edit сохраняется как отдельный user-authored
override с hash/provenance, а не меняет исходные published revisions.

Privacy/classifier policy (`deterministic-only`, `local/same-provider`,
`external-with-consent`) не смешивается с режимом Auto/Review/Manual.

### 12.3 Reuse, composition и большие задачи

Reuse-first остаётся первым быстрым путём: точный Published Profile применяется
без искусственной пересборки. Если готового варианта нет, Normalizer предлагает
точные approved revision ids, а Profile Compiler/Materializer создаёт
task-specific Effective Profile. Ephemeral composition получает manifest/hash,
проходит tool/dependency/permission validation и не загрязняет каталог. `Save
as profile` после успешной сессии — отдельное явное действие.

Для большой задачи `TaskSpec` может стать входом task-local plan с несколькими
микрозадачами. Оркестратор определяет стадии, gates и artifact handoffs, а для
каждой стадии вызывает тот же Profile Compiler/Materializer с узким
session-level `ApprovedComposition`. Compiler, а не оркестратор, создаёт system
prompt/tools и immutable Applied Snapshot. Следующей стадии передаются только
объявленные artifacts/results.

Детерминированные workflow recipes из Code AI Hub могут ускорять известные
классы работ, но остаются опциональными. Отсутствие recipe не блокирует прямую
задачу, а Normalizer не превращает каждый request в обязательную цепочку
Architecture → Plan → Implementation.

## 13. Проверка качества

### 13.1 Capture acceptance

- доказано, что захвачен нужный sent-upstream request, а не background/prewarm
  frame;
- provider, selected/actual model, route и capture mode совпадают;
- присутствуют ожидаемые prompt/tools/developer sections;
- raw JSONL остаётся canonical evidence, Markdown — только projection;
- artifacts помечены sensitive, headers redacted, hashes сохранены;
- capture не передаётся AI или внешнему сервису автоматически.

### 13.2 Baseline promotion

- static/live/workspace/adapter-owned классификация завершена;
- task messages, probe, cwd, paths, dates, git/environment и secrets исключены;
- provider-specific request-parameter allowlist применён;
- source JSON pointers, exclusions и hashes записаны;
- показан diff с предыдущей baseline revision;
- пользователь явно выбрал `Accept as Baseline`.

### 13.3 Draft и publish gate

Минимальный publish gate:

- static schema и capability compatibility;
- для skill: pinned source revision/hash, license, security review,
  compatibility и complete dependency manifest;
- positive, ambiguous и negative fixtures;
- matched skill-vs-no-skill и composition/conflict fixtures;
- permission/write/execute/network cases;
- completion discipline и требуемые artifacts;
- tool-selection accuracy;
- input/cache tokens, latency, tool calls, interventions и failures;
- Native/Parity/Lean на одинаковых fixtures;
- несколько matched повторов перед выводом о качестве или экономии.

### 13.4 Routing и normalization gate

- profile/skill routing records построены только для Published Revisions;
- `whenToUse` и `whenNotToUse` заполнены;
- positive, negative и ambiguous fixtures имеют ожидаемый outcome;
- проверены profile-only reuse и composed Effective Profile paths;
- capability/risk/permission compatibility проверена;
- low confidence и unsupported target ведут в clarification или Native;
- Auto/Review/Manual и complexity/model routing имеют отдельные fixtures;
- routing errors и user overrides доступны для regression review;
- `NormalizerRevision` проходит routing eval как единый executable contract;
- `RoutingDecision` сохраняет normalizer и все использованные routing-record
  revision ids.

AI может предложить стартовые tests, но не является единственным автором и
судьёй eval suite. Failed real runs попадают в regression corpus только после
review.

CodexUC результат около 27k против 45k токенов остаётся feasibility evidence,
а не общим доказательством превосходства lean-профилей.

## 14. Поэтапная дорожная карта

### Phase 0 — Единая вкладка Profile Studio

- Переименовать Settings-tab `Profile Creator` в `Profile Studio`.
- Перенести существующую `Native Request Capture` card из `General`.
- Добавить внутренние зоны `Native Sources / Skills & Instructions / Profiles /
  Build / Inspect & Evaluate / Normalizer Materials`.
- Сохранить раздельное Core ownership и подключить существующие RPC/read models
  через единый UI facade.

**Результат:** Capture и создание профиля становятся одним видимым workflow,
при этом UI не получает business truth.

### Phase 1 — Native Source Foundation

- Capture History с raw/diagnostics/readable artifacts и sensitivity status.
- Core importer читает raw JSONL, извлекает source sections и выполняет secret
  scan.
- Static/live/workspace/adapter-owned классификация Developer Context.
- `NativeSourcePackRevision`, source map, provenance и baseline registry.
- `Accept as Baseline`, diff с предыдущим baseline и
  `Create Profile from Baseline`.
- Provider-specific маркировка `captured-native / managed-observed-wire /
  core-authored`; термин Native запрещён без CLI-derived source.

**Результат:** для поддерживаемых targets существуют проверенные исходные
формулировки, tool schemas и developer materials, из которых можно строить
профиль.

### Phase 2 — Truth foundation и profile application

- Повторно проверить актуальные adapter routes без доверия к старым line refs.
- Ввести capability matrix/fingerprint и applied-details contract.
- Устранить подтверждённые silent no-op либо честно отключить controls.
- Зафиксировать Claude CLI → Claude Agent SDK и
  Codex CLI/app-server → CodexUC как source→execution contracts.
- Довести CodexUC adapter до полного Native Tool Set принятой baseline
  revision; missing tool является parity blocker, а не поводом урезать profile.
- Добавить достоверные tool-call, inventory и applied-state telemetry.
- Использовать revision-bound managed capture как Observed Wire verification:
  текущий CodexUC path доработать с mutable `profileId` до
  `revisionId/artifactHash`; для Claude/Codex оставить `unverified` до появления
  соответствующих managed capture routes.

**Результат:** Studio знает не только что было захвачено, но и что конкретный
route способен применить.

### Phase 3 — Authoring и compiler contract

- Typed `profile.md` с opaque byte-exact body, обязательным `sourceType` и
  source-specific provenance; `captureRef/baselineRef` — для capture-based
  drafts.
- Provider/route-specific variant identity и routing metadata.
- Native Source Pack / native bundle boundary.
- Deterministic compiler, manifest и artifact hashes.
- `native-compatible` и `lean-pinned` tool policies.
- Pinned `PublishedSkillRevision`, typed plugin/MCP dependencies и
  deterministic composed-system-prompt manifest.
- `ApprovedComposition` и skill/policy hashes в Applied Snapshot.
- Immutable published revision и session snapshot contract.
- Минимальный local publish/rollback primitive для первых seed revisions.

**Результат:** Studio создаёт воспроизводимый draft из реального baseline и
компилирует его под доказанный capability fingerprint.

### Phase 4 — Раннее наполнение каталога и Skill Library

- Provider-specific seed roles, scaffolded из подходящих Source Packs.
- Catalog cards, Native baselines и provenance.
- Review, `Draft test` и explicit local publish первых seed revisions.
- Tool-call history, redaction и secret scan.
- `Профиль из сессии` с предзаполнением и review.
- Token meter и initial usage-feedback.
- Skill Source quarantine с repository/ref/hash/license provenance.
- Security/compatibility/dependency review и первые
  `PublishedSkillRevision` с matched evals.
- Versioned profile/skill routing metadata до runtime Normalizer.

**Результат:** до запуска Normalizer существуют runnable profiles и
проверенные skills, из которых можно безопасно собрать Effective Profile.

### Phase 5 — Build, Inspector, Evaluate и AI assist

- Profile Library + Skill/Instruction Library + form-first Build.
- Inventory controls, permission display и typed capability controls.
- Создать из Native / описания / сессии; Improve / Make Lean.
- Semantic diff, draft history и Edit in VS Code.
- Composed system-prompt preview с полными selected skill bodies,
  dependencies и single-placement provenance.
- Four-level preview и Native ↔ Managed Capture Workbench.
- Sandbox fixtures, metrics, revisions, rollback и `Needs review`.
- Provider cloning с compatibility test.

**Результат:** пользователь видит путь от Native evidence до published revision
и может доказать реальное применение на wire.

### Phase 6 — Arbitrary-task preflight и task-first Normalizer

- Verbatim arbitrary request и optional read-only Workspace Fingerprint как
  обязательный entry contract; новый task не означает новый project.
- `TaskSpec`, `NormalizationProposal` и `ApprovedComposition` schemas.
- Versioned profile, skill, tool и policy routing records только из frozen
  Published Revisions и immutable eval-result sets.
- Reuse-first exact-profile path и composition из approved revisions.
- Positive/negative/ambiguous routing и composition fixtures.
- Matched Native/Parity/Lean benchmarks, routing errors и user overrides.
- Auto/Review/Manual modes, confidence/risk calibration, privacy/model policy
  и Native fallback.
- В первом slice `complexityClass` только записывается: используется
  deterministic/fixed configured normalizer, Review является default, а Auto
  разрешён только для точного high-confidence deterministic reuse.
- `NormalizerRevision` с TaskSpec/output schemas, rules/prompt, thresholds,
  routing-index set и eval hash.
- Deterministic materialization полного system prompt, tools и Task Context Pack
  до первого provider request основного агента.

**Результат:** любая поддерживаемая задача получает релевантный Effective
Profile без обязательного greenfield workflow и без runtime skill discovery
основным агентом.

### Phase 7 — Complexity routing и большие task-local программы

- Multi-factor complexity policy и model cascade от deterministic/cheap к
  strong/reviewer normalization.
- `ExecutionDecision direct/orchestrated`, `TaskProgramRevision` и
  `WorkflowRunSnapshot`; direct path не создаёт фиктивный workflow state.
- Task-local plan для больших произвольных задач и отдельная
  session-level composition для каждой микрозадачи.
- Structured `profile_capability_gap` вместо silent runtime skill/tool loading.
- Optional deterministic task recipes из Code AI Hub без обязательного
  workflow-first entry.
- Cache/economy comparison profile reuse против composed Effective Profile.
- Explicit `Save as profile draft` после успешной сессии.

**Результат:** сложность Normalizer масштабируется по реальной задаче, а
многостадийная работа не превращает один system prompt в контекст обо всём
проекте.

## 15. Критерии готовности системы

- Каждый показанный control соответствует проверенной capability truth.
- Profile Studio показывает полный source-to-profile flow в одной
  Settings-вкладке.
- Каждый Capture помечен sensitive и честно сообщает, дошёл ли probe до
  provider.
- Native baseline создаётся только из Native CLI provider family; managed
  SDK/Universal Client capture никогда не переименовывается в Native source.
- Claude Agent SDK и CodexUC предоставляют полный tool capability set своей
  принятой Native baseline revision до task-specific исключений.
- Published revision имеет typed `sourceType` и полный source-specific
  provenance; capture-based revision дополнительно имеет
  `captureRef/baselineRef` и source map до raw evidence.
- Workspace, session, date/git/environment и diagnostic probe не заморожены в
  reusable Native Source Pack.
- Canonical draft имеет одного владельца и одну on-disk serialization.
- Published revision воспроизводима по fingerprint, compiler version и hashes.
- Published Skill Revision имеет source hash/license/security/eval provenance и
  полный dependency manifest.
- Новый tool или permission не появляется в старой revision молча.
- Preview не смешивает compiled, materialized, applied и observed truth.
- Каталог profiles и Skill Library полезны и наполнены до запуска Normalizer.
- Normalizer читает только versioned profile/skill/tool/policy routing sets
  своей `NormalizerRevision`, построенные из Published Revisions и immutable
  eval results, а не raw capture, internet sources или mutable drafts.
- Основной агент получает selected skill bodies, tools, Task Context Pack и
  задачу в первом provider request и не выполняет catalog discovery.
- Auto/Review/Manual приводят к одной `ApprovedComposition` и одному
  deterministic materialization contract.
- Произвольная задача в существующем workspace не требует greenfield workflow;
  task recipe или multi-session plan остаются опциональными.
- `ExecutionDecision=direct` не создаёт фиктивный `WorkflowRunSnapshot`;
  orchestrated path pin-ит `TaskProgramRevision`, а каждая stage использует
  обычный Profile Compiler и собственный Applied Snapshot.
- Normalizer предлагает revision ids, Orchestrator владеет только
  stages/gates/handoffs, Compiler/Materializer единолично собирает provider
  package.
- Полный `AGENTS.md` не копируется task agent: scripts/Core исполняют gates,
  оркестратор передаёт только релевантный Task Execution Contract.
- AI Creator и Normalizer не меняют и не публикуют профиль без подтверждения.
- Старые сессии воспроизводятся из immutable applied snapshot.
- Sensitive content не уходит внешней модели без secret scan и consent.
- Экономические выводы основаны на нескольких matched runs.
- Native fallback доступен на любом неподдерживаемом или небезопасном пути.

## 16. Что сознательно не строим

- Chat-only Creator, владеющий профилем.
- UI-only профили без canonical файла.
- Автоматическое превращение raw capture в профиль без curation/review.
- Машинный импорт из readable Markdown вместо canonical raw request.
- Копирование Developer Context целиком вместе с workspace/session данными.
- Runtime skill discovery основным агентом, чтение им каталога descriptions или
  установка internet skill во время задачи.
- Обязательное сокращение каждого полностью релевантного skill перед включением
  в system prompt.
- Публикацию внешнего skill без provenance/license/security/eval review.
- Копирование полного `AGENTS.md` в каждый task-agent prompt вместо
  scripts/orchestrator/task-specific policy.
- Silent tool/prompt controls.
- Представление отсутствующего Native tool handler как нормального ограничения
  CodexUC profile вместо parity defect.
- Универсальный runnable prompt для всех providers/routes.
- Обязательный greenfield lifecycle или выбор workflow до ввода произвольной
  задачи.
- Фиктивный one-step `WorkflowRunSnapshot` для обычного direct task.
- Workflow Orchestrator, который самостоятельно собирает system prompt/tools,
  вместо вызова штатного Profile Compiler/Materializer.
- Автоматическую Architecture → Plan → Implementation цепочку только из-за
  большого scope или пустого workspace.
- Постоянный новый профиль на каждый запрос Normalizer.
- Автоматическое отключение tools по одному успешному запуску.
- Дублирующий session runtime внутри Studio.
- Prompt-section parser, основанный только на Markdown-заголовках.
- Передачу native captures внешней модели по умолчанию.
- Смешивание `provider-network-capture` и `session-profiles` в один Core-модуль
  только потому, что их UI находится в одной вкладке.
- Изменение adapter-owned phase/completion semantics из профиля.
- Visual multi-agent canvas до matched evidence пользы multi-agent workflow.

## 17. Оставшиеся решения перед implementation plan

1. Какие два execution routes входят в первый runnable slice: рекомендация —
   Claude Agent SDK + Native-complete CodexUC; Native sources для них — Claude
   CLI и Codex CLI/app-server соответственно.
2. Конкретная внутренняя навигация одной Settings-вкладки Profile Studio и
   границы первого UI slice.
3. Schema/расположение `NativeSourcePackRevision`, `SkillSourceRevision`,
   `PublishedSkillRevision`, generated revisions и retention draft history.
4. Нужен ли для baseline promotion один проверенный capture или повторная
   matched-пара для отделения static частей от случайного runtime content.
5. Хранение, retention и дополнительная защита sensitive raw captures и Source
   Packs.
6. Правила совместимости source→target mapping и capability fingerprint, чтобы
   cross-route перенос оставался доказуемым, а любое patch-обновление
   клиента не создавало лишний `Needs review`.
7. Privacy default для AI Creator: рекомендация — Local/Same-provider, external
   только по explicit consent.
8. Численные publish/routing thresholds после первых matched fixtures.
9. Когда `Auto` может стать default mode: только после измеренного уровня
   routing/composition errors и user overrides; task preflight и Manual/Review
   доступны с первого Normalizer slice.
10. Первый curated skill corpus, license policy и matched fixtures, которые
    докажут пользу full-skill system-prompt materialization.
11. Минимальный `WorkspaceFingerprint` и complexity/model-routing thresholds
    без превращения Normalizer в второго общего агента.
12. UX structured manual composition и граница expert raw override.
13. Подтвердить продуктовый выбор: Codex app-server остаётся capture-only и
    исключается из обычного session picker после полной CodexUC parity.
14. Минимальные schemas `ExecutionDecision`, `TaskProgramRevision` и
    `WorkflowRunSnapshot`, не превращающие optional task-local orchestration в
    обязательный Code AI Hub lifecycle.

## Итоговая продуктовая формула

**Profile Studio — единая Settings-вкладка, где Native Request Capture только
через CLI соответствующего provider family даёт фактические system prompts,
полный Native Tool Set и developer context; Skill Library превращает
проверенные внешние и внутренние методики в immutable Published Skill
Revisions; Profiles добавляют reusable role/task specialization. Execution SDK
или adapter обязан владеть полным Native capability set, после чего profile
только исключает ненужное.**

**Harness AI остаётся task-first системой. Session Normalizer принимает любую
задачу и optional existing workspace, выбирает готовый профиль либо собирает
Effective Profile только из approved revisions, а deterministic materializer до
первого хода основного агента создаёт единый system prompt, минимально
достаточные tools, Task Context Pack и immutable Applied Snapshot. Пользователь
может принять предложение автоматически, проверить и изменить его либо целиком
взять нормализацию на себя.**

```text
Native CLI Capture
  + approved profile specialization
  + full relevant Published Skill Revisions
  + task/workspace policy selected by orchestrator
  + minimal sufficient Native tool subset
  + verbatim task and Task Context Pack
  → one materialized first provider request
  → specialist agent starts useful work immediately
```

Детерминированные workflows Code AI Hub остаются опциональными task recipes для
известных классов работ и не превращают Harness AI в систему, требующую начать
проект с нуля.

Это сохраняет практичность Fable-5 без потери архитектурной честности GPT-5.6.
