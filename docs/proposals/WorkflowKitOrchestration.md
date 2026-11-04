# Workflow Kit — оркестровка исполнителей (предложение)

Статус: предложение для обсуждения (2026-11-04). Не является действующим
контрактом: после согласования переносится в
`docs/architecture/workflow-kit/` и становится основой scope.

Источник: прогоны Harness AI на `Test_New_HarnesAI_001` и
`Test_New_HarnesAI_002`; механика назначений и интеграции Workflow Kit 1.x
(`Workflow_Pilot/packages/workflow-kit`: `task-assignment`,
`assignment-contract`, `task-integration`, `integration-proof`).

## 1. Проблема

Kit 2.0 знает только одну папку, один план и одну задачу в работе
(`WorkflowKitProcess.md`, раздел 1). Механизма для исполнителей нет.

- Оркестратор раздаёт задачи субагентам в git worktree (Claude
  `isolation: "worktree"`). Хук Kit общий для всех worktree, поэтому
  `git commit` исполнителя отклоняется (`MANAGED_COMMIT_REQUIRED`).
- Законного пути нет: `scripts/workflow commit --task` в worktree работал бы
  с копией плана на момент развилки.
- Итог прогона 002: исполнители оставили файлы проиндексированными,
  оркестратор перенёс их в main и закоммитил от себя. Коммитов исполнителей,
  их проверок и происхождения работы в истории нет.
- Параллельности нет: пока одна задача `IN_PROGRESS`, `task:start` другой
  невозможен.
- Worktree создаёт провайдер внутри проекта (`.claude/worktrees/…`); после
  прогона 001 они остались и мешали статусу.
- Git-идентичность Kit не формирует. Глобальная заглушка
  `Ваше Имя <you@example.com>` попала в коммит установки. Агенты с
  изолированным домашним каталогом провайдера её не видят, и оркестратор
  задал локальную идентичность сам, угадав имя.

В Kit 1.x всё это решали назначения (`assignment:*`) и интеграция
(`integration:*`). Их переносим, без протокола диалога Workflow Pilot
(grant/attempt/acceptance, transport, SDK-сообщения).

## 2. Цели и границы

Цели:

1. Исполнитель делает свой проверенный коммит в своём worktree.
2. Оркестратор принимает его в main merge-коммитом с проверками
   объединённого результата; общий план обновляет Kit.
3. Несколько исполнителей работают одновременно, если их файлы не
   пересекаются.
4. Git-идентичность формирует и проверяет Kit.
5. Последовательный режим (сегодняшний) остаётся режимом по умолчанию.

Вне задачи: автоматическое разрешение конфликтов, rebase и переписывание
main, протокол сообщений оркестратор↔исполнитель (его ведёт провайдер или
Harness).

## 3. Режим выполнения scope

`scope:create` принимает необязательный блок:

```json
"execution": {"strategy": "orchestrated", "maxWorkers": 3,
              "reason": "T002 и T003 независимы"}
```

- `strategy`: `sequential` (по умолчанию) или `orchestrated`. Меняется
  только через `plan:extend` нового раунда.
- `maxWorkers` — лимит одновременных назначений (1 — исполнители по одному).
- У задачи `work` появляется `parallelSafe: boolean` (по умолчанию `false`).
  `true` требует конкретных путей в `files`: без glob, без `.`, без
  завершающего `/`.
- Совместимость двух задач: обе `parallelSafe`, их пути не совпадают и не
  вложены друг в друга. Задача с `parallelSafe: false` выполняется одна.

В `orchestrated`:

- Задачи `work` выполняются только через назначения: `task:start` в main
  отвечает `ORCHESTRATED_MAIN_READ_ONLY`.
- `QUALITY`, `DOCS-<раунд>` и `delivery` выполняет оркестратор в main, когда
  все назначения раунда интегрированы (`ASSIGNMENTS_PENDING`). Это проще
  Kit 1.x, где DOCS тоже шла назначением: общие документы пишет тот, кто
  видит весь результат.
- Задача `work` получает `DONE` только коммитом с ролью `integration`.

## 4. Назначение

### 4.1 Создание и привязка

Назначение создаётся в main:

```text
scripts/workflow assignment:create --task <ID> [--worktree <path>] [--attach]
```

