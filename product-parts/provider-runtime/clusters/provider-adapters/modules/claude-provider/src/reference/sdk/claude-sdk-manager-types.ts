// Shared option/settings shapes for the Claude SDK manager, split out of
// claude-sdk-manager.ts to keep it under the 500-line implementation cap.

export interface ThinkingSettings {
  readonly effort: "low" | "medium" | "high" | "xhigh" | "max";
  readonly enabled: boolean;
}

export interface ClaudeSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly providers?: {
    readonly claude?: {
      readonly thinking?: {
        readonly effort?: unknown;
        readonly enabled?: unknown;
        readonly maxTokens?: unknown;
      };
      readonly defaultModel?: unknown;
    };
  };
  readonly thinking?: {
    readonly effort?: unknown;
    readonly enabled?: unknown;
    readonly maxTokens?: unknown;
  };
}

export interface ClaudeQueryOptions extends Record<string, unknown> {
  additionalDirectories: string[];
  allowDangerouslySkipPermissions: boolean;
  cwd: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  env: NodeJS.ProcessEnv;
  includePartialMessages: boolean;
  model?: string;
  outputFormat?: {
    type: "json_schema";
    schema: Record<string, unknown>;
  };
  pathToClaudeCodeExecutable: string;
  permissionMode: "bypassPermissions";
  projectPath: string;
  resume?: string;
  settingSources: string[];
  systemPrompt?: string;
  thinking?: {
    readonly display?: "summarized" | "omitted";
    readonly type: "adaptive" | "disabled";
  };
  title?: string;
  tools: string[];
}
