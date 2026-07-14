# Claude Subagent Token Usage Package Evidence — 2026-07-14

## Scope

Пересборка macOS пакета в рамках scope `claude-cache-telemetry-2026-07-14`,
Phase 6 — два finding-а пользователя после приёмки live-телеметрии Phase 5:

1. Панель родительской Claude-сессии «прыгала» между значениями, пока
   работали сабагенты: основной SDK-поток перемежает subagent-сообщения
   (`parent_tool_use_id` заполнен), и их usage (контекст САБАГЕНТА)
   перезаписывал родительский снапшот трекера.
2. У сабагентских Claude-сессий не было ни Tokens, ни Cache — file-observer
   не извлекал `message.usage` из agent-JSONL (у Codex-сабагентов телеметрия
   есть через app-server).

## Fix commits

- `84b7f782` — `fix: ignore subagent usage in parent tracker`:
  `claude-sdk-usage-tracker.ts` игнорирует сообщения с
  `parent_tool_use_id` — родительский снапшот держит только родительский
  контекст, live-эмиттер молчит через свой дедуп; тест на interleaved
  subagent-сообщения.
- `f49e6044` — `feat: stream claude subagent token usage`:
  `extractClaudeSubagentTokenUsage` в normalizer (`used` = input +
  cache_read + cache_creation, `cached` = cache_read) + эмит свежайших цифр
  из replay-цикла observer-а в child-канал тем же `token_usage`-событием с
  дедупом до изменения цифр; `limit` остаётся 0 (agent-JSONL не сообщает
  окно контекста — фасад держит дефолт 200k); паритет с Codex-сабагентами,
  работает и при hydration после рестарта.

## Package Build

- Команда: `npm run package:mac` (лог завершается штатной строкой пропуска
  подписи; видимый exit 144 — известный ложный артефакт progress-вывода).
- Артефакт: `release/mac-arm64/Harness AI.app`,
  `Contents/Resources/app.asar` от 2026-07-14 13:21 (unsigned dev-пакет).
- Гейты качества прошли автоматически на обоих fix-коммитах (pre-commit:
  plan:validate, ultracite, check:architecture, lint, check:knip,
  typecheck, tests — 98 OK).

## Verification

- `asar extract-file`: упакованный `claude-sdk-usage-tracker.js` содержит
  фильтр `parent_tool_use_id`; `claude-subagent-observer.js` — эмит
  `token_usage` в child-канал.
- Модульные тесты: tracker (subagent-сообщения не трогают родительский
  снапшот, subagent-result не подмешивает contextWindow), normalizer
  (извлечение usage, null на пустом/не-assistant), observer (эмит на
  hydration, дедуп при повторном скане, свежие цифры после дозаписи JSONL).
- Приёмка пользователем — задача `harness-ai.phase6.stream2.task2`: панель
  родителя не прыгает при работе сабагентов; у каждой сабагентской
  Claude-сессии свои живые Tokens/Cache, как у Codex.
