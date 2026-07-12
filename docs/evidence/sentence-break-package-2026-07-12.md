# Sentence Break Package Evidence — 2026-07-12

## Scope

Пересборка macOS пакета с последней деталью читаемости из пользовательского
ретеста markdown-плашек: каждое предложение обычного ответа агента начинается
с новой строки.

- Renderer-only параграф-форматтер в `SessionMarkdownContent` разбивает
  текстовые узлы параграфа по границе `.`/`!`/`?` + пробел + заглавная буква
  (`/([.!?])\s+(?=\p{Lu})/gu`, латиница и кириллица через `\p{Lu}`); inline
  элементы (код, ссылки, emphasis), код-блоки, таблицы и списки не
  затрагиваются, поэтому `0.144.1`, `loader.ts:114`, `89/89` и `См. ...` не
  рвутся.
- Параграфы рендерятся с `white-space: pre-line`: видны и вставленные
  sentence-переносы, и авторские одиночные переносы строк внутри абзаца.

Implementation commit:
`56ddefe22a4ffc36cc2e6c61532e44c3c9acfa72` —
`feat: split assistant sentences onto lines`.

## Verification

- Commit hooks — PASS: plan validate, architecture, Ultracite, Knip,
  typecheck и полный набор из 90 test groups.
- Focused test `session-markdown-content.test.mjs` закрепляет параграф-
  компонент, точный sentence-регексп и `pre-line` правило.
- Ручная проверка эвристики на реальных фрагментах отчёта Codex (включая
  пример пользователя «…provider thread. Дополнительно проверяю…») дала
  ожидаемые построчные переносы без ложных разрывов версий/путей.

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-12T18:12:04+0200`.
- Size: `32,096,544` bytes.
- SHA-256:
  `50fd539c4b48f6bad35daadcb65ed0a70e9e076fa628d417220dd4c1c86483a7`.
- `dist/` побайтно совпадает с распакованным `app.asar/dist` (`diff -r`).
- Packaged CSS содержит `white-space:pre-line` для markdown-параграфов;
  packaged JS содержит sentence-lookahead `(?=\p{Lu})`.

## Launch Smoke

Пересобранный unsigned arm64 package успешно запущен:

- main PID `68766`;
- Core PID `68777`;
- renderer PID `69157`.

Приложение оставлено запущенным для пользовательского ретеста построчных
предложений.
