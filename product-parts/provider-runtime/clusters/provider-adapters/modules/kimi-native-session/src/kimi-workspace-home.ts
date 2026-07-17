import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { providerHomeManagerFacade } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import { isKimiAcpRecord } from "./kimi-acp-session-contracts.js";

// Claude/Codex parity for the native Kimi CLI backend: sessions run with
// `HOME` pointing at `<workspace>/.harness/runtime/providers/kimi/home`, so
// the CLI session store lands inside the workspace instead of piling up in
// the global `~/.kimi-code/sessions/` (2026-07-17 user order). Auth stays
// shared with the real home through symlinks (`credentials`, `device_id` —
// a re-login in the global home is immediately visible here), config files
// are copied once, and the CLI binary keeps resolving from the real home.
const KIMI_CONFIG_DIRNAME = ".kimi-code";
const LINKED_ENTRIES = ["credentials", "device_id"];
const COPIED_ENTRIES = ["config.toml", "tui.toml"];
const SESSION_MAP_FILENAME = "harness-session-map.json";

export interface KimiWorkspaceHome {
  // The `HOME` value for the spawned CLI child.
  readonly homePath: string;
  // `<homePath>/.kimi-code/sessions` — where this workspace's native
  // session store lives; the usage and swarm-progress readers point here.
  readonly sessionsRoot: string;
}

export interface KimiWorkspaceHomeOverrides {
  // Test override for the real `~/.kimi-code` the bootstrap links against.
  readonly realKimiConfigDir?: string;
}

export function prepareKimiWorkspaceHome(
  workspacePath: string,
  overrides: KimiWorkspaceHomeOverrides = {}
): KimiWorkspaceHome {
  const homePath = providerHomeManagerFacade.resolveProviderHome({
    providerId: "kimi",
    workspacePath,
  });
  const configDir = path.join(homePath, KIMI_CONFIG_DIRNAME);
  const realConfigDir =
    overrides.realKimiConfigDir ?? path.join(homedir(), KIMI_CONFIG_DIRNAME);
  mkdirSync(configDir, { recursive: true });
  for (const entry of LINKED_ENTRIES) {
    ensureLink(path.join(realConfigDir, entry), path.join(configDir, entry));
  }
  for (const entry of COPIED_ENTRIES) {
    copyIfMissing(path.join(realConfigDir, entry), path.join(configDir, entry));
  }
  return { homePath, sessionsRoot: path.join(configDir, "sessions") };
}

// The Core provider session id is minted by Harness while the CLI mints its
// own store id (`session_<uuid>`); deletion after a Core restart needs the
// persisted pair. The map lives next to the store it describes.
export function recordKimiSessionMapping(
  home: KimiWorkspaceHome,
  providerSessionId: string,
  acpSessionId: string
): void {
  const map = readSessionMap(home.homePath);
  if (map[providerSessionId] === acpSessionId) {
    return;
  }
  map[providerSessionId] = acpSessionId;
  writeFileSync(
    sessionMapPath(home.homePath),
    `${JSON.stringify(map, null, 2)}\n`,
    "utf8"
  );
}

// Claude-parity cleanup: removing a Harness session removes its native
// session directory from the workspace store (no JSONL garbage left).
export function deleteKimiNativeSessionArtifacts(
  providerSessionId: string,
  workspacePath: string
): void {
  const homePath = providerHomeManagerFacade.resolveProviderHome({
    providerId: "kimi",
    workspacePath,
  });
  const map = readSessionMap(homePath);
  const acpSessionId = map[providerSessionId];
  if (!acpSessionId) {
    return;
  }
  const sessionsRoot = path.join(homePath, KIMI_CONFIG_DIRNAME, "sessions");
  for (const workDir of listDir(sessionsRoot)) {
    const candidate = path.join(sessionsRoot, workDir, acpSessionId);
    if (existsSync(candidate)) {
      rmSync(candidate, { force: true, recursive: true });
    }
  }
  delete map[providerSessionId];
  writeFileSync(
    sessionMapPath(homePath),
    `${JSON.stringify(map, null, 2)}\n`,
    "utf8"
  );
}

function sessionMapPath(homePath: string): string {
  return path.join(homePath, KIMI_CONFIG_DIRNAME, SESSION_MAP_FILENAME);
}

function readSessionMap(homePath: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(sessionMapPath(homePath), "utf8")
    );
    if (!isKimiAcpRecord(parsed)) {
      return {};
    }
    const map: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        map[key] = value;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function ensureLink(sourcePath: string, destinationPath: string): void {
  if (!existsSync(sourcePath)) {
    return;
  }
  const existing = lstatSync(destinationPath, { throwIfNoEntry: false });
  if (existing?.isSymbolicLink() && existsSync(destinationPath)) {
    return;
  }
  if (existing) {
    rmSync(destinationPath, { force: true, recursive: true });
  }
  symlinkSync(sourcePath, destinationPath);
}

function copyIfMissing(sourcePath: string, destinationPath: string): void {
  if (existsSync(destinationPath) || !existsSync(sourcePath)) {
    return;
  }
  copyFileSync(sourcePath, destinationPath);
}

function listDir(dirPath: string): string[] {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
}
