# Workflow Kit — ограниченный контекст восстановления и автопилот

Статус: спецификация scope `workflow-kit-2026-11-03`. Модули-владельцы:
`workflow-recovery` (сборка пакета) и `workflow-autopilot` (решение о
продолжении) в кластере `core-runtime/clusters/project-workflow`.
Доставку в сессии Harness выполняет Core
(`WorkflowKitInstallation.md`, раздел 5).

## 1. Проблема

В Kit 1.x контекст восстановления включал каждую задачу плана, правила и
шаблоны и ограничивался 180 КБ. План Harness перед закрытием весил 70–120 КБ,
и агент читал его целиком. Пакет рос вместе с историей, поэтому
единственным способом его сократить было закрыть план. Цель — чтобы размер
пакета зависел от текущей задачи, а не от длины плана.

## 2. Состав пакета (рабочий набор)

Порядок секций задаёт их приоритет:

| # | Секция | Содержимое | Обязательна |
|---|---|---|---|
| 1 | `state` | проект, scope, revision, состояния scope, результата и профиля качества, HEAD, транзакция, событие (startup/resume/clear/compact), роль агента (`role:`); у оркестратора — назначения и журнал интеграции | да |
| 2 | `next` | шаг роли: что делать сейчас (`Continue T007`, `Start T008 via task:start`, `Scope is READY_FOR_ACCEPTANCE`, `BLOCKED: <reason>`, `No active scope`, `assignment:create`, `integration:start` …) и строка-правило роли | да |
| 3 | `objective` | цель scope и критерии приёмки | да |
| 4 | `task` | текущая (или следующая готовая) задача полностью: поля, файлы, проверки, критерии; для задачи `fixes` — сводка исходной задачи и её SHA | да |
| 5 | `upcoming` | до трёх следующих задач одной строкой; число оставшихся | да |
| 6 | `recent` | до трёх последних завершённых задач одной строкой с коротким SHA | да |
| 7 | `rounds` | сводки закрытых раундов: последние три полностью, более ранние одной строкой | нет |
| 8 | `decisions` | последние пять решений пользователя | нет |
| 9 | `changes` | изменения рабочего дерева вне задачи и незавершённая транзакция | да |
| 10 | `verification` | итог последней проверки (id, статус, хвост вывода до 1 КБ) | нет |
| 11 | `documents` | обязательные документы задачи и scope; по возможности разделами (`heading`) | нет |
| 12 | `references` | всё, что не поместилось: путь, раздел, размер и команда чтения | да |

**Роли** (`recovery-roles.ts`, `WorkflowKitExecutionModes.md`, раздел 9):

- `planning` — scope нет: спецификация и план с метками `parallelSafe`;
  в проекте Harness — `scope:propose` и конец хода (ожидающее предложение —
  ждать выбора на карточке; после `refine` — доработать и предложить снова);
  без Harness — `scope:create`;
- `self` — scope `sequential`: задачи по порядку в main;
- `orchestrator` — scope `orchestrated` в main: строки `assignments:` и
  `integration:`, шаги по порядку — фаза журнала интеграции
  (`integration:continue`), `integration:start` для каждого
  `READY_FOR_INTEGRATION` по одному, задача main (QUALITY или `delivery`),
  раздача готовых задач (`assignment:create` и субагент Claude с
  `isolation: "worktree"`), `Waiting for executors: …`,
  `assignment:cleanup`;
- `executor` — worktree назначения (или ещё не привязанный linked
  worktree orchestrated scope): `assignment:attach`, `assignment:setup` при
  `NEEDS_SETUP`, `task:start`, `commit --task`, отчёт с SHA. В `state` —
  только своя задача.

Порядок шагов `next`: нет scope, незавершённая транзакция (`repair`),
`BLOCKED`, шаг исполнителя, `READY_FOR_ACCEPTANCE`, `ACCEPTED`, шаг
оркестратора, затем шаг `self`. Каждый список в пакете ограничен 10
пунктами (`… N more`).

Правила процесса и шаблоны **в пакет не входят**. Они лежат в управляемой
секции `AGENTS.md`, которую провайдер загружает и кэширует сам. Пакет
содержит только меняющееся состояние и одну строку-указатель на правила.

## 3. Бюджет

- `budget.recoveryBytes` в конфигурации (по умолчанию 32 000 байт UTF-8,
  допустимо от 8 000 до 120 000).
- Сборка идёт по приоритету. Обязательные секции входят всегда. Если они сами
  превышают бюджет, длинные поля задачи сокращаются с пометкой
  `[truncated: N bytes, run: workflow show-task T007]`.
- Необязательная секция, которая не помещается, целиком переходит в
  `references`.
