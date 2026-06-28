# Reference Core Runtime Boundary

## Decision

Harness AI must restore the CodeAI-Hub runtime boundary:

- Core Runtime runs out-of-process as the local authority.
- Application Shell is only an interface plus Core supervisor/client.
- Provider Runtime modules stay separate and are composed by Core, not by the
  Application Shell.

The current Electron-host composition is architecture debt. It may exist only
until this scope replaces it.

## CodeAI-Hub Reference

Reference files:

- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/extension-module/core/core-process-manager.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/core-supervisor/src/index.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/client/ui/src/core-bridge/core-bridge.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/client/ui/src/core-bridge/supervisor-requests.ts`

Reference behavior:

1. The shell/extension ensures Core is installed and started.
2. The Core supervisor starts Core as a detached child process.
3. Startup waits for `/api/v1/health`.
4. Shutdown goes through `POST /api/v1/shutdown`.
5. A process lock prevents duplicate Core managers from starting competing Core instances.
6. A runtime registry records the selected Core port.
7. UI connects to Core through HTTP/WebSocket and sends user intents only.

## Harness Target Boundary

```mermaid
flowchart LR
  Shell["Application Shell<br/>UI + supervisor/client only"]
  Supervisor["Core Supervisor<br/>start / stop / restart / health"]
  Core["Core Runtime Process<br/>truth + orchestration"]
  Providers["Provider Runtime<br/>separate provider facades"]
  UI["Renderer<br/>input + display only"]

  UI --> Shell
  Shell --> Supervisor
  Shell -->|"HTTP/WebSocket client"| Core
  Supervisor --> Core
  Core --> Providers
  Providers --> Core
  Core -->|"snapshots/events"| Shell
  Shell --> UI
```

## Application Shell Contract

Application Shell may:

- create and manage Electron windows;
- expose renderer-safe UI APIs;
- start, stop, restart and health-check the Core process through the supervisor;
- connect to Core through HTTP/WebSocket contracts;
- forward user input to Core;
- render Core snapshots/events.

Application Shell must not:

- import Core Runtime implementation modules;
- import provider adapter implementation modules;
- instantiate provider facades;
- register provider adapters;
- own session state, provider state, settings truth, usage-limit truth, workflow decisions, managed lifecycle or localization truth;
- parse provider streams or infer provider semantics;
- write session history except through Core-owned contracts.

## Core Runtime Contract

Core Runtime owns:

- workspace registry and active workspace truth;
- session create/resume/send/stop lifecycle;
- provider adapter registration and provider session binding;
- settings snapshots and next-session mode truth;
- JSONL session history;
- provider event normalization and reasoning projection;
- usage/context telemetry;
- workflow and managed lifecycle decisions.

Core exposes only stable process contracts to Application Shell:

- health/status endpoint;
- shutdown endpoint;
- HTTP request endpoints for user intents and read models;
- WebSocket stream for Core-owned events.

## Provider Runtime Contract

Provider Runtime modules stay independent:

- one provider module per provider;
- each provider module exposes its own facade;
- provider-specific process/API/session logic stays provider-owned;
- provider homes/auth/runtime files stay provider-owned;
- provider events flow back to Core through shared contracts.

Provider Runtime must not be composed by Application Shell. Core Runtime is the
only owner allowed to instantiate and register provider adapters.

## Required Cleanup

This scope must remove or replace:

- Application Shell direct imports of `core-runtime/**`;
- Application Shell direct imports of provider adapter facades;
- Application Shell provider adapter construction and registry writes;
- renderer imports of provider-runtime implementation types when a Core read-model contract should be used instead;
- misleading `Restart Core` behavior that only rebuilds provider adapters in-process.

## Acceptance Criteria

- Starting Harness AI starts or attaches to a separate Core process.
- Quitting Core through the UI calls the Core shutdown contract.
- Restart Core performs a real stop/start sequence.
- Application Shell can be killed without being the source of workflow truth.
- Provider modules are instantiated by Core process code only.
- Architecture checks fail on direct Application Shell imports of Core Runtime implementation modules or provider adapter implementation modules.
