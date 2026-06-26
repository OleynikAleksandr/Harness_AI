import { shell } from "electron";

export function createVsCodeFileUrl(filePath, line = 1, column = 1) {
  return `vscode://file/${filePath}:${line}:${column}`;
}

export function canOpenExternalUrl(url) {
  return url.startsWith("vscode://file/");
}

export async function openExternalUrl(url) {
  if (!canOpenExternalUrl(url)) {
    return false;
  }
  await shell.openExternal(url);
  return true;
}
