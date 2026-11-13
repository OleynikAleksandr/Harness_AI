# Workflow Plan — harness-ai

<!-- harness-workflow:begin -->
```json
{
  "currentTaskId": null,
  "lastClosed": {
    "closedAt": "2026-11-12T15:04:21.725Z",
    "scopeId": "kit-recovery-parts-2026-11-12"
  },
  "projectId": "harness-ai",
  "projectName": "harness-ai",
  "revision": 205,
  "rounds": [
    {
      "digest": null,
      "id": "R1",
      "kind": "implementation",
      "status": "OPEN",
      "title": "Implementation"
    }
  ],
  "schema": "harness-workflow-plan/1",
  "scope": {
    "acceptance": [
      "Все 12 модулей Kit сверены с донором 2.2.4, изменения исходников и тестов перенесены с документированными адаптациями Harness.",
      "Профиль качества, тесты Kit и существующая интеграция Core/provider проходят, публичные фасады и Core authority сохранены.",
      "Kit самого Harness-репозитория обновлён до 2.2.4 штатным install --update, runtime/manifest/hooks согласованы, план и история сохранены.",
      "Пакет Harness AI для macOS собран и проверен с Kit 2.2.4; main, тег и Release с архивом опубликованы после подтверждений delivery."
    ],
    "acceptanceNote": null,
    "approval": {
      "at": "2026-11-13T15:21:47.993Z",
      "text": "Пользователь: «В текущем проекте нужно довести модуль workflow kit до версии 2.2.4». После уточнения состава: «Всё верно, готов спецификацию и план». | Execution mode chosen by the user: sequential: Пользователь выбрал последовательный режим без ревьювера; поручил выполнить план, собрать новый релиз, закрыть scope и опубликовать на GitHub. Подтверждены delivery-задачи."
    },
    "baselineCommit": "94a9d4570c071f34cc5fcfa5fb7192cead2d4559",
    "blockedReason": null,
    "context": [
      {
        "path": "docs/DOCUMENTATION_INDEX.md",
        "required": false
      }
    ],
    "decisions": [
      {
        "at": "2026-11-13T15:21:47.993Z",
        "text": "Донор — зафиксированное состояние Kit 2.2.4 в Workflow_Kit; донорский репозиторий только читается."
      },
      {
        "at": "2026-11-13T15:21:47.993Z",
        "text": "Harness сохраняет Core-владение, src для тестов, Vite-сборку и текущие зависимости; специфичные части приложения Workflow_Kit не переносятся."
      },
      {
        "at": "2026-11-13T15:21:47.993Z",
        "text": "Задачи переноса имеют явно перечисленные атомарные наборы файлов сверх ориентира трёх функциональных файлов."
      },
      {
        "at": "2026-11-13T15:21:47.993Z",
        "text": "Рекомендуется sequential; T002/T004 и T003/T004 отмечены parallelSafe по независимым путям."
      },
      {
        "at": "2026-11-13T15:21:47.993Z",
        "text": "Реализация начинается после выбора режима; delivery подтверждается отдельно; приёмка и закрытие scope требуют отдельных пользовательских решений."
      }
    ],
    "delivery": "IN_PROGRESS",
    "execution": {
      "maxWorkers": 2,
      "ownerSession": "01a1d574-4310-7453-b7e3-5276848f46a8",
      "strategy": "sequential"
    },
    "id": "workflow-kit-sync-2.2.4-2026-11-13",
    "objective": "Синхронизировать Workflow Kit 2.2.4 из Workflow_Kit в Harness AI, обновить Kit репозитория и выпустить приложение.",
    "spec": "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
    "status": "ACTIVE"
  },
  "tasks": [
    {
      "acceptance": [
        "Перед переносом подтверждены зафиксированные версия 2.2.4, source digest и коммит Kit донора; перенос не захватывает посторонние изменения Workflow_Kit.",
        "Перенесены optional platform у currentWorkflowPlatform, install и doctor; executable-правила и новый doctor-checks модуль соответствуют донору.",
        "KIT_VERSION и тесты версии ожидают 2.2.4; install/update идемпотентны и сохраняют пользовательские секции и конфигурацию.",
        "Донорские тесты и helpers адаптированы к src; module.md обоих модулей актуальны; существующие проверки коммита проходят."
      ],
      "checks": [],
      "commitMessage": "feat(workflow): synchronize platform and installer with Kit 2.2.4",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
          "heading": "3. Границы переноса",
          "required": true
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/src/platform-paths.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-doctor-checks.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-doctor.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-install.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-doctor.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-existing.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install-support.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-migrate.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-platform.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md"
      ],
      "fixes": null,
      "id": "T001",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Синхронизировать платформу, установщик и Doctor 2.2.4",
      "why": "Перенести правила ОС и новую версию payload со связанным разбиением и тестами установки; атомарный перенос этих модулей требует более трёх функциональных файлов."
    },
    {
      "acceptance": [
        "Разбиение input schema и scope completion соответствует донору; публичные экспорты и семантика планов сохранены.",
        "Существующие тесты схем, переходов, раундов и исполнения проходят; module.md отражает новые внутренние файлы."
      ],
      "checks": [],
      "commitMessage": "refactor(workflow): synchronize Kit plan internals",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
          "heading": "3. Границы переноса",
          "required": true
        }
      ],
      "dependencies": [
        "T001"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-schema-fields.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-schema.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-rounds.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-scope-completion.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md"
      ],
      "fixes": null,
      "id": "T002",
      "iteration": 1,
      "kind": "work",
      "parallelSafe": true,
      "roundId": "R1",
      "status": "DONE",
      "title": "Перенести разбиение модели плана 2.2.4",
      "why": "Синхронизировать схему входов и завершение scope без изменения публичного фасада; четыре связанных файла реализации переносятся атомарно."
    },
    {
      "acceptance": [
        "Перенесены facade base, scope create и группы CLI; API WorkflowKitFacade, envelopes и команды сохраняют совместимость с Harness.",
        "Изменённые тесты донора адаптированы к src, включая file URLs, пути Windows, npm.cmd/Path и выделенный test support.",
        "Цикл scope/task/commit/DOCS, hooks, recovery context, mode choice, assignments и worktree подтверждён тестами; module.md содержит актуальное описание тестов без отдельного tests.md."
      ],
      "checks": [],
      "commitMessage": "refactor(workflow): synchronize Kit facade and CLI",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
          "heading": "3. Границы переноса",
          "required": true
        }
      ],
      "dependencies": [
        "T002"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-hook.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-scope.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-facade-base.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope-create.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-assignment.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-context-command.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-execution-mode.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-executor.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-hooks.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-ignored-commit.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-status.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-support.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-worktree.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md"
      ],
      "fixes": null,
      "id": "T003",
      "iteration": 1,
      "kind": "work",
      "parallelSafe": true,
      "roundId": "R1",
      "status": "TODO",
      "title": "Синхронизировать фасад Kit, CLI и тесты процесса",
      "why": "Перенести согласованное разбиение Kit с регрессиями процесса; связанные файлы и test helpers превышают ориентир в три файла."
    },
    {
      "acceptance": [
        "Разбиение Git staging, integration phases и autopilot model перенесено; публичные фасады и жизненный цикл транзакции сохранены.",
        "Тесты истории и оркестрации используют корректные пути worktree на разных ОС и helpers в src; service commits, two-parent integration и repair проходят регрессии.",
        "module.md каждого изменённого модуля описывает актуальные исходники; файлы задачи не пересекаются с T002/T003."
      ],
      "checks": [],
      "commitMessage": "refactor(workflow): synchronize Git integration and autopilot",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
          "heading": "3. Границы переноса",
          "required": true
        }
      ],
      "dependencies": [
        "T001"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-staging.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-history.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-merge.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-phases.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/orchestration-scenario-planning.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/orchestration-scenario-support.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/orchestration-scenario.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/workflow-integration-facade.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/workflow-integration-merge-support.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/workflow-integration-merge.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/autopilot-decision.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/autopilot-model.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/module.md"
      ],
      "fixes": null,
      "id": "T004",
      "iteration": 1,
      "kind": "work",
      "parallelSafe": true,
      "roundId": "R1",
      "status": "TODO",
      "title": "Синхронизировать Git, интеграцию и autopilot",
      "why": "Перенести взаимосвязанные staging/merge phases и autopilot model с тестами оркестрации; эта задача атомарно охватывает более трёх функциональных файлов."
    },
    {
      "acceptance": [
        "Перенесены остальные содержательные изменения тестов assignment, host, quality, recovery; host сохраняет Vite и получает 30-секундный timeout обычных команд, timeout-тест сохраняет короткий предел.",
        "Все 12 модулей сравнены с зафиксированным донором: оставшиеся отличия ограничены Harness-адаптациями, перечень подготовлен для DOCS и evidence T006.",
        "Полный профиль коммита проходит, в том числе тесты Kit и существующие Core RPC, plan read model, паузы, mode choice, autopilot и provider workspaceContext.",
        "При выявлении дефекта вне перечисленных файлов сначала уточнена отдельная задача плана через Kit; UI не получает новой логики состояния."
      ],
      "checks": [],
      "commitMessage": "test(workflow): synchronize remaining Kit regressions",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
          "heading": "3. Границы переноса",
          "required": true
        }
      ],
      "dependencies": [
        "T003",
        "T004"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-cancel.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/src/workflow-host-facade.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner-support.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-worktree.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md"
      ],
      "fixes": null,
      "id": "T005",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Перенести оставшиеся регрессии и сверить интеграцию Harness",
      "why": "Завершить перенос изменённых тестов четырёх модулей и сверить все 12 модулей; связанные test helpers и контракты перечислены явно."
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
        "T003",
        "T004",
        "T005"
      ],
      "docsWaiver": null,
      "files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md"
      ],
      "fixes": null,
      "id": "DOCS-R1",
      "iteration": 1,
      "kind": "docs",
      "roundId": "R1",
      "status": "TODO",
      "title": "Reconcile project documentation and write the round digest",
      "why": "Keep the project context current for the next agent and close the round."
    },
    {
      "acceptance": [
        "Задача delivery начата с пользовательским подтверждением; npm run build:workflow-kit собрал бандл из синхронизированных исходников и выполнил smoke install/validate/doctor.",
        "install --update с новым бандлом и --host harness создал штатный служебный kit-update коммит; управляемые файлы не правились вручную.",
        "Новый runtime и manifest имеют 2.2.4, doctor/validate/status/schema/recover работают, активный scope, task state и Git-история сохранены; дальнейший task-коммит выполняет обновлённый Kit.",
        "Проверены полные результаты Codex hook и всех Claude hook частей с единым дайджестом; факт потребления живой сессией не выводится из одного hook-вывода.",
        "Созданы evidence с хешами, коммитами, адаптациями и результатами; индекс обновлён в том же task-коммите."
      ],
      "checks": [],
      "commitMessage": "chore(workflow): verify repository Kit 2.2.4 update",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
          "heading": "6. Порядок обновления и выпуска",
          "required": true
        }
      ],
      "dependencies": [
        "T005",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        ".harness/workflow/runtime/workflow.mjs",
        ".harness/workflow/manifest.json",
        "scripts/workflow",
        "scripts/workflow.cmd",
        "scripts/workflow.ps1",
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/hooks.json",
        ".claude/settings.json",
        ".husky/pre-commit",
        ".husky/commit-msg",
        ".husky/post-commit",
        ".husky/pre-push",
        ".gitignore",
        ".gitattributes",
        "docs/evidence/WorkflowKitSync-2.2.4-2026-11-13.md",
        "docs/DOCUMENTATION_INDEX.md"
      ],
      "fixes": null,
      "id": "T006",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "TODO",
      "title": "Обновить установленный Kit репозитория до 2.2.4",
      "why": "Обновить runtime, manifest и hooks штатным установщиком после синхронизации и DOCS; исходники и установленный Kit должны иметь согласованную версию."
    },
    {
      "acceptance": [
        "Delivery начата с подтверждением пользователя; пройдены quality, dup, security, links и npm run build, затем npm run package:mac.",
        "Пакет release/mac-arm64/Harness AI.app существует и перезапущен; новый временный проект получает Kit 2.2.4, Core читает статус и план.",
        "Evidence отличает проверки hooks и Core от факта приёма recovery новой сессией; непроведённый Windows live test не заявлен как пройденный.",
        "Версия package.json не изменена; результаты упаковки и запуска добавлены в evidence."
      ],
      "checks": [],
      "commitMessage": "chore: package Harness AI with Workflow Kit 2.2.4",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
          "heading": "6. Порядок обновления и выпуска",
          "required": true
        }
      ],
      "dependencies": [
        "T006",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/WorkflowKitSync-2.2.4-2026-11-13.md"
      ],
      "fixes": null,
      "id": "T007",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "TODO",
      "title": "Собрать и проверить Harness AI для macOS",
      "why": "Проверить приложение с новым бандлом Kit в реальном macOS-пакете."
    },
    {
      "acceptance": [
        "Delivery начата с подтверждением пользователя; история перед публикацией проверена на секреты, штатные push-проверки прошли без обхода hooks.",
        "main отправлен в origin обычным push, опубликован тег vYYYY.M.D с суффиксом при повторе даты и GitHub Release с заметками из дайджеста.",
        "Zip неподписанного Harness AI.app создан через ditto -c -k --keepParent, загружен в Release; release URL, tag и asset проверены.",
        "Evidence содержит фактические SHA и ссылки; пользовательская приёмка и закрытие scope не записаны автоматически."
      ],
      "checks": [],
      "commitMessage": "chore: publish Harness AI with Workflow Kit 2.2.4",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md",
          "heading": "6. Порядок обновления и выпуска",
          "required": true
        }
      ],
      "dependencies": [
        "T007",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/WorkflowKitSync-2.2.4-2026-11-13.md"
      ],
      "fixes": null,
      "id": "T008",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "TODO",
      "title": "Опубликовать Harness AI с Workflow Kit 2.2.4",
      "why": "Завершить поставку публикацией main, тега даты сборки и Release с архивом приложения по правилам проекта."
    }
  ]
}
```
<!-- harness-workflow:end -->

