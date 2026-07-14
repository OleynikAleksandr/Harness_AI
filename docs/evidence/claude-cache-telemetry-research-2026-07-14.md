# Claude Cache Telemetry Research — 2026-07-14

## Вопрос

Статус-панель Codex-сессии показывает `Tokens`, `Cache`, `Turns`, `Rollback`;
панель Claude — только `Tokens`. Пользователь запросил проверку: возвращает
ли Claude после каждого турна объём токенов, прочитанных из кэша, и можно ли
отображать это в статус-панели аналогично Codex.

## Эксперимент (2026-07-14, claude CLI 2.1.209, headless)

Многотурновая сессия `claude -p ... --output-format json` / `--resume` /
`--output-format stream-json --verbose`, модель `claude-haiku-4-5-20251001`:

| Метрика                                    | Турн 1 | Турн 2 (resume) |
| ------------------------------------------ | ------ | --------------- |
| `usage.cache_creation_input_tokens` (запись в кэш)  | 8 267  | 113    |
| `usage.cache_read_input_tokens` (чтение из кэша)    | 19 013 | 27 280 |

Проверка согласованности: во втором турне из кэша прочитано ровно
19 013 + 8 267 = 27 280 — весь контекст первого турна; заново записаны
только новые 113 токенов. Вывод: данные достоверны и приходят после
каждого турна.

Дополнительно подтверждено в `stream-json` прогоне с инструментом (Bash):

- каждое `assistant`-сообщение несёт `message.usage` своего API-вызова
  (в турне с инструментом их несколько);
- финальное `result`-сообщение турна несёт суммарный `usage` по турну
  (55 107 = 27 393 + 27 714 чтений кэша в контрольном прогоне), а также
  `modelUsage` с `contextWindow: 200000`, `costUSD`, `total_cost_usd`
  и разбивку кэша по TTL (`cache_creation.ephemeral_5m/1h_input_tokens`).

## Документация Agent SDK (сверено с code.claude.com/docs)

- Отдельного метода вида `getUsage()` в SDK нет: usage доступен только из
  потока сообщений `query()` — это штатный механизм
  (agent-sdk/cost-tracking.md).
- Source of truth за турн — `result.usage` (+ `modelUsage` по моделям,
  включая субагентов).
- При ручном суммировании промежуточных `assistant`-сообщений нужна
  дедупликация по `message.id`: параллельные tool calls дублируют
  одинаковый usage.
- Текущий размер контекста = `input_tokens + cache_read_input_tokens +
  cache_creation_input_tokens` последнего API-вызова; окно — из
  `modelUsage[*].contextWindow`.
- Кэш законно обнуляется при смене tool definitions / thinking-параметров:
  `cache_read_input_tokens` может упасть до 0 — это не дефект.

## Текущее состояние кода (2026-07-14)

- `claude-provider` не читает `usage` вовсе: чип `Tokens` питается
  скрапингом текстового вывода команды `/context` через отдельный CLI
  subprocess (`claude-context-usage-reader.ts`,
  `claude-context-usage-snapshot.ts`, regex по строке `Tokens X / Y`),
  событие `token_usage` несёт только `{used, limit}`
  (`claude-token-usage-sync.ts`).
- Telemetry-фасад `usage-context-telemetry-facade.ts` уже умеет читать
  `cached`/`cachedInputTokens` из событий и рисовать Cache-чип для любого
  провайдера; у Claude чип не появляется лишь потому, что провайдер не
  эмитит поле `cached` (`defaultCachedTokenCount` возвращает `null`).
- У Codex `Cache` = `cachedInputTokens` последнего вызова из notification
  `thread/tokenUsage/updated` (`codex-app-server-event-router.ts`,
  `handleThreadTokenUsageUpdated`) — то есть именно чтение из кэша.

## Решение пользователя (2026-07-14)

1. Переход на SDK-usage для `Tokens` — через диагностический период: в чипе
   временно показываются две цифры через дефис — первая по старому способу
   (скрапинг `/context`), вторая по новому (SDK usage последнего
   API-вызова). Если цифры совпадают, старый метод удаляется (отдельным
   scope по команде пользователя).
2. `Cache` для Claude — аналогично Codex: показывается чтение из кэша
   (`cache_read_input_tokens` последнего API-вызова), т.е. сколько токенов
   пришло из кэша, а не из «свежего» входного запроса.

## Scope

Реализация зафиксирована в активном плане
`claude-cache-telemetry-2026-07-14` (`.harness/plans/todo-plan.md`):
сбор usage в `claude-provider` (messaging), обогащение событий
`token_usage`/`turn_completed` полями `cached`/`sdkUsed`, двухцифровое
отображение в `usage-context-telemetry`, package + user acceptance.