Предусловия (ошибка — ничего не создано):

- scope `ACTIVE`, стратегия `orchestrated`, нет транзакции, интеграции и
  git-операции (merge/rebase);
- main чист, ветка — ветка scope (из `baselineCommit`), база = `HEAD`;
- задача `TODO`, её зависимости `DONE` и являются предками базы;
- одно активное назначение на задачу (`ASSIGNMENT_EXISTS`);
- лимит `maxWorkers` и совместимость с активными назначениями
  (`ASSIGNMENT_CAPACITY`, `ASSIGNMENT_CONFLICT`);
- назначенные проверки задачи настроены.

Два способа получить worktree:

- **Kit создаёт** (по умолчанию): `git worktree add -b workflow/<id> <path>
  <base>`. Путь по умолчанию —
  `<родитель проекта>/<имя проекта>.worktrees/<id>`, меняется в
  `config.orchestration.worktreeRoot`. Путь абсолютный, вне папки проекта,
  без symlink в составе, не существует.
- **Привязка** (`--attach`): worktree создаёт провайдер (Claude
  `isolation: "worktree"`). Kit выдаёт id, а исполнитель первым шагом
  выполняет в своём worktree `scripts/workflow assignment:attach <id>`.
  Kit проверяет, что это linked worktree того же репозитория, `HEAD` равен
  базе и дерево чисто. Ветку провайдера Kit не переименовывает.
  `.claude/worktrees/` установщик добавляет в `.gitignore`.

Рекомендация для Harness — привязка для субагентов Claude: рабочий каталог
и права исполнителя тогда обеспечивает провайдер. Создание Kit — для
исполнителей без собственной изоляции (терминал, будущие сессии-исполнители
Core).

### 4.2 Состояние

- Запись родителя: `<main>/.harness/workflow/local/assignments/<id>.json`.
- Запись исполнителя: `<worktree>/.harness/workflow/local/assignment.json`.
- Поля: `id`, `scopeId`, `taskId`, `iteration`, `worktree`, `branch`,
  `baseCommit`, `mode` (`created`/`attached`), `configDigest`, `phase`,
  `sourceCommit`, `integrationCommit`, `cleanup`.
- Фазы записи: `PREPARED` → `CREATING` (до `worktree add`) → `ASSIGNED` →
  `INTEGRATED`. Повтор с тем же id сверяет входы и продолжает.
- Повтор после сбоя: существующая ветка принимается, только если фаза
  `CREATING` и её вершина — база.

### 4.3 План исполнителя

Kit строит его из плана базового коммита (`git show <base>:<plan>`) и
делает служебный коммит с ролью `assignment-plan` (только файл плана):

- scope `assignment-<id>`, одна задача — копия назначенной, `dependencies:
  []`, стратегия `sequential`;
- контракт задачи неизменен: правка плана, конфигурации или файлов вне
  `files` задачи отклоняется (`ASSIGNMENT_CONTRACT`, `ASSIGNMENT_CONFIG`,
  `ASSIGNMENT_SCOPE`).

В worktree исполнителя разрешены `status`, `validate`, `recover`,
`show-task`, `task:start`, `commit --task`, `repair`, `task:block`,
`assignment:status` и git hooks. Остальное — `ASSIGNMENT_READ_ONLY`;
`pre-push` отклоняется.

Цикл исполнителя — обычный: `task:start <ID>` → работа → `commit --task
<ID>` с проверками задачи в его worktree. Коммит однородительский, роль
`implementation`, с trailers назначения.

### 4.4 Окружение worktree

Если проверкам задачи нужны зависимости (`package.json` с dependencies на
пути от `cwd` проверки до корня), статус `NEEDS_SETUP`. Команда
`assignment:setup --id <id>` в main:

- выполняет `npm ci` по `package-lock.json` (без lock-файла —
  `SETUP_LOCK_REQUIRED`) и `pre`-скрипты назначенных npm-проверок;
- записывает квитанцию с хешем lock-файла;
- никогда не копирует и не связывает `node_modules` main.

Набор команд подготовки берётся из профиля качества стека (для `node` —
`npm ci`), чтобы другие стеки добавлялись так же.

### 4.5 Статусы назначения