## State

- Scope: workflow-kit-sync-2.2.4-2026-11-13 (ACTIVE)
- Delivery: IN_PROGRESS
- Execution: sequential
- Current task: none
- Progress: 2/9
- Revision: 205

## Objective

Синхронизировать Workflow Kit 2.2.4 из Workflow_Kit в Harness AI, обновить Kit репозитория и выпустить приложение.

## Acceptance

- Все 12 модулей Kit сверены с донором 2.2.4, изменения исходников и тестов перенесены с документированными адаптациями Harness.
- Профиль качества, тесты Kit и существующая интеграция Core/provider проходят, публичные фасады и Core authority сохранены.
- Kit самого Harness-репозитория обновлён до 2.2.4 штатным install --update, runtime/manifest/hooks согласованы, план и история сохранены.
- Пакет Harness AI для macOS собран и проверен с Kit 2.2.4; main, тег и Release с архивом опубликованы после подтверждений delivery.

## Rounds

### R1 — Implementation (implementation, OPEN)

- [DONE] T001 — Синхронизировать платформу, установщик и Doctor 2.2.4 (work)
  - Commit: feat(workflow): synchronize platform and installer with Kit 2.2.4
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/src/platform-paths.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-doctor-checks.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-doctor.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-install.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-doctor.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-existing.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install-support.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-migrate.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-platform.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md
- [DONE] T002 — Перенести разбиение модели плана 2.2.4 (work, parallel-safe)
  - Commit: refactor(workflow): synchronize Kit plan internals
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-schema-fields.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-schema.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-rounds.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-scope-completion.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md
  - Depends on: T001
