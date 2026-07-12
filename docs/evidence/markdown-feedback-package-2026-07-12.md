# Markdown Feedback Package Evidence — 2026-07-12

## Scope

Пересборка macOS пакета по замечаниям пользовательского ретеста пакета
`dialog-markdown-indicator-package-2026-07-12`:

- Таблицы в markdown-плашках переносили слова посимвольно («Нап/рав/ление»):
  унаследованный от `.session-dialog__content` `overflow-wrap: anywhere`
  позволял браузеру сжимать узкие колонки до одной буквы. Внутри
  `.session-dialog__content--markdown table` переносы возвращены к пословным
  (`word-break: normal; overflow-wrap: normal`); широкая таблица скроллится
  горизонтально, узкие заголовочные колонки держат слово целиком.
- Thinking-плашки возвращены к прежнему plain-text формату (тонкий weight 200,
  `pre-wrap` переносы): markdown склеивал их однострочные секции в сплошную
  жирную стену. Markdown теперь рендерится только в обычных ответах агента
  (`!isThinking && role === "assistant"`).

Implementation commit:
`3c0d33645ab1f252ef0317a59e9ee238a6f530d3` —
`fix: restore thinking format and table wrapping`.

## Verification

- Commit hooks — PASS: plan validate, architecture, Ultracite, Knip,
  typecheck и полный набор из 90 test groups.
- Focused test `session-markdown-content.test.mjs` закрепляет новый контракт:
  markdown только для обычных assistant-ответов, `word-break: normal` и
  `overflow-wrap: normal` внутри markdown-таблиц.
- `npm run build` — PASS (входит в `package:mac`).

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-12T18:02:57+0200`.
- Size: `32,096,264` bytes.
- SHA-256:
  `e3041607cdeb13da605f6d9b5842f778268f7ae971202777c9a4aa35fe33b043`.
- `dist/` побайтно совпадает с распакованным `app.asar/dist` (`diff -r`).
- Packaged CSS содержит правило
  `.session-dialog__content--markdown table{word-break:normal;overflow-wrap:normal;...}`.

## Launch Smoke

Пересобранный unsigned arm64 package успешно запущен:

- main PID `58894`;
- Core PID `58898`;
- renderer PID `59282`.

Приложение оставлено запущенным для пользовательского ретеста таблиц и
thinking-плашек.
