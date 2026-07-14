# Claude Subagent Sessions

Статус: планирование (2026-07-13). Scope: `claude-subagent-sessions-2026-07-13`.

## 1. Цель

Обеспечить для провайдера Claude тот же пользовательский опыт работы с
сабагентами, который уже реализован для Codex
(`docs/architecture/SubagentSessions.md`):

- разделительная линия «Subagents launched» в timeline диалога родительской
  сессии со счётчиком запущенных сабагентов;
- дочерние сессии в дереве sidebar («N субагентов · M работают»);
- read-only диалог дочерней сессии (транскрипт: делегированная задача,
  reasoning, ответы);
- восстановление всей картины после перезапуска приложения;
- каскадное удаление артефактов детей при удалении родителя.

Сегодня Claude-провайдер полностью игнорирует сабагентов: в event-логе Core
фиксируются только тексты user/assistant/thinking основной сессии, событий
`ProviderSubagentEvent` нет, панель диалога пуста (подтверждено живой сессией
`d47f61c9-…` в workspace `Test_md`, где основной агент запускал 3 сабагентов).

## 2. Ключевой архитектурный факт: Core и UI уже готовы

Контракт сабагентов provider-neutral и полностью реализован для Codex:

- Provider boundary: `ProviderSubagentControlEvent` / `ProviderSubagentSessionEvent`
  / `ProviderSubagentStatusEvent` + `isProviderSubagentEvent`
  (`provider-adapter-contract-facade.ts`).
- Core: `SessionSubagentLifecycle` (child `CoreSession` c
  `sessionKind: "subagent"`, монотонный terminal guard, `CoreSubagentCall`,
  событие `session:subagent-call`, коалесинг, каскадное удаление, персистентный
  event JSONL, восстановление до provider replay).
- UI: `SubagentLaunchDivider`, `SessionTree`, `SubagentSessionHeader` —
  рендерят только Core read-model.

Механика доставки: провайдер эмитит `subagent_control` (spawn) в канал
родительской сессии; Core создаёт child-сессию и вызывает
`adoptProviderSession`, который делает `adapter.subscribe(childProviderSessionId)`
на том же адаптере. Значит **вся работа — только внутри модуля
`claude-provider`**: научить его эмитить события контракта и обслуживать
child-каналы. Core-контракты, read-model и UI-компоненты не меняются.

`ClaudeProviderAdapter` уже содержит нужную инфраструктуру каналов:
`subscribe(sessionId)` / `dispatchMessage(sessionId, payload)` с буферизацией
`pendingEvents` до подписки — child-каналы ложатся на неё без переделок.

## 3. Native-формат сабагентов Claude CLI (проверено на живых данных, CLI 2.1.207)

Каталог проекта: `<claude home>/.claude/projects/<workspace-slug>/`.

- Основная сессия: `<sessionId>.jsonl`.
- Сабагенты: `<sessionId>/subagents/agent-<agentId>.jsonl` (полный транскрипт)
  + `agent-<agentId>.meta.json` (создаётся в момент спавна).
- `meta.json`: `{ agentType, description, toolUseId, spawnDepth }`.
  `toolUseId` совпадает с id блока `tool_use` инструмента `Agent`
  в родительском JSONL — это ключ связи родитель↔ребёнок.
- Родительский JSONL: спавн виден как `assistant`-запись с блоком
  `tool_use { name: "Agent", input: { subagent_type, description, prompt,
  run_in_background } }`; завершение — `user`-запись с `tool_result` и
  верхнеуровневым полем `toolUseResult { status, agentId, agentType, content,
  resolvedModel, totalDurationMs, totalTokens, totalToolUseCount, usage,
  toolStats }`.
- JSONL сабагента: записи помечены `isSidechain: true`, `agentId`,
  `sessionId` родителя; первая запись — делегированный промпт (`type: user`),
  далее обычные `assistant`-записи (текст/thinking/tool_use) и `user`
  tool_result.
- Промежуточных progress-событий в родительской сессии нет. Живой прогресс —
  только растущий `agent-<agentId>.jsonl`. Статус «выполняется» выводится:
  meta.json существует, `toolUseResult` в родительском JSONL ещё нет.

## 4. Решение: файловый наблюдатель в claude-provider

### 4.1 Почему файлы, а не live-стрим SDK

