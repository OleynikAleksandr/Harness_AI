# Kimi Swarm Visibility Package Evidence (2026-07-17)

## Контекст

Ретест пользователя на сборке `30de6558…` (adoption-fix): родительский
Kimi-агент «запускает один сабагент, потом сессия умирает». Диагноз по
session JSONL воркспейса Test_md + стору CLI + headless-репро: сессия не
умирала — пользователь одобрил обе permission-карточки, CLI запустил
AgentSwarm на 18 агентов, ACP-стрим во время работы роя не шлёт ничего
(репро: рой из 3 агентов = 14 с полной тишины), диалог показывал одну
карточку `running` без задачи, и после 44 с тишины пользователь нажал
Stop (`turn.cancel` в wire; рой оборван «completed: 17, aborted: 1» — 17
из 18 агентов уже финишировали). После Stop карточка навсегда осталась
`running`: Core отписывается раньше, чем CLI доставит терминальные
события.

## Скоуп B (выбор пользователя 2026-07-17): фиксы

- `feat: surface Kimi swarm input and results` (`5628ebf8`) — normalizer
  аккумулирует стрим-ввод (частичный JSON в `content`; `rawInput` для
  роя не приходит) до успешного парса: карточка роя получает задачу
  `<description> (N agents)`; финальный `agent_swarm_result` разбирается
  на `<subagent agent_id item outcome>`-секции: каждый агент
  материализуется как ребёнок `kimi-agent-<toolCallId>:<agent_id>` и
  закрывается честным статусом (`aborted` -> `interrupted`).
- `feat: stream Kimi swarm live progress` (`ef156ad5`) — новый
  `kimi-swarm-progress-reader`: пока ход активен, runtime раз в 2 с
  сканирует стор CLI (`agents/agent-N/`), и каждый замеченный агент
  живьём спавнится running-ребёнком с делегированным промптом из его
  `wire.jsonl` (разделитель растёт во время работы роя). Файловая
  терминальность намеренно не определяется (повторный `turn.prompt`
  оживляет «завершённый» wire) — терминалы приходят из swarm result.
- `feat: deliver Kimi agent results to child sessions` (`0a3c86a7`) —
  контракт `ProviderSubagentSessionEvent.result`; Core публикует текст
  один раз assistant-сообщением ребёнка при живой терминализации: клик
  по завершённой карточке агента показывает его результат (для корня
  роя — сводка `completed: N…`, для одиночного Agent — тело после
  `[summary]`).
- `fix: close running subagent calls on turn stop` (`1d232c48`) —
  provider-neutral: `SessionTurnStop` закрывает все running/pending
  субагентные ветки остановленной сессии статусом `interrupted` через
  штатный lifecycle; карточки больше не виснут `running` после Stop.

## Смоук на dist (живой CLI 0.26.0, рой из 3 агентов)

- +0.3 с — карточка роя получила задачу из распарсенного ввода.
- +0.9 с — три live-спавна агентов с реальными промптами (a.md/b.md/c.md).
- 32 с работы роя — карточки running с задачами.
- Терминал: агенты `completed` (task = item, result = полный текст),
  корень `completed` со сводкой `completed: 3`; `turn_completed`.
- Permission-карточка запрошена и одобрена штатно.

## Package

- Команда: `npm run package:mac` — exit 0.
- Артефакт: `release/mac-arm64/Harness AI.app`.
- Timestamp `app.asar`: `2026-07-17 19:19 +0200`.
- SHA-256 `app.asar`:
  `45a98092bfddf930622062dc193812169bc258f4bfbcc320e625720808ae2c5b`.
- Binary grep `app.asar`: `registerLiveSwarmAgents` — 4,
  `readKimiSwarmAgents` — 3, `publishChildResultMessage` — 2,
  `interruptSubagentChild` — 2.
