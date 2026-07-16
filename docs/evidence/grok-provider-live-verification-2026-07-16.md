# Grok Provider Live Verification — 2026-07-16

## Итог

Нативный `grok-provider` проверен против установленного официального Grok
Build CLI и действующей подписочной авторизации пользователя. Live matrix
подтвердила Native и Managed binding, модели/reasoning, structured events,
tokens/cache, SuperGrok billing, resume, conversation-only rollback, все три
blocking interaction, MCP stdio lifecycle и native subagent routing.

Во время проверки обнаружены и исправлены два реальных wire-gap:

1. `_x.ai/rewind/execute` с `force: false` является preview-only и закономерно
   возвращает `success: false`; фактический `conversation_only` rewind требует
   `force: true`. Файлы при этом не затрагиваются, потому что это определяет
   `mode`, а не `force`.
2. Installed `0.2.101` возвращает tier как `subscription_tier`, а не
   `subscriptionTier`; additive decoder теперь принимает обе формы.

После исправлений целевые тесты и повторные live probes прошли.

## Проверенное окружение

| Параметр | Подтверждённое значение |
| --- | --- |
| Binary | `/Users/oleksandroliinyk/.grok/bin/grok` |
| Version | `grok 0.2.101 (5bc4b5dfadcf) [stable]` |
| Transport | `grok --no-auto-update agent --no-leader stdio` |
| ACP | protocol v1, newline JSON-RPC over stdio |
| Auth | `cached_token`, status `ready` |
| Workspace | `/Users/oleksandroliinyk/VSCODE/harness-ai` |

Verifier не печатал и не копировал OAuth token, auth files, raw tool inputs или
полные provider payloads. Provider session IDs представлены только как
необратимый короткий hash в локальном результате и не записаны в этот документ.

## Dynamic model catalog

Authenticated `session/new` и Harness model normalizer вернули:

| Model | Context | Reasoning efforts |
| --- | ---: | --- |
| `grok-4.5` | `500000` | `high`, `medium`, `low` |
| `grok-composer-2.5-fast` | `200000` | provider-managed, выбора effort нет |

Текущая модель — `grok-4.5`. Выбор `low` и `high` прошёл через установленный
`session/set_model`; silent downgrade не наблюдался.

## Native, usage, cache, billing и rollback

Native binding вернул `mode: native` и vendor-default prompt/tool semantics.
Три коротких последовательных turn завершились structured событиями
`turn_started`, thinking, assistant и `turn_completed`.

| Turn | `totalTokens` | `cachedReadTokens` |
| ---: | ---: | ---: |
| 1 | `16885` | `11136` |
| 2 | `16986` | `16768` |
| 3 | `17020` | `16896` |

Это подтверждает ненулевой native cache signal для нижней status panel. Billing
после additive decoder повторно проверен отдельно:

- tier: `SuperGrok`;
- weekly reset: присутствует;
- usage percent: `null`, поскольку провайдер его не прислал;
- Core scope: `grok:subscription`.

Rewind points содержали prompt indices `0`, `1`, `2`. Первый live execute с
`force: false` вернул preview `{ success: false, error: null }`; public source
Grok Build также определяет этот путь как pure preview. После исправления
`force: true` тот же `conversation_only` execute успешно сохранил prompts
`0..1`, а adapter result вернул `turns: 2`. Режим оставляет workspace files
нетронутыми. Источник semantics: [Grok Build rewind implementation](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-shell/src/session/acp_session_impl/rewind.rs).

## Resume

После остановки первого ACP process новый adapter instance выполнил
`session/load` с тем же provider session ID. Контрольный turn завершился,
assistant/think/usage events восстановились, `cachedReadTokens` остался
ненулевым (`16896`). Совпадение provider session ID подтверждено без публикации
самого ID.

## Managed system prompt и tooling

Controlled Managed profile включал полный system prompt override и только
категорию `file-read`.

- `profileBindingVerified: true`;
- applied agent name имеет Harness namespace;
- `systemPrompt: full override`;
- provider-owned `system_prompt.txt` точно равен frozen prompt (`exact match`);
- `toolBinding: ACP _meta.agentProfile.tools`;
- effective `toolDefinitionsCount: 5`, что укладывается в проверенный allowlist
  плюс native MCP meta-tools;
- контрольный turn с `reasoningEffort: high` завершился;
- первый Managed turn уже вернул `cachedReadTokens: 128`.

