# Claude Cache Telemetry Package Evidence — 2026-07-14

## Scope

Добавить диагностическую телеметрию использования токенов Claude из Agent
SDK параллельно с существующим скрапингом `/context`, чтобы пользователь мог
на реальных турнах сравнить обе цифры и в будущем scope решить, можно ли
вывести legacy-способ из эксплуатации. Дополнительно — Cache-чип для Claude
с Codex-паритетом (сколько токенов прочитано из кэша на последнем API-вызове).

Implementation commits:

- `09ba1c81` — `feat: track claude sdk usage per turn`
- `068c0d54` — `feat: emit claude cache and sdk token usage`
- `b751e57d` — `feat: show dual claude token figures and cache chip`

## Verification

- Commit hooks — PASS на каждом из трёх коммитов: architecture, Ultracite,
  Knip, typecheck и полный набор тестов (97 test groups; было 95 до scope,
  +2 новых test-файла — `claude-sdk-usage-tracker.test.mjs`,
  `claude-token-usage-snapshot.test.mjs` — плюс новые кейсы в
  `usage-context-telemetry-facade.test.mjs`).
- `npm run package:mac` (`package:stop-old` → `build`
  [`typecheck` + `build:runtime` + `vite build`] →
  `electron-builder --mac dir --publish never`) — PASS, exit code 0.
- Code signing: identity явно `null` (unsigned local build, штатно без Apple
  Developer ID).

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-14T10:17:43+0200`.
- Size: `32,129,214` bytes.
- SHA-256:
  `162194a4e0c8636fdc10d4be44a7663bb954ad8d7fab41534731bfb25fdeaae3`.

## Pending User Acceptance

Задача `harness-ai.phase3.stream1.task2`: пользователь перезапускает
`Harness AI.app` (обязательно после пересборки — старый процесс работает на
старом `app.asar`), открывает Claude-сессию и на реальных турнах сверяет:

1. Статус-панель Claude показывает две цифры Tokens через дефис —
   `"<legacy /context> - <sdk usage> (<percent>%)"` — вместо одной.
2. У Claude появляется Cache-чип (аналогично Codex), значение — токены,
   прочитанные из кэша на последнем API-вызове.
3. По результатам сравнения двух цифр Tokens на протяжении нескольких
   турнов пользователь решает — отдельным будущим scope и по своей
   команде — можно ли отказаться от legacy-скрапинга `/context`.
