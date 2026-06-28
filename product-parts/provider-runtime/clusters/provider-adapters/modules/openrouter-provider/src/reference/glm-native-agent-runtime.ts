import { randomUUID } from "node:crypto";
import { GLM_NATIVE_EXPANDED_WORKFLOW_TOOLS } from "./glm-native-expanded-tool-definitions.js";
import type { GlmToolCall } from "./glm-native-sse-parser.js";
import { executeGlmNativeTool } from "./glm-native-tool-executors.js";

const WORKFLOW_ARTIFACT_TOOL_NAME = "write_workflow_artifact";

export const GLM_NATIVE_MAX_TOOL_STEPS = 64;

interface GlmNativeToolDefinition {
  readonly function: {
    readonly description: string;
    readonly name: string;
    readonly parameters: Record<string, unknown>;
  };
  readonly type: "function";
}

const STRING_SCHEMA = { type: "string" } as const;
const EMPTY_PARAMETERS_SCHEMA = {
  additionalProperties: false,
  properties: {},
  type: "object",
} as const;

export const GLM_NATIVE_WORKFLOW_TOOLS: readonly GlmNativeToolDefinition[] = [
  buildGlmFunctionTool({
    description:
      "Run a shell command in the workspace. Use this for builds, tests, package managers and one-off diagnostics.",
    name: "exec_command",
    parameters: objectSchema(
      {
        cmd: {
          description: "Shell command to run.",
          type: "string",
        },
        max_output_tokens: {
          description: "Approximate output budget.",
          type: "number",
        },
        shell: {
          description: "Optional shell path.",
          type: "string",
        },
        workdir: {
          description:
            "Optional workspace-relative working directory. Defaults to workspace root.",
          type: "string",
        },
        yield_time_ms: {
          description: "Command timeout in milliseconds.",
          type: "number",
        },
      },
      ["cmd"]
    ),
  }),
  buildGlmFunctionTool({
    description:
      "Fast codebase text search powered by ripgrep. Prefer this over ad-hoc shell grep for source search.",
    name: "grep_files",
    parameters: objectSchema(
      {
        include: {
          description: "Optional glob include filter such as **/*.ts.",
          type: "string",
        },
        max_results: {
          description: "Maximum matching lines to return.",
          type: "number",
        },
        path: {
          description:
            "Optional workspace-relative file or directory to search.",
          type: "string",
        },
        pattern: {
          description: "Ripgrep search pattern.",
          type: "string",
        },
      },
      ["pattern"]
    ),
  }),
  buildGlmFunctionTool({
    description:
      "Fast workspace file discovery powered by ripgrep --files and glob patterns.",
    name: "glob_files",
    parameters: objectSchema(
      {
        max_results: {
          description: "Maximum file paths to return.",
          type: "number",
        },
        path: {
          description: "Optional workspace-relative directory to search from.",
          type: "string",
        },
        pattern: {
          description: "Glob pattern such as **/*.ts.",
          type: "string",
        },
      },
      ["pattern"]
    ),
  }),
  buildGlmFunctionTool({
    description: "Read a UTF-8 text file from the workspace.",
    name: "read_file",
    parameters: objectSchema(
      {
        limit: {
          description: "Optional maximum number of lines to return.",
          type: "number",
        },
        offset: {
          description: "Optional 1-based starting line.",
          type: "number",
        },
        path: {
          description: "Workspace-relative file path.",
          type: "string",
        },
      },
      ["path"]
    ),
  }),
  buildGlmFunctionTool({
    description: "Write or replace a UTF-8 text file inside the workspace.",
    name: "write_file",
    parameters: objectSchema(
      {
        content: STRING_SCHEMA,
        path: {
          description: "Workspace-relative file path.",
          type: "string",
        },
      },
      ["path", "content"]
    ),
  }),
  buildGlmFunctionTool({
    description:
      "Apply a Codex-style patch payload in the workspace. Use write_file for simple full-file writes.",
    name: "apply_patch",
    parameters: objectSchema(
      {
        patch: {
          description: "Complete apply_patch payload.",
          type: "string",
        },
      },
      ["patch"]
    ),
  }),
  buildGlmFunctionTool({
    description:
      "Search the public web for current information. Returns titles, URLs and snippets.",
    name: "web_search",
    parameters: objectSchema(
      {
        query: {
          description: "Search query.",
          type: "string",
        },
        response_length: {
          description: "Desired result count/detail.",
          enum: ["short", "medium", "long"],
          type: "string",
        },
      },
      ["query"]
    ),
  }),
  buildGlmFunctionTool({
    description:
      "Fetch a public URL and return readable text. Use after web_search when a source must be inspected.",
    name: "web_fetch",
    parameters: objectSchema(
      {
        max_chars: {
          description: "Maximum response characters to return.",
          type: "number",
        },
        url: {
          description: "HTTP or HTTPS URL to fetch.",
          type: "string",
        },
      },
      ["url"]
    ),
  }),
  ...GLM_NATIVE_EXPANDED_WORKFLOW_TOOLS,
  {
    type: "function",
    function: {
      name: WORKFLOW_ARTIFACT_TOOL_NAME,
      description:
        "Write or replace one CodeAI Hub managed workflow artifact. Use this for every required output target artifact instead of pasting the full artifact into chat.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          relative_path: {
            type: "string",
            description:
              "Workspace-relative artifact path. Must start with .codeai-hub/ and must exactly match the runtime target path when one is provided.",
          },
          content: {
            type: "string",
            description: "Complete UTF-8 artifact content to write.",
          },
        },
        required: ["relative_path", "content"],
      },
    },
  },
];

function buildGlmFunctionTool(options: {
  readonly description: string;
  readonly name: string;
  readonly parameters: Record<string, unknown>;
}): GlmNativeToolDefinition {
  return {
    function: {
      description: options.description,
      name: options.name,
      parameters: options.parameters,
    },
    type: "function",
  };
}

function objectSchema(
  properties: Record<string, unknown>,
  required: readonly string[] = []
): Record<string, unknown> {
  return {
    ...EMPTY_PARAMETERS_SCHEMA,
    properties,
    ...(required.length > 0 ? { required: [...required] } : {}),
  };
}

export interface GlmSessionMessage {
  readonly content: string;
  readonly reasoning_content?: string;
  readonly role: string;
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly GlmToolCall[];
}

export const executeGlmNativeToolCall = async (
  toolCall: GlmToolCall,
  workspacePath?: string
): Promise<GlmSessionMessage> => {
  const content = await executeToolCallSafely(toolCall, workspacePath);
  return {
    content: JSON.stringify(content),
    role: "tool",
    tool_call_id: toolCall.id,
  };
};

const executeToolCallSafely = async (
  toolCall: GlmToolCall,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  try {
    return await executeToolCall(toolCall, workspacePath);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      tool_call_id: toolCall.id,
    };
  }
};

const executeToolCall = async (
  toolCall: GlmToolCall,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  return await executeGlmNativeTool(toolCall, workspacePath);
};

export const buildGlmNativeAssistantToolMessage = (result: {
  readonly content: string;
  readonly reasoningContent: string;
  readonly toolCalls: readonly GlmToolCall[];
}): GlmSessionMessage => ({
  content: result.content,
  ...(result.reasoningContent.trim().length > 0
    ? { reasoning_content: result.reasoningContent }
    : {}),
  role: "assistant",
  tool_calls: result.toolCalls.map((call) => ({
    ...call,
    id: call.id || `call_${randomUUID()}`,
  })),
});
