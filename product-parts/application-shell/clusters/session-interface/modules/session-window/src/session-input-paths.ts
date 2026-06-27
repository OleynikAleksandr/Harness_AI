const LINE_SPLIT_REGEX = /\r?\n/u;
const WINDOWS_PATH_PATTERN = /^[a-zA-Z]:[\\/]/u;

export function normalizePathCandidate(rawValue: string): null | string {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (value.startsWith("file://")) {
    const withoutScheme = value.replace("file://", "");
    try {
      return decodeURIComponent(withoutScheme);
    } catch {
      return withoutScheme;
    }
  }

  if (
    value.startsWith("/") ||
    value.startsWith("~") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    WINDOWS_PATH_PATTERN.test(value)
  ) {
    return value;
  }

  return null;
}

export function formatPathsForInsertion(paths: readonly string[]): string {
  if (paths.length === 0) {
    return "";
  }
  return `${paths.map((path) => `"${path}"`).join("\n")}\n`;
}

export function collectPathsFromDataTransfer(
  dataTransfer: DataTransfer | null
): string[] {
  if (!dataTransfer) {
    return [];
  }

  const results: string[] = [];
  collectPathsFromPayload(
    results,
    dataTransfer.getData("application/vnd.code.uri-list") ||
      dataTransfer.getData("text/uri-list")
  );
  collectPathsFromPayload(results, dataTransfer.getData("text/plain"));
  collectPathsFromFiles(results, dataTransfer.files);
  collectPathsFromItems(results, dataTransfer.items);
  return results;
}

function collectPathsFromPayload(results: string[], payload: string): void {
  if (!payload) {
    return;
  }
  for (const line of payload.split(LINE_SPLIT_REGEX)) {
    const normalized = normalizePathCandidate(line);
    if (normalized) {
      pushUnique(results, normalized);
    }
  }
}

function collectPathsFromFiles(
  results: string[],
  files: FileList | null | undefined
): void {
  if (!files) {
    return;
  }
  for (const file of Array.from(files)) {
    const normalized = normalizePathCandidate(resolveFilePath(file));
    if (normalized) {
      pushUnique(results, normalized);
    }
  }
}

function collectPathsFromItems(
  results: string[],
  items: DataTransferItemList | undefined
): void {
  if (!items) {
    return;
  }
  for (const item of Array.from(items)) {
    if (item.kind !== "file") {
      continue;
    }
    const file = item.getAsFile();
    if (!file) {
      continue;
    }
    const normalized = normalizePathCandidate(resolveFilePath(file));
    if (normalized) {
      pushUnique(results, normalized);
    }
  }
}

function resolveFilePath(file: File): string {
  const bridgedPath = window.harnessFilePaths?.getPathForFile(file);
  if (bridgedPath) {
    return bridgedPath;
  }
  return (file as File & { path?: string }).path ?? "";
}

function pushUnique(results: string[], value: string): void {
  if (!results.includes(value)) {
    results.push(value);
  }
}