- [TODO] T003 — Синхронизировать фасад Kit, CLI и тесты процесса (work, parallel-safe)
  - Commit: refactor(workflow): synchronize Kit facade and CLI
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-hook.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-scope.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-facade-base.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope-create.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-assignment.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-context-command.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-execution-mode.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-executor.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-hooks.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-ignored-commit.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-status.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-support.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-worktree.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md
  - Depends on: T002
- [TODO] T004 — Синхронизировать Git, интеграцию и autopilot (work, parallel-safe)
  - Commit: refactor(workflow): synchronize Git integration and autopilot
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-staging.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-history.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-merge.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-phases.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/orchestration-scenario-planning.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/orchestration-scenario-support.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/orchestration-scenario.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/workflow-integration-facade.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/workflow-integration-merge-support.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/workflow-integration-merge.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/autopilot-decision.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/autopilot-model.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/module.md
  - Depends on: T001
- [TODO] T005 — Перенести оставшиеся регрессии и сверить интеграцию Harness (work)
  - Commit: test(workflow): synchronize remaining Kit regressions
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-cancel.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/src/workflow-host-facade.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner-support.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-worktree.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md
  - Depends on: T003, T004
- [TODO] DOCS-R1 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R1
  - Files: README.md, docs/architecture/OVERVIEW.md, docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md
  - Depends on: T001, T002, T003, T004, T005
