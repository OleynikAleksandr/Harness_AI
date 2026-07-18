# Kimi Context And Update Channel Package Evidence (2026-07-18)

## Контекст

После приёмки дефект-фиксов пользователь показал скриншоты десктопного
Kimi app (модели «K3» / «K3 Swarm», «Conversation capacity:
Standard / Extra Long (1M)») и приказал: включить честное контекстное окно
K3 и разобраться, почему карточка Kimi Versions не видит вышедший
CLI `0.27.0`. Исследование (read-only):

- Живой каталог Coding Plan `GET https://api.kimi.com/coding/v1/models`
  (Bearer-ключ подписки): `kimi-for-coding` 262144,
  `kimi-for-coding-highspeed` 262144, `k3` **1048576** (модель с 1M
  контекстом; `think_efforts` low/high/max, default max). Отдельной модели
  «k3-swarm» в каталоге НЕТ.
- «K3 Swarm» в Kimi app — продуктовая упаковка режима Agent Swarm. В CLI
  это swarm mode (`/swarm`, system-reminder «дроби задачу до 128
  сабагентов», авто-approve AgentSwarm). ACP-поверхность CLI 0.26.0 его НЕ
  экспонирует: `session/set_config_option` маршрутизирует только
  `model`/`mode`/`thinking`, остальное отвечает `-32602`. Включение
  отложено до экспозиции в ACP; AgentSwarm уже работает по прямому
  запросу.
- Наш бутстрап workspace-home писал для `k3` `max_context_size = 262144`,
  зарезая окно вчетверо (CLI компактит по этому значению, панель считала
  проценты от 256K).
- Карточка Versions читала только пассивный файл
  `~/.kimi-code/updates/latest.json`, который CLI освежает лишь при
  собственных запусках; наши сессии живут в workspace-home с выключенным
  auto-update, файл замёрз на `0.26.0` (checkedAt 2026-07-16), тогда как
  CDN-канал самого CLI `https://code.kimi.com/kimi-code/latest.json`
  (302 redirect -> JSON-манифест `{version, publishedAt, rollout[]}`) уже
  публикует `0.27.0` (2026-07-17T13:17:41Z, rollout 30/30/40).

## Стрим 9: реализация

- `feat: declare Kimi model context lengths in Core catalog` (`39710371`)
  — `ProviderModelDescriptor.contextLength`, живые значения в
  `KIMI_CLIENT_MODELS`, резолвер `kimiClientModelContextLength`, панельный
  дефолт `kimi-client` стал per-model (свежая k3-сессия стартует с 1M до
  первого хода).
- `feat: read live Kimi model contexts` (`79da3da2`) —
  `kimi-model-catalog.ts`: живой каталог с общим ключ-резолвером
  (`resolveKimiApiKey` экспортирован из usage-limits), merge поверх
  Core-фолбэка, memo на процесс (TTL 15 мин), офлайн — мгновенный фолбэк.
- `feat: write Kimi per-model context truth` (`07ec8efe`) —
  `prepareKimiWorkspaceHome` принимает `modelContexts`; генерируемые
  секции берут окно из карты; managed-upsert чинит `max_context_size`
  существующих каталожных секций (262144 -> 1048576 для k3);
  `parseKimiWireUsage`/`readKimiSessionTokenUsage` принимают `limit`.
- `feat: route Kimi model contexts to native sessions` (`ec9f511c`) —
  адаптер резолвит карту на create/resume, драйвер несёт её в runtime,
  runtime кормит бутстрап и резолвит лимит `token_usage` по применённой
  модели.
- `feat: check live Kimi update channel` (`6a38c4a1`) —
  `readKimiCliVersionStatus` читает CDN-манифест канала (follow redirect,
  3s abort, строгая проверка release-строки) с фолбэком на пассивный
  state-файл; карточка Versions теперь видит `0.27.0`.

## Package

- Команда: `npm run package:mac` — упаковка пре-авторизована приказом
  2026-07-18; ложный exit 144 pipe-артефакта (билд успешен, см. память
  kb) — лог заканчивается штатными строками electron-builder.
- Артефакт: `release/mac-arm64/Harness AI.app`.
- Timestamp `app.asar`: `2026-07-18 10:38 +0200`.
- SHA-256 `app.asar`:
  `adac9d21dbe05d3a98ac91f148324a0f78c887c5d5898f0a204c4fe968b6db3b`.
- Binary grep `app.asar`: `code.kimi.com/kimi-code/latest.json` — 1,
  `coding/v1/models` — 3, `kimiClientModelContextLength` — 3,
  `resolveKimiModelContexts` — 5, `1048576` — 22.
