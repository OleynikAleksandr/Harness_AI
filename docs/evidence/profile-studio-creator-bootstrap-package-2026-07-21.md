# Profile Studio Creator Bootstrap Package Evidence (2026-07-22)

Пользовательская сборка первого Capture-first конвейера Profile Creator Agent.
Scope остаётся открытым до ручной проверки в упакованном приложении.

## Реализованный контракт

- В Settings выбранный по умолчанию Creator Agent разрешается Core как
  `Codex Profile Creator Agent` с моделью `gpt-5.6-sol` и уровнем рассуждения
  `high`; provider/model создаваемого Target Profile не меняют эту
  исполнительную идентичность.
- Составной профиль Creator Agent загружается из
  `~/.harness-ai/ProfileStudio/CreatorAgents/Codex/`: неизменённый Native
  `system-prompt.md`, `custom-instructions.md`, декларативный `tools.json` и
  `initial-user-message.md`.
- Одно нажатие «Создать профиль» сначала запускает через Core свежий Native
  Request Capture для выбранных target provider/model/reasoning. До успешного
  Capture Draft и сессия не создаются.
- Core проверяет завершённость Capture, принадлежность raw JSONL каталогу
  Native Capture, provider/model/capture id, наличие request и SHA-256. Core не
  извлекает из provider payload системный промпт или инструменты: смысловой
  разбор raw JSONL выполняет Creator Agent.
- После успешной проверки Core создаёт Draft и обычную персистентную сессию,
  подставляет точный путь raw JSONL и его hash в первое пользовательское
  сообщение и отправляет его Creator Agent ровно один раз.
- Для Codex перечень инструментов Target Profile хранится и показывается как
  `declarative-only`: фактический tooling Codex app-server остаётся
  фиксированным.
- При повторном входе Target Profile восстанавливается по данным выбранного
  профиля, а не по Codex-идентичности Creator Agent.

Custom Capture намеренно не входит в этот этап: он остаётся отдельной будущей
проверкой уже сформированного профиля.

## Компоненты Creator Agent

Проверены четыре непустых файла пользовательского профиля:

| Компонент | Размер | SHA-256 |
| --- | ---: | --- |
| `system-prompt.md` | 17766 bytes | `cbefa6b0bede0e332d957fca70ccacf9f12f4c0ecdf81b819e5cbe1a3b16e265` |
| `custom-instructions.md` | 8926 bytes | `6b09b24e7b98c5d6440cc6f79209876544b24783505ea662c77047b2a87128f6` |
| `tools.json` | 36831 bytes | `d6c690dd5d1c4ccad1425f5e9fd64cd4bfda74fa8f846bbdd609ea1563a156b0` |
| `initial-user-message.md` | 562 bytes | `1641a00a2898b6f048aa05347b457ded1de24f098fa5ef150183627d7d33709d` |

`tools.json` содержит четыре Native Codex tool declaration. При загрузке Core
проверяет схему всех компонентов и разрешённые placeholders первого сообщения;
неполный или повреждённый состав останавливает создание до появления Draft.

## Проверка и идентичность пакета

Implementation commits от `5e5c4505` до `14a519fe` прошли plan validation,
architecture, Ultracite, Knip, typecheck, docs-sync и `Tests: OK (148)` в
обязательных commit hooks. Дополнительно выполнены production build и явно
разрешённая пользователем сборка unsigned macOS arm64 package.

`npm run build` создал:

- `dist/renderer/assets/index-BNUhS4UG.js`;
- `dist/renderer/assets/index-BKDwbUw6.css`;
- production Core Runtime.

`npm run package:mac` пересобрал приложение из revision
`14a519feb86f14ca5d0b6280ce457e1a82687ba6`:

- application: `release/mac-arm64/Harness AI.app`;
- bundle identifier: `ai.harness.desktop`;
- `app.asar` size: `32503541` bytes;
- `app.asar` modification time: `2026-07-22T09:43:58+0200`;
- SHA-256:
  `d1428e39d4b221f1897a092ac1eb2ce56d49d17a64ca3ca32dd1662e8c97646f`.

