# Codex Child Recovery Package Evidence — 2026-07-12

## Scope

Исправить два дефекта, найденных предрелизным аудитом Codex subagent sessions:

- не переносить fork-копию parent reasoning/assistant messages в восстановленный
  child transcript;
- сохранять `interrupted`, `failed`, `completed` и `inProgress` последнего
  собственного child turn вместо безусловного `completed` для
  `thread.status=notLoaded`.

Implementation commit:
`24aca33baf8a53a1203ae4982b0fad686d5d63c2` —
`fix: preserve codex child recovery semantics`.

## Verification

- Commit hooks — PASS: architecture, Ultracite, Knip, typecheck и полный набор
  из 89 test groups.
- Focused provider tests — PASS: event normalizer, history loader и provider
  facade.
- `check:dup`, `check:security`, `check:links` — PASS; production audit содержит
  0 high-level vulnerabilities.
- `npm run build` — PASS.
- Реальный Codex 0.144.1 `thread/read(includeTurns=true)` подтвердил ownership
  boundary: forked child повторяет ancestor turn с тем же стабильным turn id,
  а собственная работа начинается в отдельном child turn.

Проверка нового loader на трёх фактических provider threads:

| Child provider thread | Собственные transcript items | Parent items | Terminal status |
| --- | ---: | ---: | --- |
| `019f5569-1cf9-7560-9edd-00b9df258f58` | 16 | 0 | `completed` |
| `019f5569-3a63-7ea2-8ef1-9d544e7a4acb` | 10 | 0 | `completed` |
| `019f5569-5884-7c00-8d76-335033bbd6d9` | 14 | 0 | `completed` |

Отдельный packaged behavioral probe передал
`turn/completed status=interrupted`; нормализованный результат остался
`interrupted`.

## Package

- App: `release/mac-arm64/Harness AI.app`.
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Timestamp: `2026-07-12T10:59:36+0200`.
- Size: `29,952,353` bytes.
- SHA-256:
  `7a4f29ac863ed8f72f4f31156b1d9fb4e9ea27e149d2ef1444ef44b44ea9742d`.
- Packaged normalizer и history loader побайтно совпадают с новым `dist`.
- Packaged loader повторил реальную трёх-thread проверку с `Parent items = 0`.

## Launch Smoke

Новый unsigned arm64 package успешно запущен:

- main PID `49387`;
- Core PID `49430`;
- renderer PID `49980`.

Все процессы работают из нового `app.asar`.

## Retest Boundary

Старые Core session event JSONL являются append-only и уже содержат сообщения,
записанные до исправления. Package не удаляет пользовательскую историю. Для
чистой визуальной проверки transcript ownership пользователь должен создать
новую parent session либо явно удалить старую тестовую session через UI.

final result: passed
