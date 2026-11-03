# Workflow Kit — установка, Доктор, интеграция с Harness и платформы

Статус: спецификация scope `workflow-kit-2026-11-03`. Модули-владельцы:
`workflow-installer`, `workflow-host` и `workflow-platform`. Интеграция в Core,
Electron host и интерфейс описана в разделах 4–7.

## 1. Классификация папки (`inspect <path>`)

| Состояние | Признак | Предлагаемое действие |
|---|---|---|
| `MISSING` | папки нет | создать (только «Новый проект») |
| `EMPTY` | папка пуста | установить с `git init` |
| `NOT_GIT` | есть файлы, нет репозитория | установить с `git init`; существующие файлы не меняются |
| `GIT_NO_KIT` | репозиторий без Kit | установить |
| `LEGACY_HARNESS_PLAN` | `.harness/plans/todo-plan.md` в формате `harness-ai-plan-v1` | установить и мигрировать план (раздел 3) |
| `PILOT_KIT` | `.harness/kit-manifest.json` Workflow Pilot | не поддерживается: объяснить и ничего не менять |
| `KIT_OK` | манифест совпадает с файлами, версия текущая | открыть |
| `KIT_OUTDATED` | версия в манифесте старее | обновить (`install --update`) |
| `KIT_DAMAGED` | файлы отличаются от манифеста или отсутствуют | Доктор с исправлением |

Ответ `inspect` содержит состояние, найденные экосистемы, наличие Git и его
identity (`user.name`, `user.email`), а также незавершённую транзакцию, если
она есть. Сам `inspect` ничего не меняет.

## 2. Установка (`install <path> [--name <projectName>] [--update]`)

1. Создаёт папку, если её нет. Если репозитория нет, выполняет `git init`
   (ветка `main`). Без Git identity установка останавливается с ошибкой
   `GIT_IDENTITY` и инструкцией: ничего не записано.
2. Записывает файлы из таблицы `WorkflowKit.md`, раздел 4. Способ записи
   зависит от вида файла:
   - **owned** — перезаписывается целиком;
   - **управляемая секция** — заменяется только блок между
     `workflow-kit:begin` и `workflow-kit:end`; остальной текст сохраняется
     байт в байт;
   - **управляемый JSON** — добавляется или заменяется только запись Kit;
     чужие хуки и настройки сохраняются;
   - **создаётся, если нет** — существующий файл не трогается.
3. Git hooks:
   - если задан `core.hooksPath`, в каждый hook-файл этого каталога
     добавляется секция Kit; у Harness это `.husky`;
   - иначе Kit пишет hooks в `.harness/workflow/hooks/` и выполняет
     `git config core.hooksPath .harness/workflow/hooks`.

   Каждый hook вызывает
   `"$(git rev-parse --show-toplevel)/scripts/workflow" git-hook <name> "$@"`.
4. Записывает пустой план (`NONE`) и конфигурацию: профиль качества
   `DISCOVERY`, стандартные бюджеты.
5. Записывает манифест: версия, файлы, виды и SHA-256.
6. Делает служебный коммит с ролью `bootstrap` через транзакцию Kit. Если в
   рабочем дереве уже были изменения, они в коммит не входят и
   перечисляются в ответе.

`install --update` перезаписывает owned-файлы и секции текущей версией.
План, конфигурация и пользовательский текст остаются нетронутыми. Коммит
делается с ролью `kit-update`.

## 3. Миграция плана Harness (`migrate:harness-plan`)

Для репозиториев с планом `harness-ai-plan-v1` (сам Harness AI):

1. Читает строки задач старого плана. Задачи `[DONE]` становятся сводкой
   закрытого раунда `R0-legacy`:
   - в `result` — список ID и названий задач;
   - в `references` — ссылка на коммит миграции.

   Сам прежний текст плана остаётся в родительском коммите.
2. Задачи `[TODO]` и `[IN_PROGRESS]` становятся задачами нового раунда:
   - `expected commit` переходит в `commitMessage`;
   - `completion: user-acceptance` превращается в обычный финал: приёмку
     через `accept`;
   - задача `package` получает вид `delivery`.
3. Новый план получает `baselineCommit` = HEAD до миграции. Коммит
   выполняется с ролью `kit-update`.
4. После миграции старые `scripts/plan.mjs` и `check-docs-sync` больше не
   используются. Их удаление — отдельная задача плана.

## 4. Доктор (`doctor [--fix]`)

Проверки дают статус `ok`, `warn` или `fail`, а также `fixable` и
`nextAction`:

