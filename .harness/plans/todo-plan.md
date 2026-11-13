# Workflow Plan — harness-ai

<!-- harness-workflow:begin -->
```json
{
  "currentTaskId": null,
  "lastClosed": {
    "closedAt": "2026-11-13T16:32:24.995Z",
    "scopeId": "workflow-kit-sync-2.2.4-2026-11-13"
  },
  "projectId": "harness-ai",
  "projectName": "harness-ai",
  "revision": 240,
  "rounds": [
    {
      "digest": {
        "contracts": [
          "get-product-info returns a process snapshot: applicationVersion, workflowKitVersion, releaseTag, buildNumber and channel.",
          "Missing or inconsistent metadata fails rather than producing a zero or fictitious release number.",
          "HARNESS_RELEASE_TAG is required before packaging; publish the tag embedded in the tested artifact."
        ],
        "decisions": [
          "Use the existing calendar release tag for the full About version; derive three-component package version and build number automatically.",
          "Keep source package.json.version unchanged and overwrite stale release metadata with explicit Development in dev builds.",
          "Core owns application and bundled Kit versions; About never uses the selected project Kit version."
        ],
        "references": [
          "docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md",
          "README.md",
          "docs/architecture/OVERVIEW.md"
        ],
        "result": "Implemented immutable release version metadata, Core product info and the native About wiring. All three source tasks passed the full quality profile. Packaged native-window verification and publication remain delivery tasks."
      },
      "id": "R1",
      "kind": "implementation",
      "status": "OPEN",
      "title": "Implementation"
    }
  ],
  "schema": "harness-workflow-plan/1",
  "scope": {
    "acceptance": [
      "About displays two clearly labeled versions: the installed Harness AI release and its bundled Workflow Kit.",
      "Version metadata is fixed before packaging and agrees with Core, macOS metadata and the published GitHub tag.",
      "Both versions are verified visually in the actual native About window of the packaged application; selecting a different project does not change them.",
      "Quality checks pass and the corrected macOS artifact is published as a new release without overwriting the existing one."
    ],
    "acceptanceNote": null,
    "approval": {
      "at": "2026-11-13T16:54:05.378Z",
      "text": "Пользователь: «Я думаю, что там должна быть обязательно и версия самого приложения и версия Workflow Kit»; «иначе откуда я узнаю, что апдейт произошел?» | Execution mode chosen by the user: sequential: Пользователь: «Выбираю последовательный режим без ревьювера. Выполни план, проверь обе версии в About готового приложения и опубликуй новый релиз на GitHub». Подтверждены delivery сборки и публикации."
    },
    "baselineCommit": "89922ac6adea0623f449fce6cfef80215ae7fb35",
    "blockedReason": null,
    "context": [
      {
        "path": "docs/DOCUMENTATION_INDEX.md",
        "required": false
      }
    ],
    "decisions": [
      {
        "at": "2026-11-13T16:54:05.378Z",
        "text": "Application release version follows the existing GitHub calendar tag; packaged macOS/SemVer version and build are derived automatically."
      },
      {
        "at": "2026-11-13T16:54:05.378Z",
        "text": "Keep source package.json.version unchanged; generate real version metadata for the packaged application."
      },
      {
        "at": "2026-11-13T16:54:05.378Z",
        "text": "Core is the authority; About shows the bundled Kit version, independently of project selection."
      },
      {
        "at": "2026-11-13T16:54:05.378Z",
        "text": "Use the existing native About panel and existing modules, with no new dependencies."
      }
    ],
    "delivery": "IN_PROGRESS",
    "execution": {
      "maxWorkers": 3,
      "ownerSession": "01a1d574-4310-7453-b7e3-5276848f46a8",
      "strategy": "sequential"
    },
    "id": "application-versions-about-2026-11-13",
    "objective": "Показывать в нативном About достоверные раздельные версии установленного Harness AI и встроенного Workflow Kit, связанные с реальной релизной сборкой.",
    "spec": "docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md",
    "status": "ACTIVE"
  },
  "tasks": [
    {
      "acceptance": [
        "HARNESS_RELEASE_TAG нормализуется один раз в releaseTag/releaseVersion, трёхкомпонентную applicationVersion и buildNumber; неверные или пустые release-теги прекращают упаковку.",
        "Build/dev/package используют единый дескриптор; electron-builder получает реальные version/buildVersion, исходная package.json.version не меняется.",
        "Ресурс дескриптора включён в пакет; dev-сборка явно Development и не наследует прежний релизный номер.",
        "Проверены первая/повторная версии даты и ошибочные теги; профиль коммита проходит."
      ],
      "checks": [],
      "commitMessage": "feat(build): generate immutable application release metadata",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md",
          "heading": "3. Источники истины",
          "required": true
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "scripts/build-release-info.mjs",
        "scripts/build-release-info.test.mjs",
        "scripts/package-mac.mjs",
        "scripts/dev-electron.mjs",
        "package.json"
      ],
      "fixes": null,
      "id": "T001",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Создать единые метаданные версии релизной сборки",
      "why": "Обозначить реальную версию готового приложения без ручной смены package.json.version; связанный набор tooling и тестов допускает более трёх функциональных файлов."
    },
    {
      "acceptance": [
        "get-product-info возвращает releaseVersion приложения и workflowKitFacade.installer.version; Core валидирует ресурс сборки.",
        "Метод работает без workspace; открытый проект со старым Kit не меняет версию Kit приложения.",
        "Нет чтения versions из renderer и нет изменения модулей Kit ради окна About; контракт и тесты обновлены вместе с кодом.",
        "Повреждённый или отсутствующий release-ресурс не превращается в достоверный Development/0.0.0; профиль коммита проходит."
      ],
      "checks": [],
      "commitMessage": "feat(core): expose installed product version information",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md",
          "heading": "3. Источники истины",
          "required": true
        }
      ],
      "dependencies": [
        "T001"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-product-info.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-product-info.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md"
      ],
      "fixes": null,
      "id": "T002",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Отдавать версии приложения и встроенного Kit из Core",
      "why": "Дать About один Core-контракт, независимый от текущего workspace."
    },
    {
      "acceptance": [
        "Host получает get-product-info через Core bridge и настраивает штатное окно About.",
        "В About отдельно подписаны версия Harness AI и версия встроенного Workflow Kit; нулевая заглушка отсутствует.",
        "Core-недоступность отображается честно; host/renderer не определяют продуктовые версии из Git, package.json или выбранного проекта.",
        "Документы обоих модулей актуальны; изменение не затрагивает меню и окна сверх необходимой настройки About."
      ],
      "checks": [],
      "commitMessage": "feat(electron): show application and Workflow Kit versions in About",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md",
          "heading": "2. Видимый результат",
          "required": true
        }
      ],
      "dependencies": [
        "T002"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/app-bootstrap-facade.mjs",
        "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/module.md",
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs",
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.test.mjs",
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/module.md"
      ],
      "fixes": null,
      "id": "T003",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Показать две версии в нативном About",
      "why": "Сделать установленное обновление проверяемым пользователем через существующий пункт About."
    },
    {
      "acceptance": [
        "Project-wide documents describe the round result",
        "The round digest records result, decisions, contracts and references"
      ],
      "checks": [],
      "commitMessage": "docs: reconcile documentation for R1",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "T001",
        "T002",
        "T003"
      ],
      "docsWaiver": null,
      "files": [
        "AGENTS.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/DOCUMENTATION_INDEX.md",
        "docs/architecture/ReleaseFixes-2026-11-04-2.md",
        "docs/architecture/workflow-kit/WorkflowKitQuality.md",
        "docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md"
      ],
      "fixes": null,
      "id": "DOCS-R1",
      "iteration": 1,
      "kind": "docs",
      "roundId": "R1",
      "status": "DONE",
      "title": "Reconcile project documentation and write the round digest",
      "why": "Keep the project context current for the next agent and close the round."
    },
    {
      "acceptance": [
        "Delivery начата с подтверждением пользователя; тег выбран до упаковки, ожидается новый свободный тег даты сборки с суффиксом при повторе.",
        "Качество, duplication/security/links и упаковка проходят; upackaged package.json, Info.plist и Core согласованы с единым дескриптором.",
        "Реальное нативное About открыто в собранном Harness AI.app, обе подписанные версии читаются на screenshot; renderer-only изображение не выдаётся за проверку About.",
        "Приложение работает без workspace, а выбор проекта с другой версией Kit не меняет About; renderer/preload/Core и подготовка проекта работают.",
        "Evidence и индекс записаны вместе; текущий опубликованный релиз не перезаписан."
      ],
      "checks": [],
      "commitMessage": "chore: package and verify application version display",
      "confirmation": "Пользователь: «Выполни план, проверь обе версии в About готового приложения и опубликуй новый релиз на GitHub». Подтверждены сборка и нативная проверка.",
      "context": [
        {
          "path": "docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md",
          "heading": "6. Критерии и проверка",
          "required": true
        }
      ],
      "dependencies": [
        "T003",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/ApplicationVersionsAndAbout-2026-11-13.md",
        "docs/evidence/assets",
        "docs/DOCUMENTATION_INDEX.md",
        "docs/evidence/assets/application-versions-about-v2026.11.13.2.png"
      ],
      "fixes": null,
      "id": "T004",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "DONE",
      "title": "Собрать и проверить приложение с новым About",
      "why": "Проверить реальную поставку, включая нативное окно и согласованные метаданные."
    },
    {
      "acceptance": [
        "Delivery начата с подтверждением; история проверена на секреты, push-проверки проходят без обходов.",
        "Публикация использует тег проверенного дескриптора; main, новый тег и Release с zip неподписанного приложения отправлены на GitHub.",
        "Проверены asset state/size/digest; версии About соответствуют загруженному пакету; старый релиз сохранён.",
        "Приёмка и закрытие scope не объявлены выполненными без соответствующих пользовательских команд."
      ],
      "checks": [],
      "commitMessage": "chore: publish release with application and Kit version information",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md",
          "heading": "7. Документация и поставка",
          "required": true
        }
      ],
      "dependencies": [
        "T004",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/ApplicationVersionsAndAbout-2026-11-13.md"
      ],
      "fixes": null,
      "id": "T005",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "TODO",
      "title": "Опубликовать исправленный релиз Harness AI",
      "why": "Доставить пользователю проверенное приложение с обеими версиями."
    }
  ]
}
```
<!-- harness-workflow:end -->

