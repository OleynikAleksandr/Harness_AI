# Пакет восстановления целиком за один ход — Workflow Kit 2.2.3

Статус: разделы 2–4 реализованы задачами T001–T003 scope
`kit-recovery-parts-2026-11-12` (`KIT_VERSION` 2.2.3) и сверены с кодом в
DOCS-R1; разделы 6 (delivery) и 8 — задачи D1, D2 и P1. Точные контракты —
`module.md` модулей `workflow-recovery`, `workflow-kit`, `workflow-installer`,
`docs/architecture/workflow-kit/WorkflowKitRecovery.md`,
`WorkflowKitInstallation.md` и `WorkflowKitCommands.md`.

Источник: проект Workflow Kit (`/Users/oleksandroliinyk/VSCODE/Workflow_Kit`),
его спецификация `docs/planning/M21-recovery-one-turn.md`, раздел 3.1. Workflow
Kit поставляет пользователям бандл Kit (`kit-bundle`) и получает 2.2.3 отсюда.

Решения пользователя (2026-11-12): «Давай исправим Claude и Codex, а с кими
будем разбираться потом. Подготовь спецификацию и план для реализации этих
исправлений в… Harness AI. И выполни и пересобери новый релиз… Harness AI, а
потом и нашего Workflow Kit»; «самым неприемлемым является необходимость
пользователю что-то подтверждать»; «Я все принимаю. Дальше делай все как
положено».

## 1. Проблема

Хук `hook session-start` отдаёт весь пакет одной строкой `additionalContext`.
Провайдеры режут вывод хука (проверено 2026-11-12):

| Провайдер | Лимит вывода одного хука | Что видит агент |
| --- | --- | --- |
| Claude Code 2.1.322 | 10 000 единиц UTF-16 на **каждый** хук; настройки нет | длиннее — файл и превью ~2 КБ `<persisted-output>` |
| Codex 0.167.2 | ~10 000 байт на **каждый** хук; поле записи `additionalContextLimit` поднимает лимит | длиннее — середина вырезана (`…N tokens truncated…`) |

Пакет в роли planning весит ~10 000 символов, с обязательными документами — до
60 000 байт. Превью начинается с заголовка пакета, поэтому агент считает пакет
полученным и `recover` не вызывает.

Опыты: Claude — 4 записи SessionStart, три по 9 900 символов кириллицы целиком,
10 050 — превью; порядок частей в контексте не совпал с порядком записей. Codex —
3 хука по 4 500 байт целиком; один на 30 000 байт с
`"additionalContextLimit": 60000` целиком, без поля — обрезан.

## 2. Части пакета (`workflow-recovery`)

Новый файл `src/recovery-parts.ts`:

- `PART_LIMIT = 9500` — предел части в единицах UTF-16 (`string.length`),
  включая её первую строку.
- `packetParts(text, count) → { parts: string[]; needed: number }` — режет
  готовый текст пакета (`assemblePacket(...).text`) не больше чем на `count`
  частей:
  - резка по началу разделов (`\n## `); раздел длиннее части — по строкам;
    строка длиннее части — по символам, без разрыва суррогатной пары;
  - первая строка каждой части:
    `# Workflow recovery packet — part K/N · revision R · head H · digest D`,
    `N` — фактическое число частей, `D` — первые 12 hex SHA-256 полного текста;
    `R` и `H` берутся из модели пакета;
  - склейка частей без их первых строк равна исходному тексту;
  - если частей нужно больше `count`, последняя часть заканчивается строкой
    `Packet incomplete: it needs M parts, N delivered. Run \`scripts/workflow recover --format text\`.`;
    `needed` = M.
- Пакет короче предела — одна часть с той же первой строкой (`part 1/1`).

