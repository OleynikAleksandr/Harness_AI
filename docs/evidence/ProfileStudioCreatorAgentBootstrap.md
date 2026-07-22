# Profile Studio Creator Agent Bootstrap: implementation planning

Статус: согласованный planning source для следующего implementation slice.

Дата: 21 июля 2026 года.

## 1. Цель среза

После следующей package-сборки пользователь должен иметь возможность:

1. открыть Profile Studio;
2. выбрать provider и model создаваемого профиля;
3. нажать `Создать профиль`;
4. дождаться автоматического свежего Native Request Capture для выбранной
   цели;
5. увидеть созданную и выбранную обычную creator session;
6. увидеть первое Core-generated сообщение с точной ссылкой на raw Capture;
7. получить первый ответ Codex Profile Creator Agent, который работает с
   полностью собранным системным профилем и начинает интервью о назначении
   будущего профиля.

Срез не считается готовым, если пользователь должен вручную открывать
Settings, запускать Capture, искать артефакт, копировать путь, самостоятельно
отправлять первое сообщение или объяснять агенту последовательность работы.

## 2. Подтверждённые решения

### 2.1 Core автоматизирует только механические операции

Весь детерминированный workflow принадлежит Core:

- разрешение выбранного target provider/model и Capture reasoning;
- разрешение default Creator Agent из system settings;
- проверка существования и целостности составного Creator Agent profile;
- запуск Native Request Capture;
- проверка завершённости Capture, target identity, containment и hash;
- создание и привязка Draft/creator session;
- формирование и отправка первого user-role сообщения;
- сохранение session history и восстановление Studio после перезапуска;
- проверка structured output и атомарная запись target profile documents.

Creator Agent выполняет только смысловую работу:

- исследует raw Native Request Capture;
- определяет Native System Prompt, Tool Declarations, developer/runtime и
  request context независимо от конкретных имён JSON-полей;
- проводит интервью;
- сокращает Native System Prompt под назначение будущего агента;
- пишет Custom Instructions;
- формирует provider-appropriate tooling representation;
- объясняет решения и предлагает ручные проверки.

### 2.2 Raw JSONL является единственным Capture source of truth

Authoritative donor:

`~/.harness-ai/logs/native-request-capture/*-native-request.jsonl`

Core не создаёт `system-prompt.md` и `tools.json` путём эвристического
парсинга Capture до первого смыслового результата Creator Agent. Markdown и
diagnostics артефакты Native Request Capture могут продолжать создаваться для
чтения человеком и диагностики, но они не являются donor input агента.

В терминах profile authoring raw JSONL является единственным автоматически
сформированным содержательным исходным документом. Core может сохранять
необходимый lifecycle passport или пустую Draft-оболочку для устойчивой
profile/session identity, но не синтезирует в неё Native Prompt, Custom
Instructions или Tooling.

### 2.3 Creator Agent profile отделён от target profile

Default Creator Agent определяется редкой system setting:

- provider: `codex`;
- model: `gpt-5.6-sol`;
- reasoning: `high`;
- display label: `Codex Profile Creator Agent`.

Target provider/model выбираются в Profile Studio при каждом создании профиля
и не меняют execution identity Creator Agent.

Составной профиль первого Creator Agent находится в:

`~/.harness-ai/ProfileStudio/CreatorAgents/Codex/`

и включает:

- `system-prompt.md` — свежая Native Codex foundation;
- `custom-instructions.md` — полный стабильный Profile Creator workflow;
- `tools.json` — захваченный Codex Native Tooling как readable/declarative
  truth для фиксированного app-server tool registry;
- `initial-user-message.md` — читаемый шаблон первого динамического сообщения.

Core собирает effective Creator Agent system prompt в фиксированном порядке:

1. `system-prompt.md`;
2. `custom-instructions.md`;
3. Core-generated custom directive с точным языком общения из system Settings
   `general.localization.categories.systemFeedback`, с fallback на
   `defaultLanguage`.

Директива требует использовать выбранный язык во всех вопросах интервью,
объяснениях, summary и approval request независимо от английского языка
статических инструкций или первого Core assignment.

Первое user-role сообщение не включается в system prompt. Оно рендерится Core
из отдельного шаблона для конкретного Draft/Capture.

