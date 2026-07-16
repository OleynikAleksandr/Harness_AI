const PROVIDER_SECTION_RE = /^\[providers\.[^\]]+\]$/u;
const MODEL_SECTION_RE = /^\[models\.([^\]]+)\]$/u;
const BASE_URL_LINE_RE = /^(\s*base_url\s*=\s*")([^"]*)(".*)$/u;
const MODEL_LINE_RE = /^(\s*model\s*=\s*")([^"]*)(".*)$/u;
const DEFAULT_MODEL_LINE_RE = /^(\s*default_model\s*=\s*")([^"]*)(".*)$/u;
const TRAILING_SLASH_RE = /\/+$/u;
const SAFE_MODEL_ID_RE = /^[a-zA-Z0-9._-]+$/u;

interface TomlSection {
  readonly end: number;
  readonly modelId: string;
  readonly start: number;
}

// Produces a temporary native-CLI config. Provider endpoints are redirected
// to the reverse bridge while service URLs remain untouched. If the selected
// Coding Plan model is absent from the user's CLI aliases, the first native
// model block is cloned and only its upstream model id is replaced.
export function prepareKimiCaptureConfig(
  toml: string,
  bridgeBaseUrl: string,
  selectedModelId: string
): string {
  if (!SAFE_MODEL_ID_RE.test(selectedModelId)) {
    throw new Error(`Kimi capture model id is not safe: ${selectedModelId}`);
  }
  const redirected = rewriteProviderBaseUrls(toml, bridgeBaseUrl);
  const withAlias = ensureModelAlias(redirected, selectedModelId);
  return selectDefaultModel(withAlias, selectedModelId);
}

function rewriteProviderBaseUrls(toml: string, bridgeBaseUrl: string): string {
  const normalizedBridge = bridgeBaseUrl.replace(TRAILING_SLASH_RE, "");
  let inProviderSection = false;
  return toml
    .split("\n")
    .map((line) => {
      if (line.startsWith("[")) {
        inProviderSection = PROVIDER_SECTION_RE.test(line);
        return line;
      }
      if (!inProviderSection) {
        return line;
      }
      const match = line.match(BASE_URL_LINE_RE);
      if (!match) {
        return line;
      }
      const [, prefix, url, suffix] = match;
      return `${prefix}${normalizedBridge}${extractUrlPath(url)}${suffix}`;
    })
    .join("\n");
}

function ensureModelAlias(toml: string, selectedModelId: string): string {
  const lines = toml.split("\n");
  const sections = findModelSections(lines);
  if (sections.some((section) => section.modelId === selectedModelId)) {
    return toml;
  }
  const source = sections[0];
  if (!source) {
    throw new Error("Kimi capture config has no native model section to clone");
  }
  const clone = lines.slice(source.start, source.end);
  clone[0] = `[models.${selectedModelId}]`;
  const modelLineIndex = clone.findIndex((line) => MODEL_LINE_RE.test(line));
  if (modelLineIndex < 0) {
    clone.push(`model = "${selectedModelId}"`);
  } else {
    clone[modelLineIndex] = clone[modelLineIndex].replace(
      MODEL_LINE_RE,
      `$1${selectedModelId}$3`
    );
  }
  return `${toml.trimEnd()}\n\n${clone.join("\n").trimEnd()}\n`;
}

function findModelSections(lines: readonly string[]): readonly TomlSection[] {
  const starts: { readonly modelId: string; readonly start: number }[] = [];
  const sectionStarts: number[] = [];
  for (const [index, line] of lines.entries()) {
    if (line.startsWith("[")) {
      sectionStarts.push(index);
    }
    const match = line.match(MODEL_SECTION_RE);
    if (match) {
      starts.push({ modelId: match[1], start: index });
    }
  }
  return starts.map((section) => ({
    ...section,
    end:
      sectionStarts.find((sectionStart) => sectionStart > section.start) ??
      lines.length,
  }));
}

function selectDefaultModel(toml: string, selectedModelId: string): string {
  const lines = toml.split("\n");
  const lineIndex = lines.findIndex((line) => DEFAULT_MODEL_LINE_RE.test(line));
  if (lineIndex < 0) {
    return `default_model = "${selectedModelId}"\n${toml}`;
  }
  lines[lineIndex] = lines[lineIndex].replace(
    DEFAULT_MODEL_LINE_RE,
    `$1${selectedModelId}$3`
  );
  return lines.join("\n");
}

function extractUrlPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}
