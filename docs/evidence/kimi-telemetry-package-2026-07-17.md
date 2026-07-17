# Kimi Telemetry Package Evidence — 2026-07-17

## Scope

Пересборка macOS пакета по дефект-фидбеку пользователя на упакованный
profile-routing build (workspace `/Users/oleksandroliinyk/VSCODE/Test_md/`,
stream 4 активного плана; упаковка предавторизована тем же приказом):
нативные Kimi-сессии не показывали активность сабагентов, нижнюю
статус-панель (контекст/кэш/turns), верхние лимиты и плашки рассуждений.

- **Сабагенты**: Kimi ACP не имеет отдельных subagent-дискриминаторов —
  сабагенты приходят как `Agent`/`AgentSwarm` tool_call-апдейты (результат
  несёт `agent_id`/`actual_subagent_type`/`status`). Новый
  `kimi-subagent-normalizer` синтезирует provider-neutral жизненный цикл
  (`subagent_control` spawn + `subagent_session` c task из `rawInput`,
  терминальные session/status с ролью из результата; синтетический child id
  `kimi-agent-<toolCallId>`, один child на tool call), питая тот же
  Core-граф и разделитель «Subagents launched», что у Claude/Codex.
- **Токены/кэш**: CLI 0.26.0 не шлёт live `usage_update`; после каждого
  хода runtime читает сессионный стор CLI
  (`sessions/<wd_*>/<acpSessionId>/agents/main/wire.jsonl`, последняя
  строка `usage.record`/`step.end`) и эмитит общий `token_usage`
  (`used = inputOther+output+inputCacheRead+inputCacheCreation`,
  `cached = inputCacheRead`, limit `262144`).
- **Нижняя панель**: `kimi-client` объявлен в capability-таблицах
  (`showCache`, `showTurns`, default limit `262144`, cached стартует с 0);
  turns считаются Core по `turn_completed`.
- **Верхние лимиты**: восстановлен ридер
  `GET https://api.kimi.com/coding/v1/usages` (Bearer: ключ Harness либо
  fallback на `api_key` из `~/.kimi-code/config.toml`; `limits[0].detail` ->
  5h, `usage` -> Weekly; числа приходят строками), `refreshUsageLimits` на
  адаптере Kimi + `kimi-client` в pending/scope/label-таблицах телеметрии.
  Keyed-таблицы лимитов вынесены в `usage-context-limit-scopes.ts`
  (500-line cap фасада).
- **Плашки рассуждений — честное ограничение CLI**: `session/new`
  объявляет thinking select (off|on), но CLI 0.26.0 отвергает включение
  (`Internal error`) для конфигурации пользователя, а модели-алиасы из
  config.toml опцию не показывают вовсе (проверено серией живых проб, в
  т.ч. с клонированным home: k3-алиас доступен, thinking — нет).
  Реализован best-effort запрос thinking при открытии сессии с
  диагностическим событием при отказе: будущие версии CLI/модели с
  поддержкой thinking начнут давать плашки без изменений Harness
  (нормализатор `agent_thought_chunk` готов).

Implementation commits:

- `e550da30064ecc88f32103353020b7c3f092ce84` —
  `plan: add Kimi session telemetry stream`.
- `e8b25f9c6f6d8fd2d3ef2b9a550e8f67a8191b29` —
  `feat: surface Kimi native subagents`.
- `6c429570ab4dec80ef7769d938bb5866c9f11599` —
  `feat: read Kimi native token usage`.
- `24f9592d3dd543e3aef51333defb6215266dc60d` —
  `feat: enable Kimi status panel telemetry`.
- `4c01157848416d636527eee02cc59873dc309ef2` —
  `feat: broadcast Kimi usage limits`.
- `81759ca5ae2e7fc52c4af3626546672a8c76872c` —
  `feat: request Kimi native thinking best effort`.

## Verification

- Commit hooks — PASS на каждом коммите (полный набор; 123 test groups к
  финальному коммиту; новые focused-тесты: subagent-синтез на реплее живого
  лога, wire.jsonl parse/locate, capability-таблицы kimi в телеметрии,
  limits-ридер на живом payload c TOML-fallback, thinking-refusal путь).
- Live pre-package smoke на установленном CLI `0.26.0` (реальный
  `~/.kimi-code`): нативная сессия со спавном сабагента дала полную
  последовательность `subagent_control:spawn` ->
  `subagent_session:running` -> `...:task=Reply with READY` ->
  `...:completed:role=coder` -> `subagent_status:completed`, затем
  `token_usage {"cached":17152,"limit":262144,"used":19281}` из сессионного
  стора и `turn_completed`; `readKimiUsageLimitsEvent()` вернул живые
  бакеты (5h `percentUsed:25`, Weekly `percentUsed:8` с resetTime).

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-17 14:14 +0200`.
- Size: `32,309,653` bytes.
- SHA-256:
  `3ec7c92f9b1f132d4907993013387759f80d027ea5d46df5b36a0e2c17c02b9a`.
- Упакованный `app.asar` содержит новый код (binary grep):
  `kimi-subagent-normalizer` / `kimi-session-usage-reader` /
  `kimi-usage-limits` — 6 совпадений.
- `npm run package:mac` завершился с exit 0.

## User Retest

Пользовательская проверка (задача `harness-ai.phase8.stream1.task8`):
перезапустить упакованное приложение, в нативной Kimi-сессии с сабагентами
увидеть разделитель «Subagents launched», в нижней панели — контекстное
окно/Cache/Turns, в верхней — лимиты 5h/Weekly; ограничение thinking
принято как документированное поведение CLI 0.26.0.

## Adoption Fix Repackage (same day)

Ретест пользователя на telemetry-сборке: сабагенты не видны, диалог молчит
до конца хода. Причина (подтверждена по session JSONL воркспейса Test_md +
коду): Core создавал child-сессию и «усыновлял» её на родительский адаптер
вызовом `adapter.subscribe("kimi-agent-<toolCallId>")`; адаптер такие
синтетические id не распознавал и бросал `Unknown kimi-client session` —
исключение убивало публикацию `session:subagent-call` (разделитель) и
обрывало доставку остальных событий батча (тишина). В JSONL: child-файл
`session-subagent-*` создан, `session:subagent-call` в родителе
отсутствует.

Fix `fix: adopt Kimi synthetic subagent channels`
(`53c6ceb15d13a08088c47823a51ce706975a4838`):

- `kimi-client` адаптер обслуживает `kimi-agent-*`
  (`isKimiNativeSubagentSessionId`) как инертный канал: subscribe -> no-op
  unsubscribe, stop/delete -> no-op, resume -> echo id, sendMessage ->
  честный отказ (у сабагента нет собственного provider-канала).
- Драйвер нативных сессий изолирует ошибки слушателей: один бросающий
  потребитель больше не рвёт доставку остальным и не валит нативный ход.
- Тесты: adoption-поверхности адаптера для `kimi-agent-*` не бросают и не
  трогают драйвер; бросающий listener в driver-фан-ауте не мешает доставке
  (полный permission-цикл проходит при «ядовитом» слушателе).

Repackage:

- Timestamp: `2026-07-17 15:46 +0200`.
- SHA-256:
  `30de6558f62f1a367e85cd80e44e50c4585fadce955d7bf2be442981032bb159`.
- Binary grep: `isKimiNativeSubagentSessionId` — 7 совпадений в `app.asar`.
- `npm run package:mac` — exit 0.
