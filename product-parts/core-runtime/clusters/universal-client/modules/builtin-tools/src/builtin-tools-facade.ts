// Public facade of the built-in tools: assembles the built-in ToolSource that
// the tool registry registers. Descriptors and executors live in the part
// files; this facade parses arguments, dispatches to the owning part, and turns
// any failure into a tool error result (a bad tool call is reported to the
// model, not fatal to the turn). Contract: docs/architecture/UniversalClient.md 3.2.

import type { ToolSourceProvider } from "../../tool-registry/src/tool-registry-facade.js";
import {
  executeFileExecSearchTool,
  FILE_EXEC_SEARCH_DESCRIPTORS,
} from "./builtin-tools-file-exec-search.js";
import { parseToolArguments } from "./builtin-tools-shared.js";

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const createBuiltinToolSource = (): ToolSourceProvider => ({
  async execute(qualifiedName, argumentsJson, context) {
    let args: Record<string, unknown>;
    try {
      args = parseToolArguments(argumentsJson);
    } catch (error) {
      return { isError: true, output: errorText(error) };
    }
    try {
      const result = await executeFileExecSearchTool(
        qualifiedName,
        args,
        context
      );
      return (
        result ?? {
          isError: true,
          output: `Unknown built-in tool: ${qualifiedName}`,
        }
      );
    } catch (error) {
      return {
        isError: true,
        output: `${qualifiedName} failed: ${errorText(error)}`,
      };
    }
  },
  list: () => [...FILE_EXEC_SEARCH_DESCRIPTORS],
  source: "builtin",
});
