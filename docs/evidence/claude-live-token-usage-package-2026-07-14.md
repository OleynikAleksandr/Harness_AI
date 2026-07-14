# Claude Live Token Usage Package Evidence — 2026-07-14

## Scope

Пересборка macOS пакета в рамках scope `claude-cache-telemetry-2026-07-14`,
Phase 5 (прямой заказ пользователя после приёмки Phase 4: убрать старый
метод подсчёта израсходованного контекстного окна и обновлять контекст/кэш
после каждого цикла, как у Codex).

## Изменения

1. `106dc4c3` — `feat: stream claude token usage per api call`: новый
   `claude-live-usage-emitter.ts` — после каждой записи SDK usage tracker-а
   (каждый API-вызов агентского цикла) эмитится `token_usage` событие с
   полным снапшотом `{used, limit, cached}` (дедупликация до изменения
   цифр); панель Claude тикает во время турна, паритет с Codex.
2. `2bffdc4d` — `feat: retire claude context probe`: подсистема `/context`
   probe удалена целиком (reader/probe/cwd-resolver/provider-jsonl/snapshot
   в `sdk/**` + `claude-token-usage-sync.ts`); `readCompletionPayload`
   строит turn-completion снапшот прямо из tracker-а без CLI-subprocess;
   env для rate-limit чтений сохранил per-use резолв
   (`ClaudeUsageEnvironmentConfig.resolveEnv`); архитектурные доки
   актуализированы (tail-reader прецедент помечен как выведенный).
3. `cba99157` — `feat: drop dual claude token figure display`: временный
   диагностический формат «legacy - SDK» снят; `tokenDisplay` снова одна
   цифра, но `used` теперь живая SDK-цифра, поэтому процент обновляется
   каждый цикл; Cache-чип и normalize восстановленной телеметрии сохранены;
   mid-turn события с `limit: 0` наследуют прежний limit.

## Package Build

- Команда: `npm run package:mac`; перед финальной сборкой `dist/runtime`
  очищен вручную — `tsc` не удаляет артефакты стёртых исходников, и первые
  сборки уносили в `app.asar` шесть осиротевших probe-`.js` (учтено ниже в
  Verification). Наблюдаемый exit 144 — известный ложный артефакт
  progress-вывода; лог завершается штатной строкой о пропуске подписи.
- Артефакт: `release/mac-arm64/Harness AI.app`,
  `Contents/Resources/app.asar` от 2026-07-14 13:04 (unsigned dev-пакет).
- Гейты качества прошли автоматически на всех трёх implementation commits
  (pre-commit: plan:validate, ultracite, check:architecture, lint,
  check:knip, typecheck, tests — 97–98 OK).

## Verification

- `asar list`: `claude-live-usage-emitter.js` в бандле; файлов
  `claude-context-usage-*` и `claude-token-usage-sync.js` — ноль
  (осиротевшие копии из инкрементального `dist/runtime` устранены чистой
  пересборкой).
- Упакованный `usage-context-telemetry-facade.js` не содержит `sdkUsed` —
  дуал-режим снят и в бандле.
- Модульные тесты: live-эмиттер (дедуп, temp-сессии, fallback session id),
  tracker-снапшот (`limit: 0` до `result.modelUsage`), фасад (live-события
  Claude, сохранение limit при mid-turn `limit: 0`, restored-телеметрия без
  новых ключей).
- Приёмка пользователем — задача `harness-ai.phase5.stream2.task2`: цифры
  Tokens/Cache у Claude обновляются по ходу турна после каждого цикла,
  формат Tokens одноцифровой, восстановленные сессии здоровы.