После распаковки `app.asar` подтверждены:

- оба новых Core facade:
  `profile-studio-creator-profile-facade.js` и
  `profile-studio-creator-bootstrap-facade.js`;
- packaged markers `initial-user-message.md`, `rawCaptureSha256`,
  `declarative-only` и `session-profile-creator-`;
- renderer copy состояния `Подготовка Capture`.

Пересобранное приложение успешно запущено; подтверждены main process, отдельный
Core Runtime process и renderer process.

## Ручная проверка пользователем

1. Открыть Settings → Profile Studio и убедиться, что выбран
   `Codex Profile Creator Agent` (`Codex / GPT-5.6 Sol / high`).
2. Открыть Profile Studio, выбрать provider/model/reasoning создаваемого
   Target Profile и один раз нажать «Создать профиль».
3. Убедиться, что во время подготовки виден статус Capture, а повторное нажатие
   и переключение target заблокированы.
4. Дождаться выбранного Draft, полного стандартного интерфейса сессии и первого
   пользовательского сообщения с точным raw JSONL path и SHA-256.
5. Убедиться, что первый ответ Codex Creator Agent начинает интервью о
   назначении профиля и не просит вручную запускать Capture или выбирать файл.
6. После появления структурированного результата проверить вкладки Custom
   System Prompt и Custom System Tools; для Codex tools должны быть честно
   обозначены как декларативные при фиксированном runtime tooling.
7. Выйти из Profile Studio и открыть его снова: выбранный Target Profile,
   Draft, сессия и переписка должны восстановиться вместе.
8. Удалить тестовый Draft штатной кнопкой и подтвердить, что связанная Creator
   Session больше не восстанавливается.

## Отклонённая проверка первого turn

Пользовательская проверка первой сборки 2026-07-22 подтвердила корректную
часть Capture-first workflow для target `claude` / `opus` / `medium`:

- Core записал свежий Native Request Capture;
- создал и выбрал Draft
  `draft-f3670188-5676-47e4-a4f1-06414e7db323`;
- создал обычную Creator Session;
- отправил первое user-role сообщение с точным raw JSONL path и SHA-256.

Первый turn Creator Agent не стартовал. Codex вернул HTTP 400
`invalid_json_schema`, потому что `toolSelection` внутри
`codex_output_schema` использовал запрещённый keyword `oneOf`. Это локализовало
дефект в structured-output контракте после уже успешно выполненного Capture и
session bootstrap; пакет не был принят.

## Codex Structured Output Schema Repair Package

Commit `ff480677` (`fix: make profile creator schema codex compatible`)
заменяет provider-variant schema на единый строгий envelope:

- `mode`: `claude-subset | codex-fixed | kimi-candidate`;
- `runtimeEffect`: `declarative-only | null`;
- `toolsJson`: JSON-текст полного массива provider tool declarations.

Схема больше не содержит `oneOf`, `const`, `minLength` или массивов
произвольных object items. Core разбирает `toolsJson`, отклоняет невалидный
JSON, проверяет provider/runtime mode и продолжает передавать в authoring
обычный структурированный `ProfileStudioToolSelection`. Формат сохраняемого
target `tools.json` не изменился.

Обновлённый
`~/.harness-ai/ProfileStudio/CreatorAgents/Codex/custom-instructions.md`
явно описывает этот transport contract:

- size: `9475` bytes;
- SHA-256:
  `978c42cf4c83dd2fa3f13865218bc36a290044a99c75e99bc823a10f28f3e179`.

Ремонт и связанная документация прошли обязательные commit gates и
`Tests: OK (148)`. После отдельного подтверждения пользователя выполнены
production build и `npm run package:mac` из revision
`ff480677`:

- application: `release/mac-arm64/Harness AI.app`;
- bundle identifier: `ai.harness.desktop`;
- renderer: `/dist/renderer/assets/index-BNUhS4UG.js` и
  `/dist/renderer/assets/index-BKDwbUw6.css`;
