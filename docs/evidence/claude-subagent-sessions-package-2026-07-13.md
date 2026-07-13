# Claude Subagent Sessions Package Evidence — 2026-07-13

## Scope

Явно одобренная пользователем пересборка macOS пакета со scope
`claude-subagent-sessions-2026-07-13`
(`docs/architecture/ClaudeSubagentSessions.md`):

1. Сабагенты провайдера Claude получили Codex-паритетную видимость через
   файловый наблюдатель в модуле `claude-provider` (Core/UI контракты
   не менялись):
   - файловый слой читает native-хранилище Claude CLI
     (`<sessionId>/subagents/agent-<agentId>.meta.json` + `.jsonl`,
     `toolUseResult` в родительском JSONL);
   - нормализатор проецирует файлы в provider-neutral события
     (`subagent_control`/`subagent_session`/`subagent_status`) и
     message-события child-канала со стабильными id для Core dedupe;
   - observer ведёт turn-scoped поллинг (1.5 с) с финальным сканом на
     завершении turn и hydration-скан при create/resume; сканы
     сериализованы, replay-once на процесс; незавершённый сабагент при
     hydration получает `interrupted`;
   - адаптер: события в родительский канал, транскрипт — в child-каналы
     `agent-<agentId>` через существующую буферизацию `dispatchMessage`;
     pseudo-resume child id (сабагент — не SDK-сессия); каскадная чистка
     файлов: удаление родителя удаляет каталог `<sessionId>/`.
2. Карточка запуска сабагентов в диалоге (оба провайдера) стала чисто
   информационной панелью: количество запущенных сабагентов + перечень
   делегированных задач; кнопки открытия/открепления и статусы остались
   только в sidebar-дереве (решение пользователя 2026-07-13).

Implementation commits:

- `223454d3655ddbaab73c9347133405bc7f3c3503` —
  `feat: add claude subagent file reader`;
- `ca07990b0f407d25755d4d4083306ef3fefbd234` —
  `feat: normalize claude subagent transcript events`;
- `4ce9738e5d9c87d8180bfb5c1382cf2453a982c6` —
  `feat: wire claude subagent events into adapter` (включает файлы
  observer: knip-гейт требует потребителя в том же commit);
- `c85330c78ec1f12927074c9fce4eef4427f0d597` —
  `feat: cascade claude subagent artifact cleanup`;
- `73657dbe761b691ed774ea9ebfaabcd04cfc4b9c` —
  `feat: make subagent timeline card informational`.

## Verification

- Commit hooks на каждом коммите — PASS: plan validate, staged ultracite,
  architecture, lint, knip, typecheck, tests (95 test files на финальном
  коммите), docs-sync.
- Unit-тесты scope: файловый слой (скан/инкрементальный tail/partial line/
  toolUseResult), нормализатор (spawn/terminal mapping/транскрипт),
  observer (hydration завершённого и незавершённого, live-поллинг,
  replay-once), адаптер (source-контракт wiring), cleanup (родитель/child/
  идемпотентность), timeline (info-панель без controls).
- `npm run package:mac` — exit 0, свежий
  `release/mac-arm64/Harness AI.app` (app.asar пересобран 2026-07-13).

## User Acceptance

- Ожидает проверки пользователем в упакованном приложении:
  1. Живой запуск сабагентов в Claude-сессии → info-панель в диалоге,
     дети в sidebar-дереве, read-only child-диалог с транскриптом.
  2. Терминальные статусы после завершения сабагентов.
  3. Восстановление дерева/статусов/транскриптов после перезапуска.
  4. Каскадное удаление при удалении родительской сессии.
  5. Информационная панель без кнопок для Codex и Claude.
