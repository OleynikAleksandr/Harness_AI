import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { ReasoningTranslationOverlay } from "./reasoning-translation-overlay-facade.js";

export interface ReasoningTranslationOverlayRecord
  extends ReasoningTranslationOverlay {
  readonly createdAt: string;
}

export class ReasoningTranslationOverlayStore {
  appendOverlay(
    workspacePath: string,
    overlay: ReasoningTranslationOverlay,
    createdAt = new Date().toISOString()
  ): ReasoningTranslationOverlayRecord {
    const record = { ...overlay, createdAt };
    const filePath = overlayFilePath(workspacePath, overlay.sessionId);
    mkdirSync(dirname(filePath), { recursive: true });
    appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf8");
    return record;
  }

  listOverlays(
    workspacePath: string,
    sessionId: string
  ): ReasoningTranslationOverlayRecord[] {
    const filePath = overlayFilePath(workspacePath, sessionId);
    if (!existsSync(filePath)) {
      return [];
    }
    return readFileSync(filePath, "utf8")
      .split("\n")
      .flatMap((line) => {
        const record = parseOverlayRecord(line);
        return record ? [record] : [];
      });
  }

  deleteSessionOverlays(workspacePath: string, sessionId: string): void {
    const filePath = overlayFilePath(workspacePath, sessionId);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}

function overlayFilePath(workspacePath: string, sessionId: string): string {
  return join(
    workspacePath,
    ".harness",
    "sessions",
    "reasoning-translations",
    `${encodeURIComponent(sessionId)}.jsonl`
  );
}

function parseOverlayRecord(
  line: string
): ReasoningTranslationOverlayRecord | null {
  if (!line.trim()) {
    return null;
  }
  try {
    const value = JSON.parse(
      line
    ) as Partial<ReasoningTranslationOverlayRecord>;
    if (
      typeof value.createdAt === "string" &&
      typeof value.engineId === "string" &&
      typeof value.messageId === "string" &&
      typeof value.sessionId === "string" &&
      typeof value.sourceHash === "string" &&
      (typeof value.sourceText === "undefined" ||
        typeof value.sourceText === "string") &&
      (value.status === "fallback" || value.status === "translated") &&
      typeof value.targetLanguage === "string"
    ) {
      return value as ReasoningTranslationOverlayRecord;
    }
  } catch {
    return null;
  }
  return null;
}
