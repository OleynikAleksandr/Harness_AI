export const CODEX_DEFAULT_PROCESS_PROFILE_KEY = "codex:default";
export const CODEX_NATIVE_CAPTURE_PROCESS_PROFILE_KEY = "codex:native-capture";
export const CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY =
  "codex:workflow-documentation";
export const CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_PROCESS_PROFILE_KEY =
  "codex:workflow-documentation-restricted";
export const CODEX_TRANSLATION_PROCESS_PROFILE_KEY = "codex:translation";

export type CodexAppServerProcessProfileKey =
  | typeof CODEX_DEFAULT_PROCESS_PROFILE_KEY
  | typeof CODEX_NATIVE_CAPTURE_PROCESS_PROFILE_KEY
  | typeof CODEX_TRANSLATION_PROCESS_PROFILE_KEY
  | typeof CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY
  | typeof CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_PROCESS_PROFILE_KEY;

export interface CodexAppServerProcessProfile {
  readonly appServerArgs: readonly string[];
  readonly key: CodexAppServerProcessProfileKey;
}

const CODEAI_CODEX_WORKFLOW_DOCUMENTATION_APP_SERVER_ARGS = [
  "app-server",
  "--disable",
  "multi_agent",
  "--disable",
  "computer_use",
  "--disable",
  "image_generation",
  "--disable",
  "plugins",
  "--disable",
  "apps",
] as const;
const CODEAI_CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_APP_SERVER_ARGS = [
  "app-server",
  "--disable",
  "multi_agent",
  "--disable",
  "browser_use",
  "--disable",
  "in_app_browser",
  "--disable",
  "computer_use",
  "--disable",
  "image_generation",
  "--disable",
  "plugins",
  "--disable",
  "apps",
  "--disable",
  "tool_search",
] as const;
const CODEAI_CODEX_TRANSLATION_APP_SERVER_ARGS = [
  ...CODEAI_CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_APP_SERVER_ARGS,
] as const;
const CODEX_DEFAULT_APP_SERVER_ARGS = ["app-server"] as const;
// The capture-and-abort proxy can only read plain HTTP request bodies. Codex
// 0.142.x ships the experimental `responses_websockets` transport where the
// request payload travels in WebSocket frames after the upgrade handshake, so
// native capture forces the HTTP transport (`--disable <feature>` is the CLI
// equivalent of `-c features.<name>=false`).
const CODEX_NATIVE_CAPTURE_APP_SERVER_ARGS = [
  "app-server",
  "--disable",
  "responses_websockets",
  "--disable",
  "responses_websockets_v2",
] as const;

const CODEX_APP_SERVER_PROCESS_PROFILES: ReadonlyMap<
  CodexAppServerProcessProfileKey,
  CodexAppServerProcessProfile
> = new Map([
  [
    CODEX_DEFAULT_PROCESS_PROFILE_KEY,
    {
      appServerArgs: CODEX_DEFAULT_APP_SERVER_ARGS,
      key: CODEX_DEFAULT_PROCESS_PROFILE_KEY,
    },
  ],
  [
    CODEX_NATIVE_CAPTURE_PROCESS_PROFILE_KEY,
    {
      appServerArgs: CODEX_NATIVE_CAPTURE_APP_SERVER_ARGS,
      key: CODEX_NATIVE_CAPTURE_PROCESS_PROFILE_KEY,
    },
  ],
  [
    CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
    {
      appServerArgs: CODEAI_CODEX_WORKFLOW_DOCUMENTATION_APP_SERVER_ARGS,
      key: CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
    },
  ],
  [
    CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_PROCESS_PROFILE_KEY,
    {
      appServerArgs:
        CODEAI_CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_APP_SERVER_ARGS,
      key: CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_PROCESS_PROFILE_KEY,
    },
  ],
  [
    CODEX_TRANSLATION_PROCESS_PROFILE_KEY,
    {
      appServerArgs: CODEAI_CODEX_TRANSLATION_APP_SERVER_ARGS,
      key: CODEX_TRANSLATION_PROCESS_PROFILE_KEY,
    },
  ],
]);

export const resolveCodexAppServerProcessProfile = (
  key: CodexAppServerProcessProfileKey = CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY
): CodexAppServerProcessProfile => {
  const profile = CODEX_APP_SERVER_PROCESS_PROFILES.get(key);
  if (!profile) {
    throw new Error(`Unknown Codex app-server process profile: ${key}`);
  }
  return profile;
};
