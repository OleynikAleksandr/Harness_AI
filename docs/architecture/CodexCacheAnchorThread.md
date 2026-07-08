# Codex app-server: persistent cache-anchor thread

## Цель

Организовать долгоживущую Codex app-server сессию, где:

- один `thread_id` используется как cache anchor;
- большой статичный контекст находится в `system/developer/tools`;
- диалоговая история после каждой фазы очищается;
- рабочее состояние восстанавливается из `todo-plan.md`, git, diffs и документов проекта;
- static prefix переиспользуется через OpenAI prompt cache.

## Основная модель

```text
thread_id = cache anchor
system/developer/tools = static prefix
embedded frozen docs = часть static prefix
todo-plan.md = оперативная память проекта
git commits / diffs / tests / docs = источник фактов
turn history = временный trace, удаляется после фазы
```

## Static Bundle

Static Bundle — неизменяемый набор данных на время одной cache session.

В него помещаются:

- system instructions;
- developer instructions;
- tool schemas;
- порядок tools;
- frozen architecture docs;
- frozen API contracts;
- coding rules;
- ADR summary;
- glossary;
- project invariants;
- правила работы агента;
- правило: не использовать историю чата как память проекта;
- правило: в начале каждого turn читать `todo-plan.md`.

Static Bundle помещается в `system/developer/tools`.

Static Bundle не меняется внутри одной cache session.

## Dynamic Context

В dynamic context остаётся всё, что меняется между фазами:

- `todo-plan.md`;
- текущий git status;
- текущий diff;
- test output;
- runtime errors;
- текущая microtask;
- свежие логи;
- изменяемые документы;
- результаты tool calls.

`todo-plan.md` не помещается в static prefix.

## thread/rollback

`thread/rollback` — основной механизм очистки model-visible истории между фазами.

Назначение:

- сохранить тот же `thread_id`;
- удалить последние `numTurns` из in-memory context;
- записать rollback marker в persisted rollout JSONL;
- сделать future `thread/resume` уже с pruned history;
- не создавать новый thread;
- не менять static prefix;
- подготовить чистое context window для следующего turn.

Формат вызова:

```json
{
  "method": "thread/rollback",
  "id": 30,
  "params": {
    "threadId": "thr_xxx",
    "numTurns": 1
  }
}
```

Для полной очистки диалога внутри cache session:

```text
1. thread/read includeTurns=true
2. count turns
3. thread/rollback numTurns = turns.length
4. thread/read includeTurns=true
5. verify turns are empty or expected
6. start next turn in the same thread_id
```

`thread/rollback` очищает context, но не откатывает файловую систему.

Файловое состояние фиксируется отдельно:

- git commit;
- git diff;
- test output;
- `todo-plan.md`;
- docs/dev-log;
- docs/diffs.

## Рабочий цикл одной фазы

```text
1. Resume same thread_id.
2. Start one turn.
3. Agent reads todo-plan.md.
4. Agent verifies git status and last relevant commit.
5. Agent reads only required files/docs.
6. Agent executes one coherent phase.
7. Agent runs checks/tests.
8. Agent updates todo-plan.md.
9. Agent creates commit.
10. Agent ends turn.
11. thread/read includeTurns=true.
12. thread/rollback removes completed turn(s).
13. Next phase resumes same thread_id.
```

## todo-plan.md

`todo-plan.md` — оперативный источник состояния.

Минимальная структура:

```markdown
# Todo Plan

## Cache Session
- Thread id:
- Static bundle id:
- Static bundle hash:
- Model:
- Created from commit:

## Current Objective

## Source of Truth
- Last good commit:
- Relevant docs:
- Relevant modules:

## Completed Phases
- Phase:
  - Commit:
  - Diff:
  - Tests:
  - Result:

## Current Phase

## Next Microtasks
1.
2.
3.

## Known Constraints

## Do Not Repeat

## Stop Conditions
```

`todo-plan.md` должен оставаться компактным.

Большие детали выносятся в:

