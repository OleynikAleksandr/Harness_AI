# Reference Provider Module Inventory - 2026-06-28

Scope: new `reference-provider-modules-migration-2026-06-28` active plan.

Reason for reset:

- The previous Harness provider work patched simplified wrappers instead of migrating the provider runtime modules from CodeAI Hub.
- User rejected wrapper/guessing work and required provider-by-provider migration from the reference project.

Reference modules inspected:

- Claude: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Claude_Module/src/**`
- Codex: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Codex_AppServer_Module/src/**`
- Kimi: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Kimi_Module/src/**`
- GLM Native: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/GLM_Module/src/**`
- GLM OpenCode: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/GLM_OpenCode_Module/src/**`
- Local Models: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/core/src/local-models/**`
- OpenRouter: CodeAI Hub settings, workflow start settings, endpoint search, and translation profile code paths.

Harness modules compared:

- `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/**`
- `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/**`
- `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/**`
- `product-parts/provider-runtime/clusters/provider-adapters/modules/glm-native-provider/**`
- `product-parts/provider-runtime/clusters/provider-adapters/modules/glm-opencode-provider/**`
- `product-parts/provider-runtime/clusters/provider-adapters/modules/openrouter-provider/**`
- `product-parts/provider-runtime/clusters/provider-adapters/modules/local-models-provider/**`
- `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/**`

Finding:

- Harness provider modules are currently much thinner than the reference modules.
- Claude must migrate from the wrapper CLI path to the reference Claude Agent SDK path.
- Codex must migrate from partial app-server handling to the reference Codex app-server process/facade/event-router path.
- Kimi, GLM Native, GLM OpenCode, OpenRouter, and Local Models must be handled as provider migrations, not shared wrapper patches.

Verification commands for this inventory:

- `npm run plan:status`
- `npm run plan:validate`
- `find <reference-provider-src> -maxdepth 3 -type f`
- `find product-parts/provider-runtime/clusters/provider-adapters/modules -maxdepth 3 -type f`

Result:

- New active plan created and committed.
- Reference inventory and migration map recorded before any provider code changes.