- [TODO] T006 — Обновить установленный Kit репозитория до 2.2.4 (delivery)
  - Commit: chore(workflow): verify repository Kit 2.2.4 update
  - Files: .harness/workflow/runtime/workflow.mjs, .harness/workflow/manifest.json, scripts/workflow, scripts/workflow.cmd, scripts/workflow.ps1, AGENTS.md, CLAUDE.md, .codex/hooks.json, .claude/settings.json, .husky/pre-commit, .husky/commit-msg, .husky/post-commit, .husky/pre-push, .gitignore, .gitattributes, docs/evidence/WorkflowKitSync-2.2.4-2026-11-13.md, docs/DOCUMENTATION_INDEX.md
  - Depends on: T005, DOCS-R1
- [TODO] T007 — Собрать и проверить Harness AI для macOS (delivery)
  - Commit: chore: package Harness AI with Workflow Kit 2.2.4
  - Files: docs/evidence/WorkflowKitSync-2.2.4-2026-11-13.md
  - Depends on: T006, DOCS-R1
- [TODO] T008 — Опубликовать Harness AI с Workflow Kit 2.2.4 (delivery)
  - Commit: chore: publish Harness AI with Workflow Kit 2.2.4
  - Files: docs/evidence/WorkflowKitSync-2.2.4-2026-11-13.md
  - Depends on: T007, DOCS-R1

State changes only through `scripts/workflow` commands. History lives in Git.