`SubagentSessions.md` запрещает парсить raw rollout JSONL для Codex — там
источник правды — структурные RPC app-server (`thread/list`, `thread/read`).
У Claude SDK структурного API перечисления сабагентов нет; каталог
`subagents/**` и есть его native-формат хранения. Прецедент файлового чтения
в claude-provider был принят архитектурой ещё context-usage tail reader-ом
(`claude-context-usage-provider-jsonl.ts`; сам probe выведен из эксплуатации
2026-07-14 — токены теперь идут из SDK usage tracker, но файловый прецедент
остаётся в силе для сабагентов). Проверка живых данных показала,
что SDK-стрим основной сессии не доставляет транскрипт сабагентов
(пересечение uuid событий Core-лога и сабагентских JSONL — ноль), поэтому
файловый источник — единственный полный. Правило «UI не классифицирует»
не нарушается: весь парсинг живёт в провайдере, Core/UI получают
нормализованные события.

Единый файловый источник покрывает и live-наблюдение, и hydration одним кодом
— это осознанное упрощение по сравнению с Codex (там live-события и
history-loader — разные каналы).

### 4.2 Компоненты (все — внутри модуля `claude-provider`)

1. **`reference/subagents/claude-subagent-files.ts`** — файловый слой:
   - скан `<projects>/<slug>/<sessionId>/subagents/` (пары meta.json + jsonl);
   - парс meta.json;
   - инкрементальный tail JSONL по offset (подход ныне выведенного
     context-usage tail reader-а):
     дочитывание новых строк agent-JSONL и родительского JSONL;
   - извлечение `toolUseResult` с `agentId` из родительских записей.
2. **`reference/subagents/claude-subagent-event-normalizer.ts`** — чистая
   нормализация:
   - meta.json → `subagent_control` (spawn) + `subagent_session`;
   - `toolUseResult` → `subagent_status` (терминальный);
   - записи agent-JSONL → message-события транскрипта child-канала в тех же
     форматах, что использует основной поток (`assistant`, thinking-диалог);
     переиспользуются существующие правила эмиссии messaging-модуля.
3. **`reference/subagents/claude-subagent-observer.ts`** — координатор:
   - жизненный цикл: поллинг во время активного turn родителя (между
     turn started и turn completed, интервал ~1–2 с) + финальный скан на
     завершении turn;
   - hydration-скан при `subscribe`/`resumeSession` родителя: полное
     проигрывание meta.json → spawn, agent-JSONL → транскрипт,
     `toolUseResult` → терминальные статусы;
   - сериализация гидраций и replay-once наборы (паттерн
     `CodexSubagentHistoryLoader`); Core-сторона уже защищена монотонным
     terminal guard и dedupe по стабильным id.
4. **Wiring в `ClaudeProviderAdapter`**: создание observer при биндинге
   сессии; эмиссия subagent-событий в родительский канал, транскрипта — в
   child-канал через существующий `dispatchMessage`.
