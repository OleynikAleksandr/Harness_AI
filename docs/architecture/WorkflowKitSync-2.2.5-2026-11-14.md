# Синхронизация Workflow Kit 2.2.5 в Harness AI

Статус: действующая спецификация раунда R2 scope
`application-versions-about-2026-11-13`. Пользователь поручил выполнить работу
самостоятельно, без вопросов, вплоть до сборки и публикации релиза.

## 1. Цель и согласование

Поднять встроенный Workflow Kit Harness AI с 2.2.4 до версии донора
`/Users/oleksandroliinyk/VSCODE/Workflow_Kit`, обновить установленный Kit этого
репозитория, собрать новое приложение и опубликовать его на GitHub.

Поручение пользователя (2026-11-14): «синхронизировал внутренний кит Harness AI
с китом, который имеет большую версию… повысь версию Kit в Harness AI без моего
участия, состав, спецификацию и план, и выполни их вплоть до сборки нового
релиза и публикации его на GitHub». Пользователь отсутствует и вопросов не
принимает; решения ниже приняты по существующим правилам проекта.

Процесс — управляемая секция [AGENTS.md](../../AGENTS.md); предыдущий перенос —
[WorkflowKitSync-2.2.4-2026-11-13.md](WorkflowKitSync-2.2.4-2026-11-13.md).

## 2. Проверенная исходная точка

| Слой | Состояние на 2026-11-14 |
| --- | --- |
| Harness AI | HEAD `d90ca418`, scope `application-versions-about-2026-11-13` READY_FOR_ACCEPTANCE, R1 закрыт |
| Исходники Kit Harness | `core-runtime/project-workflow`, 12 модулей, `KIT_VERSION = 2.2.4` |
| Установленный Kit Harness | manifest/runtime 2.2.4 |
| Донор | Workflow_Kit HEAD `324ec80`, приложение 0.13.5 |
| Изменение Kit донора после 2.2.4 | единственный коммит `696e95c4` (M31, `scope:owner`) |
| Версия исходников и бандла донора | 2.2.5, source digest `f12d1abc…a22099b` |

Пофайловое сравнение всех `src/*.ts` и тестов 12 модулей донора и Harness
показало: кроме шести уже объяснённых адаптаций 2.2.4 и путей импорта тестов
(`test/**` донора → `src/**` Harness), отличается ровно содержимое `696e95c4`.

## 3. Состав 2.2.5

Команда `scope:owner --session <id> --note "<why>"` переносит
`execution.ownerSession` открытого scope в другую сессию до начала работы.

- `workflow-plan`: новый `plan-owner.ts` (`moveOwner(plan, session, note, now)`:
  `NO_SCOPE`, `USAGE`, тот же владелец без изменений, `OWNER_BUSY` при задаче
  `IN_PROGRESS`, иначе revision + 1 и решение
  `Owner session moved from <old|none> to <id>: <note>`), метод фасада.
- `workflow-kit`: новый `kit-scope-owner.ts` (блокировка, отказ при активном
  назначении, сохранение плана без коммита, как `task:block`), команда CLI в
  `kit-cli-execution.ts` с текстовой формой, метод фасада, тест
  `workflow-kit-owner.test.mjs`.
- `workflow-installer`: `KIT_VERSION = 2.2.5` и проверка версии в тесте.
  Управляемые тексты не меняются; смена версии переводит прежние установки
  в `KIT_OUTDATED`, и обновление переписывает manifest/runtime.

Адаптации Harness, как в 2.2.4: тесты в `src/**` и импорты `../src/`;
донорский `tests.md` отражается в `module.md`; сборка остаётся Vite
(`scripts/build-workflow-kit.mjs`); форматирование — профиль Harness.
Контракт `workflow-kit/module.md` у предела 28 000 байт: описание команды
краткое, полное — в [WorkflowKitCommands.md](workflow-kit/WorkflowKitCommands.md).

