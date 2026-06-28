# Harness AI Agent Instructions

Это главная директива для разработки Harness AI. Следуй ей при старте каждой новой сессии из этого workspace.

## 0. Язык И Режим Работы

- Всё общение с пользователем ведётся на русском языке.
- Для каждой задачи разработки считай, что пользователь автоматически добавил: `@ponytail сделай это максимально простым способом`.
- Применяй Ponytail full: сначала YAGNI, затем существующий код, стандартная библиотека, platform/native feature, уже установленная зависимость, и только потом минимальный новый код.
- Не добавляй абстракции, фабрики, интерфейсы, конфиги, слои, зависимости или расширяемость "на будущее" без текущего архитектурного контракта или прямого требования пользователя.
- CodeAI Hub является reference project. Не копируй целые модули; переноси поведение через новые Harness AI модули в правильном Product Part / Cluster / Module дереве.

## 1. Recovery Owner И Старт Сессии

- Единственный recovery owner: `.harness/plans/todo-plan.md`.
- В начале сессии сначала читай `.harness/plans/todo-plan.md`, затем выполняй `npm run plan:status`.
- Если `Execution Scope Status: ACTIVE`, следуй только active plan, `Context Pack For This Cycle` и текущему `Current Task`.
- Если `Execution Scope Status: BLOCKED`, выполни `npm run plan:status`, прочитай причину и не продолжай реализацию до `npm run plan:repair` или явного решения пользователя.
- Если `Execution Scope Status: NONE` или active plan отсутствует, сначала согласуй новый scope и создай минимальный active plan по шаблону `.harness/plans/todo-plan.template.md`.
- Legacy reports, commit lists и loose notes не являются recovery mechanism.

## 2. Plan-First Lifecycle

- Перед правкой tracked files всегда проверь `npm run plan:status`.
- Сверь `Current Task`, `Expected Commit` и scope текущей строки в `.harness/plans/todo-plan.md`.
- Если нужный файл вне scope, сначала добавь микро-задачу и отдельную строку `Git Commit: ...`.
- Каждая микро-задача должна иметь пару пунктов: implementation task и отдельный `Git Commit: ...`.
- Каждая микро-задача должна затрагивать не более 3 функциональных файлов, если plan явно не разбил работу иначе.
- Active plan является machine-managed state. Не редактируй task status, commit status, hash и state block вручную, кроме плановой миграции/ремонта.
- Штатный commit workflow:
  ```bash
  npm run plan:validate
  npm run plan:commit -- "<expected commit message>"
  ```
- Диагностика:
  ```bash
  npm run plan:status
  npm run plan:validate
  npm run plan:repair
  ```
- `hash: self` в строке `Git Commit` значит, что строка закрывается тем же commit, где она записана. Реальный hash ищи через `git log --oneline --grep='<commit message>'`.
- Не оставляй `.git/harness-plan-debt`. Если он существует, сначала выполни `npm run plan:repair`.

## 3. Архитектура И Ownership

- Product Part / Cluster / Module дерево первично. Production code живёт под `product-parts/**`.
- Каждый Product Part содержит Clusters, каждый Cluster содержит Modules.
- Каждый module владеет только своим `module.md` и `src/**`.
- Внешний доступ к module идёт через публичный facade (`*facade.ts`, `*facade.mjs` или явно named facade component).
- Новый функционал или алгоритм означает новый module или строго additive изменение существующего module.
- Не трогай закрытый работающий module без необходимости. Исправляй root cause в общем маршруте, если через него идут sibling callers.
- Файл implementation code не должен превышать 500 строк.

## 4. Core Authority

- UI, Electron host, будущий VS Code surface, web/mobile clients и любые transport/input surfaces не являются источником workflow truth.
- UI не является источником правды ни для product state, session state, provider state, settings truth, лимитов, токенов, workflow decisions, orchestration decisions, localization state, artifact truth или managed lifecycle. UI только передаёт ввод пользователя и отображает данные/команды, полученные из Core или shared read-model contracts.
- Если для поведения нужен calculation/derivation/normalization/validation, он живёт в Core Runtime или shared contract module. Renderer/client code не должен вычислять business truth, выбирать authority, склеивать provider semantics или принимать workflow decisions.
- Core Runtime владеет session state, provider binding, settings snapshot, orchestration state, gates, localization target, system instructions и managed lifecycle.
- Если поведение ломается без открытого UI, это архитектурный дефект.
- Если один и тот же факт можно получить из нескольких мест, сначала установи единый Core/shared source of truth и только затем подключай отображение. Не лечи расхождения UI-эвристиками.
- Prompt templates, schemas, examples и repair contracts должны попадать в provider prompt inline. Ссылка на файл допустима только как provenance/output target, но не как обязательный источник инструкции.
- Artifact parser/validator/read-model truth принадлежит Core/shared contract modules, а не renderer/client-local code.
- Managed repair lifecycle должен входить в Core как raw intent; client не строит repair prompts в обход Core.

