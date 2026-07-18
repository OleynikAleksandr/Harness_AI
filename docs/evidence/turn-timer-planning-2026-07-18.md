# Turn Timer Planning — 2026-07-18

## Запрос пользователя

- Таймер `total:` в панели ввода сессии сейчас считает непрерывно от
  `session.createdAt`, не останавливаясь — это не та функция.
- Нужен таймер турна в строке поля ввода пользователя справа (там, где
  placeholder «Сообщить активному поставщику.»): появляется при отправке
  сообщения (когда поле блокируется), считает время до окончания турна,
  исчезает при разблокировке поля; его значение приплюсовывается к Total.
- Total в итоге = суммарное время активной работы агента (сумма длительностей
  всех турнов сессии).
- Поведение одинаково для сессий всех провайдеров; реализация — отдельным
  модулем со своим фасадом.

## Текущее состояние (2026-07-18)

- `ElapsedTotal` — `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx:265-276`:
  `setInterval(1000)` + `formatElapsed(createdAt, now)` (`:320-336`) считает
  `now - session.createdAt`; монтируется в `.session-input__footer-right`
  (`:140-142`). Таймер не останавливается и не сбрасывается.
- Панель ввода — `ReferenceInputPanel` (`reference-session-panels.tsx:36-146`):
  строка `.session-input__row` (textarea + `.session-input__action` с кнопкой
  ▶/Stop), футер с хинтом и `ElapsedTotal`.
- Блокировка поля во время турна: Core публикует `session:turn-state`
  (`idle`/`running`), renderer ведёт `runningSessionIds`
  (`session-window-core-events.ts:79-90`), `disabled` пробрасывается в
  `ReferenceInputPanel` (`session-window-facade.tsx:368`).
- Источники переходов turn-state в Core:
  `session-request-handler-facade.ts:218` (sendMessage → running), `:223`
  (ошибка dispatch → idle), `session-provider-event-router.ts:107-126`
  (`turn_started` → running; `turn_completed`/`turn_failed`/`stream_error` →
  idle), `session-turn-stop.ts:46` (Stop → idle), `session-rollback.ts:101`
  (rollback → idle).
- Каждое событие `SessionCoreEvent` несёт `timestamp` (ISO) и персистится в
  `.harness/sessions/events/<sessionId>.jsonl`
  (`session-event-stream-facade.ts:214-227`), реплеится при загрузке
  (`configureSessionHistory`). Значит, точная длительность каждого турна
  восстанавливается из журнала событий и переживает перезапуск приложения.

## Архитектурное решение

- Core Authority (AGENTS.md §4): деривация длительности турна и суммарного
  активного времени — это business truth, она живёт в Core, а не в renderer.
- Новый Core-модуль `turn-timing`
  (`core-runtime/clusters/session-runtime/modules/turn-timing/`) с фасадом:
  чистая функция
  `deriveTurnTiming(events, sessionId) → { activeMs, runningSince }` по
  событиям `session:turn-state` сессии.
- Renderer получает истину, вызывая эту чистую функцию из Core-модуля над
  журналом событий, который он уже реплеит/получает (прецедент прямого
  импорта чистой Core-функции в renderer: `resolveCodexReasoningEffort` в
  `reference-session-panels.tsx:4`). Renderer только тикает раз в секунду и
  форматирует — сам ничего не выводит из provider payloads.
- Новый UI-модуль `turn-timer`
  (`application-shell/clusters/session-interface/modules/turn-timer/`) по
  образцу маленького модуля `input-controls`: фасад с компонентами
  `TurnTimer` (строка поля ввода справа, виден только при running) и
  `SessionTotalTimer` (footer-right, сумма завершённых турнов; заменяет
  `ElapsedTotal`).

## Правила деривации `deriveTurnTiming`

- Пара `running` → следующий `idle`: `activeMs += idle.timestamp - running.timestamp`.
- Повторные `running` подряд (sendMessage публикует `running`, затем
  `turn_started` публикует `running` ещё раз) — продолжение того же турна;
  стартом считается первый `running` серии.
- Незакрытый хвостовой `running` из прошлого запуска приложения не воскресает
  и в `activeMs` не учитывается; `runningSince` выставляется только для
  турна, идущего в текущем live-режиме.
- Stop, ошибка dispatch, `turn_failed`, `stream_error`, rollback — всё это
  `idle`: турн закрывается, накопленное время плюсуется в Total.
- Во время выполнения турна Total статичен (только завершённые турны);
  бегущее время показывает таймер турна в поле ввода (решение пользователя
  2026-07-18).

## Затрагиваемые файлы и документы

- Новые: `turn-timing/src/turn-timing-facade.ts` + `module.md`;
  `turn-timer/src/turn-timer-facade.tsx` + `module.md`.
- Изменяемые: `session-window/src/reference-session-panels.tsx`,
  `session-window/src/session-window-facade.tsx`,
  `session-window/src/session-window.css`, `session-window/module.md`.
- Регистрация модулей: `session-runtime/cluster.md`,
  `session-interface/cluster.md`, при необходимости `product-part.md`
  соответствующих частей, `.harness/product-tree/product-tree.json` +
  `product-tree.md`, `docs/DOCUMENTATION_INDEX.md` (этот документ).

## План микро-задач

См. активный план `.harness/plans/todo-plan.md` (scope
`turn-timer-2026-07-18`).
