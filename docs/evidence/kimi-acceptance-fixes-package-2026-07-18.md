# Kimi Acceptance Fixes Package Evidence (2026-07-18)

## Контекст

Пользователь прогнал приёмочный ретест на билде `f9ee8c1e…` (native
thinking): thinking-пузыри и выбор уровня работают, но приёмка task34
отклонена с тремя дефектами:

1. Рой из 3 агентов регистрировался как 4 сабагента: синтезированный
   root-ребёнок AgentSwarm (`kimi-agent-<toolCallId>`) появлялся отдельной
   карточкой «Сводки трёх архивных документов», внутри — только куцая
   сводка роя (`completed: 3`).
2. Автопрокрутка диалога не показывала разделитель «Subagents launched N»:
   разделитель рендерится ниже последнего пузыря, а нижний якорь скролла
   учитывал только `.session-dialog__message`.
3. Чип `Turns` статус-панели переезжал на вторую строку у Kimi: бейдж
   reasoning стал шестым элементом в пятиколоночном grid
   `session-status` (Codex спасал только семиколоночный
   rollback-модификатор).

## Стрим 8: исправления

- `fix: drop synthetic Kimi swarm root card` (`0878e29d`) — AgentSwarm
  больше не спавнит/не обновляет/не закрывает root-ребёнка: регистрируются
  только настоящие агенты (`kimi-agent-<toolCallId>:<agent_id>`), поэтому
  рой из 3 агентов даёт счётчик 3 в разделителе и сайдбаре. Накопленный
  streamed input остаётся источником spawn-prompt агентов. Единственное
  исключение — терминальный fallback: рой, умерший до появления хотя бы
  одного агента, один раз материализует root-ребёнка, чтобы сбой не
  исчез из диалога бесследно. Одиночный `Agent` сохраняет прежний цикл.
- `fix: autoscroll to subagent launch divider` (`501f92a5`) — нижний якорь
  автопрокрутки и `ResizeObserver` работают по селектору
  `.session-dialog__message, .session-subagent-divider`, так что
  появившийся/растущий разделитель прокручивается в зону видимости.
- `fix: keep status panel chips on one row` (`bed911c1`) —
  `session-status` переведён с фиксированных grid-колонок на однострочный
  flex: чип Tokens — единственная гибкая ячейка (`flex: 1 1 auto;
  min-width: 0`), остальные `flex: none`, поэтому
  Model/effort/Tokens/Cache/Turns (+Rollback, где он есть) всегда в одну
  строку; мёртвый модификатор `session-status--codex-rollback-probe`
  удалён из компонента и стилей, узкий экран (<=780px) складывает панель
  колонкой.

## Package

- Команда: `npm run package:mac` — exit 0 (упаковка подтверждена
  пользователем отдельно).
- Артефакт: `release/mac-arm64/Harness AI.app`.
- Timestamp `app.asar`: `2026-07-18 09:23 +0200`.
- SHA-256 `app.asar`:
  `648aadcec789ddfb370059385b602bc7028dbc541a8cdbca3d055c9f34f06350`.
- Binary grep `app.asar`:
  `session-dialog__message, .session-subagent-divider` — 1 (новый якорь
  автопрокрутки в renderer-бандле), `codex-rollback-probe` — 0
  (модификатор удалён), `root child never materializes` — 1 (новый
  swarm-нормализатор в runtime), минифицированный CSS несёт
  `session-status{...display:flex}` и `session-status-chip--limits{flex:auto}`.
