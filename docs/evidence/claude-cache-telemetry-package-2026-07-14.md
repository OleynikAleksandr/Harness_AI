# Claude Cache Telemetry Package Evidence — 2026-07-14

## Scope

Пересборка macOS пакета в рамках scope `claude-cache-telemetry-2026-07-14`
после приёмки первой сборки (Phase 4 - Acceptance Fixes активного плана).

## Приёмка первой сборки (findings)

Пользователь отклонил первую сборку (2026-07-14): панель Claude показывала
`Tokens: 0 (100%)` без Cache-чипа даже на новой сессии, а восстановленные
Codex-сессии выдавали «Provider setup needed: Cannot read properties of
undefined (reading 'toLocaleString')». Живая диагностика упакованного
приложения (RPC ядра + CDP в renderer + ручные прогоны probe/SDK)
подтвердила три дефекта:

1. Телеметрия, восстановленная из истории сессий старой сборки, не имеет
   ключа `sdkUsed`; `formatTokenUsage` проверял только `=== null` и падал
   на `undefined.toLocaleString()` во всех трёх методах фасада — привязка
   каждой восстановленной сессии ломалась, телеметрия замерзала.
2. Событие `token_usage` эмитилось только при успешном `/context` probe:
   вместе с мёртвым probe умирали и SDK-цифры (`cached`/`sdkUsed`), хотя
   tracker их собрал.
3. Probe был мёртв из-за раскола provider home: env для context-reader
   снимался одноразовым снапшотом при initialize адаптера и в гонке с
   global-home liveness preflight замораживался на
   `~/.harness-ai/providers/claude/home`, тогда как турны пишут транскрипты
   в workspace-локальный home
   (`<workspace>/.harness/runtime/providers/claude/home`); `--resume`
   отвечал «No conversation found». Транскрипты «провальной» сессии
   пользователя найдены целыми в workspace-локальном home.

Симптом «виден только один workspace» на уровне Core/моста/renderer не
воспроизвёлся: `list-workspaces`/`add-workspace`/`restartCore` отработали
корректно на живом упакованном приложении; вероятная причина у пользователя
— полумёртвый detached Core-процесс старой сборки, рекомендация: полный
Quit + повторный запуск.

## Fix commits

- `2d3ecf75` — `fix: harden telemetry against restored token usage`:
  нормализация `tokenUsage` в `buildTelemetry`, null-safe merge, поддержка
  partial-событий (только `cached`/`sdkUsed`, прежний `used` сохраняется),
  регрессионный тест на JSON round-trip телеметрии старой сборки.
- `4a922524` — `fix: emit claude sdk usage without context probe`:
  `buildSdkOnlyTokenUsage` + эмит `token_usage` с `cached`/`sdkUsed` в
  обеих ветках отказа probe (дедупликация до изменения цифр).
- `b2c7b1c2` — `fix: resolve claude probe env per read`:
  `ContextUsageReaderConfig.resolveEnv` вместо одноразового env-снапшота;
  context-reader и rate-limit чтения `claude-usage-sync.ts` резолвят env
  при каждом использовании; новый тест
  `claude-context-usage-reader.test.mjs` (data:-URL заглушки соседей)
  фиксирует контракт per-read env.

## Package Build

- Команда: `npm run package:mac` (exit 0, лог в файл — без pipe-артефакта).
- Артефакт: `release/mac-arm64/Harness AI.app`,
  `Contents/Resources/app.asar` от 2026-07-14 11:56.
- Гейты качества прошли автоматически на всех трёх fix-коммитах
  (pre-commit: plan:validate, ultracite, check:architecture, lint,
  check:knip, typecheck, tests — 97/98 OK).

## Verification

- `asar extract-file`: упакованный `claude-context-usage-reader.js`
  содержит per-read `resolveEnv()`; `usage-context-telemetry-facade.js` —
  нормализацию restored-телеметрии; `claude-token-usage-sync.js` —
  `emitSdkOnlyUsage`.
- Изолированный репро дефекта 1 (restored-телеметрия без `sdkUsed`) после
  фикса: `applyBinding`/`applyStatus`/`applyProviderEvent` — OK; позитивные
  сценарии (двухцифровой Tokens, Cache-чип) не изменились.
- Приёмка пользователем в упакованном приложении — задача
  `harness-ai.phase4.stream2.task2` активного плана: восстановленные сессии
  без «Provider setup needed», на новой Claude-сессии две цифры Tokens из
  независимых источников и Cache-чип.
