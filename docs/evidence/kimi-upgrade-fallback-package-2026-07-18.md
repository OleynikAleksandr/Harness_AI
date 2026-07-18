# Kimi Upgrade Fallback Package Evidence (2026-07-18)

## Дефект

Пользователь: карточка Versions показывает `0.27.0`, кнопка Update
отрабатывает «как будто бы», но Current остаётся `0.26.0`. Живая
диагностика (`kimi upgrade` вручную):

```
A newer version of @moonshot-ai/kimi-code is available (0.26.0 -> 0.27.0).
Detected install source: native (windows). Auto-update is not supported on this platform.
To update manually, run: curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash
```

`kimi upgrade` на native-инсталляции (standalone-бинарь; «(windows)» —
жёсткая строка сообщения CLI даже на macOS) принципиально НЕ
самообновляется: печатает подсказку и выходит с кодом 0. Наш
`upgradeKimiCli` видел exit 0 и считал апдейт успешным.

## Фикс (`fix: run Kimi native installer on upgrade`, `84fe500e`)

`upgradeKimiCli` сравнивает установленную версию до/после `kimi upgrade`;
если версия не изменилась, а CDN-канал реально рекламирует другой релиз —
запускает официальный установщик, который CLI сам печатает
(`curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash`, pipefail,
бюджет 300s/10MB). Не изменившаяся после установщика версия отклоняется
честной ошибкой (карточка показывает сбой вместо тихого no-op);
уже-актуальная версия и офлайн-проверка остаются чистыми no-op.

## Живая проверка (сам вендорский путь, до упаковки)

- Установщик прочитан перед запуском: неинтерактивный, ставит в
  `~/.kimi-code`, без sudo, бэкапит старый бинарь, проверяет checksum.
- Запуск на реальной системе: `Downloading .../binaries/0.27.0/
  kimi-code-darwin-arm64` -> `Verifying checksum` -> `Installed`;
  `kimi --version` -> `0.27.0`.
- ACP-смоук на 0.27.0: `initialize` отвечает `protocolVersion: 1`,
  `Kimi Code CLI 0.27.0` — наш native-канал совместим.
- Бонус-проверка нового бинаря: ACP `session/set_config_option` в 0.27.0
  по-прежнему маршрутизирует только `model`/`mode`/`thinking` — swarm mode
  в ACP не экспонирован, вопрос «K3 Swarm» остаётся отложенным.

## Package

- Команда: `npm run package:mac` — первый прогон был прерван (реальный
  exit 144, app.asar дописан фоном), перезапущен начисто: exit 0.
- Артефакт: `release/mac-arm64/Harness AI.app`.
- Timestamp `app.asar`: `2026-07-18 12:21 +0200`.
- SHA-256 `app.asar`:
  `bedf737835528b15512ccfd067e1f964fd9f86271993ad82a865a91166176769`.
- Binary grep `app.asar`: `kimi-code/install.sh | bash` — 1,
  `did not change the installed version` — 1,
  `code.kimi.com/kimi-code/latest.json` — 1.