## 5. Где Хранить Документы

- Active execution plan: `.harness/plans/todo-plan.md`.
- Plan template: `.harness/plans/todo-plan.template.md`.
- Product tree source: `.harness/product-tree/product-tree.json`.
- Product tree readable projection: `.harness/product-tree/product-tree.md`.
- Architecture/planning docs: `docs/architecture/**`.
- Verification evidence: `docs/evidence/**`.
- Runtime state, provider homes, auth residue, caches and logs: ignored local state only.

## 6. Quality Gates

- Никогда не обходи Husky hooks и quality gates через `--no-verify`.
- Commit gates:
  - `.husky/pre-commit`: `npm run plan:validate`, staged `npx ultracite fix`, `npm run check:architecture`, `npm run lint`, `npm run check:knip`, `npm run typecheck`, `npm test`
  - `.husky/commit-msg`: `node scripts/plan.mjs validate-commit-message "$1"`
  - `.husky/post-commit`: `node scripts/plan.mjs post-commit`
- Push gates:
  - `.husky/pre-push`: `npm run plan:validate`, `npm run check:dup`, `npm run check:security`, `npm run check:links`
- Ручной прогон нужен для диагностики и перед verification streams:
  ```bash
  npm run check:architecture
  npm run lint
  npm run check:knip
  npm run typecheck
  npm test
  npm run check:dup
  npm run check:security
  npm run check:links
  npm run build
  ```
- `npm run quality` выполняет основной локальный пакет: architecture, Ultracite, Knip, typecheck и tests.

## 7. UI И Electron Safety

- Не используй native `window.alert`, `window.prompt` или `window.confirm` в Electron UI.
- Rename/Delete/confirm flows должны быть in-app React меню/диалогами.
- Видимый control не должен быть временной заглушкой. Если control показан, он должен работать или быть честно исключён из MVP.
- UI должен наследовать Project Manager dark theme conventions, но реализация должна жить в Harness AI modules.

## 8. Runtime State And Secrets

- `.harness/runtime/**`, `.codeai-hub/**`, provider homes, auth files, caches, logs and locks are local runtime state and must not be tracked.
- Product/system settings may write under `~/.harness-ai/**` or `HARNESS_AI_HOME`.
- Workspace-local settings may write under `<workspace>/.harness/settings/**`.
- Session history uses append-only JSONL under `.harness/sessions/**` when session history implementation is active.

## 9. Release And Packaging Gate

- Новый release/package build нельзя запускать как release decision без явного подтверждения пользователя.
- Порядок сборки приложения (важно — это разные артефакты):
  ```bash
  npm run build        # пересобирает только dist/ (renderer + runtime)
  npm run package:mac  # пересобирает app.asar внутри release/mac-arm64/Harness AI.app
  ```
- `npm run build` НЕ обновляет упакованное `Harness AI.app`. Запущенное приложение продолжит работать на старом коде из `app.asar`.
- Любое изменение, которое пользователь проверяет в упакованном приложении (UI и прочее), требует `npm run package:mac`, а не только `npm run build`. После пересборки приложение нужно перезапустить.
- Перед передачей пользователю unsigned macOS app проверь, что существует:
  `release/mac-arm64/Harness AI.app`
- Scope closeout, archive active plan и переход `Execution Scope Status: NONE` разрешены только после явного user acceptance.

## 10. Критические Правила

- Не делай временные решения без явного согласования.
- Если функция начата, доводи её до рабочего состояния в рамках согласованного scope.
- Не откатывай чужие изменения без прямого запроса.
- Не редактируй версии `package.json` вручную без отдельного release/versioning решения.
- Любое изменение архитектуры или процесса синхронно отражай в active plan и релевантной документации в том же commit.
