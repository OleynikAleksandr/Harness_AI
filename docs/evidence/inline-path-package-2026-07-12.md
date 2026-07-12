# Inline Path Package Evidence — 2026-07-12

## Scope

Пересборка macOS пакета по ретесту пользователя: workspace-пути, написанные
агентом как inline code (`.harness/plans/todo-plan.md`), не были ссылками и
оставались некликабельными.

- Inline code, чей текст выглядит как файловый путь (slash-разделённый токен
  без пробелов, файловый сегмент с точкой-расширением, optional
  `:line[:column]`; абсолютный или резолв от корня активного workspace),
  оборачивается в тот же `vscode://file` anchor, что и явные ссылки, и
  читается как кликабельный dotted-link поверх код-плашки.
- Обычный inline code, block code и не-пути (`89/89`, `npm test`,
  `session:messages-replaced`, `completed/interrupted`, `thread/read`,
  web-URL) не затрагиваются. Голое имя файла без каталога
  (`loader.ts:114`) не резолвится — каталог неизвестен.

Implementation commit:
`5f98f977eaf33b87f3765984b51f6d48d130b223` —
`feat: link inline code file paths`.

## Verification

- Commit hooks — PASS: plan validate, architecture, Ultracite, Knip,
  typecheck и полный набор из 91 test group.
- Focused test `session-markdown-content.test.mjs` закрепляет эвристику
  пути (whitespace-фильтр, dotted файловый сегмент), file-link класс и
  cursor/underline стиль.
- Ручная проверка эвристики: `.harness/plans/todo-plan.md`,
  `product-parts/.../codex-subagent-history-loader.ts:114`,
  `scripts/plan.mjs:42:7`, абсолютный путь → корректные `vscode://file`
  цели; все перечисленные не-пути → null.

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-12T18:46:47+0200`.
- Size: `32,099,906` bytes.
- SHA-256:
  `dfb40ac8c3f6aa6157d99271c2f244b455b51671cf0b82e3834807422b2df056`.
- `dist/` побайтно совпадает с распакованным `app.asar/dist` (`diff -r`).
- Packaged JS содержит `session-markdown-file-link`; packaged CSS содержит
  кликабельный стиль
  `...file-link code{color:#6d9cef;...cursor:pointer;...underline dotted}`.

## Launch Smoke

Пересобранный unsigned arm64 package успешно запущен:

- main PID `8800`;
- Core PID `8812`;
- renderer PID `9199`.

Приложение оставлено запущенным для пользовательского ретеста кликабельных
inline-путей.