`sessionStart(root, { client, env, stdin, part? })` в фасаде: без `part` —
весь пакет, как в 2.2.2; с `part = { index, count }` — часть `index`, а если её
нет (пакет короче), ответ без `additionalContext`. `sessionStartResponse`
принимает `null` вместо текста и тогда не пишет `additionalContext`.
`HARNESS_WORKFLOW_RECOVERY=host` — без контекста, как раньше.

## 3. CLI (`workflow-kit`)

`hook session-start --client claude|codex [--part K/N]`:

- `--part` — целые `1 ≤ K ≤ N ≤ 16`; иначе ответ без `additionalContext`,
  строка `hook session-start: --part must be K/N with 1 <= K <= N <= 16` в
  stderr, код выхода 0 (хук сессию не блокирует).
- Без `--part` — прежнее поведение.

## 4. Установщик (`workflow-installer`)

`installer-provider-hooks.ts`:

- Claude: `CLAUDE_PARTS = 6` групп SessionStart подряд, в каждой команда
  `"$CLAUDE_PROJECT_DIR/scripts/workflow" hook session-start --client claude --part K/6`
  (до 57 000 символов пакета).
- Codex: одна группа, запись
  `{ "type": "command", "command": "scripts/workflow hook session-start --client codex", "additionalContextLimit": 65536 }`.
- `mergeSessionStartHook` удаляет все группы Kit (метки `scripts/workflow` и
  `hook session-start`) и дописывает новые в конец; чужие группы и настройки
  остаются.
- `extractSessionStartHook` возвращает все группы Kit по порядку (JSON
  массива), `expectedSessionStartHook` — ожидаемый массив; inspect и doctor
  сравнивают их целиком. Проект на 2.2.2 — `update`, `install --update`
  переписывает записи.

`installer-texts.ts`, раздел «Start of every session», пункт 1:

> 1. The recovery packet arrives at session start (Claude: in parts K/N).
>    Unless the whole packet is in your context — every part with one digest,
>    no `<persisted-output>`, no truncation marker — run
>    `scripts/workflow recover --format text`.

`installer-payload.ts`: `KIT_VERSION = "2.2.3"`.

## 5. Поведение на ОС

Поведение одинаковое на macOS, Linux и Windows: это работа со строками и JSON.
Команды хуков те же, что в 2.2.2, плюс аргумент `--part`; на Windows Claude
запускает их так же, как сейчас, шесть процессов параллельно.

## 6. Проверка

- Тесты `workflow-recovery`: каждая часть ≤ `PART_LIMIT`; склейка без первых
  строк равна пакету; общий `digest`, `N` во всех частях; большой раздел
  режется по строкам, длинная строка — по символам без разрыва пары; строка
  «Packet incomplete» и `needed` при нехватке частей; ответ хука без
  `additionalContext` для отсутствующей части и в режиме host.
- Тесты CLI: `--part` верный, неверный, отсутствует.
- Тесты установщика: 6 групп Claude, поле Codex, миграция с группы 2.2.2,
  чужие хуки на месте, inspect/doctor видят расхождение в любой группе,
  новый текст раздела AGENTS.md.
- Delivery: бандл `npm run build:workflow-kit` на временном проекте —
  установка пишет 6 групп Claude и запись Codex с полем, `install --update`
  проекта 2.2.2 их переписывает; `hook session-start --part K/6` на проекте с
  длинным пакетом даёт части ≤ 9 500 символов. Единица `additionalContextLimit`
  проверяется живым запуском Codex с пакетом ~60 КБ. Доказательства —
  `docs/evidence/kit-recovery-parts-2026-11-12-bundle.md`.

## 7. Границы

- Kimi (у Kimi нет хука Kit).
- Подтверждение хука в Codex делает Workflow Kit (его задача M21 T001).
- Перенос бандла в Workflow Kit — его задача M21 T002.

## 8. Поставка

План заканчивается задачами поставки по правилам `AGENTS.md` §8: бандл Kit
2.2.3, пакет приложения `npm run package:mac`, публикация на GitHub (push
`main`, тег, GitHub Release с zip приложения, проверка истории на секреты).
