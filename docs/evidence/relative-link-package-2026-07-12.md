# Relative Link Package Evidence — 2026-07-12

## Scope

Пересборка macOS пакета по замечанию пользователя: относительные ссылки вроде
`.harness/plans/todo-plan.md` должны быть адресными в конкретном workspace.

- Schemeless относительные markdown href резолвятся против Core-provided
  корня активного workspace (`activeWorkspace.path` из facade → dialog
  panel → markdown anchors) в тот же `vscode://file` маршрут, с optional
  `:line[:column]` (например `scripts/plan.mjs:42:7`), включая `./`
  префикс. Href со схемой (`https:`, `mailto:`), якоря `#...` и пустые
  не резолвятся; без известного workspace root относительные ссылки остаются
  нетронутыми.
- Абсолютные и `file://` ссылки работают как раньше.

Implementation commit:
`6719318fad659155d9435ed7c336f072de180687` —
`feat: resolve workspace relative links`.

Примечание процесса: первый `plan:commit` упал на ultracite-гейте
(`useTopLevelRegex`), план уже был продвинут; восстановление выполнено по
документированному рецепту — вынесен top-level regex
(`TRAILING_SLASHES_PATTERN`) и сделан обычный `git commit` с тем же
сообщением.

## Verification

- Commit hooks — PASS: plan validate, architecture, Ultracite, Knip,
  typecheck и полный набор из 91 test group.
- Focused test `session-markdown-content.test.mjs` закрепляет
  scheme-фильтр, workspace-join и проброс `workspaceRoot` через dialog
  panel и facade.
- Ручная проверка резолвера: `.harness/plans/todo-plan.md`,
  `./docs/DOCUMENTATION_INDEX.md`, `product-parts/...:193`,
  `scripts/plan.mjs:42:7` → корректные `vscode://file` цели workspace;
  `https`, `mailto`, `#anchor`, пустые и отсутствие root → null.

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-12T18:40:51+0200`.
- Size: `32,099,115` bytes.
- SHA-256:
  `2d9806a42dc3a372dce59d1a8f10561b143263d8c91f6abbc5da320aafb449d2`.
- `dist/` побайтно совпадает с распакованным `app.asar/dist` (`diff -r`).
- Packaged renderer-бандл содержит проброшенный `workspaceRoot` контракт.

## Launch Smoke

Пересобранный unsigned arm64 package успешно запущен:

- main PID `98575`;
- Core PID `98587`;
- renderer PID `99024`.

Приложение оставлено запущенным для пользовательского ретеста относительных
workspace-ссылок.
