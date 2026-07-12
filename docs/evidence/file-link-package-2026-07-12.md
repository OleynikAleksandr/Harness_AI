# File Link Package Evidence — 2026-07-12

## Scope

Пересборка macOS пакета с обработкой ссылок из пользовательского ретеста
markdown-плашек:

- Ссылки в отрендеренном markdown переносятся целиком (inline-block с
  max-width 100%): дефисные имена вроде
  `codex-subagent-history-loader.ts:114` больше не рвутся посреди ссылки —
  «тире на одной строке, остаток на другой» исключены.
- Абсолютные file:line ссылки открывают файл в VS Code окна workspace на
  указанной строке: anchor-компонент резолвит absolute unix / file:// href с
  optional `:line[:column]` в `vscode://file/<path>:<line>:<column>` и
  отдаёт клик существующему Electron window-open маршруту
  (`vscode-link-opener`, тот же путь, что у profile file-кнопок). Прочие
  href проходят прежний default url transform; `file://` href сохраняются
  кастомным transform до anchor-резолва.

Implementation commit:
`53cc22aab7558b8c315a1544cf9423924799a02e` —
`feat: open file links in vs code`.

## Verification

- Commit hooks — PASS: plan validate, architecture, Ultracite, Knip,
  typecheck и полный набор из 90 test groups.
- Focused test `session-markdown-content.test.mjs` закрепляет резолвер,
  `vscode://file` контракт, сохранение `file://` href и inline-block
  правило ссылок.
- Ручная проверка резолвера: абсолютный путь без суффикса → `:1:1`, c
  `:114` и `:42:7` → те же координаты, `file:///...` → декодированный
  путь; `https`, `mailto`, относительные пути и пустые href остаются
  нетронутыми (null).

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-12T18:20:32+0200`.
- Size: `32,097,138` bytes.
- SHA-256:
  `cc0f28302116c75dee10b6e37cce4f26f711858d113bcafd68a1bb822f531a18`.
- `dist/` побайтно совпадает с распакованным `app.asar/dist` (`diff -r`).
- Packaged JS содержит `vscode://file/` резолвер; packaged CSS содержит
  правило `.session-dialog__content--markdown a{...max-width:100%...display:inline-block}`.

## Launch Smoke

Пересобранный unsigned arm64 package успешно запущен:

- main PID `78665`;
- Core PID `78669`;
- renderer PID `79090`.

Приложение оставлено запущенным для пользовательского ретеста переноса ссылок
и открытия файлов в VS Code.
