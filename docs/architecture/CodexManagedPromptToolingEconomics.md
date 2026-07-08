# Экономика управляемого prompt и tooling для CodexUC

Статус: архитектурный вывод по benchmark-экспериментам 2026-07-08.

Этот документ фиксирует важный результат сравнения двух путей вызова Codex:

- **Codex app-server** — родной клиент OpenAI/Codex через application server.
- **CodexUC** — наш собственный Responses-compatible клиент, где Harness AI
  сам формирует системный prompt, системный tooling, request envelope и
  provider-adapter protocol.

## Вывод

Управление и системным prompt, и системным tooling является не косметической
настройкой, а существенным рычагом качества и стоимости сессии.

В benchmark-прогонах CodexUC с task-specific lean-профилем сохранил качество
завершения Electron/macOS application задачи, но использовал заметно меньший
контекст:

- полный CodexUC benchmark-профиль: примерно `45,591` used tokens и `45,440`
  cached tokens;
- lean CodexUC Electron-профиль: примерно `27,283` used tokens и `24,576`
  cached tokens;
- сопоставимый Codex app-server Electron-прогон: примерно `44,818` used tokens
  и `42,368` cached tokens.

Lean-профиль при этом не упростил саму задачу: агент всё равно прошёл
обязательный lifecycle:

- planning document;
- `.harness/plans/todo-plan.md`;
- реализация Electron main/preload/renderer/shared logic;
- `npm install`;
- `npm run build`;
- `npm test`;
- `npm run package:mac`;
- evidence-документ;
- completion guard перед финальным ответом.

В рамках этого эксперимента снижения качества завершения не наблюдалось:
план был закрыт, package был создан, evidence был записан, а промежуточные
сообщения не завершали turn преждевременно.

## Почему это важно

Большой native-like профиль полезен как эталон для сравнения с Codex
app-server, но он не должен становиться единственным рабочим режимом.

Если задача известна заранее, Core может собрать более узкий provider-facing
пакет:

- только релевантные workflow-инструкции;
- только нужные tool schemas;
- только нужные adapter protocol rules;
- без skills/plugins/MCP/browser/web/tool descriptions, которые не нужны
  конкретной задаче;
- без длинных общих правил, если они не участвуют в acceptance criteria.

Это уменьшает входной prompt, снижает cache anchor size и уменьшает шум для
модели. Важно, что экономия достигается не за счёт отключения агентности, а за
счёт удаления нерелевантного статического payload.

## Граница между profile и adapter

Эксперименты также подтвердили разделение ответственности:

- **profile/compiler** отвечает за статический prompt и статический tooling,
  которые видит модель;
- **provider adapter** отвечает за wire protocol и lifecycle semantics:
  tool loop, фазу `commentary`, терминальную фазу `final_answer`, обработку
  native/custom tool calls, telemetry/cache mapping;
- **Core/UI** не должны угадывать завершённость turn по обычному тексту
  assistant output.

Поэтому сокращение профиля не должно удалять adapter-owned protocol. Если
провайдер не имеет родного аналога `agentMessage.phase`, adapter обязан дать
модели явный способ различать промежуточный прогресс и финальный ответ.

Для CodexUC таким способом является route-owned `final_answer` protocol:
обычный assistant text считается `commentary`, а terminal answer возникает
только через явный финальный сигнал.

## Практическое правило для будущих профилей

Для каждого benchmark или production workflow нужно различать два режима:

1. **Parity profile** — широкий профиль, близкий к native/app-server surface.
   Он нужен для лобового сравнения каналов и проверки, что мы ничего
   принципиально не потеряли.
2. **Task-specific lean profile** — профиль под конкретный класс задач. Он
   должен оставлять только те инструкции и tools, которые реально нужны для
   acceptance criteria этого класса задач.

Lean profile считается успешным только если он экономит prompt/cache tokens и
не ухудшает проверяемые показатели:

- completion contract выполнен;
- план закрыт;
- build/test/package/evidence выполнены, если они требовались;
- финальный ответ честно соответствует артефактам;
- приложение или иной результат можно открыть/проверить;
- нет ручного nudging для продолжения tool loop.

## Архитектурное следствие

Harness AI должен развивать profile compilation как first-class runtime
механику. Цель не в том, чтобы один раз скопировать native prompt/tools
провайдера, а в том, чтобы иметь управляемую матрицу:

- provider parity profiles;
- role-specific profiles;
- task-specific lean profiles;
- tool bundles;
- prompt manifests;
- воспроизводимые benchmark traces.

Итоговая позиция: собственный клиент с управляемым prompt/tool surface может
быть не только более контролируемым, но и существенно дешевле по токенам без
наблюдаемого снижения качества в проверенном классе задач. Это является
сильным аргументом в пользу доведения CodexUC и аналогичных custom provider
adapters до production-качества.