- `app.asar` size: `32503533` bytes;
- `app.asar` modification time: `2026-07-22T10:39:00+0200`;
- SHA-256:
  `07f8cbf3b257aa4ca93bd10f245bf832fd544cec4c65a987f590d8111fe78c6b`.

Распаковка нового `app.asar` подтвердила в compiled
`profile-studio-agent-facade.js`:

- `toolsJson`: присутствует;
- Core parser `parseToolsJson`: присутствует;
- `oneOf`: отсутствует;
- schema keyword `const`: отсутствует.

Пакет успешно запущен: main process `92315`, Core Runtime process `92329`,
renderer process `92334`.

### Фокус повторной проверки

1. Удалить отклонённый Draft, чтобы новая сессия получила обновлённый
   `custom-instructions.md` с самого первого turn.
2. Снова выбрать Claude / Opus / medium и нажать «Создать профиль» один раз.
3. Дождаться Capture, нового выбранного Draft/session и Core-generated первого
   сообщения.
4. Убедиться, что вместо `invalid_json_schema` появляется первый ответ Codex
   Profile Creator Agent с кратким результатом анализа Capture и началом
   purpose interview.
5. Выйти из Studio, вернуться и проверить восстановление Draft, сессии и
   переписки; затем проверить штатное удаление.

## Communication Language And Three-Pane Resize Package

Повторная пользовательская проверка schema-repair package подтвердила, что
Creator Session теперь запускается и агент работает. Пакет не был принят по
двум следующим причинам: агент отвечал на английском, а границы трёх колонок
Profile Studio нельзя было изменять.

Commit `246e6256` (`fix: localize profile creator communication`) добавляет
Core-owned языковой контракт:

- при создании Creator Session Core читает system Settings
  `general.localization.categories.systemFeedback`;
- пустое значение использует `defaultLanguage`, затем безопасный `en`;
- Creator Profile facade добавляет в custom-часть materialized system prompt
  точное имя и код языка;
- директива требует использовать этот язык для каждого вопроса интервью,
  объяснения, summary и approval request независимо от английского языка
  статических инструкций и первого Core assignment;
- итоговый prompt вместе с директивой входит в immutable managed content hash.

Commit `348396c7` (`feat: resize profile studio panes`) добавляет два
presentation-only separator между левым sidebar, центральной стандартной
сессией и правым inspector:

- pointer drag использует pointer capture;
- Left/Right keyboard arrows изменяют ширину сфокусированной границы;
- double-click возвращает соответствующую side pane к default width;
- `ResizeObserver` и явные minimum widths не позволяют divider схлопнуть
  соседние панели при drag или изменении размера окна;
- геометрия остаётся renderer state и не входит в Core profile/session truth.

Оба implementation commits прошли plan validation, architecture, Ultracite,
Knip, typecheck, docs-sync и `Tests: OK (148)`. Пользователь явно разрешил
новую package-сборку. `npm run build` и `npm run package:mac` из revision
`348396c7` создали:

- application: `release/mac-arm64/Harness AI.app`;
- bundle identifier: `ai.harness.desktop`;
- renderer: `/dist/renderer/assets/index-DimWUakc.js` и
  `/dist/renderer/assets/index-DGrvNM_0.css`;
- transformed renderer modules: `337`;
- `app.asar` size: `32507561` bytes;
- `app.asar` modification time: `2026-07-22T10:58:06+0200`;
- SHA-256:
  `6bc522bd0c8c4e5a9a5b218ae5ea7ff810d482aaf75f49502c35049a267fa486`.

Распаковка `app.asar` подтвердила:

- Core Session Creation читает `categories.systemFeedback` и вызывает
  `composeEffectiveSystemPrompt`;
- compiled Creator Profile содержит `User communication language`, названия
  поддерживаемых языков и правило о first user-role assignment;
- renderer содержит `ResizeObserver`, `setPointerCapture`, обе Arrow keys,
  `aria-orientation`, `aria-valuenow` и double-click handlers;
- CSS содержит обе pane variables и `cursor: col-resize`.

Пакет успешно запущен: main process `12991`, Core Runtime process `13005`,
renderer process `13056`.

### Фокус повторной проверки языка и layout