- манифест и хеши owned-файлов;
- целостность управляемых секций и JSON;
- `core.hooksPath` и секции Kit в hooks;
- исполняемый бит запускателей (POSIX);
- доступность среды выполнения (раздел 6);
- валидность плана и сверка задач с коммитами;
- незавершённая транзакция (`nextAction: repair`);
- Git identity;
- дрейф профиля качества относительно `quality:detect`;
- секции `.gitignore` и `.gitattributes`.

`doctor --fix` исправляет только `fixable`-пункты: перезаписывает owned-файлы
и секции, восстанавливает `core.hooksPath` и исполняемый бит. Изменения
фиксируются служебным коммитом `kit-update`. План, конфигурацию и чужие
файлы Доктор не меняет.

## 5. Интеграция с Harness

### 5.1 Сборка и поставка

- `scripts/build-workflow-kit.mjs` (Vite, второй конфиг в режиме
  SSR-библиотеки) собирает `dist/workflow-kit/workflow.mjs` из точки входа
  `workflow-kit/src/workflow-kit-cli.ts`. Шаг включён в `npm run build` и в
  `scripts/dev-electron.mjs`.
- electron-builder кладёт бандл обычным файлом:
  `extraResources: dist/workflow-kit → Resources/workflow-kit`.
- Electron host передаёт процессу Core переменные окружения:
  - `HARNESS_WORKFLOW_KIT_BUNDLE` — путь к бандлу; в dev — `dist/workflow-kit`
    репозитория;
  - `HARNESS_ELECTRON_NODE` — `process.execPath`, используется с
    `ELECTRON_RUN_AS_NODE=1`.

### 5.2 `workflow-host` (Core)

Асинхронно запускает бандл дочерним процессом (`execFile` без shell, таймаут,
JSON на stdout). Для `install` и `inspect` берётся бандл приложения, для
остальных команд — бандл, установленный в проект. Если установленного нет,
используется бандл приложения. Открывая проект, Core записывает
`.harness/workflow/local/runtime`: путь к Electron и режим `electron`. Так
запускатели в проекте работают даже без системного Node.

Ответ всегда имеет форму конверта Kit. Сбои самого хоста приходят в той же
форме с кодами `HOST_NO_BUNDLE`, `HOST_SPAWN`, `HOST_TIMEOUT` и
`HOST_OUTPUT`, поэтому Core обрабатывает один формат.

### 5.3 Core RPC (`core-project-workflow-rpc.ts`)

| Метод | Назначение |
|---|---|
| `workflow-inspect` `{path}` | классификация папки |
| `workflow-prepare-project` `{path, name?, mode: "new"\|"open"}` | установка и добавление workspace |
| `workflow-status` `{workspaceId?}` | статус Kit workspace |
| `workflow-doctor` `{workspaceId?, fix?}` | Доктор |
| `workflow-autopilot-set` `{sessionId, enabled}` | включить или выключить автопилот |
| `workflow-autopilot-get` `{sessionId}` | состояние автопилота и последняя причина остановки |

Для `mode: "new"` поле `path` — родительская папка, а `name` — имя новой
папки проекта. Целевая папка должна отсутствовать или быть пустой. Для
`mode: "open"` поле `path` — сама папка. Что делает Core, зависит от
`action` результата `inspect`:
- `create`, `install`, `install-migrate` — установка;
- `update` — обновление;
- `open`, `doctor` — ничего не устанавливается;
- `unsupported` — отказ.

Затем папка регистрируется как workspace. Методы `workflow-*` обрабатывает
`CoreProjectWorkflowRpc` (`core-project-workflow-rpc.ts`).

Событие `workflow:status` публикуется после каждой операции Kit. Событие
`workflow:autopilot` публикуется при каждом решении автопилота.

### 5.4 Доставка контекста восстановления в сессии

- Контракт адаптера расширяется полем
  `ProviderSessionStartOptions.workspaceContext?: string`. Core вычисляет
  пакет в `bindProviderSession` и передаёт его в `createSession` и
  `resumeSession`.
- Как адаптеры используют поле:
  - **Claude** — добавляет его к системному промпту (native: `append` к
    пресету `claude_code`; managed и legacy: в конец строки);
  - **Codex** — `developerInstructions` в `thread/start` и `thread/resume`;
  - **клиенты OpenRouter, GLM, Local Models, Kimi-client** — системное
    сообщение в начале истории.
- **Kimi native и Grok** в этом выпуске поле не используют. Агент получает
  правила из `AGENTS.md` и вызывает `scripts/workflow recover`.
