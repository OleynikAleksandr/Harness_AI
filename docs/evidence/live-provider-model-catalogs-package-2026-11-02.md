# Live Provider Model Catalogs Package Evidence (2026-11-02)

Пользовательская сборка Phase 21 «Live Provider Model Catalogs». Scope
остаётся открытым до ручной проверки в упакованном приложении (задача 134).

## Реализованный контракт

- Kimi: исправление уровня thinking под Kimi CLI 2.4.1 вошло отдельным
  коммитом `8a07adee`. Core читает `GET /coding/v1/models` ключа Coding Plan, сохраняет
  последний удачный ответ в `~/.harness-ai/providers/kimi-client/model-catalog.json`
  и объявляет каждую модель каталога в `config.toml` рабочего Kimi home
  (квотированные ключи вида `[models."k3.1-pro"]`, контекст и
  `support_efforts` из каталога). Уровень `[thinking].effort` сохраняется на
  Kimi CLI 2.4.1.
- Codex: Core читает видимые модели через app-server `model/list` в Harness
  Codex home и сохраняет их в `~/.harness-ai/providers/codex/model-catalog.json`;
  по умолчанию Codex берёт первую модель каталога.
- Claude: Core читает `supportedModels()` установленного в Harness Claude Agent
  SDK (без отправки промпта) и сохраняет их в
  `~/.harness-ai/providers/claude/model-catalog.json`; строка-алиас `default`
  пропускается.
- Все три каталога применяются из сохранённого файла синхронно при старте Core,
  обновляются в фоне (TTL 15 минут), а при сбое чтения остаётся последний
  известный каталог или проверенный резервный список.
- Settings: нормализация и вкладки Claude, Codex и Kimi берут модели, подписи,
  описания и уровни рассуждений каждой модели из Core через RPC
  `list-provider-model-catalogs`. Renderer не держит собственных списков и не
  вычисляет уровень рассуждений Codex. Старые id нормализуются на каталог
  (`opus` → `opus[1m]`); недоступный в каталоге уровень сбрасывается на
  умолчание модели. Мёртвый пункт `Ultracode` у Opus исчез: адаптер Claude
  принимает только `low`..`max`.

## Проверка и идентичность пакета

Implementation commits `d097c5b8`…`73c3aa37` (живые каталоги Kimi/Codex/Claude,
объявление моделей в Kimi home, Settings на живых каталогах) прошли plan validation,
architecture, Ultracite, Knip, typecheck, docs-sync и полный набор тестов в
обязательных commit hooks. Сборка unsigned macOS arm64 package разрешена
пользователем («В конце собери и установи новый Релиз для моих проверок!»).

`npm run package:mac` из revision
`73c3aa37f643e6a5b0ce7b8d07b60e1dd99566fa` создал:

- renderer: `dist/renderer/assets/index-DVSecEaU.js`,
  `dist/renderer/assets/index-DGrvNM_0.css`;
- application: `release/mac-arm64/Harness AI.app`;
- bundle identifier: `ai.harness.desktop`;
- `app.asar` size: `32535782` bytes;
- `app.asar` modification time: `2026-11-02T18:35:32+0100`;
- SHA-256:
  `3437725505a1fd79ded31bcb64178f0b878e2f1e8e6e3d82c594361ce65ef503`.

После распаковки `app.asar` подтверждены модули `kimi-model-catalog.js`,
`codex-model-catalog.js`, `claude-model-catalog.js` и
`settings-model-catalogs.js`, а также маркеры `list-provider-model-catalogs`,
`listProviderModelCatalogs` (в том числе в renderer bundle),
`supportedModels`, `model/list`, `coding/v1/models`, `claude-fable-5`,
`gpt-6.1-sol` и `k3.1-pro`.

## Живое чтение из собранного runtime

Скрипт на `dist/runtime` вызвал три refresh-функции и
`settingsStoreFacade.listProviderModelCatalogs()`: все три чтения
`fulfilled`, все три файла `model-catalog.json` записаны в 18:36.

| Провайдер | Модели (уровни; умолчание) |
| --- | --- |
| Claude | `opus[1m]`, `claude-fable-5[1m]`, `sonnet` (low..max; medium), `haiku` (без уровней) |
| Codex | `gpt-6.1-sol` (low..ultra; low), `gpt-6-astra` (low..ultra; medium), `gpt-6.1-terra` (low..ultra; low), `gpt-6-sol` (low..ultra; medium), `gpt-6-luna` (low..max; medium), `gpt-5.6-sol` (low..ultra; low), `gpt-5.6-terra` (low..ultra; medium), `gpt-5.6-luna` (low..max; medium) |
| Kimi | `kimi-for-coding` K2.8 Preview (low/high/max; max), `kimi-for-coding-highspeed` (без уровней), `k3`, `k3-256k`, `k3.1-pro`, `k3.1-pro-highspeed` (low/high/max; high) |

Нормализованные умолчания настроек пользователя: Claude `sonnet`, Codex
`gpt-6.1-sol`, Kimi `k3`.

Пакет успешно запущен: main process `79103`, Core Runtime process `79116`.

## Известное

- `kimi-native-session-runtime.test.mjs` один раз упал при полном прогоне
  из-за порядка `turn_started` и первого ACP-уведомления fake CLI; в изоляции
  тест прошёл 6 раз из 6, а в commit hook задачи 130 — успешно. Это
  существующая гонка теста, не связанная с каталогами.

## Шаги ручной проверки

1. Settings → Claude: в списке есть Fable; у Haiku «Not adjustable».
2. Settings → Codex: в списке модели GPT-6.x, у каждой свой набор уровней
   (у Luna без Ultra).
3. Settings → Kimi: в списке K3.1 Pro и K3.1 Pro Highspeed; у K2.7 Code
   Highspeed «Provider managed».
4. Новая Kimi-сессия на K3.1 Pro с выбранным уровнем стартует и отвечает.
5. Новые сессии Codex (GPT-6.x) и Claude (Fable) стартуют на выбранной модели.