1. Удалить старый тестовый Draft и создать новый Claude / Opus / medium, чтобы
   новая Creator Session получила заново materialized system prompt.
2. Проверить, что первый и следующие ответы Creator Agent используют язык
   `System Feedback`, выбранный в Settings → General → Localization.
3. Перетащить левую границу: левый sidebar меняется, центральная сессия
   занимает оставшееся место, правый inspector сохраняет ширину.
4. Перетащить правую границу: inspector меняется, центральная сессия снова
   адаптируется; панели не схлопываются на minimum limits.
5. Сфокусировать каждый divider клавиатурой, проверить Left/Right arrows и
   double-click reset, затем изменить ширину всего окна.
6. Убедиться, что Capture, создание/выбор Draft, leave/re-entry и удаление
   продолжают работать.

## Codex Structured Response Projection Package

Повторная пользовательская проверка language/resize package подтвердила
русский язык Creator Agent и работу обеих изменяемых границ. Следующий дефект
был локализован в Codex structured-output projection: app-server возвращал
результат `outputSchema` как сериализованный JSON финального `agentMessage`, и
общий dialog projector показывал целиком `assistantResponse` / `draft` /
`nextAction` вместе с литералами `\n`.

Commit `6e3072b4` (`fix: normalize codex structured output`) исправляет маршрут
на provider boundary:

- Codex facade отмечает только turn, в котором Core действительно передал
  `outputSchema`;
- отдельный внутренний agent-message projector разбирает финальный JSON только
  такого turn и публикует provider-neutral `structured_output`;
- сериализованный JSON не попадает в обычный dialog projector;
- Core использует существующий `ProfileCreatorResultHandler`, проверяет объект
  через `ProfileStudioAgentFacade` и публикует только `assistantResponse`;
- JSON decoding превращает `\n` в настоящие переносы строк до сохранения
  session message;
- обычный Codex turn без `outputSchema` сохраняет прежний `dialog_message`
  route без JSON parsing.

Поведенческий probe подтвердил оба маршрута на одном projector state:
schema-bound JSON дал один `structured_output` с
`Строка 1\n\n- пункт` как реальным многострочным значением, следующий обычный
ответ дал один стандартный `dialog_message`. Implementation commit прошёл
architecture, Ultracite, Knip, typecheck, docs-sync и `Tests: OK (148)`.

Production build и `npm run package:mac` из revision `6e3072b4` создали:

- application: `release/mac-arm64/Harness AI.app`;
- bundle identifier: `ai.harness.desktop`;
- renderer: `/dist/renderer/assets/index-DimWUakc.js` и
  `/dist/renderer/assets/index-DGrvNM_0.css`;
- transformed renderer modules: `337`;
- `app.asar` size: `32509655` bytes;
- `app.asar` modification time: `2026-07-22T12:25:43+0200`;
- SHA-256:
  `06c2f6ab2c253712fec0f362318f313454b1d27c7234c3b155a361c3948c76ee`.

Распаковка нового `app.asar` подтвердила compiled runtime markers:

- `state.structuredOutputExpected = outputSchema !== undefined`;
- `projectCompletedCodexAgentMessage`;
- `type: "structured_output"` внутри Codex projector;
- Core publication через `parsed.result.assistantResponse`.

Пакет успешно запущен: main process `48591`, Core Runtime process `48723`,
renderer process `48768`.

### Фокус повторной проверки форматирования

1. Можно продолжить существующую Creator Session или создать новый Draft;
   новый system prompt для этого исправления не требуется.
2. Отправить агенту следующее сообщение и дождаться полного ответа.
3. Убедиться, что сообщение начинается непосредственно с текста ответа и не
   содержит видимые поля `{"assistantResponse":`, `"draft"` или
   `"nextAction"`.
4. Проверить, что абзацы и списки отображаются реальными переносами строк, а
   не символами `\n`.
5. Старые уже сохранённые JSON-сообщения могут остаться в истории без
   ретроактивного переписывания; все новые schema-bound ответы должны быть
   чистыми.
6. Подтвердить, что русский язык и обе изменяемые границы панелей продолжают
   работать.