```text
docs/dev-log/
docs/diffs/
docs/decisions/
docs/test-runs/
```

## Prompt Cache

Ожидаемая структура model input:

```text
STATIC PREFIX:
system
developer
tools
tool schemas
embedded frozen docs

DYNAMIC TAIL:
new user turn
todo-plan.md
git status
selected files
tool results
test output
```

Условие cache hit:

```text
static prefix identical between turns
+ same model/provider
+ same tool schemas
+ same tool order
+ same output schema, if used
+ cache still available
```

Проверка:

```text
usage.prompt_tokens_details.cached_tokens
```

Ключевая метрика:

```text
cache_ratio = cached_tokens / prompt_tokens
```

## Manual rollout JSONL prune

Fallback, если `thread/rollback` недоступен или удалён.

Условия:

- turn завершён;
- нет active turn;
- app-server не держит active context;
- есть backup rollout JSONL;
- не удаляются thread/session metadata;
- не удаляется identity/cache anchor;
- не удаляются dynamicTools metadata, если они нужны;
- после чистки выполняется `thread/read includeTurns=true`.

Рекомендуемый приоритет:

```text
1. thread/rollback
2. custom thread/prune patch
3. manual rollout JSONL prune
```

## Новая Cache Session

Новая cache session создаётся, если меняется Static Bundle.

Триггеры:

- изменились system instructions;
- изменились developer instructions;
- изменился embedded frozen doc;
- изменился набор tools;
- изменился порядок tools;
- изменилась tool schema;
- изменилась output schema;
- изменилась model/provider;
- завершён текущий todo-plan;
- начинается новый крупный пакет работ.

Схема:

```text
static docs changed
→ close current todo-plan
→ create new Static Bundle
→ create new thread/session
→ warm cache once
→ continue rollback-cycle
```

## Static Bundle Fingerprint

Для каждой cache session фиксируется hash:

```text
static_bundle_hash = sha256(
  model
  + system prompt
  + developer prompt
  + embedded static docs
  + tool schemas
  + output schema
)
```

Hash записывается в:

```text
todo-plan.md
cache-session manifest
metrics logs
```

## Cache Session Manifest

```yaml
cache_session:
  id: codex-cache-session-YYYY-MM-DD-A
  thread_id: thr_xxx
  static_bundle_hash: sha256:...
  model: ...
  created_from_commit: ...
  todo_plan: todo-plan.md
  embedded_docs:
    - docs/architecture.freeze.md
    - docs/api-contract.freeze.md
    - docs/coding-rules.freeze.md
    - docs/adr-summary.freeze.md
  immutable_until:
    - todo-plan completed
    - static bundle changed
    - tool schema changed
    - model changed
```

## Developer Prompt Rule

```text
You are operating inside a persistent Codex thread used as a prompt-cache anchor.

Do not rely on previous chat history as project memory.

At the start of every turn:
1. Read ./todo-plan.md.
2. Identify the current phase and next microtask.
3. Verify repository state with git status and the last relevant commit.
4. Read only documents required for the current microtask.
5. Execute exactly one coherent development phase.
6. Run relevant checks/tests.
7. Update todo-plan.md with factual results, commits, diffs, tests, and next tasks.
8. Keep todo-plan.md concise.
9. Move detailed logs to docs/dev-log/ or docs/diffs/.
```

## Инварианты

- Один `thread_id` используется внутри одной cache session.
- Static Bundle immutable внутри cache session.
- `todo-plan.md` dynamic, не static.
- Диалоговая история не является источником истины.
- Источник истины: git, commits, diffs, tests, docs, `todo-plan.md`.
- После каждой фазы model-visible dialogue trace удаляется через `thread/rollback`.
- Новый turn восстанавливает контекст из файлов проекта.
- Cache hit подтверждается только `cached_tokens`.
- При изменении Static Bundle создаётся новая cache session.

## Проверка Codex app-server 2026-07-06

Локальная проверка проводилась через отдельный `codex app-server` thread, не
через основной чат Harness AI. Текущая версия Codex CLI (`0.142.5`) генерирует
JSON Schema для `thread/rollback`, `thread/read` и `thread/tokenUsage/updated`
через:

