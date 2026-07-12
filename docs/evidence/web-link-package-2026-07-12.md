# Web Link Package Evidence — 2026-07-12

## Scope

Пересборка macOS пакета по подтверждению пользователя: веб-ссылки в ответах
агентов кликабельны и открываются в стандартном системном браузере.

- Window-open маршрут (`vscode-link-opener`) расширил явный protocol
  allowlist: `vscode://file/` (workspace файлы в VS Code) плюс `https://`
  и `http://` (системный браузер через `shell.openExternal`). Все прочие
  протоколы (включая `file://` напрямую и `javascript:`) остаются
  запрещёнными.
- Renderer не менялся: markdown-ссылки уже уходят в этот маршрут через
  `target="_blank"`.

Implementation commit:
`834295683ec2ed386a9b924f4a5cab2ad6349197` —
`feat: open web links in system browser`.

## Verification

- Commit hooks — PASS: plan validate, architecture, Ultracite, Knip,
  typecheck и полный набор из 91 test group (новый focused test
  `vscode-link-opener.test.mjs`).
- Focused test закрепляет точный allowlist из трёх префиксов, deny-путь до
  `shell.openExternal` и отсутствие прямого `file://`/`javascript`.

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-12T18:32:29+0200`.
- Size: `32,098,646` bytes.
- SHA-256:
  `2abb58b86393d994c7bb0c9d3b59793533ee67713d6875bcf9459f5bea08e1a0`.
- `dist/` побайтно совпадает с распакованным `app.asar/dist` (`diff -r`).
- Packaged host-источник `vscode-link-opener-facade.mjs` внутри `app.asar`
  содержит ровно
  `OPENABLE_URL_PREFIXES = ["vscode://file/", "https://", "http://"]`.

## Launch Smoke

Пересобранный unsigned arm64 package успешно запущен:

- main PID `89201`;
- Core PID `89205`;
- renderer PID `89580`.

Приложение оставлено запущенным для пользовательского ретеста веб-ссылок.