## State

- Scope: application-versions-about-2026-11-13 (ACTIVE)
- Delivery: IN_PROGRESS
- Execution: sequential
- Current task: none
- Progress: 5/6
- Revision: 240

## Objective

Показывать в нативном About достоверные раздельные версии установленного Harness AI и встроенного Workflow Kit, связанные с реальной релизной сборкой.

## Acceptance

- About displays two clearly labeled versions: the installed Harness AI release and its bundled Workflow Kit.
- Version metadata is fixed before packaging and agrees with Core, macOS metadata and the published GitHub tag.
- Both versions are verified visually in the actual native About window of the packaged application; selecting a different project does not change them.
- Quality checks pass and the corrected macOS artifact is published as a new release without overwriting the existing one.

## Rounds

### R1 — Implementation (implementation, OPEN)

- [DONE] T001 — Создать единые метаданные версии релизной сборки (work)
  - Commit: feat(build): generate immutable application release metadata
  - Files: scripts/build-release-info.mjs, scripts/build-release-info.test.mjs, scripts/package-mac.mjs, scripts/dev-electron.mjs, package.json
- [DONE] T002 — Отдавать версии приложения и встроенного Kit из Core (work)
  - Commit: feat(core): expose installed product version information
  - Files: product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-product-info.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-product-info.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md
  - Depends on: T001
