import { shell } from "electron";

export function createVsCodeFileUrl(filePath, line = 1, column = 1) {
  return `vscode://file/${filePath}:${line}:${column}`;
}

// Explicit allowlist: workspace file links open in VS Code, web links open in
// the default system browser. Every other protocol stays denied.
const OPENABLE_URL_PREFIXES = ["vscode://file/", "https://", "http://"];

export function canOpenExternalUrl(url) {
  return OPENABLE_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export async function openExternalUrl(url) {
  if (!canOpenExternalUrl(url)) {
    return false;
  }
  await shell.openExternal(url);
  return true;
}
