import { createHash } from "node:crypto";

export function createReasoningSourceHash(sourceText: string): string {
  return createHash("sha256").update(sourceText, "utf8").digest("hex");
}
