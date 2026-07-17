# Kimi Native Access Package Evidence (2026-07-17)

## Контекст

Пользователь подтвердил работу swarm-видимости на сборке `45a98092…`, но
до приёмки заказал два паритетных исправления (стрим 5 активного плана):

1. Нативные Kimi-сессии должны идти с полным доступом — карточки
   Tool permission постоянно прерывают работу.
2. Kimi должен запускаться в provider home конкретного воркспейса, как
   Claude/Codex: сейчас все native-сессии ложатся мусором в общий
   `~/.kimi-code/sessions/`, и удаление Harness-сессии их не убирает.

## Фиксы

- `feat: enable Kimi native full access mode` (`10bca1cc`) — при открытии
  нативной сессии runtime отправляет
  `session/set_config_option {configId: "mode", value: "yolo"}`. Проверено
  живьём на CLI `0.26.0`: опция принимается, ход с Bash-командой не даёт
  ни одного `session/request_permission`. Отказ будущей версии CLI не
  убивает сессию: один честный диагностик
  `kimi_full_access_unavailable`, permission-мост остаётся fail-closed.
- `feat: run Kimi native sessions in workspace home` (`2a2482e6`) — новый
  `kimi-workspace-home.ts`: CLI-ребёнок запускается с
  `HOME=<workspace>/.harness/runtime/providers/kimi/home` (резолв через
  общий provider-home manager), auth шарится симлинками
  `credentials`/`device_id` на реальный `~/.kimi-code`,
  `config.toml`/`tui.toml` копируются один раз, бинарь CLI остаётся
  глобальным. Store сессий ложится внутрь воркспейса; ридеры usage и
  swarm-прогресса читают workspace store. Пара
  `providerSessionId -> acpSessionId` персистится в
  `harness-session-map.json`, и `deleteSessionArtifacts` адаптера удаляет
  каталог native-сессии при удалении Harness-сессии (паритет с
  `deleteClaudeTranscriptArtifacts`).

## Смоук на dist (живой CLI 0.26.0)

- Промпт с прямой Bash-командой + рой из 2 агентов: **0** interaction-
  запросов за весь ход.
- Store создан в `<ws>/.harness/runtime/providers/kimi/home/.kimi-code/
  sessions/wd_…`; в глобальном `~/.kimi-code/sessions/` новых каталогов
  нет.
- Swarm-жизненный цикл цел (root + 2 live-агента, терминалы, результат).
- `token_usage {cached: 20123, used: 20226, limit: 262144}` прочитан из
  workspace store.
- После удаления сессии каталог `session_*` вычищен, map пуст.

## Package

- Команда: `npm run package:mac` — exit 0.
- Артефакт: `release/mac-arm64/Harness AI.app`.
- Timestamp `app.asar`: `2026-07-17 20:00 +0200`.
- SHA-256 `app.asar`:
  `f2649d6b8507f54d1108d2677ca2d29e77ae5f4d7cc11ae11ca740be46b0ff90`.
- Binary grep `app.asar`: `prepareKimiWorkspaceHome` — 4,
  `deleteKimiNativeSessionArtifacts` — 4, `harness-session-map` — 1,
  `kimi_full_access_unavailable` — 1.
