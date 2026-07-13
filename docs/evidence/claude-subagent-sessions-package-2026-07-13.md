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

## Repackage 2026-07-13 (acceptance fix)

Первый пользовательский retest НЕ показал сабагентов: адаптер строил путь
родительского транскрипта как `projects/<claudeProjectSlug>/…` с
захардкоженным в facade слагом `harness-ai`, тогда как Claude CLI создаёт
slug-каталог из своего cwd (например,
`-Users-oleksandroliinyk-VSCODE-Test-md`). Observer сканировал пустой
каталог и не эмитил событий.

Фикс `fec5c850` — `fix: resolve claude subagent transcript path by scan`:
файловый слой получил `findParentTranscriptPath` (скан slug-каталогов
projects-root — та же устойчивость, что у context-usage tail reader),
observer находит транскрипт лениво (файл появляется только с первым turn)
и сбрасывает найденный путь при смене session id; адаптер передаёт
projects-root вместо slug-пути.

Верификация фикса: smoke-прогон observer над реальными файлами сессии
`db50d8e3-…` (Test_md) — 3 × spawn с моделью `claude-opus-4-8` и задачами
«Summarize archive group 1/2/3», транскрипты в child-каналы
(2/3/2 сообщений), 3 × terminal `completed`. Повторный
`electron-builder --mac dir` — exit 0, `app.asar` пересобран
(`findParentTranscriptPath` присутствует в упакованном runtime).
Примечание: два прогона `npm run package:mac` подряд оборвались с exit 144
до этапа packaging; прямой `npx electron-builder --mac dir --publish never`
поверх свежего `dist/` завершился успешно.

## Repackage 2 — 2026-07-13 (context menu hit area)

Пользователь подтвердил видимость сабагентов Claude после первого repackage,
но правый клик по имени сессии открывал меню «через раз»: обработчик
`contextmenu` висел только на кнопке заголовка, и попадание в остальную
часть строки (padding, chevron дерева, иконка detach) молча ничего не
делало, а при открытом меню глобальный pointerdown-закрыватель просто
прятал его.

Фикс `2f874f58` — `fix: open session context menu from the whole row`:
кнопка заголовка растянута на свободную ширину/высоту строки
(`flex: 1` + `align-self: stretch`), chevron- и detach-кнопки получили тот
же contextmenu-обработчик (a11y-линт запрещает обработчики на
неинтерактивном div строки). Subagent-строки по-прежнему без меню.
Повторная сборка: `npm run build` (exit 0) + `npx electron-builder --mac
dir --publish never` (exit 0), `app.asar` пересобран.

## Repackage 3 — 2026-07-13 (context menu clipping)

Retest после repackage 2 показал, что right-click delete всё ещё не
работает при одной сессии в списке. Живая диагностика через DevTools в
упакованном приложении (computer-use) дала точный диагноз: меню
РЕНДЕРИЛОСЬ (React-обработчик и state исправны), но absolute-меню
позиционируется под строкой, а прокручиваемый `.session-list`
(overflow hidden/auto) обрезает всё за пределами своего контента — при
одной сессии меню целиком ниже нижней границы списка (menu top=179 vs
list bottom=175) и полностью невидимо; при длинном списке помещается —
отсюда «работает через раз». Фикс зоны клика (repackage 2) был полезен,
но корень был в клиппинге.

Фикс `08cb397b` — `fix: escape session context menu from list clipping`:
меню рендерится `position: fixed` с якорем по viewport-rect строки,
захваченным при открытии (fixed не подвержен overflow-клипу; у предков
нет transform), и закрывается при scroll/resize.

Верификация end-to-end в упакованном приложении через computer-use:
right-click по строке сессии → меню появилось → Delete → карточка
«Удалить сессию?» → Delete → сессия исчезла из sidebar; каскад подтверждён
файлово (index.json пуст, event JSONL и provider transcript удалены).
Сборка: `npm run build` + `npx electron-builder --mac dir` — exit 0.

## User Acceptance

- Ожидает проверки пользователем в упакованном приложении:
  1. Живой запуск сабагентов в Claude-сессии → info-панель в диалоге,
     дети в sidebar-дереве, read-only child-диалог с транскриптом.
  2. Терминальные статусы после завершения сабагентов.
  3. Восстановление дерева/статусов/транскриптов после перезапуска.
  4. Каскадное удаление при удалении родительской сессии.
  5. Информационная панель без кнопок для Codex и Claude.
