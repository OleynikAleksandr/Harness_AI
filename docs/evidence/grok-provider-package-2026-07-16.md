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
| `app.asar` size | `32213204` bytes |
| `app.asar` modified | `2026-07-16T12:57:31+0200` |
| `app.asar` SHA-256 | `041937140eb1e25ca22d6d8e2d41bb539aecede18e1b75d45a0f466c708bef98` |

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
- provider facade/adapter и Core usage/status telemetry.

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
| Repository tests | `110` passed |
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
