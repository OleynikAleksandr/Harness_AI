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
import {
  type ProviderModelDescriptor,
  providerDescriptorFacade,
} from "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
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
// The CLI accepts `session/set_config_option {model}` only for ids declared
// in config.toml (`Model "k3" is not configured in config.toml` — verified
// live on 0.26.0 and again on 2.4.1, 2026-11-02), and a stock user config
// declares only the models the CLI itself synced, so the bootstrap appends a
// section for every model of the Core-served Kimi catalog
// (provider-descriptor, refreshed live from GET /coding/v1/models).
const catalogModels = (): readonly ProviderModelDescriptor[] =>
  providerDescriptorFacade.getKimiClientModels();
const BARE_TOML_KEY_PATTERN = /^[A-Za-z0-9_-]+$/u;
const KIMI_NATIVE_CONTEXT_LIMIT = 262_144;
const PROVIDER_LINE_PATTERN = /^\s*provider\s*=\s*"([^"]+)"/mu;
// Thinking declarations (verified live on CLI 0.26.0, 2026-07-17): the CLI
// derives "supported efforts" from the model section's capabilities, and the
// migrated legacy user config declares none — that alone produced
// `Supported efforts: off` and `thinking: {type: "disabled"}` requests while
// kimi-for-coding is a thinking model (without Thinking the service routes
// to K2.6). The effort LEVEL comes from `[thinking].effort`, read once at
// CLI process start; the ACP option only toggles off/on.
// Efforts follow the catalog row: models without selectable efforts (K2.7
// Code Highspeed) declare thinking only, so the CLI keeps them `on`.
function modelThinkingLines(model: ProviderModelDescriptor): string[] {
  const efforts = model.reasoningEfforts ?? [];
  return efforts.length > 0
    ? [
        'capabilities = ["thinking", "tool_use"]',
        `support_efforts = [${efforts.map((effort) => `"${effort}"`).join(", ")}]`,
      ]
    : ['capabilities = ["thinking", "tool_use"]'];
}
export const KIMI_THINKING_EFFORTS = ["low", "high", "max"] as const;
export type KimiThinkingEffort = (typeof KIMI_THINKING_EFFORTS)[number];
const DEFAULT_THINKING_EFFORT: KimiThinkingEffort = "high";
const DEPRECATED_DEFAULT_THINKING_PATTERN = /^\s*default_thinking\s*=.*$\n?/gmu;
const THINKING_EFFORT_LINE_PATTERN = /^\s*effort\s*=\s*".*"\s*$/mu;
const THINKING_EFFORT_VALUE_PATTERN = /^effort\s*=\s*"([^"]*)"$/u;
const MODEL_CONTEXT_LINE_PATTERN = /^\s*max_context_size\s*=/u;

export interface KimiWorkspaceHome {
  // The `HOME` value for the spawned CLI child.
  readonly homePath: string;
  // `<homePath>/.kimi-code/sessions` — where this workspace's native
  // session store lives; the usage and swarm-progress readers point here.
  readonly sessionsRoot: string;
}

export interface KimiWorkspaceHomeOverrides {
  // Per-model native context windows (the Core catalog merged with the live
  // Coding Plan catalog). Generated sections and the managed context upsert
  // take their `max_context_size` from this map; missing ids keep the
  // verified K2.7 window.
  readonly modelContexts?: Readonly<Record<string, number>>;
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
  const modelContexts = overrides.modelContexts ?? {};
  ensureCatalogModelSections(
    path.join(configDir, "config.toml"),
    modelContexts
  );
  ensureCatalogContextSizes(path.join(configDir, "config.toml"), modelContexts);
  ensureThinkingDeclarations(path.join(configDir, "config.toml"));
  return { homePath, sessionsRoot: path.join(configDir, "sessions") };
}

