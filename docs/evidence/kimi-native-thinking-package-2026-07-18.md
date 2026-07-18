# Kimi Native Thinking Package Evidence (2026-07-18)

## Контекст

Пользователь оспорил вывод «thinking — ограничение провайдера» («я всегда
считал, что его отключить нельзя, а не включить нельзя») — и оказался
прав. Веб-исследование + живые probes на CLI `0.26.0`:

- По документации Kimi Code K2.7 Code (`kimi-for-coding`) — thinking-
  модель: без Thinking mode запросы роутятся на K2.6. В наших captured
  native-запросах CLI слал `"thinking": {"type": "disabled"}`.
- Отказы CLI шли из МИГРИРОВАННОГО ЛЕГАСИ-КОНФИГА пользователя
  (migrator 0.1.1, 2026-06-21): устаревший ключ `default_thinking`
  (заменён секцией `[thinking]`) и модельные секции без
  `capabilities`/`support_efforts`, из которых CLI строит «Supported
  efforts».
- С декларациями (`[thinking] enabled`, `capabilities = ["thinking",
  "tool_use"]`, `support_efforts = ["low","high","max"]`) все три модели
  Coding Plan стримят `agent_thought_chunk` (31/23/16 чанков в probes).
- Уровень усилия CLI читает из `[thinking].effort` один раз на старте
  процесса; ACP-опция thinking переключает только off/on, и `on`
  ПЕРЕЗАПИСЫВАЕТ уровень дефолтным high (проверено: конфиг max + on →
  wire high).

## Стрим 7: реализация (по приказу «все три режима, выбор как у других
провайдеров, в карточке и в settings»)

- `feat: declare Kimi thinking in workspace config` (`dfb51c41`) —
  bootstrap workspace-home: upsert `[thinking]` (enabled, keep=all,
  дефолт high), вычистка deprecated-ключа из копии, инъекция
  capabilities/support_efforts в существующую секцию модели и в
  генерируемые секции; `writeKimiThinkingEffort`/`readKimiThinkingEffort`.
- `feat: apply Kimi native thinking effort` (`fbe42925`) — прокладка
  effort adapter -> driver -> runtime.
- `feat: route Kimi reasoning effort from settings` (`5f22674f`) —
  `kimiClient.reasoningByModel` (workspace-проекция, нормализация
  low/high/max, дефолт high) + ветка `kimi-client` в
  `buildProviderTurnOptions`.
- `feat: show Kimi reasoning in Settings and panel` (`3f8a189c`) — общий
  `ModelRows` получил слот контрола строки; строки Kimi-моделей в
  Settings несут Reasoning select (low/high/max); бейдж уровня в панели
  сессии.
- `fix: apply Kimi thinking effort at session start` (`cbdef4b1`) — три
  живых находки: (1) драйвер открывает CLI eagerly при создании сессии,
  поэтому отличающийся уровень первого хода теперь чисто перезапускает
  ещё-пустой child с записанным уровнем; (2) relaunch сбрасывает
  applied-модель — иначе свежая CLI-сессия тихо оставалась на дефолтной
  модели; (3) `thinking=on` больше не отправляется, когда thinking
  управляется конфигом (он затирал уровень).

## Смоук на dist (живой CLI 0.26.0)

Сессия с моделью `k3` и effort `max` из настроек: рабочая CLI-сессия
гоняет `llm.request` с `modelAlias: "k3"`, `thinkingEffort: "max"`,
thinking-пузырь приходит в диалог, ответ получен.

## Package

- Команда: `npm run package:mac` — exit 0 (упаковка подтверждена
  пользователем отдельно).
- Артефакт: `release/mac-arm64/Harness AI.app`.
- Timestamp `app.asar`: `2026-07-18 08:39 +0200`.
- SHA-256 `app.asar`:
  `f9ee8c1e2ac4d30ea4482f3f6144b89ff78ea841366631731ffdf465283fcc29`.
- Binary grep `app.asar`: `ensureThinkingDeclarations` — 2,
  `writeKimiThinkingEffort` — 4, `readKimiThinkingEffort` — 4,
  `KIMI_REASONING_EFFORTS_BY_MODEL` — 2, `kimi_thinking_effort_locked` — 1.