5. **Pseudo-resume child-сессий**: после рестарта Core вызывает
   `bindProviderSession` для всех восстановленных сессий, включая
   `sessionKind: "subagent"` → `adapter.resumeSession(childProviderSessionId)`.
   Адаптер обязан распознавать child-id и не запускать SDK-сессию: вернуть id
   как есть (binding ready, канал обслуживается observer'ом родителя).
6. **Cleanup**: расширение `claude-transcript-cleanup.ts` — удаление родителя
   удаляет и каталог `<sessionId>/` (subagents); `deleteSessionArtifacts`
   для child-id удаляет его пару файлов.

### 4.3 Идентификаторы и маппинг

- `childProviderSessionId` := `agent-<agentId>` (совпадает с базовым именем
  файлов; префикс отличает child-id от UUID основных сессий в
  `resumeSession`/`deleteSessionArtifacts`/`resolveSessionAlias`).
- `callId` := `toolUseId` из meta.json.
- `subagent_control`: `senderProviderSessionId` = id родительской
  Claude-сессии; `receiverProviderSessionIds` = [`agent-<agentId>`];
  `action: "spawn"`; `prompt` = `description` из meta.json.
- `subagent_session`: `task` = description, `agentRole` = `agentType`
  (Explore/Plan/general-purpose/…), `title` — из description.
- Модель ребёнка: из `resolvedModel` (`toolUseResult`) либо первой
  assistant-записи agent-JSONL (`message.model`).
- Статусы: работа → `running`; `toolUseResult.status: "completed"` →
  `completed`; иные/`is_error` → `failed`; hydration незавершённого сабагента
  при неактивном родителе → `interrupted` (см. открытый вопрос 2).

### 4.4 Каналы доставки событий

- `subagent_control` (spawn) и `subagent_session` (метаданные) эмитятся в
  канал родительской сессии — их обрабатывает родительский маршрут Core.
- `subagent_status` (терминальный) эмитится в канал child-сессии
  (`agent-<agentId>`): Core принимает статус только на канале самой
  subagent-сессии и молча отбрасывает его на родительском (симметрично
  Codex, где thread status приходит через подписку на child thread;
  приёмочная находка 2026-07-13, подтверждена инструментированной
  сборкой).
- Прочитанные из родительского JSONL терминальные результаты удерживаются
  до успешной эмиссии: файловый курсор уже прошёл мимо них, и упавший
  слушатель не должен их потерять. Ошибки сканов и per-agent replay
  логируются через reporter адаптера.

## 5. Разделительная линия вместо интерактивной карточки (оба провайдера)

Решения пользователя (2026-07-13, две итерации одного дня). Сначала
интерактивная карточка `SubagentCallTimelineItem` (кнопки открытия
child-сессии, открепление в окно, статус-кольца, строки метаданных) была
сведена к текстовой инфопанели (количество запусков + перечень
делегированных задач). Затем пользователь сократил панель до чистого
разделителя: горизонтальная черта с разрывом по центру, в разрыве —
локализованная надпись «Subagents launched» и суммарный счётчик запущенных
сабагентов.

- Подряд идущие запуски (без сообщений между ними) сливаются в один
  разделитель `SubagentLaunchDivider`; счётчик растёт на месте — 1, 2, 3, ...
  — по мере присоединения новых вызовов к группе.
- Счётчик = сумма `max(childSessionIds.length, 1)` по вызовам группы, поэтому
  spawn-событие ещё без child id уже учитывается как один запуск и
  уточняется следующим Core snapshot с тем же call id.
- Никакого другого содержимого у разделителя нет: перечень задач, кнопки
  открытия/открепления, статус-кольца и live-статусы живут только в
  sidebar-дереве.
- Компонент общий и рендерит Core read-model, поэтому изменение применяется
  к Codex и Claude одновременно; provider-код не затрагивается.
- Затрагиваемые файлы: `session-subagent-timeline.tsx` (группировка вызовов,
  `SubagentLaunchDivider`), `session-dialog-panel.tsx` (рендер разделителя),
  `session-window.css` (стили черты), `session-subagent-timeline.test.mjs`,
  словарь `source-dictionaries.ts` (метка `session.subagents.launched`
  вместо `session.subagents.started`).
- Контракт разделителя в `docs/architecture/SubagentSessions.md` обновляется
  в том же commit.

## 6. Что не входит в scope

- Вложенные сабагенты (`spawnDepth > 1`): формат учитывается при парсинге
  (поле читается), но глубокая иерархия не моделируется — все дети
  привязываются к родительской сессии первого уровня.
- Интерактив с сабагентом (send_input/resume/close): у Claude таких native
  каналов нет; child-сессии строго read-only.
- Отображение tool-вызовов сабагента: паритет с основным диалогом Claude
  (сейчас — текст + thinking).
- Изменения Core/UI контрактов: не требуются и не планируются.

## 7. Открытые вопросы (решить до реализации)

1. **Перевод reasoning сабагентов.** В основной сессии thinking переводится
   через haiku-переводчик. Для сабагентов объём reasoning кратно больше.
   Рекомендация: в MVP отображать оригинал без live-перевода; перевод — как
   отдельное расширение при спросе.
2. **Статус незавершённого сабагента при hydration.** Если `toolUseResult`
   в родительском JSONL отсутствует и родитель не ведёт активный turn —
   сабагент уже не работает. Рекомендация: `interrupted`.
3. **Live-задержка.** Файловый поллинг даёт задержку появления/обновления
   ~1–2 с. Считаем приемлемой (паритет ожиданий с Codex не требует
   субсекундной точности).

## 8. Критерии приёмки

1. Запуск сабагентов в Claude-сессии виден в диалоге родителя
   разделительной линией «Subagents launched» с растущим счётчиком
   запусков; дети появляются в sidebar-дереве.
2. Диалог ребёнка открывается, read-only, показывает делегированную задачу,
   reasoning и итоговый ответ; шапка — breadcrumb, задача, статус, модель.
3. Терминальные статусы (completed/failed) доезжают после завершения
   сабагентов; sidebar-дерево обновляется (разделитель в диалоге статусы
   не показывает).
4. После перезапуска приложения дерево, карточка, статусы и транскрипты
   детей восстанавливаются без дубликатов.
5. Удаление родительской сессии удаляет детей из Core и их файлы провайдера
   (каталог `<sessionId>/`).
6. Renderer не парсит provider-текст: все факты приходят Core-событиями.
7. Codex-путь сабагентов не регрессирует (общие Core-модули не меняются).
8. Карточка запуска сабагентов в диалоге (Codex и Claude) — чисто
   информационная: количество и перечень задач, без кнопок открытия/
   открепления и статус-колец; управление доступно только в sidebar-дереве.