// The level currently configured in the workspace-home config — the runtime
// seeds its applied level from this so an eager-opened session skips the
// relaunch when the requested level already matches.
export function readKimiThinkingEffort(home: KimiWorkspaceHome): string | null {
  try {
    return thinkingEffortOf(
      readFileSync(
        path.join(home.homePath, KIMI_CONFIG_DIRNAME, "config.toml"),
        "utf8"
      )
    );
  } catch {
    return null;
  }
}

function thinkingEffortOf(source: string): string | null {
  const lines = source.split("\n");
  const headerIndex = lines.findIndex((line) => line.trim() === "[thinking]");
  if (headerIndex < 0) {
    return null;
  }
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed.startsWith("[")) {
      return null;
    }
    const match = trimmed.match(THINKING_EFFORT_VALUE_PATTERN);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Set the per-session thinking level: the CLI reads `[thinking].effort` at
// process start, so the runtime writes it right before the first spawn.
// Returns false (and writes nothing) for a level outside the supported set.
export function writeKimiThinkingEffort(
  home: KimiWorkspaceHome,
  effort: string
): boolean {
  if (!(KIMI_THINKING_EFFORTS as readonly string[]).includes(effort)) {
    return false;
  }
  const configPath = path.join(
    home.homePath,
    KIMI_CONFIG_DIRNAME,
    "config.toml"
  );
  let source: string;
  try {
    source = readFileSync(configPath, "utf8");
  } catch {
    return false;
  }
  writeFileSync(configPath, upsertThinkingSection(source, effort), "utf8");
  return true;
}

// Strip the deprecated key, declare thinking on the catalog model sections
// and make sure the `[thinking]` section declares an effort. The Kimi CLI
// config migration of 2026-09-09 leaves `[thinking]` with only
// `enabled = true` (effort moved to per-model `default_effort`); without an
// explicit effort the runtime would send ACP `thinking=on`, which CLI 2.4.1
// resolves to the model default instead of the Harness-selected level.
function ensureThinkingDeclarations(configPath: string): void {
  let source: string;
  try {
    source = readFileSync(configPath, "utf8");
  } catch {
    return;
  }
  let next = source.replace(DEPRECATED_DEFAULT_THINKING_PATTERN, "");
  for (const model of catalogModels()) {
    next = injectModelThinkingLines(next, model);
  }
  if (thinkingEffortOf(next) === null) {
    next = upsertThinkingSection(next, DEFAULT_THINKING_EFFORT);
  }
  if (next !== source) {
    writeFileSync(configPath, next, "utf8");
  }
}

// Insert the thinking declarations right below the section header when the
// section exists and declares no capabilities yet.
function injectModelThinkingLines(
  source: string,
  model: ProviderModelDescriptor
): string {
  const lines = source.split("\n");
  const headerIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return (
      trimmed === `[models.${model.id}]` || trimmed === `[models."${model.id}"]`
    );
  });
  if (headerIndex < 0) {
    return source;
  }
  let end = lines.length;
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith("[")) {
      end = index;
      break;
    }
  }
  const body = lines.slice(headerIndex + 1, end);
  if (body.some((line) => line.trim().startsWith("capabilities"))) {
    return source;
  }
  lines.splice(headerIndex + 1, 0, ...modelThinkingLines(model));
  return lines.join("\n");
}

function hasThinkingSection(source: string): boolean {
  return source.split("\n").some((line) => line.trim() === "[thinking]");
}

function upsertThinkingSection(source: string, effort: string): string {
  if (!hasThinkingSection(source)) {
    return `${source.trimEnd()}\n\n[thinking]\nenabled = true\neffort = "${effort}"\nkeep = "all"\n`;
  }
  const lines = source.split("\n");
  const headerIndex = lines.findIndex((line) => line.trim() === "[thinking]");
  let end = lines.length;
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith("[")) {
      end = index;
      break;
    }
  }
  for (let index = headerIndex + 1; index < end; index += 1) {
    if (THINKING_EFFORT_LINE_PATTERN.test(lines[index])) {
      lines[index] = `effort = "${effort}"`;
      return lines.join("\n");
    }
  }
  lines.splice(headerIndex + 1, 0, `effort = "${effort}"`);
  return lines.join("\n");
}

