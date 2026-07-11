# Subagent Session Design QA — 2026-07-11

## Scope

Проверить реализованный гибридный UX сессий субагентов относительно
согласованного [Figma-прототипа](https://www.figma.com/design/kCyw0MBXSjdCoV1wh43vui):
точка входа в parent transcript, постоянное рекурсивное дерево в sidebar,
read-only child transcript, detached-window intent и управление названием
primary session.

## Build и автоматические проверки

- `npm run build` — PASS.
- Vite production renderer — PASS; собраны актуальные CSS/JS assets.
- Focused tree/timeline/localization/session-state tests — PASS.
- Каждый implementation commit прошёл обязательные commit hooks:
  architecture, lint, Knip, typecheck и полный набор из 88 test groups.
- Console warning/error log локального QA renderer — пустой.

## Browser QA setup

- Поверхность: Codex in-app Browser.
- Viewport: 1440×900, одинаковый для reference и implementation captures.
- Данные: реалистичный Core mock с primary GPT-5.6 Soul Ultra session, тремя
  child sessions, одним running и двумя completed statuses, transcript,
  telemetry, model и `ultra` reasoning metadata.
- Mock был введён только в изолированный runtime context локальной вкладки для
  проверки собранного renderer. Исходники, persisted app state и provider data
  этим mock не изменялись.

## Проверенные сценарии

| Сценарий | Результат |
| --- | --- |
| Parent transcript объединяет messages и `session:subagent-call` по timestamp | PASS |
| Inline group показывает три child entry points и три ExternalLink controls | PASS |
| Sidebar root показывает `3 subagents · 1 running` | PASS |
| Chevron раскрывает три child rows; useful task/status subtitle не повторяет title | PASS |
| Выбор child открывает его live transcript в основном pane | PASS |
| Child header показывает parent breadcrumb, task, nickname/role/model/reasoning/status | PASS |
| Child session не показывает composer | PASS |
| Inline detach отправляет `{ sessionId: "child-core-audit", workspaceId: "workspace-qa" }` | PASS |
| Rename dialog открывается внутри React UI, сохраняет `Codex subagent audit` | PASS |
| Regenerate title возвращает `GPT-5.6 Soul Ultra` | PASS |
| Sidebar computed width/min/max/resize: `280px` / `240px` / `360px` / `horizontal` | PASS |
| Горизонтальный overflow desktop shell | PASS (`0px`) |

## Визуальная сверка

Reference и implementation captures сравнивались рядом для двух состояний:

1. parent session с раскрытым sidebar tree и inline group;
2. выбранная child session с breadcrumb/task/status header и read-only
   transcript.

Сохранён существующий Harness chrome (session id/limits bar, status panel,
dialog plates и typography). Новые surfaces используют те же background,
border, muted text и teal accent tokens. После первого сравнения исправлены:
дублированная child subtitle, слишком маленький status marker, раннее
обрезание inline metadata и слабая иерархия child title/focus state. Повторное
сравнение не выявило cropped controls, горизонтального overflow или
неработающих основных действий.

## Packaging boundary

`npm run package:mac` не запускался. Согласно release contract, новый
`Harness AI.app` собирается только после свежего явного подтверждения
пользователя. Текущий результат готов к этому package/retest шагу.

final result: passed