| Статус | Когда |
|---|---|
| `PREPARING` | план исполнителя ещё не закоммичен |
| `NEEDS_SETUP` | окружение не готово |
| `READY` | можно начинать |
| `RUNNING` | задача исполнителя начата |
| `READY_FOR_INTEGRATION` | есть коммит `implementation` с пройденными проверками |
| `INTEGRATED` | принят в main |

`status` и recovery main показывают все активные назначения: задача,
статус, worktree, коммит.

## 5. Хуки в worktree

`core.hooksPath` общий для всех worktree, а хук запускает launcher своего
worktree (`scripts/workflow git-hook …`). Отличие коммита Kit от прямого
`git commit` определяет журнал транзакции своего worktree
(`.harness/workflow/local`), поэтому механизм Kit 2.0 работает без
изменений. Для назначения pre-commit дополнительно проверяет контракт
(раздел 4.3).

## 6. Интеграция

```text
scripts/workflow integration:start --id <assignment> --source <sha>
scripts/workflow integration:status
scripts/workflow integration:continue --id <assignment>
```

Предусловия:

- main чист (неотслеживаемые файлы сохраняются, но блокируют:
  `INTEGRATION_DIRTY`), нет транзакции;
- назначение `READY_FOR_INTEGRATION`, дерево исполнителя чисто;
- `source` — его коммит.

Kit доказывает источник (`INTEGRATION_HISTORY`, `INTEGRATION_UNCHECKED`):

- история `base..source` — ровно коммит `assignment-plan` и коммиты
  `implementation` этой задачи, каждый однородительский, с верными
  trailers;
- в diff нет служебных файлов Kit (`.harness/**`, кроме плана, и
  launchers);
- квитанция проверок исполнителя относится к дереву `source`, все
  назначенные проверки `PASSED`;
- контракт задачи в базе совпадает с текущим.

Шаги:

1. `git merge --no-commit --no-ff <source>`. Без `MERGE_HEAD` — `UNKNOWN`,
   без автоматического повтора.
2. План исполнителя заменяется планом main; Kit строит кандидат общего
   плана: задача `DONE`, ссылка на коммит с ролью `integration`,
   `operationId` и `sourceCommit`.
3. Изменения вне `files` задачи и её документов-контрактов —
   `INTEGRATION_SCOPE`; чужие файлы не удаляются.
4. Коммит `merge: <title>` с двумя родителями (прежний main, `source`).
   Pre-commit запускает проверки задачи из конфигурации main на
   объединённом кандидате. Trailers: `Workflow-Scope`, `Workflow-Task`,
   `Workflow-Role: integration`, `Workflow-Transaction`, `Workflow-Source`.

Ошибки:

- Конфликт — фаза `CONFLICT`, а не ошибка. Оркестратор разрешает его в main
  в пределах файлов задачи, `git add` и `integration:continue`. Kit никогда
  не применяет ours/theirs сам.
- Проверки упали — `CHECKS_FAILED`: `MERGE_HEAD` и исправления остаются,
  задача не `DONE`; после исправления — `continue`.

Журнал `<main>/.harness/workflow/local/integration.json` блокирует другие
команды записи. Фазы: `PREPARED`, `MERGING`, `RESOLVING`, `CONFLICT`,
`CHECKING`, `CHECKS_FAILED`, `UNKNOWN`. Повтор сверяет журнал, `HEAD` и
родителей и завершает уже созданный коммит; второго merge и
`reset --hard` нет.

После `INTEGRATED` Kit удаляет worktree (`git worktree remove` без force,
затем `prune`) и влитую ветку (`git branch -d`). Отказ не отменяет
интеграцию: `cleanup: PENDING`, `assignment:cleanup` доделывает. Для
`--attach` ветку и папку тоже удаляет Kit, если провайдер их не удалил.

Сверка истории Kit 2.0 принимает двухродительские коммиты только с ролью
`integration` и доказанным источником. Коммиты `implementation` в main
остаются однородительскими.

## 7. Git-идентичность

Kit формирует её сам и не зависит от домашнего каталога агента:

1. `install` берёт идентичность из `--git-name/--git-email` (Harness
   передаёт её из своих настроек), иначе из локального конфига репозитория,
   иначе из глобального.
