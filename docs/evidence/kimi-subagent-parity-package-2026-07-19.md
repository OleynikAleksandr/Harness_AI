# Kimi Subagent Session Parity Package Evidence (2026-07-19)

## Контекст

Пользователь подтвердил сборку нового пакета для ручного ретеста Kimi
субагентов. Цель Phase 3 — передать в дочерние Harness-сессии нативный
`agents/agent-<n>/wire.jsonl`, чтобы общий Core/UI маршрут показывал reasoning,
assistant transcript, реальный context/cache/turn count и корректный terminal
status без дублирующего синтетического результата.

## Реализация в пакете

- `0c7e7d29` — `kimi-subagent-wire` сопоставляет синтетический child id с
  конкретным agent wire и нормализует think/text, usage и turn lifecycle.
- `275d09e5` — `kimi-native-session` даёт adopted Kimi child живую read-only
  подписку, инкрементально читает его wire и передаёт стандартные provider
  events в существующий Core router.
- `e830c620` — Core отбрасывает точный transcript replay после restart и
  публикует provider terminal fallback только если terminal drain не доставил
  assistant content из wire.

Renderer не менялся: дочерний диалог использует те же reasoning/message/status
проекции, что и primary session.

## Package

- Пользовательское подтверждение package-сборки: получено 2026-07-19.
- Команда: `npm run package:mac` — exit 0.
- Build: TypeScript runtime + Vite renderer — exit 0; 322 renderer modules.
- Артефакт: `release/mac-arm64/Harness AI.app` (unsigned macOS arm64).
- `app.asar`: timestamp `2026-07-19 14:10:09 +0200`, size `32389661` bytes.
- SHA-256 `app.asar`:
  `1966dc47354ca02af999bc345196a748c03bd0f7e385b41e0f849c536186ed8e`.

## Packaged Runtime Proof

`app.asar` содержит все три ключевых runtime-файла:

- `dist/runtime/product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-subagent-wire-channel.js`;
- `dist/runtime/product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js`;
- `dist/runtime/product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-subagent-lifecycle.js`.

После extraction их SHA-256 точно совпали с текущим `dist/runtime`:

- child wire channel:
  `ec05ca8f5e85f23d3b12271d0418e23decf2f63327c39c65cf46f91053f02050`;
- Core event-stream dedupe:
  `430f1e17eab27c412fab1fa91961247dac60c017c3bf51a2fa304c0d09d259d1`;
- terminal result reconciliation:
  `5383e24e2d9d998e1f6fad286bdc0405022acdb7c2f13294a3b9d753f833e5a4`.

Свежий пакет запущен через `open`; проверены основной процесс приложения и
Core process, оба работают из нового `Harness AI.app/Contents/Resources/app.asar`.

## Автоматическая проверка перед package

- `npm run check:architecture` — OK (3 Product Parts, 16 Clusters,
  59 Modules).
- `npm run lint` — OK (432 files).
- `npm run check:knip` — OK (только существующие configuration hints).
- `npm run typecheck` — OK.
- `npm test` — OK (132 tests).
- Commit hooks для `275d09e5` и `e830c620` прошли без обхода Husky gates.

## Ручной ретест пользователя

1. Запустить Kimi native-profile задачу, которая создаёт один Agent или K3
   Swarm.
2. Пока child работает, открыть его диалог: reasoning и assistant text должны
   появляться из wire без ожидания terminal result.
3. Проверить status panel child: Tokens/context, Cache и Turns должны получать
   реальные значения; terminal status должен перейти в idle.
4. После завершения убедиться, что итоговый assistant result не продублирован.
5. Перезапустить приложение и снова открыть child: transcript не должен
   удвоиться после replay.
6. Убедиться, что primary Kimi session продолжает работать без регрессии.

User acceptance остаётся отдельной текущей задачей плана; scope остаётся
`ACTIVE` и не архивируется автоматически.
