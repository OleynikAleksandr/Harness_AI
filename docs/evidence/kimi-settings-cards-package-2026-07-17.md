# Kimi Settings Cards Package Evidence — 2026-07-17

## Scope

Пересборка macOS пакета по подтверждению пользователя: Settings -> Kimi
получает два раздела по образцу Codex-вкладки (стрим 2 активного плана,
приёмка native capture зафиксирована ранее в этом же scope).

- Kimi Versions: одна строка `Kimi CLI` (SDK у Kimi не существует —
  universal client работает по HTTP), current из `kimi --version`, latest из
  родного update-канала CLI (`~/.kimi-code/updates/latest.json`), обновление
  через нативный `kimi upgrade`; чекбокс Auto-update Kimi с честным CLI-only
  описанием; общий warning-баннер.
- Kimi Session Continuity: общая карточка порога
  (`providers.kimiClient.sessionContinuity.remainingPercentThreshold`,
  default 30, workspace-проекция). Порог пока не потребляется ядром ни для
  одного провайдера — зафиксировано в module.md настроек; runtime-механизм
  вынесен в отдельный будущий scope по решению пользователя.
- Настройки: `providers.kimiClient` расширен ключами `autoUpdate`
  (system-проекция) и `sessionContinuity` (workspace-проекция).

Implementation commits:

- `769ec748471b36044655e2b426153da5f8101bfd` —
  `feat: add Kimi common provider settings`.
- `617a501483c5990d6c0be5dfc11b583a3b482672` —
  `feat: serve Kimi CLI version status`.
- `5dae70523d94a5aca41175397afd7401d0ddfd76` —
  `feat: show Kimi versions card in Settings`.
- `3549e30f2c75ae71cae5547583ca49c5ca9fe5c0` —
  `feat: show Kimi session continuity card`.

## Verification

- Commit hooks — PASS на каждом из четырёх коммитов: plan validate,
  architecture, Ultracite, Knip, typecheck и полный тестовый набор
  (117 test groups к финальному коммиту; новые focused-тесты:
  `settings-store-projections.test.mjs`, version tooling внутри
  `kimi-native-capture.test.mjs`, `provider-version-controls.test.mjs`,
  `kimi-session-continuity-card.test.mjs`).
- Live-проверка backend на установленном Kimi CLI `0.26.0` через
  собранный `dist/runtime` перед упаковкой:
  `readKimiCliVersionStatus()` вернул
  `{"currentVersion":"0.26.0","latestVersion":"0.26.0"}`;
  `loadProviderVersions()` содержит `kimi: { cli: ... }` рядом с
  claude/codex (ключи snapshot: `checkedAt, claude, codex, kimi`).
- `kimi upgrade` в live-режиме не запускался: установленная версия уже
  равна latest; сам вызов закреплён focused-тестом на fake-CLI.

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-17 11:26:50 +0200`.
- Size: `32,252,707` bytes.
- SHA-256:
  `69eef7c53e120ce4eba85d8347f4f4cac7b458d46a9cd01659c067466f647f67`.
- Упакованный `app.asar` содержит новый код (binary grep):
  `settings.provider.kimiClient.sessionContinuity` ×2,
  `settings.provider.versions.autoUpdate.cli.description` ×2,
  `readKimiCliVersionStatus` ×3 (renderer bundle + runtime).
- `npm run package:mac` завершился с exit 0 (лог без pipe-артефактов).

## User Retest

Пользовательская проверка (задача `harness-ai.phase6.stream1.task7`):
перезапустить упакованное приложение, открыть Settings -> Kimi и убедиться,
что карточка Kimi Versions показывает реальные Current/Latest и рабочую
кнопку обновления (одна строка CLI), а порог Kimi Session Continuity
сохраняется после перезапуска.
