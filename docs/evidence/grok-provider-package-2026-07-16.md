# Grok Provider Package — 2026-07-16

## Итог

Нативный провайдер Grok собран в новый macOS-пакет Harness AI для
пользовательского тестирования. Перед упаковкой пройдены полная проверка
качества, live matrix установленного Grok CLI и production build. Активный
scope остаётся открытым до пользовательской приёмки пакета.

## Артефакт

| Параметр | Значение |
| --- | --- |
| Application | `release/mac-arm64/Harness AI.app` |
| Runtime archive | `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` |
| Architecture | `arm64` |
| Electron | `42.5.0` |
| Packaging tool | `electron-builder 26.15.3` |
| Signing | unsigned, как предусмотрено локальной package-конфигурацией |
| `app.asar` size | `32219875` bytes |
| `app.asar` modified | `2026-07-16T16:38:04+0200` |
| `app.asar` SHA-256 | `7d809298ecea5ee58fbb2dccf2ee3762bb1f33c7f42f850dc00cea7a242d3ff7` |

Исполняемый файл внутри `.app` проверен как `Mach-O 64-bit executable arm64`.

## Проверка содержимого пакета

Список `app.asar` подтверждает наличие актуального renderer bundle
`dist/renderer/assets/index-_OEcKjLF.js` и production-файлов Grok provider:

- ACP contracts, router и supervised process;
- session runtime, load/resume и event routing;
- model catalog, billing и conversation-only rewind;
- Native/Managed profile application и effective tool inventory;
- permission/ask-user/plan interaction bridge;
- native subagent normalization;
- semantic Thinking stream buffer;
- replay-safe provider facade/adapter и Core usage/status telemetry.

Также в архив вошёл Core-owned
`usage-context-status-panel.js`, через который Grok и Codex получают
нормализованную нижнюю status panel без renderer-эвристик.

## Обязательная функциональная паритетность с Codex

Интерфейс Grok-сессии должен быть функционально идентичен интерфейсу
Codex-сессии. Особое требование относится к нижней status panel: для Grok она
обязана выводить весь тот же набор информации, который доступен в Codex:

- выбранную модель;
- выбранный reasoning effort, когда модель его поддерживает;
- tokens и процент заполнения context window;
- cache read tokens;
- число завершённых Core turns;
- действие rollback/rewind, сохраняющее первые два хода сессии.

Все эти значения приходят из Core/shared read model. UI только отображает
нормализованный результат и не вычисляет provider truth самостоятельно.

Кроме status panel в пакет включены model/reasoning controls, Native/Managed
session profiles, in-app permission/ask-user/plan dialogs, MCP transport и
дерево native Grok subagents.

## Проверки перед упаковкой

| Проверка | Результат |
| --- | --- |
| Architecture | passed |
| Formatter/lint | passed |
| Knip | passed |
| TypeScript | passed |
| Repository tests | `111` passed |
| Duplication | passed |
| Security audit | `0` vulnerabilities |
| Link check | passed |
| Plan validation | passed |
| `npm run build` | passed |
| `npm run package:mac` | passed |

Production renderer собран из `318` modules; итоговый JavaScript bundle —
`466.04 kB`, CSS bundle — `48.12 kB`.

Live-проверка установленного `grok 0.2.101`, подписочной авторизации,
Native/Managed binding, моделей, usage/cache/billing, resume/rewind,
interactions, MCP и native subagents зафиксирована в
`docs/evidence/grok-provider-live-verification-2026-07-16.md`.

## Acceptance repair package

Пакет пересобран после commit `654ca411` (`fix: stabilize Grok dialog
streaming`) для исправления двух дефектов, найденных при пользовательской
проверке:

1. Grok ACP присылал Thinking токенами, а adapter превращал каждый токен в
   самостоятельное Core message. Из-за этого каждый фрагмент переводился
   отдельно и отображался с переносом строки. Новый semantic stream buffer
   сохраняет исходные пробелы и выпускает законченные предложения/абзацы либо
   ограниченный по размеру смысловой блок. Перевод выполняется для целого
   блока, после чего существующий prefix-stable UI reveal возвращает перевод в
   диалог стримом.
2. `session/load` повторно присылал сохранённую историю как ACP notifications
   с `_meta.isReplay: true`. Core уже восстановил ту же историю из своей JSONL,
   поэтому replay создавал вторые Thinking и Grok blocks. Adapter теперь
   отбрасывает replay до маршрутизации chat/subagent events; normalizer также
   содержит защитный replay filter.

Live source-build probe установленного Grok CLI подтвердил:

- первый turn вернул два полных читаемых reasoning-предложения и один
  assistant result `FIRST_OK`;
- resume до нового turn дал `0` исторических assistant/thinking messages;
- второй turn после resume вернул один полный reasoning block и один assistant
  result `SECOND_OK`.

## Визуальная проверка repair package

Проверка выполнена в упакованном `Harness AI.app`, а не только в dev/runtime
сборке:

1. После холодного запуска окно полностью отрисовалось; чёрного пустого
   renderer не было.
2. Создана новая Native Grok-сессия с prompt
   `Кратко обдумай запрос в двух полных предложениях и ответь точно: VISUAL_OK`.
3. В transcript появился один переведённый Thinking block с нормальной строкой
   и один визуальный Grok block. Token-level лестницы и отдельных строк для
   каждого чанка не было.
4. Нижняя status panel показала `Model: grok-4.5 (high)`,
   `Tokens: 13,469 (97%)`, `Cache: 11,136`, `Turns: 1` и Rollback control.
5. Приложение было полностью остановлено и запущено заново. После повторного
   открытия той же native session и ожидания более минуты transcript по-прежнему
   содержал ровно один Thinking block и один Grok block; поздний replay не
   добавил дубликаты.

Ранее повреждённая тестовая сессия
`session-grok-d07f6b8d-d848-466f-9210-2ad818870b4d` намеренно не переписана:
старые append-only события остаются историческим артефактом. Исправление
гарантирует корректный live stream и reopen для новых сессий без разрушительной
миграции пользовательской истории.

## Пользовательская приёмка

Пакет передаётся на следующий acceptance checklist:

1. Запустить `release/mac-arm64/Harness AI.app` и убедиться, что Grok имеет
   статус Ready.
2. Создать Native Grok-сессию, сменить модель и reasoning effort.
3. После нескольких ходов проверить нижнюю status panel: Model, reasoning,
   Tokens/context, Cache, Turns и Rollback должны быть доступны так же, как у
   Codex.
4. После трёх и более ходов выполнить rollback и подтвердить, что остаются
   первые два хода, а workspace files не изменяются.
5. Создать Managed Grok-сессию с собственным system prompt/tool profile и
   подтвердить applied profile в интерфейсе.
6. При появлении permission, ask-user или plan approval проверить, что запрос
   показан in-app dialog и после ответа продолжается исходный turn.
7. Запустить native Grok subagent и проверить parent/child tree, reasoning,
   transcript и terminal status.

До подтверждения этого checklist package gate считается собранным, но
пользовательская приёмка и активный execution scope остаются открытыми.
