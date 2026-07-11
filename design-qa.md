# Design QA — Subagent Sessions

Дата: 2026-07-11  
Прототип: [Harness AI — Subagent Sessions UX Prototype](https://www.figma.com/design/kCyw0MBXSjdCoV1wh43vui)  
Подробная проверка: `docs/evidence/subagent-session-design-qa-2026-07-11.md`

## Проверенный результат

- Inline-карточки появляются в хронологической точке Core
  `session:subagent-call`, показывают задачу, agent/model/reasoning/status и
  открывают либо открепляют соответствующий child session id.
- Sidebar показывает primary session с количеством потомков, рекурсивно
  раскрывает дочерние сессии и сохраняет отдельные open/detach controls.
- Child view показывает breadcrumb, delegated task, metadata и live transcript
  без composer.
- Sidebar имеет рабочий диапазон resize 240–360 px без горизонтального
  overflow при desktop viewport 1440×900.
- In-app rename сохраняет новое имя, а Regenerate title восстанавливает auto
  title; native prompt/confirm не используются.
- Визуальная сверка выполнялась рядом с Figma-состояниями основной и дочерней
  сессий. Новые элементы используют существующие Harness surfaces/tokens, а не
  заменяют уже принятый chrome приложения прототипным chrome.

## Исправления по итогам сверки

- Убрано дублирование nickname/title во второй строке child session.
- В sidebar теперь показываются delegated task + status; статусная точка стала
  заметнее.
- Inline metadata допускает две строки вместо преждевременного обрезания.
- Focus state и визуальная иерархия child breadcrumb/title приведены к
  Harness accent contract.

## Граница

Проверены source build и локальный renderer с реалистичным Core mock в
изолированном browser QA context. `package:mac` не запускался: packaged-app
сборка остаётся отдельным шагом после явного подтверждения пользователя.

final result: passed
