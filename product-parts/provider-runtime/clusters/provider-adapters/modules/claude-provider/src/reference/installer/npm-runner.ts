import { execFile } from "node:child_process";
import { delimiter } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GUI_NPM_PATHS =
  process.platform === "darwin"
    ? ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"]
    : [];

export interface NpmCommandResult {
  readonly stderr: string;
  readonly stdout: string;
}

export async function runNpmCommand(
  args: readonly string[],
  options: {
    readonly npmExecutable: string;
    readonly env: NodeJS.ProcessEnv;
  }
): Promise<NpmCommandResult> {
  const result = await execFileAsync(options.npmExecutable, [...args], {
    env: buildNpmEnvironment(options.env),
    windowsHide: true,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function buildNpmEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const currentPath = env.PATH ?? process.env.PATH ?? "";
  const pathParts = currentPath.split(delimiter).filter(Boolean);
  for (const candidate of GUI_NPM_PATHS) {
    if (!pathParts.includes(candidate)) {
      pathParts.push(candidate);
    }
  }
  return {
    ...env,
    PATH: pathParts.join(delimiter),
  };
}