Для Codex `tools.json` не является заменой или подмножеством native tools.
App-server tooling остаётся фиксированным; документ служит декларативным
описанием и provenance-контролем. Core не заявляет, что подменил инструменты.

## 3. Create Profile workflow

### 3.1 Preflight

После raw intent `Создать профиль` Core:

1. валидирует target provider/model;
2. разрешает default Creator Agent provider из settings;
3. разрешает фиксированные model/reasoning Creator Agent;
4. загружает четыре Creator Agent profile components;
5. проверяет, что prompt parts и initial-message template не пусты, а
   `tools.json` является валидным JSON;
6. формирует effective Creator Agent system prompt без AGENTS/Skills/project
   settings wrapper и добавляет Core-owned communication-language directive.

Отсутствующий или повреждённый Creator Agent profile останавливает workflow
до Capture и возвращает одно понятное Core-сообщение. Renderer не ищет файлы и
не создаёт fallback prompt.

### 3.2 Fresh Native Request Capture

Core запускает существующий provider-native Capture path для target, а не для
Creator Agent:

- `claude` target → Claude Native Capture;
- `codex` target → Codex Native Capture;
- `kimi-client` target → диагностический Kimi CLI Capture channel `kimi`.

Reasoning берётся из точного выбора, когда он присутствует в Create intent,
либо из уже существующего Core-owned provider/model setting. Renderer не
вычисляет provider default.

Успешный bootstrap требует:

- завершённый Capture;
- raw `.jsonl` внутри HARNESS_AI_HOME-aware Capture root;
- совпадающий provider/model;
- непустой captured request или поддержанный Kimi applied envelope;
- capture id;
- SHA-256 raw JSONL.

Неизвестная структура request body не является ошибкой Core bootstrap: её
семантически исследует агент. Ошибкой являются только отсутствие Capture,
незавершённый Capture, target mismatch, containment violation или
нечитаемый/невалидный JSONL.

### 3.3 Draft и creator session

Только после успешного preflight и Capture Core:

1. фиксирует immutable profile id и creator session id;
2. сохраняет Draft lifecycle binding;
3. создаёт creator session на default Creator Agent provider/model/reasoning;
4. сохраняет target provider/model как authoring context этой session;
5. активирует session в стандартном Session Surface;
6. автоматически публикует и dispatch-ит первое user-role сообщение.

Если provider dispatch Creator Agent завершился ошибкой, Draft и первое
сообщение не исчезают. Ошибка показывается в обычном session interface, а
Studio сохраняет выбранный profile/session для повторного входа.

## 4. Первое Core-generated сообщение

Сообщение должно содержать только динамические факты и стартовое задание:

- target provider;
- target model;
- target reasoning, если применимо;
- profile id;
- capture id;
- абсолютный raw JSONL path;
- SHA-256 raw JSONL;
- факт отсутствия готовых target prompt/tool documents;
- команду исследовать Capture по системным инструкциям и начать интервью.

Предлагаемый читаемый шаблон:

```text
We are creating a new Harness AI Custom Profile.

Target provider: {{targetProviderId}}
Target model: {{targetModelId}}
Target reasoning: {{targetReasoning}}
Profile ID: {{profileId}}

Core completed a fresh Native Request Capture.
Capture ID: {{captureId}}
Raw JSONL: {{rawCapturePath}}
Raw JSONL SHA-256: {{rawCaptureSha256}}

No target System Prompt, Custom Instructions, or Tooling has been authored yet.
Read and analyze only the exact raw Capture above according to your system
instructions, then begin the purpose interview with the user.
```

Путь формируется только Core и уже прошёл containment validation. Агент не
просит пользователя выбрать файл или повторить Capture. Сообщение хранится в
обычной append-only session history и после восстановления отображается как
первое user message.

## 5. Контракт semantic Capture analysis

`custom-instructions.md` должен явно отказаться от зависимости от стабильных
JSON labels. Агент исследует роли, порядок, содержимое и структурные связи.

Он должен различать:

- Native System Prompt или несколько system-level blocks;
- developer/host context, включая permissions, skills, plugins и runtime
  policy;
