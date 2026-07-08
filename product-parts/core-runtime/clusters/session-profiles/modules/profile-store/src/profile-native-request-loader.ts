import { promises as fs } from "node:fs";
import {
  parseSessionProfileJsonDocument,
  type SessionProfileNativeRequestBundle,
} from "./profile-document-parser.js";
import type { SessionProfileDocumentPaths } from "./profile-store-facade.js";

const INPUT_PREFIX_FILE_NAME = "input-prefix.json";
const REQUEST_TEMPLATE_FILE_NAME = "request-template.json";
const TOOLS_FILE_NAME = "tools.json";

interface MutableSessionProfileNativeRequestBundle {
  customInstructions?: string;
  inputPrefix?: readonly Readonly<Record<string, unknown>>[];
  requestTemplate?: Readonly<Record<string, unknown>>;
  tools?: readonly Readonly<Record<string, unknown>>[];
}

export async function loadNativeRequestBundle(
  documents: SessionProfileDocumentPaths,
  issues: string[]
): Promise<SessionProfileNativeRequestBundle | undefined> {
  const [customInstructions, inputPrefixText, requestTemplateText, toolsText] =
    await Promise.all([
      readOptionalDocument(documents.customInstructionsPath),
      readOptionalDocument(documents.inputPrefixPath),
      readOptionalDocument(documents.requestTemplatePath),
      readOptionalDocument(documents.toolsPath),
    ]);
  const bundle: MutableSessionProfileNativeRequestBundle = {};
  if (customInstructions?.trim()) {
    bundle.customInstructions = customInstructions;
  }
  readJsonArraySidecar(
    inputPrefixText,
    INPUT_PREFIX_FILE_NAME,
    issues,
    (value) => {
      bundle.inputPrefix = value;
    }
  );
  readJsonObjectSidecar(
    requestTemplateText,
    REQUEST_TEMPLATE_FILE_NAME,
    issues,
    (value) => {
      bundle.requestTemplate = value;
    }
  );
  readJsonArraySidecar(toolsText, TOOLS_FILE_NAME, issues, (value) => {
    bundle.tools = value;
  });
  return Object.keys(bundle).length > 0 ? bundle : undefined;
}

function readJsonArraySidecar(
  text: string | undefined,
  fileName: string,
  issues: string[],
  applyValue: (value: readonly Readonly<Record<string, unknown>>[]) => void
): void {
  if (text === undefined) {
    return;
  }
  const parsed = parseSessionProfileJsonDocument(text, fileName);
  issues.push(...parsed.issues);
  if (
    Array.isArray(parsed.value) &&
    parsed.value.every((item) => isPlainRecord(item))
  ) {
    applyValue(parsed.value);
  } else if (parsed.value !== undefined) {
    issues.push(`${fileName}: root value must be an array of objects.`);
  }
}

function readJsonObjectSidecar(
  text: string | undefined,
  fileName: string,
  issues: string[],
  applyValue: (value: Readonly<Record<string, unknown>>) => void
): void {
  if (text === undefined) {
    return;
  }
  const parsed = parseSessionProfileJsonDocument(text, fileName);
  issues.push(...parsed.issues);
  if (isPlainRecord(parsed.value)) {
    applyValue(parsed.value);
  } else if (parsed.value !== undefined) {
    issues.push(`${fileName}: root value must be an object.`);
  }
}

async function readOptionalDocument(
  filePath: string
): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