Таким образом, Managed не откатился молча к Native/full toolset.

## Blocking interactions

Проверены все три Core/Grok interaction kinds:

| Kind | Live evidence |
| --- | --- |
| `permission` | ACP запущен с явным CLI `--permission-mode default`, безопасный `/tmp` shell action вызвал request с 2 options; выбранный option ID вернулся через adapter, 4 tool lifecycle events завершились |
| `ask_user` | Native prompt вызвал один structured question; verifier ответил через `answers`, исходный turn продолжился |
| `plan_approval` | Native prompt вызвал plan approval; typed `approved` продолжил тот же turn |

Обычная пользовательская конфигурация автоматически разрешила безопасный
`pwd`, поэтому для доказуемого permission reverse request verifier явно закрепил
CLI default/ask policy только на временном process. Product adapter не меняет
Native permission policy пользователя. В обоих режимах interaction шёл через
`provider_interaction_requested`/`provider_interaction_resolved`, без native
browser dialogs и без raw tool input в Core/UI read model.

## MCP

Пользовательский `grok mcp list` сообщил, что постоянных MCP servers сейчас нет.
Поэтому проверка использовала одноразовый локальный stdio server в `/tmp`, не
меняя `~/.grok`:

1. adapter передал server через ACP `mcpServers`;
2. Grok вызвал `initialize`;
3. сервер получил `notifications/initialized`;
4. Grok вызвал `tools/list`;
5. модель вызвала `harness_live__probe`;
6. marker подтвердил фактический `tools/call`, а provider stream дал 6 tool
   lifecycle events;
7. временный marker удалён.

Credentials, persistent Grok config и project MCP files не создавались.

## Native subagent

Контрольный prompt породил реального Grok child session. Parent channel получил
`subagent_control` и `subagent_session`; после регистрации child listener
получил reasoning, assistant transcript и terminal `subagent_status`.
Все четыре capability prompts (shell, ask-user, plan, subagent) завершились.

## Диагностика и граница результата

- unexpected Grok process exits: `0`;
- protocol diagnostics после финальных probes: `0`;
- full repository tests до live matrix: `110` passed;
- после wire-fixes повторно выполняются formatter, typecheck, Grok unit tests и
  полный commit hook.

Этот документ закрывает installed-CLI/Core-adapter verification. Проверка
видимой нижней status panel и in-app dialogs в shipped Electron surface
остаётся отдельным package + user-acceptance gate.

## Packaged acceptance findings: semantic reasoning и replay — 2026-07-16

Первый визуальный packaged retest обнаружил два дефекта, которые не покрывала
исходная live matrix:

1. Grok ACP передавал один thought как token-level
   `agent_thought_chunk`, а адаптер превращал каждый delta в отдельное
   `session:message`. Контрольная Core-сессия записала 43 отдельных thinking
   message и запустила 43 независимых перевода, поэтому UI закономерно показал
   каждое слово/знак с новой строки.
2. При повторном открытии `session/load` воспроизводил сохранённые thought и
   assistant updates с `_meta.isReplay: true`. Адаптер не учитывал replay stamp
   и добавлял цельный historical thought и финальный ответ поверх уже
   восстановленной append-only Core history.

Исправленный provider path теперь:

- сохраняет исходный whitespace token deltas;
- накапливает их до sentence/paragraph, bounded-size, tool, plan, answer или
  terminal boundary;
- публикует один Core thinking message на читаемый смысловой блок со стабильным
  session/prompt/block ID;
- переводит уже этот блок через существующий Core overlay, после чего UI
  использует prefix-stable translated reveal;
- подавляет historical chat/subagent notifications, явно помеченные Grok как
  `_meta.isReplay: true`, поскольку Harness Core уже восстановил собственную
  session history;
- сохраняет native `_x.ai/subagent/list_running` для восстановления только
  текущего transient состояния.

Повторный source-build probe против установленного CLI подтвердил:

| Проверка | Результат |
| --- | --- |
| Первый Native turn | 2 полных reasoning-предложения, assistant `FIRST_OK` |
| `session/load` до нового turn | 0 historical thinking/assistant messages |
| Новый turn после resume | 1 полный reasoning-блок, assistant `SECOND_OK` |

Служебные model/system notifications после resume остаются допустимыми и не
создают dialog bubbles. Следующий gate — новый packaged build и личная
визуальная проверка перевода, cold restart и duplicate-free reopen.