Тест `core-product-info.test.mjs` сверяет версию Kit, встроенного в
приложение, через фасад установщика; его ожидание становится 2.2.5.
Контракт `core-runtime-process` от числа не зависит (docsWaiver).

Не переносится: подключение `scope:owner` в UI/Core Harness (донорская панель
вызывает её при старте плана из другой сессии). Это отдельная продуктовая
доработка, пользователь её не поручал. UI, служба, PTY и release-скрипты
донора, версия `package.json` не меняются.

## 4. Почему раунд R2 этого scope

Активный scope ждёт приёмки; принять и закрыть его можно только по словам
пользователя, которых нет. Поэтому работа добавляется через `plan:extend`
новым раундом implementation. Это согласуется с целью scope: About показывает
версию встроенного Kit, и новый релиз покажет 2.2.5 — проверка обновления.

## 5. План

| ID | Результат | Зависимости |
| --- | --- | --- |
| T006 | `scope:owner`: модель плана, Kit, CLI, тест, контракты | — |
| T007 | `KIT_VERSION = 2.2.5` и связанные проверки | T006 |
| DOCS-R2 | Общие документы, справочник команд, дайджест | T006, T007 |
| T008 | delivery: бандл 2.2.5, `install --update` репозитория, evidence | DOCS-R2 |
| T009 | delivery: `package:mac` с `v2026.11.14`, проверка About | T008 |
| T010 | delivery: push main, тег, GitHub Release с zip | T009 |

Режим sequential: задачи образуют цепочку. Подтверждение delivery-задач —
приведённое выше поручение пользователя.

## 6. Обновление и выпуск

- T008: `npm run build:workflow-kit`, затем установщик **нового** бандла
  (`node dist/workflow-kit/workflow.mjs install --update --host harness`),
  не старого `scripts/workflow` — урок 2.2.4. Установщик сам создаёт
  служебный `kit-update` коммит. Проверить `doctor`, `validate`, `status`,
  `recover`, сохранность плана; хеш runtime равен хешу бандла.
  Evidence — `docs/evidence/WorkflowKitSync-2.2.5-2026-11-14.md`.
- T009: `npm run quality`, `check:dup`, `check:security`, `check:links`,
  `npm run build`, `HARNESS_RELEASE_TAG=v2026.11.14 npm run package:mac`
  (при занятом теге — следующий суффикс до сборки). Проверить
  `release/mac-arm64/Harness AI.app`, Info.plist, встроенный Kit 2.2.5 и
  нативное окно About с двумя версиями.
- T010: проверка истории на секреты, обычный push `main`, тег из дескриптора
  пакета, Release с дайджестом и zip (`ditto -c -k --keepParent`).

## 7. Критерии приёмки

1. Исходники Kit Harness совпадают с донором `696e95c4` с точностью до
   задокументированных адаптаций; `KIT_VERSION` и тесты — 2.2.5.
2. Все коммиты проходят профиль качества без обхода проверок.
3. Установленный Kit репозитория — 2.2.5, `doctor`/`validate` ok, план и
   история сохранены, управляемые файлы руками не правились.
4. About упакованного приложения показывает Harness AI `2026.11.14` и
   Workflow Kit `2.2.5`.
5. Опубликованы main, новый тег и Release; прежние релизы не перезаписаны.
6. Приёмка и закрытие scope — только по словам пользователя.

## 8. Результат переноса исходников

- T006 `b3b6895f`: `plan-owner.ts`, `kit-scope-owner.ts`, команда CLI
  `scope:owner`, методы фасадов и тест `workflow-kit-owner.test.mjs`.
  Biome переформатировал четыре файла; поведение совпадает с `696e95c4`.
- T007 `30a18290`: `KIT_VERSION = 2.2.5`, тест payload и ожидание версии
  встроенного Kit в `core-product-info.test.mjs`.

Оба коммита прошли полный профиль качества. Контракты `workflow-plan`,
`workflow-kit` и `workflow-installer` обновлены вместе с кодом; остальные
модули Kit не менялись с 2.2.4, их строки синхронизации это отражают.
