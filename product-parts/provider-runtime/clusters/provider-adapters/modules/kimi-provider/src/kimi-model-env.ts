import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const KIMI_CONFIG_PATH = path.join(homedir(), ".kimi-code", "config.toml");
const KIMI_MODEL_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  "kimi-k2.7-code": "Kimi K2.7 Code",
  "kimi-k2.7-code-highspeed": "Kimi K2.7 Code High Speed",
};

export function buildKimiModelEnvironment(
  model: string | undefined,
  configPath = KIMI_CONFIG_PATH
): NodeJS.ProcessEnv | null {
  const modelName = model?.trim();
  if (!(modelName && modelName in KIMI_MODEL_DISPLAY_NAMES)) {
    return null;
  }
  const credentials = readKimiCredentials(configPath);
  if (!credentials) {
    throw new Error(
      `Kimi model "${modelName}" requires Kimi API credentials in ${configPath}. Run "kimi migrate" or "kimi login", then restart Core.`
    );
  }
  return {
    KIMI_MODEL_API_KEY: credentials.apiKey,
    KIMI_MODEL_BASE_URL: credentials.baseUrl,
    KIMI_MODEL_DISPLAY_NAME: KIMI_MODEL_DISPLAY_NAMES[modelName],
    KIMI_MODEL_MAX_CONTEXT_SIZE: "262144",
    KIMI_MODEL_NAME: modelName,
    KIMI_MODEL_PROVIDER_TYPE: "kimi",
  };
}

function readKimiCredentials(
  configPath: string
): { apiKey: string; baseUrl: string } | null {
  let toml = "";
  try {
    toml = readFileSync(configPath, "utf8");
  } catch {
    return null;
  }
  for (const section of readTomlSections(toml, "providers")) {
    const apiKey = readTomlString(section.text, "api_key");
    if (apiKey) {
      return {
        apiKey,
        baseUrl:
          readTomlString(section.text, "base_url") ??
          "https://api.kimi.com/coding/v1",
      };
    }
  }
  return null;
}

function readTomlSections(
  toml: string,
  tableName: string
): Array<{ name: string; text: string }> {
  const headers = Array.from(toml.matchAll(/^\s*\[([^\]]+)\]\s*$/gmu));
  return headers.flatMap((header, index) => {
    const rawName = header[1];
    const prefix = `${tableName}.`;
    if (!rawName.startsWith(prefix)) {
      return [];
    }
    const start = (header.index ?? 0) + header[0].length;
    const end = headers[index + 1]?.index ?? toml.length;
    return [
      { name: rawName.slice(prefix.length), text: toml.slice(start, end) },
    ];
  });
}

function readTomlString(section: string, key: string): string | undefined {
  return section.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "mu"))?.[1];
}
