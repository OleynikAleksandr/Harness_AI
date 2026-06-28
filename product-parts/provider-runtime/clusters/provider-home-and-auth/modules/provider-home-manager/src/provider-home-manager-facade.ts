import {
  access,
  copyFile,
  link,
  lstat,
  mkdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export interface ProviderHomeRequest {
  providerId: string;
  workspacePath?: string;
}

export interface PreparedProviderHome {
  authLinked: boolean;
  homePath: string;
}

const AUTH_FILENAME = "auth.json";
const CONFIG_FILENAME = "config.toml";
const LEGACY_CODEX_HOME = path.join(homedir(), ".codex");
const LEGACY_SUMMARY_LINE_RE = /^\s*default_reasoning_summary\s*=\s*.+?$/gmu;
const SUMMARY_LINE = 'model_reasoning_summary = "none"';
const SUMMARY_LINE_RE = /^\s*model_reasoning_summary\s*=\s*.+?$/gmu;
const REASONING_EFFORT_LINE_RE = /^\s*model_reasoning_effort\s*=\s*.+$/mu;
const TOML_TABLE_RE = /^\s*\[/mu;

export class ProviderHomeManagerFacade {
  resolveProviderHome(request: ProviderHomeRequest): string {
    if (request.workspacePath && !request.workspacePath.includes(".asar")) {
      return path.join(
        request.workspacePath,
        ".harness",
        "runtime",
        "providers",
        request.providerId,
        "home"
      );
    }
    return path.join(
      homedir(),
      ".harness-ai",
      "providers",
      request.providerId,
      "home"
    );
  }

  async prepareCodexHome(
    request: ProviderHomeRequest
  ): Promise<PreparedProviderHome> {
    const homePath = this.resolveProviderHome({
      ...request,
      providerId: "codex",
    });
    await mkdir(homePath, { recursive: true });
    const authLinked = await materializeAuthFile({
      destinationPath: path.join(homePath, AUTH_FILENAME),
      sourcePath: path.join(LEGACY_CODEX_HOME, AUTH_FILENAME),
    });
    await copyIfMissing({
      destinationPath: path.join(homePath, CONFIG_FILENAME),
      sourcePath: path.join(LEGACY_CODEX_HOME, CONFIG_FILENAME),
    });
    await ensureSummaryConfig(path.join(homePath, CONFIG_FILENAME));
    return { authLinked, homePath };
  }
}

async function materializeAuthFile(paths: {
  destinationPath: string;
  sourcePath: string;
}): Promise<boolean> {
  if (!(await exists(paths.sourcePath))) {
    return false;
  }
  await mkdir(path.dirname(paths.destinationPath), { recursive: true });
  if (await pointsToSource(paths)) {
    return true;
  }
  await rm(paths.destinationPath, { force: true });
  const relativeSource = path.relative(
    path.dirname(paths.destinationPath),
    paths.sourcePath
  );
  try {
    await symlink(relativeSource || paths.sourcePath, paths.destinationPath);
  } catch {
    await link(paths.sourcePath, paths.destinationPath);
  }
  return true;
}

async function copyIfMissing(paths: {
  destinationPath: string;
  sourcePath: string;
}): Promise<void> {
  if (
    (await exists(paths.destinationPath)) ||
    !(await exists(paths.sourcePath))
  ) {
    return;
  }
  await mkdir(path.dirname(paths.destinationPath), { recursive: true });
  await copyFile(paths.sourcePath, paths.destinationPath);
}

async function ensureSummaryConfig(configPath: string): Promise<void> {
  const raw = await readFile(configPath, "utf8").catch(() => "");
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(
    configPath,
    materializeCodexReasoningSummaryConfig(raw),
    "utf8"
  );
}

export function materializeCodexReasoningSummaryConfig(raw: string): string {
  const withoutLegacy = raw
    .replace(LEGACY_SUMMARY_LINE_RE, "")
    .replace(SUMMARY_LINE_RE, "")
    .trim();
  const effortMatch = REASONING_EFFORT_LINE_RE.exec(withoutLegacy);
  if (effortMatch?.index !== undefined) {
    const insertIndex = effortMatch.index + effortMatch[0].length;
    return `${[
      withoutLegacy.slice(0, insertIndex).trimEnd(),
      SUMMARY_LINE,
      withoutLegacy.slice(insertIndex).trimStart(),
    ]
      .filter(Boolean)
      .join("\n")}\n`;
  }
  const withoutExisting = withoutLegacy.trimEnd();
  const tableMatch = TOML_TABLE_RE.exec(withoutExisting);
  if (!tableMatch) {
    return `${[withoutExisting, SUMMARY_LINE].filter(Boolean).join("\n")}\n`;
  }
  return `${[
    withoutExisting.slice(0, tableMatch.index).trimEnd(),
    SUMMARY_LINE,
    withoutExisting.slice(tableMatch.index).trimStart(),
  ]
    .filter(Boolean)
    .join("\n")}\n`;
}

async function pointsToSource(paths: {
  destinationPath: string;
  sourcePath: string;
}): Promise<boolean> {
  const stats = await lstat(paths.destinationPath).catch(() => null);
  if (!stats?.isSymbolicLink()) {
    return false;
  }
  const target = await readlink(paths.destinationPath).catch(() => null);
  return target
    ? path.resolve(path.dirname(paths.destinationPath), target) ===
        path.resolve(paths.sourcePath)
    : false;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export const providerHomeManagerFacade = new ProviderHomeManagerFacade();
