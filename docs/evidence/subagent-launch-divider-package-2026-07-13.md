# Subagent Launch Divider Package Evidence — 2026-07-13

## Scope

Пересборка macOS пакета в рамках scope `subagent-launch-divider-2026-07-13`
(фаза упаковки предусмотрена активным планом; запрос пользователя
2026-07-13):

1. Плашки «Subagents started» в диалоге родительской сессии заменены одним
   разделителем `SubagentLaunchDivider` (оба провайдера): горизонтальная
   черта с разрывом по центру, в разрыве — локализованная надпись
   «Subagents launched» и суммарный счётчик запущенных сабагентов.
2. Подряд идущие запуски (без сообщений между ними) сливаются в один
   разделитель; счётчик растёт на месте — 1, 2, 3, ... — по мере
   присоединения новых вызовов (`max(childSessionIds.length, 1)` на вызов).
3. Перечень делегированных задач, время, кнопки и статусы из диалога
   убраны полностью: управление и live-статусы остаются только в
   sidebar-дереве (`docs/architecture/ClaudeSubagentSessions.md`, раздел 5).
4. Словарная метка `ui_labels`: `session.subagents.launched`
   («Subagents launched») заменила `session.subagents.started`; надпись
   локализуется штатным localization runtime.

Implementation commits:

- `8ac6a0951014b6d8179a0089d1a7079030bfa27f` —
  `feat: add subagent launch divider label`;
- `1e210a1b5b097420800b62abc8a35a3439eb6000` —
  `feat: collapse subagent launches into dialog divider`.

## Package Build

- Команда: `npm run package:mac` (exit 0).
- electron-builder 26.15.3, Electron 42.5.0, arch arm64,
  подпись пропущена (identity=null) — unsigned dev-пакет.
- Артефакт: `release/mac-arm64/Harness AI.app`,
  `Contents/Resources/app.asar` от 2026-07-13 13:19:09.
- Гейты качества прошли автоматически на обоих implementation commits
  (pre-commit: plan:validate, ultracite, check:architecture, lint,
  check:knip, typecheck, tests — 95 OK).

## Verification

- Изолированный визуальный прогон divider-стилей (реальные CSS-правила на
  reference-фоне диалога) подтвердил ожидаемый вид: тонкая линия с разрывом
  по центру, надпись вторичным цветом, счётчик ярче (tabular-nums).
- Модульный тест `session-subagent-timeline.test.mjs` фиксирует новый
  контракт: группировка подряд идущих вызовов, рост счётчика, отсутствие
  карточной разметки/кнопок/статусов, divider-классы в CSS.
- Приёмка пользователем в упакованном приложении — задача
  `harness-ai.phase3.stream1.task2` активного плана.