- Документ включается, только если помещается целиком. Иначе включается его
  раздел (`heading`). Если и раздел не помещается, документ уходит в ссылки.
- Пакет никогда не обрезается молча. В заголовке указаны `bytes`, `budget` и
  списки `included` и `omitted`.

## 4. Сводка раунда

Сводку пишет агент в задаче `DOCS` своего раунда
(`commit --task DOCS-R2 --digest <file.json>`):

```json
{
  "result": "What the round delivered, 1-3 sentences",
  "decisions": ["Decision and its reason"],
  "contracts": ["product-parts/.../module.md: what changed"],
  "references": ["docs/architecture/workflow-kit/WorkflowKitProcess.md#9"]
}
```

Ограничения: `result` до 600 байт, каждый список до 8 пунктов по 300 байт.
Нужен хотя бы `result`, остальное необязательно. Kit проверяет форму, а
DOCS — смысл.

## 5. Команды

- `recover [--format text|json] [--event startup|resume|clear|compact]` —
  пакет текущего состояния.
- `hook session-start --client codex|claude` — то же для хуков провайдеров.
  Читает событие из stdin и отвечает в формате SessionStart:
  `{continue, hookSpecificOutput: {hookEventName, additionalContext}}`. Если
  задана переменная окружения `HARNESS_WORKFLOW_RECOVERY=host`, отвечает без
  `additionalContext`: в этом случае контекст уже доставил Harness, и
  повторять его не нужно.
- `show-task <ID>` и `history [--task ID] [--round R]` — полный текст задачи
  и история по запросу из Git.

## 6. Автопилот

**Назначение.** Сохранить границу «одна задача — один коммит — один ход» и
при этом не заставлять пользователя писать «Continue» после каждой задачи.

**Решение (`workflow-autopilot`, чистая функция).** На вход подаётся статус
проекта, результат последнего хода и счётчики сессии. На выходе — одно из
двух:

- `continue` с текстом следующего хода, например:
  `Continue the workflow: run task:start T008 if it is not started, then implement it and commit.`;
- `stop` с причиной.

**Причины остановки:**

| Причина | Условие |
|---|---|
| `disabled` | автопилот выключен для сессии |
| `waiting-for-mode-choice` | предложение scope ждёт выбора режима на карточке |
| `no-scope` | scope `NONE` |
| `blocked` | scope `BLOCKED` |
| `transaction-pending` | незавершённая транзакция или упавшая проверка коммита |
| `ready-for-acceptance` | все задачи завершены, нужна приёмка пользователя |
| `delivery-confirmation` | следующая задача `delivery`, нужно подтверждение пользователя |
| `no-progress` | ход закончился, а revision плана и HEAD не изменились (агент не продвинулся) |
| `limit` | достигнут лимит подряд идущих продолжений (по умолчанию 40) |
| `waiting-for-executors` | scope `orchestrated`: шагов для оркестратора нет, а назначения в `ASSIGNED`, `NEEDS_SETUP`, `READY` или `RUNNING` |
| `turn-error` | ход закончился ошибкой провайдера или отменён пользователем |
| `user-message` | пользователь написал сам: автопилот уступает ход |

**Режим `orchestrated`.** `autopilot:status` дополнительно передаёт
`proposalPending` и `orchestration` (активные назначения и назначения с
незавершённой очисткой, журнал интеграции, готовые задачи). Автопилот
продолжает оркестратора по первому из шагов: фаза журнала интеграции
(`integration:continue`), назначение `READY_FOR_INTEGRATION`
(`integration:start`), QUALITY или начатая `delivery` в main, готовые
задачи (`assignment:create` и субагент с поручением), незавершённая
очистка (`assignment:cleanup`). Иначе — `waiting-for-executors`,
`delivery-confirmation` или `blocked`. Решение несёт `orchestrationKey`
(назначения, интеграция, готовые задачи): ход, изменивший только его,
не считается `no-progress`.

**Исполнение в Core.** Когда ход сессии завершается, Core проверяет, включён
ли автопилот для этой сессии и установлен ли Kit в её workspace. Если да,
Core получает статус Kit, вызывает решение и при `continue` отправляет новый
пользовательский ход тем же маршрутом, что и обычное сообщение. Каждое
решение публикуется событием `workflow:autopilot`, а интерфейс показывает
состояние и причину остановки. Включение, пауза и сброс счётчика — команды
пользователя через RPC. Выбор `sequential` или `orchestrated` на карточке
режима тоже включает автопилот сессии-владельца, без немедленной оценки:
решение принимает конец хода с сообщением выбора
(`WorkflowKitExecutionModes.md`, раздел 4.2).