```bash
codex app-server generate-json-schema --out /tmp/codex-appserver-schema
```

Подтверждённая форма `thread/rollback`:

```json
{
  "method": "thread/rollback",
  "params": {
    "threadId": "019f35f9-6534-7370-8475-b351c27bb936",
    "numTurns": 2
  }
}
```

В schema `numTurns` описан как количество последних turns, удаляемых из конца
thread history. Операция меняет историю thread, но не откатывает локальные
файловые изменения. Клиент обязан сам решать, нужен ли Git/file rollback.

### Метрики эксперимента

Контрольный thread:

```text
threadId: 019f35f9-6534-7370-8475-b351c27bb936
model: gpt-5.4-mini
cwd: /Users/oleksandroliinyk/VSCODE/harness-ai
```

Сценарий:

1. Turn 1: основной cache-anchor turn с этим документом.
2. Turn 2: большой dynamic turn со встроенными `docs/architecture/*.md`
   (`153842` символа).
3. Turn 3: follow-up, использующий dynamic docs из turn 2.
4. `thread/rollback numTurns=2`.
5. Probe turn в том же `threadId`.

Полученные `thread/tokenUsage/updated` значения:

```text
after turn1:
  turns = 1
  lastInput = 16238
  lastCached = 4480

after turn2 with embedded architecture docs:
  lastInput = 58251
  lastCached = 15744

after turn3:
  turns = 3
  lastInput = 58308
  lastCached = 57728

after thread/rollback numTurns=2:
  thread/read includeTurns=true -> turns = 1
  rollout JSONL event -> thread_rolled_back, num_turns = 2

post-rollback probe:
  thread/read includeTurns=true -> turns = 2
  lastInput = 16303
  lastCached = 15744
```

Вывод: `thread/rollback` удалил dynamic turns из active/read projection,
следующий provider request вернулся к размеру anchor-only контекста
(`~16k input` вместо `~58k input`), а cache hit на оставшемся prefix сохранился
(`~15.7k cached`). Это подтверждает модель: тот же `threadId` может быть
cache anchor, а завершённые dynamic turns можно удалять между фазами без
потери уже прогретого статичного prefix.

### Accepted 2026-07-08 cache-anchor history mode finding

Packaged-app retest on 2026-07-08 confirmed that live Codex app-server sessions
must use `persistExtendedHistory: false` on both `thread/start` and
`thread/resume` for stable cache-anchor parity with CodexUC synthetic-native
sessions.

Root cause found during the retest investigation:

- Harness live Codex app-server had used `persistExtendedHistory: true` since
  the original app-server migration.
- Native Request Capture used `persistExtendedHistory: false`.
- Direct app-server probe with `false` produced the expected cache timing:
  `4992` cached input tokens on turn 1, then `14208` on turn 2 and turn 3.
- Direct app-server probe with `true` was less stable and could depend on
  app-server extended-history bootstrap state rather than the stable native
  prompt prefix alone.
- The packaged-app retest after switching live `thread/start`/`thread/resume`
  to `false` was accepted by the user: Codex app-server now reaches the large
  cache-anchor value on the same second-visible-turn timing as CodexUC.

Do not "fix" this back to `true` for ordinary Harness sessions. If future work
needs extended-history persistence, it must first re-run the cache-anchor probe
and prove that Codex app-server still reports stable `last_token_usage` cache
hits by the second visible turn.

UI note: Harness keeps the positive Codex-family `Cache` display monotonic for
the active projected session, so the status panel is a cache-anchor indicator,
not a raw per-request trace. For debugging this specific behavior, use provider
telemetry `last_token_usage.cached_input_tokens` from the rollout/request
evidence.

### Что считать текущим окном

`total_token_usage` в app-server остаётся накопительным счётчиком thread и НЕ
уменьшается после rollback. Поэтому его нельзя использовать как "текущее
занятое окно".

