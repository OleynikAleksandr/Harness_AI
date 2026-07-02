import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Core-owned per-provider memory for the session profile picker: the last
 * selected profile id and the AutoNormalizer flag (contract only until the
 * normalizer exists). Settings truth, never renderer state
 * (docs/architecture/SessionProfiles.md). Stored beside settings.json so the
 * main settings schema/file stays untouched.
 */
export interface SessionProfileMemory {
  readonly autoNormalizerByProvider: Readonly<Record<string, boolean>>;
  readonly lastSelectedProfileByProvider: Readonly<Record<string, string>>;
}

const EMPTY_MEMORY: SessionProfileMemory = {
  autoNormalizerByProvider: {},
  lastSelectedProfileByProvider: {},
};

export async function readSessionProfileMemory(
  memoryFilePath = defaultMemoryFilePath()
): Promise<SessionProfileMemory> {
  try {
    const parsed: unknown = JSON.parse(
      await fs.readFile(memoryFilePath, "utf8")
    );
    if (!isRecord(parsed)) {
      return EMPTY_MEMORY;
    }
    return {
      autoNormalizerByProvider: readBooleanMap(parsed.autoNormalizerByProvider),
      lastSelectedProfileByProvider: readStringMap(
        parsed.lastSelectedProfileByProvider
      ),
    };
  } catch {
    return EMPTY_MEMORY;
  }
}

export async function rememberLastSelectedProfile(
  providerId: string,
  profileId: string,
  memoryFilePath = defaultMemoryFilePath()
): Promise<void> {
  const current = await readSessionProfileMemory(memoryFilePath);
  if (current.lastSelectedProfileByProvider[providerId] === profileId) {
    return;
  }
  await writeSessionProfileMemory(
    {
      ...current,
      lastSelectedProfileByProvider: {
        ...current.lastSelectedProfileByProvider,
        [providerId]: profileId,
      },
    },
    memoryFilePath
  );
}

export async function rememberAutoNormalizerFlag(
  providerId: string,
  enabled: boolean,
  memoryFilePath = defaultMemoryFilePath()
): Promise<void> {
  const current = await readSessionProfileMemory(memoryFilePath);
  if (current.autoNormalizerByProvider[providerId] === enabled) {
    return;
  }
  await writeSessionProfileMemory(
    {
      ...current,
      autoNormalizerByProvider: {
        ...current.autoNormalizerByProvider,
        [providerId]: enabled,
      },
    },
    memoryFilePath
  );
}

async function writeSessionProfileMemory(
  memory: SessionProfileMemory,
  memoryFilePath: string
): Promise<void> {
  await fs.mkdir(path.dirname(memoryFilePath), { recursive: true });
  await fs.writeFile(
    memoryFilePath,
    `${JSON.stringify(memory, null, 2)}\n`,
    "utf8"
  );
}

function defaultMemoryFilePath(): string {
  const harnessHome =
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai");
  return path.join(harnessHome, "settings", "session-profile-memory.json");
}

function readStringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && entry.trim()) {
      result[key] = entry;
    }
  }
  return result;
}

function readBooleanMap(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return {};
  }
  const result: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "boolean") {
      result[key] = entry;
    }
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