- user/request context;
- Tool Declarations: names, descriptions, schemas и namespace composition;
- tool choice, parallel-tool и другие tool configuration parameters;
- model/reasoning/cache/stream request parameters;
- applied Harness/profile envelope и provider diagnostics;
- дублирующий serialized `bodyText` и уже разобранный `body`;
- несколько requests в одном Capture.

Обязательные риски и правила:

1. Provider и его CLI/SDK могут менять field names и nesting.
2. System Prompt может быть string, array или набором typed blocks.
3. Наивысшие инструкции могут приходить с ролью `developer`, а не `system`.
4. Tool declarations могут находиться вне top-level `tools`.
5. Capture может содержать dynamic host instructions, которые не являются
   частью Native foundation будущего профиля.
6. Typed block metadata нельзя молча терять.
7. Request context нельзя принять за Native Prompt.
8. Отсутствующий или неоднозначный Prompt/Tooling нельзя заменять пустым или
   выдуманным содержимым.
9. Markdown Capture не исправляет и не переопределяет raw JSONL.
10. Агент обязан сообщить конкретный blocker, если семантическое разделение
    нельзя обосновать.

Агент может читать только raw Capture path, переданный Core для текущего
Draft. Он не сканирует соседние Capture, profiles, workspace instructions или
произвольные пользовательские файлы и не пишет profile documents напрямую.

## 6. Provider-specific authoring

### 6.1 Claude target

- Native Capture является prompt/tool donor.
- Агент извлекает Native Prompt, сокращает его под назначение профиля и пишет
  Custom Instructions.
- Агент выбирает только полные Native tool declarations, необходимые
  согласованным задачам.
- Core проверяет, что выбранные tool names действительно присутствуют в raw
  donor Capture.
- `tools.json` имеет runtime effect через существующий Claude subset path.

### 6.2 Codex target

- Агент извлекает и сокращает Native System Prompt.
- Полный захваченный app-server Tooling сохраняется для чтения и provenance.
- Tooling имеет режим `codex-fixed` и `runtimeEffect: declarative-only`.
- Core не заявляет структурную замену или сокращение Codex tools.
- Ненужное использование фиксированных tools ограничивается инструкциями в
  Custom System Prompt, а не вымышленным tool subset.
- Текущий `codex-fixed/tools: null` authoring contract должен быть расширен,
  чтобы хранить реальную декларативную inventory без её runtime application.

### 6.3 Kimi target

- Native Kimi CLI Capture является donor Native behavior.
- Custom Profile исполняется universal client, а не native ACP session.
- Core дополнительно предоставляет фактический executable universal-client
  tool catalog.
- Агент не переносит Native Kimi tool, отсутствующий в universal executor.
- До достижения необходимой executor parity профиль остаётся честным Draft и
  не получает `Valid`.

## 7. Structured output и persistence

После интервью и анализа агент возвращает полный structured Draft snapshot,
а не shell/file operations и не свободный patch. Snapshot содержит:

- name, description и purpose;
- reduced Native `systemPrompt`;
- `customInstructions`;
- provider-appropriate tooling representation;
- raw Capture donor path;
- capture id/hash provenance;
- краткое user-facing объяснение следующего шага.

Core проверяет snapshot и атомарно записывает target profile documents:

- `profile.yaml`;
- `system-prompt.md`;
- `custom-instructions.md`;
- `tools.json`.

До этого момента пустая lifecycle shell не считается сформированным профилем.
Агент никогда не присваивает `Valid`; manual behavioral validation и approval
точного content hash остаются user-owned.

Custom Capture conformity остаётся отдельным следующим runtime capability.
Текущий bootstrap/package slice не должен притворяться, что эта функция уже
реализована. Creator Agent может довести профиль до полного Draft и предложить
manual tests; автоматический Custom Capture добавляется отдельным последующим
срезом.

## 8. Module ownership

### Новый Core module: `profile-studio-creator-profile`

Public class facade владеет:

- HARNESS_AI_HOME-aware разрешением Creator Agent directory;
- чтением и проверкой четырёх profile components;
- сборкой двухчастного system prompt;
- рендером `initial-user-message.md` только из Core-supplied values;
- декларативной проверкой `tools.json`;
- отсутствием fallback на inline prompt или ambient instructions.