Для UI и диагностики current context после rollback использовать:

- `last_token_usage.input_tokens` следующего turn;
- `last_token_usage.cached_input_tokens` следующего turn;
- `model_context_window`;
- `thread/read includeTurns=true` для проверки числа видимых turns.

Persisted rollout JSONL остаётся audit log: строки удалённых turns физически
могут сохраняться, но после rollback `thread/read includeTurns=true` возвращает
pruned projection. Источник истины для model-visible history — app-server
projection, а не ручное удаление строк из JSONL.

## Следующая стадия: ручная проверка Codex в Harness

Автоматизация откладывается. Следующая стадия ограничена только Codex, потому
что именно для Codex app-server уже подтверждён `thread/rollback` и сохранение
cache-anchor prefix после удаления dynamic turns.

Минимальный UI-зонд для Codex-сессии:

- в status panel сессии показать Core-owned `Tokens` и, когда provider его
  сообщает, `Cache`;
- справа в той же панели показать `Turns` рядом с кнопкой `Rollback`;
- кнопка вызывает Core-owned Codex rollback intent, а не прямой renderer-side
  provider JSON-RPC;
- счётчик turns остаётся операторским ориентиром, но дефолт Harness rollback
  сохраняет первые два visible user turns как warmup/cache-anchor pair и
  отправляет в Core политику `preserveFirstUserTurns: 2`; Core сам выводит
  `numTurns` из transcript projection;
- будущая orchestration/todo-plan стадия может вызывать тот же facade с явным
  `numTurns`, если процесс должен удалить строго заданное количество turns;
- при `Turns <= 2` кнопка недоступна, чтобы не стереть cache-anchor warmup;
- для не-Codex провайдеров этот UI-зонд не показывается;
- оператор сверяет, как меняются `Turns`, `Tokens`, cached input и
  provider-visible history.

Порядок ручной проверки Codex:

1. Создать Codex cache-anchor turn.
2. Создать второй warmup/probe turn; после accepted 2026-07-08 fix для live
   app-server (`persistExtendedHistory: false`) уже здесь должен появиться
   большой cached-prefix value, matching CodexUC synthetic-native timing.
3. Добавить 1-2 больших dynamic turns.
4. Снять `thread/read includeTurns=true` и `thread/tokenUsage/updated`.
5. Нажать Harness `Rollback`; UI отправляет `preserveFirstUserTurns: 2`, а
   Core вызывает provider rollback с вычисленным `numTurns`.
6. Снять `thread/read` и следующий probe turn.
7. Принять только если `lastInput` падает до anchor-tail размера, а
   `lastCached` остаётся высоким.

Что НЕ входит в текущую стадию:

- Claude rollback/rewind contract;
- universal-client local history pruning for Kimi, GLM, OpenRouter and Local
  Models;
- provider-neutral rollback abstraction;
- provider-neutral configurable rollback policy beyond the current
  Codex-only facade contract.

Acceptance для перехода к автоматизации Codex:

- UI показывает turns count без вывода provider truth в renderer: число должно
  приходить из Core/session snapshot или из Core-normalized telemetry, и только
  для Codex-сессии.
- Rollback action идёт в Core как raw user intent: `sessionId` плюс либо
  явный `numTurns`, либо policy `preserveFirstUserTurns`; renderer не вычисляет
  provider rollback depth и не вызывает provider JSON-RPC.
- Core выбирает Codex strategy: `thread/rollback`.
- После rollback Core публикует обновлённый session snapshot и telemetry,
  восстановленные к anchor snapshot после сохранённых turns.
- Evidence фиксирует до/после: `turns`, `lastInput`, `lastCached`,
  `modelContextWindow`, provider id `codex`, model id и точный rollback
  strategy.
- UI cache display принимает только Core-normalized telemetry; renderer не
  читает provider-native payload и не вычисляет cached-token truth сам.

## Официальные источники

- Codex app-server: https://developers.openai.com/codex/app-server
- OpenAI prompt caching: https://developers.openai.com/api/docs/guides/prompt-caching