// Append-only on every prepare: existing sections and user edits stay
// untouched; the provider name is inherited from the user's own model
// section so the appended entries route through the same subscription.
function ensureCatalogModelSections(
  configPath: string,
  modelContexts: Readonly<Record<string, number>>
): void {
  let source: string;
  try {
    source = readFileSync(configPath, "utf8");
  } catch {
    return;
  }
  const missing = catalogModels().filter(
    (model) => !hasModelSection(source, model.id)
  );
  if (missing.length === 0) {
    return;
  }
  const provider =
    source.match(PROVIDER_LINE_PATTERN)?.[1] ?? "kimi-for-coding";
  const blocks = missing.map((model) => {
    // Dotted ids (`k3.1-pro`) must be quoted, or TOML reads nested tables.
    const key = BARE_TOML_KEY_PATTERN.test(model.id)
      ? model.id
      : `"${model.id}"`;
    const contextSize =
      modelContexts[model.id] ??
      model.contextLength ??
      KIMI_NATIVE_CONTEXT_LIMIT;
    const defaultEffort = model.reasoningEfforts?.length
      ? `default_effort = "${model.defaultReasoningEffort ?? DEFAULT_THINKING_EFFORT}"\n`
      : "";
    return `\n[models.${key}]\nprovider = "${provider}"\nmodel = "${model.id}"\nmax_context_size = ${contextSize}\n${modelThinkingLines(model).join("\n")}\n${defaultEffort}`;
  });
  writeFileSync(configPath, `${source.trimEnd()}\n${blocks.join("")}`, "utf8");
}

// The workspace-home config is a managed copy: when the catalog context
// window differs from what a catalog-model section declares, the section is
// brought back to the truth (the 2026-07-17 bootstrap wrote 262144 for k3,
// quartering its real 1M window — the CLI compacts against this value).
// Only `max_context_size` on the catalog-model sections is touched; user
// sections and every other field stay as they are.
function ensureCatalogContextSizes(
  configPath: string,
  modelContexts: Readonly<Record<string, number>>
): void {
  let source: string;
  try {
    source = readFileSync(configPath, "utf8");
  } catch {
    return;
  }
  let next = source;
  for (const model of catalogModels()) {
    const contextSize = modelContexts[model.id];
    if (typeof contextSize === "number" && contextSize > 0) {
      next = upsertModelContextSize(next, model.id, contextSize);
    }
  }
  if (next !== source) {
    writeFileSync(configPath, next, "utf8");
  }
}

function upsertModelContextSize(
  source: string,
  modelId: string,
  contextSize: number
): string {
  const lines = source.split("\n");
  const headerIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return (
      trimmed === `[models.${modelId}]` || trimmed === `[models."${modelId}"]`
    );
  });
  if (headerIndex < 0) {
    return source;
  }
  let end = lines.length;
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith("[")) {
      end = index;
      break;
    }
  }
  const contextLine = `max_context_size = ${contextSize}`;
  for (let index = headerIndex + 1; index < end; index += 1) {
    if (MODEL_CONTEXT_LINE_PATTERN.test(lines[index])) {
      if (lines[index].trim() === contextLine) {
        return source;
      }
      lines[index] = contextLine;
      return lines.join("\n");
    }
  }
  lines.splice(headerIndex + 1, 0, contextLine);
  return lines.join("\n");
}

function hasModelSection(source: string, modelId: string): boolean {
  const plain = `[models.${modelId}]`;
  const quoted = `[models."${modelId}"]`;
  return source.split("\n").some((line) => {
    const trimmed = line.trim();
    return trimmed === plain || trimmed === quoted;
  });
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