- Процессам провайдеров Harness передаёт `HARNESS_WORKFLOW_RECOVERY=host`.
  Если проектные хуки (`.claude/settings.json` в native-профиле,
  `.codex/hooks.json`) всё же сработают, они вернут пустой контекст и не
  будут его дублировать.
- Ход автопилота несёт свежий пакет в тексте сообщения. Поэтому длинная
  сессия, у которой системный контекст фиксируется при старте, всегда видит
  актуальное состояние.

### 5.5 Автопилот в Core

Исполнитель автопилота — `session-request-handler`
(`session-workflow-autopilot.ts`). Он работает рядом с обработчиком
`turn_completed` в `session-provider-event-router.ts`. После завершения хода:

1. Пропускает ход, если:
   - сессия — субагент или Profile Creator;
   - ход был остановлен пользователем;
   - ход закончился ошибкой;
   - ожидается ответ на запрос провайдера.
2. Получает статус через `workflow-host`.
3. Вызывает `WorkflowAutopilotFacade.decide`.
4. При `continue` отправляет ход через `SessionRequestHandlerFacade.sendMessage`.

Состояние автопилота хранится в памяти Core для каждой сессии. По умолчанию
автопилот выключен.

### 5.6 Интерфейс

- Новый кластер Application Shell `project-workflow-ui`:
  - `project-setup-dialog` — «Новый проект»: родительская папка и имя;
    «Открыть проект»: папка, результат `inspect` и кнопка установки;
  - `project-doctor-panel` — проверки Доктора и «Исправить»;
  - `workflow-status-strip` — scope, задача, прогресс, переключатель и
    причина остановки автопилота.
- В меню workspace в боковой панели — «Новый проект», «Открыть проект»,
  «Доктор проекта». Прежний пункт «Add Workspace» становится «Открыть
  проект».
- Electron host получает IPC `pick-project-folder` (только выбор папки и
  возврат пути) и `pick-project-parent`.
- Все строки интерфейса проходят через `source-dictionaries`. Нативные
  `alert`, `confirm` и `prompt` не используются.

## 6. Платформы (macOS, Windows, Linux)

- Пути внутри плана, манифеста и конфигурации всегда в формате POSIX. На
  границе с ФС они переводятся в формат ОС. Абсолютные пути, `..` и
  выход за корень отклоняются. На ФС без учёта регистра сравнение путей тоже
  идёт без учёта регистра.
- Процессы запускаются без shell, аргументы передаются массивом. На Windows
  `.cmd` и `.bat` (`npm`, `npx`) запускаются через `cmd.exe /d /s /c` с
  экранированием аргументов. Исполняемые файлы ищутся по `PATH` и `PATHEXT`.
- Запись атомарна: временный файл в том же каталоге, затем `rename`. На
  Windows при `EPERM`, `EBUSY` и `EACCES` выполняется до 5 повторов с
  нарастающей задержкой.
- Блокировка — эксклюзивное создание файла (`wx`) с PID и временем. Блокировка
  считается устаревшей, если процесса нет или она старше 10 минут.
- Запускатели:
  - `scripts/workflow` — POSIX `sh`;
  - `scripts/workflow.cmd` — CMD;
  - `scripts/workflow.ps1` — PowerShell.

  Все три ищут среду выполнения в одном порядке:
  1. `HARNESS_WORKFLOW_NODE`;
  2. `.harness/workflow/local/runtime`;
  3. `node` из `PATH` версии 22 и выше;
  4. стандартные пути ОС.
- `.gitattributes`: `scripts/workflow` и hooks — `eol=lf`, `*.cmd` и
  `*.ps1` — `eol=crlf`, `.harness/**` — `eol=lf`.
- Git hooks — POSIX `sh`. Git for Windows выполняет их своим `sh`.
- В этом выпуске собирается только пакет macOS. Проверки Windows и Linux
  выполняются тестами платформенного модуля с подменой `platform`.

## 7. Перевод репозитория Harness AI на Kit

1. Профиль качества Harness (`WorkflowKitQuality.md`, раздел 9) и политика
   контрактов: `module.md` меняется вместе с `src/**` модуля.
2. `install` в самом репозитории (секции в `.husky/*`) и
   `migrate:harness-plan` для активного плана.
3. Переписать `AGENTS.md`: правила процесса берутся из секции Kit,
   проектные ограничения остаются. Обновить `CLAUDE.md`,
   `docs/DOCUMENTATION_INDEX.md` и шаблон плана. Удалить
   `scripts/plan.mjs`, `scripts/check-docs-sync.mjs`, их тесты и
   npm-скрипты `plan:*`.
4. Оставшиеся задачи scope (DOCS, сборка, приёмка) выполняются уже
   командами нового Kit.
