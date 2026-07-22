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

