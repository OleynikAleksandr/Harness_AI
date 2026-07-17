# Kimi Native Model Config Package Evidence (2026-07-17)

## Контекст

Пользовательский вопрос «почему в диалоге нет Thinking» привёл к живой
диагностике на CLI `0.26.0` (probes через dist-транспорт):

- Thinking — ограничение провайдера, а не Harness: наш runtime отправляет
  `session/set_config_option {thinking, "on"}` при каждом открытии, CLI
  отвечает: `Thinking effort "on" is not supported by model
  "kimi-for-coding". Supported efforts: off.` `default_thinking = true` в
  config.toml тоже не включает опцию, у config-aliased моделей она скрыта
  целиком. В native wire.jsonl каждый `llm.request` уходит с
  `thinkingEffort: "off"` — reasoning-контента нет нигде.
- Попутный дефект: выбор каталожных моделей не работал — CLI отвечал
  `Model "k3" is not configured in config.toml. Add a [models."k3"] entry
  with max_context_size.` Все нативные сессии тихо работали на дефолтной
  `kimi-for-coding`, хотя панель показывала выбранную Core-модель.

## Фикс

`feat: declare Kimi native models in workspace home` (`789ec9a5`):
bootstrap workspace-home на каждом prepare дописывает отсутствующие
секции `[models.kimi-for-coding-highspeed]` и `[models.k3]` в копию
`config.toml` (provider наследуется из модельной секции пользователя,
`max_context_size = 262144`); существующие секции и локальные правки не
трогаются (append-only, идемпотентно).

## Смоук на dist (живой CLI 0.26.0)

- `config.toml` workspace-home получил `[models.k3]`.
- Диагностик отказа модели не эмитится; хронология wire.jsonl:
  `config.update modelAlias: kimi-for-coding` (старт) ->
  `config.update modelAlias: "k3"` (после выбора) ->
  **`llm.request model: "k3"`** — сессия реально работает на k3.
- Ответ ассистента получен, сессия удалена штатно.

## Package

- Команда: `npm run package:mac` — exit 0 (упаковка пре-авторизована
  приказом пользователя «чиним + упаковка и ретест»).
- Артефакт: `release/mac-arm64/Harness AI.app`.
- Timestamp `app.asar`: `2026-07-17 20:55 +0200`.
- SHA-256 `app.asar`:
  `df3585549af9aea6b006dbf0fce277537ae1a3c449ed27d664bb1056240c2bbe`.
- Binary grep `app.asar`: `ensureCatalogModelSections`/`CATALOG_MODEL_IDS`
  — 4 совпадения.