- [DONE] T003 — Показать две версии в нативном About (work)
  - Commit: feat(electron): show application and Workflow Kit versions in About
  - Files: product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/app-bootstrap-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/module.md, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.test.mjs, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/module.md
  - Depends on: T002
- [DONE] DOCS-R1 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R1
  - Files: AGENTS.md, README.md, docs/architecture/OVERVIEW.md, docs/DOCUMENTATION_INDEX.md, docs/architecture/ReleaseFixes-2026-11-04-2.md, docs/architecture/workflow-kit/WorkflowKitQuality.md, docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md
  - Depends on: T001, T002, T003
- [DONE] T004 — Собрать и проверить приложение с новым About (delivery)
  - Commit: chore: package and verify application version display
  - Files: docs/evidence/ApplicationVersionsAndAbout-2026-11-13.md, docs/evidence/assets, docs/DOCUMENTATION_INDEX.md, docs/evidence/assets/application-versions-about-v2026.11.13.2.png
  - Depends on: T003, DOCS-R1
- [TODO] T005 — Опубликовать исправленный релиз Harness AI (delivery)
  - Commit: chore: publish release with application and Kit version information
  - Files: docs/evidence/ApplicationVersionsAndAbout-2026-11-13.md
  - Depends on: T004, DOCS-R1

Digest: Implemented immutable release version metadata, Core product info and the native About wiring. All three source tasks passed the full quality profile. Packaged native-window verification and publication remain delivery tasks.

State changes only through `scripts/workflow` commands. History lives in Git.
