# Dialog Markdown And Indicator Package Evidence — 2026-07-12

## Scope

Явно заказанная пользователем пересборка macOS пакета с двумя визуальными
изменениями subagent-интерфейса:

- Плашки ответа и thinking агента рендерят GFM markdown (таблицы, списки,
  код, заголовки, цитаты, ссылки) через renderer-only компонент
  `SessionMarkdownContent` на `react-markdown` + `remark-gfm` с `skipHtml`;
  raw HTML не исполняется, внешние ссылки уходят в системный браузер через
  существующий Electron window-open bridge. Сообщения user/system остаются
  plain text.
- Статусные индикаторы child-сессий в левом sidebar кодируют прогресс формой:
  пока работа идёт (`pending`/`running`) — нейтральное незалитое кольцо;
  итоговые статусы залиты цветом — зелёный `completed` (`#52c974`), оранжевый
  `interrupted` (`#f0883e`), красный `failed`/`not_found`, серый `shutdown`.
  Карточки timeline и header дочерней сессии остаются залитыми и используют
  те же итоговые цвета.

Implementation commits:

- `ff3284173ef9e79a887dd4075b85a7a192c798b3` —
  `feat: render markdown in session dialog`;
- `5e7c3905b2e5f81de0ed5816434d08b12e2fa703` —
  `style: format markdown session replies`;
- `5553ab7e841d7adce983d153da43723404651df8` —
  `style: shape subagent status indicators`.

## Verification

- Commit hooks на каждом из трёх коммитов — PASS: plan validate, architecture,
  Ultracite, Knip, typecheck и полный набор из 90 test groups.
- Focused tests: `session-markdown-content.test.mjs` (движок, безопасные
  ссылки, dependencies рядом с первым использованием, стили таблиц/кода) и
  `session-tree.test.mjs` (правило кольца `fill: transparent`, итоговые цвета
  `#52c974`/`#f0883e`) — PASS.
- `npm run build` — PASS; renderer-бандл включает markdown-стек.

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-12T13:01:02+0200`.
- Size: `32,096,224` bytes.
- SHA-256:
  `38a07b350c0ec2eba3311d1a623d906e2bb924617c851a2a99629903b7872125`.
- `dist/` побайтно совпадает с распакованным `app.asar/dist` (`diff -r`).
- Packaged CSS содержит стили `.session-dialog__content--markdown` (таблицы,
  код, цитаты) и правило кольца
  `.session-tree-status--pending,.session-tree-status--running{color:#a5acb5;fill:#0000}`
  (`#0000` — минифицированный `transparent`).
- Packaged JS содержит markdown-рендерер (className
  `session-dialog__content--markdown` присутствует в бандле).
- Подпись: ad-hoc (identity=null), как в предыдущих пакетах.

## Launch Smoke

Новый unsigned arm64 package успешно запущен:

- main PID `1876`;
- Core PID `1880`;
- renderer PID `2266`.

Приложение оставлено запущенным для пользовательской приёмки markdown-плашек
и sidebar-индикаторов.
