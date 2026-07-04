// The universal client's tool registry with a source abstraction. Tools come
// from sources (built-in now; MCP and skills are reserved registration points,
// NOT MVP — docs/architecture/UniversalClient.md sections 3.2 / 3.10). Each
// source lists its descriptors and executes its own calls. The registry
// aggregates descriptors for the request and routes a tool call to its owning
// source. Permissions are pass-through in MVP (full-auto, no ruleset).

import type {
  ToolDescriptor,
  ToolSource,
} from "../../client-contract/src/client-contract-facade.js";

// Where a built-in tool runs. Executors validate paths against workspacePath.
export interface ToolExecutionContext {
  readonly signal?: AbortSignal;
  readonly workspacePath: string;
}

export interface ToolExecutionResult {
  // Set when the tool failed; the output carries the error text. A tool error
  // is returned to the model as a tool result, it does not fail the turn.
  readonly isError?: boolean;
  readonly output: string;
}

// A registration source contributes descriptors and executes its own calls.
// The built-in tools module implements one of these; future MCP/skill modules
// register additional sources through the same interface.
export interface ToolSourceProvider {
  readonly execute: (
    qualifiedName: string,
    argumentsJson: string,
    context: ToolExecutionContext
  ) => Promise<ToolExecutionResult>;
  readonly list: () => readonly ToolDescriptor[];
  readonly source: ToolSource;
}

export interface ToolRegistry {
  readonly execute: (
    qualifiedName: string,
    argumentsJson: string,
    context: ToolExecutionContext
  ) => Promise<ToolExecutionResult>;
  readonly listDescriptors: () => readonly ToolDescriptor[];
  readonly registerSource: (provider: ToolSourceProvider) => void;
}

export const createToolRegistry = (): ToolRegistry => {
  const sources: ToolSourceProvider[] = [];
  // qualifiedName -> the source that owns it, built as sources register.
  const ownerByName = new Map<string, ToolSourceProvider>();

  return {
    async execute(qualifiedName, argumentsJson, context) {
      const owner = ownerByName.get(qualifiedName);
      if (!owner) {
        return {
          isError: true,
          output: `Unknown tool: ${qualifiedName}`,
        };
      }
      return await owner.execute(qualifiedName, argumentsJson, context);
    },
    // MVP: return every registered descriptor. This is the pass-through
    // permission boundary — a future permission ruleset would filter here
    // without changing the loop (docs section 3.5).
    listDescriptors() {
      return sources.flatMap((source) => source.list());
    },
    registerSource(provider) {
      sources.push(provider);
      for (const descriptor of provider.list()) {
        ownerByName.set(descriptor.qualifiedName, provider);
      }
    },
  };
};
