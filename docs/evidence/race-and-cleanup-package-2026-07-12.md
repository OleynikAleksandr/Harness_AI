# Race And Cleanup Package Evidence — 2026-07-12

## Scope

Явно одобренная пользователем объединённая пересборка macOS пакета с двумя
исправлениями subagent-сессий:

1. Гонка terminal statuses при конкурентной hydration (аудит Codex, repro
   10/10):
   - provider loader выполняет hydrations разных roots через одну
     последовательную цепочку (общие replay-наборы, детерминированный порядок
     уведомлений), анонс каждого descendant `thread/started` спарен с его
     же replay, а повторный анонс уже терминально восстановленного child
     запрещён — поздний `thread/started` больше не понижает
     восстановленный терминальный статус;
   - Core guard монотонности: терминальный статус child
     (`completed`/`interrupted`/`failed`/`not_found`/`shutdown`)
     не понижается в `running`/`pending` событием, чей timestamp не
     строго новее записи сессии (status events, agent states, child merges);
     отвергнутое понижение не трогает `updatedAt`.
2. Каскадная очистка артефактов удаления: при удалении parent-сессии каскад
   удаляет per-session event JSONL (`.harness/sessions/events/`) и
   reasoning-translation sidecar
   (`.harness/sessions/reasoning-translations/`) каждой сессии дерева;
   delete-session RPC делегирует каскаду единственный маршрут очистки.

Implementation commits:

- `44c510044bbc8c8902d8ee105342db904735c9f2` —
  `fix: cascade subagent artifact deletion`;
- `5dcd1dda31bfb1fc5225eceab0b43a8b6d168c1d` —
  `refactor: unify session artifact cleanup`;
- `ba7ffb31269897ef36e3b917cc8b546241285c35` —
  `fix: serialize codex hydration replay`;
- `b3305706b4bc8471d207edee8b40ea0d43b6d5e0` —
  `fix: guard terminal subagent statuses`.

## Verification

- Commit hooks на каждом коммите — PASS: plan validate, architecture,
  Ultracite, Knip, typecheck и полный набор из 91 test group.
- Regression-тест конкурентного recovery (транспилированный unit в
  `codex-subagent-history-loader.test.mjs`): параллельные
  `hydrate(parent)` + `hydrate(child)` — последнее статусное уведомление
  child остаётся `turn/completed(interrupted)`, повторного
  `thread/started` после терминального replay нет. Доказано, что на
  предыдущем коде этот тест падает (проверено git stash прогонкой), на новом
  — проходит.
- Обновлённый контракт: повторный `hydrate(child)` после полного
  parent-hydrate не шлёт ни одного уведомления (раньше тест закреплял
  одиночный понижающий `thread/started`).
- Focused source-contract tests закрепляют guard во всех трёх точках Core и
  каскадную очистку sidecar-файлов.

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-12T19:26:13+0200`.
- Size: `32,101,908` bytes.
- SHA-256:
  `fe0e100e7ccffd07c99cca5a5637c9b90b64d5016baeea3e28945ea201dfd765`.
- `dist/` побайтно совпадает с распакованным `app.asar/dist` (`diff -r`).
- Packaged runtime содержит все маркеры фиксов: `hydrationChain` (loader),
  `TERMINAL_SUBAGENT_STATUSES` (lifecycle guard), `deleteSessionEvents` в
  каскаде facade и `deleteSessionOverlays` (overlay facade + store).

## Launch Smoke

Пересобранный unsigned arm64 package успешно запущен:

- main PID `41404`;
- Core PID `41410`;
- renderer PID `41740`.

Приложение оставлено запущенным для пользовательского ретеста: restored
terminal statuses после перезапуска и отсутствие orphan event/translation
файлов после удаления parent-сессии.