### Новый Core module: `profile-studio-creator-bootstrap`

Public class facade владеет:

- Capture-first create workflow state;
- проверкой raw Capture containment/completion/identity;
- вычислением capture hash;
- immutable bootstrap result для lifecycle/session composition;
- структурированными preflight/capture errors.

### Существующие owners

- `provider-network-capture` продолжает владеть фактическим Capture и raw
  artifacts.
- `profile-studio-agent` владеет Creator Agent turn/output contract, но
  получает составной профиль через новый facade.
- `profile-studio-lifecycle` владеет Draft identity/status/approval.
- `profile-studio-authoring` валидирует и применяет полный agent snapshot.
- `session-runtime` создаёт/восстанавливает стандартную creator session и
  dispatch-ит Core-generated first message.
- `core-runtime-process` только композирует facades в одном typed RPC.
- Application Shell передаёт Create intent и отображает pending/result/error;
  он не запускает Capture и не строит сообщения.

## 9. Failure contract

Create workflow завершается структурированной ошибкой и не запускает
неподготовленного агента, если:

- Creator Agent profile отсутствует или повреждён;
- target Capture не поддерживается или не завершился;
- raw path выходит за Capture root;
- provider/model Capture не совпадает с target;
- raw JSONL отсутствует, пуст или не читается;
- initial message не может быть отрендерено без всех обязательных значений;
- creator session не может быть создана.

Уже созданная session не удаляется из UI из-за provider auth/runtime ошибки
первого turn. Повторное открытие Studio восстанавливает точный Draft/session и
первое сообщение.

## 10. Verification

### Automated tests

- Creator Agent profile resolution under default and overridden
  `HARNESS_AI_HOME`.
- Missing/empty/malformed component rejection.
- Exact system prompt composition order.
- Initial message escaping and required-placeholder validation.
- Creator provider/model/reasoning remain independent from target identity.
- Claude/Codex/Kimi target → correct Capture channel mapping.
- Capture containment, completion, target match and SHA-256.
- No creator session and no first dispatch after failed Capture.
- One successful create produces exactly one creator session and one initial
  user message.
- First message survives session restore without duplicate dispatch.
- Codex fixed tool inventory persists declaratively and is not applied as a
  replacement.
- A Codex turn carrying `outputSchema` is projected as one normalized
  `structured_output`: the visible Creator message contains only decoded
  `assistantResponse`, uses real paragraph/list line breaks and contains no
  serialized `draft` / `nextAction` envelope.
- Existing Draft deletion and Studio leave/re-entry remain healthy.

### Package acceptance

На rebuilt macOS package пользователь:

1. выбирает target provider/model;
2. нажимает `Создать профиль` один раз;
3. видит понятное состояние подготовки, пока идёт Capture;
4. получает выбранный Draft и стандартный session interface;
5. видит первое user message с точным raw JSONL path/capture id/hash;
6. получает первый ответ `Codex Profile Creator Agent` на
   `gpt-5.6-sol/high`;
7. видит только читаемый `assistantResponse` с нормальными переносами строк,
   без JSON-обёртки `assistantResponse` / `draft` / `nextAction`;
8. убеждается, что агент исследовал Capture и начал интервью, не потребовав
   ручного Capture или выбора файла;
9. выходит из Studio, возвращается и видит ту же session/history;
10. подтверждает, что удаление Draft по-прежнему удаляет связанную session.

## 11. Вне текущего среза

- автоматический Custom Capture и repair loop;
- benchmark и автоматическая behavioral validation;
- автоматическое обновление существующих profiles после provider upgrade;
- универсальный semantic JSONL parser в Core;
- дополнительные Creator Agent providers;
- самостоятельное ручное редактирование profile documents пользователем;
- Normalizer и автоматический выбор target profile для обычной session.

## 12. Definition of Done

Срез готов к пользовательскому тестированию, когда Create Profile без ручных
промежуточных действий создаёт fresh target Capture, запускает отдельно
выбранного Codex Creator Agent с составным system prompt, сохраняет и
показывает первое Core-generated user message, получает первый provider turn
и сохраняет весь workflow после leave/re-entry в rebuilt package.