2. Заглушки отклоняются (`GIT_IDENTITY_PLACEHOLDER`): пустые значения,
   `you@example.com`, домены `example.*`/`invalid`/`localhost`, имена
   `Your Name` и `Ваше Имя`.
3. Выбранная идентичность записывается в локальный конфиг репозитория
   (`git config user.name/user.email`). Linked worktree читают его через
   общий каталог Git, поэтому исполнители и оркестратор подписывают коммиты
   одинаково.
4. Каждый коммит Kit передаёт идентичность явно (`-c user.name=… -c
   user.email=…` из локального конфига) и проверяет её перед транзакцией.
5. Доктор: `git-identity` — `error`, если идентичности нет или это
   заглушка; `--fix` без источника не угадывает, а отвечает, что нужно
   указать. В Harness источник — настройка «Git identity» (имя и почта) в
   Settings; New/Open Project передаёт её в `install`, а Доктор предлагает
   применить её к открытому проекту.

Агентам запрещается задавать идентичность самим; это правило входит в
управляемую секцию `AGENTS.md`.

## 8. Recovery и правила агента

- Recovery main в `orchestrated` показывает активные назначения, ожидающие
  интеграции результаты и следующий шаг оркестратора: создать назначение,
  интегрировать или выполнить `DOCS`.
- Recovery в worktree исполнителя — только его задача и правила
  исполнителя: работать в этом worktree, `commit --task`, не трогать план и
  `.harness/**`, сообщить SHA.
- Управляемая секция `AGENTS.md` получает два коротких блока:
  - **оркестратор:** `assignment:create` → запуск исполнителя → ожидание его
    SHA → `integration:start`;
  - **исполнитель:** `assignment:attach` (при привязке) → `task:start` →
    `commit --task` → отчёт с SHA.

## 9. Интеграция с Harness

- `workflow-host` и Core RPC получают `assignments` в статусе;
  `workflow-status-strip` показывает число исполнителей и ожидающих
  интеграции.
- Автопилот в `orchestrated` продолжает ход оркестратора, когда Kit сообщает
  `READY_FOR_INTEGRATION` или когда раунд готов к `DOCS`. Решение по-прежнему
  принимает Kit (`autopilot:status`).
- Настройка «Git identity» живёт в Core settings; renderer её только
  показывает и передаёт.
- Исполнители — субагенты провайдера с привязкой (раздел 4.1). Сессии-
  исполнители Core с собственным рабочим каталогом — следующий этап.

## 10. Порядок реализации (предварительно)

1. План: `execution`, `parallelSafe`, валидация, `ORCHESTRATED_MAIN_READ_ONLY`.
2. Git: операции worktree, сверка истории с ролью `integration`.
3. Назначения: `create`/`attach`/`status`/`setup`/`cleanup`, план исполнителя,
   защита контракта в worktree.
4. Интеграция: журнал, merge, кандидат плана, проверки, повтор.
5. Git-идентичность: установщик, транзакции, Доктор.
6. Recovery, тексты `AGENTS.md`, CLI-справка.
7. Harness: статус назначений, настройка «Git identity», автопилот.
8. Сценарный тест на настоящих worktree (как fixtures Kit 1.x): два
   параллельных исполнителя, конфликт, падение объединённых проверок, сбой
   на каждом шаге и повтор. Затем сборка и проверка на тестовом проекте.

## 11. Вопросы для обсуждения

1. Привязка к worktree провайдера (Claude `isolation: "worktree"`) как
   основной путь для Harness, а создание Kit — для остальных. Согласны?
2. `DOCS`, `QUALITY` и `delivery` в `orchestrated` выполняет оркестратор в
   main, а не исполнитель. Согласны?
3. Путь worktree, которые создаёт Kit: рядом с проектом
   (`<имя>.worktrees/<id>`) или в `~/.harness-ai/worktrees/<проект>/<id>`?
4. Источник Git-идентичности в Harness: отдельная настройка в Settings или
   брать из учётной записи провайдера?
5. Тот же агент-оркестратор может быть исполнителем (`maxWorkers: 1` без
   субагентов) — оставить `sequential` для этого или разрешить назначение
   в собственном worktree?
