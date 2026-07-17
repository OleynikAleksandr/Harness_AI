# Kimi Profile Routing Package Evidence — 2026-07-17

## Scope

Пересборка macOS пакета по подтверждению пользователя: избирательная
маршрутизация Kimi-сессий по профилю (стрим 3 активного плана, приказ
пользователя 2026-07-17).

- Профиль `native` -> установленный Kimi CLI через ACP: новый модуль
  `kimi-native-session` (супервизируемый `kimi acp` c дефолтным агентом,
  реальный `~/.kimi-code`, без переписывания base_url, самообновление CLI
  отключено на время жизни ребёнка), JSON-RPC роутер, сессионный раннер
  (initialize -> session/new -> выбор модели -> многоходовой prompt,
  session/cancel, resume-on-send), нормализатор потока session/update
  (чанки текста/размышлений -> читаемые dialog-блоки, tool_call/usage ->
  stream-события Core) и fail-closed мост разрешений
  (session/request_permission -> Core permission interaction; всё прочее
  отклоняется methodNotFound).
- Любой managed-профиль -> универсальный клиент, где материализованный
  профиль теперь реально применяется: промпт профиля открывает историю
  сессии одним system-сообщением, tooling-категории выбирают whitelist
  builtin-инструментов (`KIMI_CLIENT_TOOL_CATEGORY_MAP`).
- Provider id остаётся `kimi-client`; standalone ACP id `kimi` не
  возвращается. Документация «ACP-провайдер не возвращается» переписана на
  избирательную модель (SessionProfilesV2, cluster.md, product-tree,
  комментарии реестра).

Implementation commits:

- `2958ed1ef7cd46720829fc7b318ee6a54f985dd2` —
  `plan: add Kimi profile routing stream`.
- `072e6b2f4f1ab5169c1216c64efdc6649a285a3f` —
  `feat: add Kimi ACP session transport`.
- `759f33672920b087bcbbde65aa3519e22a8a2d63` —
  `feat: add Kimi native session runtime`.
- `822d938aa2805e7a976937a4da5feedee698da42` —
  `feat: bridge Kimi native session interactions`.
- `1a3458a18798f7fb227203936a8c51a8ddb01189` —
  `feat: route Kimi sessions by profile kind`.
- `c0d3799892ba3644196889950a5c91a4e0ab1165` —
  `docs: record Kimi profile-selective routing`.

## Verification

- Commit hooks — PASS на каждом коммите: plan validate, architecture (56
  модулей после регистрации `kimi-native-session`), Ultracite, Knip,
  typecheck и полный тестовый набор (120 test groups к финальному коммиту).
- Новые focused-тесты: транспорт (fake stdio CLI: корреляция, reverse
  requests, timeout, abort, expected/unexpected exit), раннер+нормализатор
  (полный нативный ход: thinking/assistant чанки, tool call/result,
  usage_update, stopReason; гибель CLI -> turn_failed + stream_error),
  драйвер+мост (permission round-trip: CLI-запрос -> Core interaction ->
  решение -> ACP outcome), маршрутизация адаптера (native-делегирование
  всех поверхностей; managed system-сообщение ровно один раз в истории;
  tool whitelist по категориям; сессии без профиля сохраняют полный
  инвентарь).
- `check:dup` вручную — PASS (1.48%/1.91% при порогах 3%/4%): Kimi-транспорт
  написан собственным стилем, не копией Grok-слоёв.
- Живой pre-package smoke на установленном Kimi CLI `0.26.0` через
  собранный `dist/runtime`: реальный `kimi acp` против реального
  `~/.kimi-code`, сессия `kimi-native-<uuid>`, промпт
  "Reply with exactly: HARNESS NATIVE OK" -> события
  `turn_started` -> `dialog_message:assistant:HARNESS NATIVE OK` ->
  `turn_completed:end_turn`, процесс корректно остановлен.

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-17 12:52 +0200`.
- Size: `32,293,441` bytes.
- SHA-256:
  `58a7f96dbcd6b5ba886f52ba795cb98dfae77c3c6448da35bc9d4f5f4995d676`.
- Упакованный `app.asar` содержит новый код (binary grep):
  `kimi-native-session-facade` / `isKimiNativeSessionId` — 9 совпадений.
- `npm run package:mac` завершился с exit 0 (лог без pipe-артефактов).

## User Retest

Пользовательская проверка (задача `harness-ai.phase7.stream1.task8`):
перезапустить упакованное приложение и убедиться, что новая Kimi-сессия с
профилем Native отвечает через родной CLI (нативное поведение/инструменты
Kimi Code), а сессия с любым кастомным профилем идёт через универсальный
клиент с применённым промптом профиля.
