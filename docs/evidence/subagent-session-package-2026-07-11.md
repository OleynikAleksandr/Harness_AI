# Subagent Session Package Evidence — 2026-07-11

## Scope

Проверить в новом packaged `Harness AI.app` исправленный полный маршрут Codex
subagents: актуальный `subAgentActivity`, Core parent/child graph, историческое
восстановление через app-server, transcript, task identity, reasoning metadata,
terminal statuses и повторный запуск без дублирования.

## Автоматические проверки

- Все defect-correction commits прошли обязательные commit hooks:
  architecture, Ultracite, Knip, typecheck и полный набор из 89 test groups.
- `npm run build` — PASS.
- `npm run package:mac` — PASS; unsigned macOS arm64 directory package создан.

## Package artifact

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-11T21:54:19+0200`.
- Size: `29,948,837` bytes.
- SHA-256:
  `5e4e806b538790f5b1739d4e45b10ebc4a03a2ab21a83b0adf08540ef7b467e7`.
- Direct asar listing contains:
  - `codex-subagent-event-normalizer.js`;
  - `codex-subagent-history-loader.js`;
  - `session-subagent-lifecycle.js`;
  - `session-live-tail-dedupe.js`.
- Direct archive marker checks passed for `subAgentActivity`,
  `ancestorThreadId`, `isOwnedSubagentActivity`, `agentPathTitle`,
  `resolveConfiguredReasoningEffort`, `hasStableMessageDuplicate` and
  `configureSessionHistory`.

## Packaged live restoration

Проверка выполнялась на фактической parent provider session
`019f5271-3cc7-77e3-83bd-849ca0e51bd6`. Перед финальным запуском временные
Core-проекции diagnostic smoke были сохранены в `/tmp` и убраны; provider
rollout/session файлы Codex не изменялись.

После первого запуска packaged app:

- main и Core child processes успешно запущены;
- Core session index перешёл с 1 primary к 1 primary + 3 child;
- получены ровно 3 distinct parent timeline calls;
- latest status всех трёх calls — `completed`;
- каждый child имеет parent Core id
  `session-codex-bf42eab6-4579-43e3-92f9-91342a7cb364`, model
  `gpt-5.6-sol`, reasoning `ultra` и status `completed`.

| Provider thread | Child | Task/title | Messages | False nested calls |
| --- | --- | --- | ---: | ---: |
| `019f5273-09c4-76c0-9b73-c354604b120a` | Archimedes | Provider event audit | 59 | 0 |
| `019f5273-275c-7c43-99a4-8b0ca21a97f7` | Russell | Core session graph audit | 73 | 0 |
| `019f5273-3dac-73c0-b77e-cb6de5485a32` | Boole | Packaged ui audit | 44 | 0 |

Во всех трёх child event histories ошибок нет. `delegatedTask` совпадает с
structured agent-path title, поэтому inherited parent `thread.preview` не
попадает в inline card/header. Унаследованные collaboration items fork history
не создают sibling/grandchild calls.

## Packaged restart idempotency

После штатной остановки и повторного запуска того же пакета:

- набор из трёх Core child ids не изменился;
- message counts до/после остались `44,59,73`;
- false nested call count до/после остался `0`;
- все три child sessions и latest parent calls остались `completed`;
- packaged main/Core processes успешно запущены повторно.

Это подтверждает, что Core загружает persisted event files до provider history
replay и stable-id dedupe действительно предотвращает повторную запись
transcript.

## User retest

Приложение оставлено запущенным для проверки. Ожидаемый результат в session UI:
три inline entry points в parent transcript, раскрываемое дерево из трёх child
слева, read-only transcript при открытии child и рабочий detach control.

final result: passed
