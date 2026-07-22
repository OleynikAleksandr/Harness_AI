import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export type ProfileStudioCreatorAgentProviderId = "codex";

export interface ProfileStudioCreatorProfile {
  readonly customInstructions: string;
  readonly directoryPath: string;
  readonly effectiveSystemPrompt: string;
  readonly initialUserMessageTemplate: string;
  readonly providerId: ProfileStudioCreatorAgentProviderId;
  readonly systemPrompt: string;
  readonly toolDeclarations: readonly Readonly<Record<string, unknown>>[];
}

export interface ProfileStudioInitialAssignment {
  readonly captureId: string;
  readonly profileId: string;
  readonly rawCapturePath: string;
  readonly rawCaptureSha256: string;
  readonly targetModelId: string;
  readonly targetProviderId: string;
  readonly targetReasoning: string;
}

const COMPONENT_FILES = {
  customInstructions: "custom-instructions.md",
  initialUserMessageTemplate: "initial-user-message.md",
  systemPrompt: "system-prompt.md",
  toolDeclarations: "tools.json",
} as const;

const TEMPLATE_FIELDS = [
  "captureId",
  "profileId",
  "rawCapturePath",
  "rawCaptureSha256",
  "targetModelId",
  "targetProviderId",
  "targetReasoning",
] as const;
const PLACEHOLDER_PATTERN = /\{\{([^{}]+)\}\}/gu;
const UNRESOLVED_PLACEHOLDER_PATTERN = /\{\{[^{}]+\}\}/u;

export class ProfileStudioCreatorProfileFacade {
  async load(
    providerId: ProfileStudioCreatorAgentProviderId
  ): Promise<ProfileStudioCreatorProfile> {
    const directoryPath = resolveCreatorAgentProfilePath(providerId);
    const [systemPrompt, customInstructions, toolsText, messageTemplate] =
      await Promise.all([
        readRequiredText(directoryPath, COMPONENT_FILES.systemPrompt),
        readRequiredText(directoryPath, COMPONENT_FILES.customInstructions),
        readRequiredText(directoryPath, COMPONENT_FILES.toolDeclarations),
        readRequiredText(
          directoryPath,
          COMPONENT_FILES.initialUserMessageTemplate
        ),
      ]);
    const toolDeclarations = parseToolDeclarations(toolsText);
    validateMessageTemplate(messageTemplate);
    return {
      customInstructions,
      directoryPath,
      effectiveSystemPrompt: `${systemPrompt}\n\n${customInstructions}`,
      initialUserMessageTemplate: messageTemplate,
      providerId,
      systemPrompt,
      toolDeclarations,
    };
  }

  renderInitialUserMessage(
    profile: ProfileStudioCreatorProfile,
    assignment: ProfileStudioInitialAssignment
  ): string {
    let rendered = profile.initialUserMessageTemplate;
    for (const field of TEMPLATE_FIELDS) {
      rendered = rendered.replaceAll(`{{${field}}}`, assignment[field]);
    }
    if (UNRESOLVED_PLACEHOLDER_PATTERN.test(rendered)) {
      throw new Error(
        "Creator Agent initial message contains an unsupported placeholder."
      );
    }
    return rendered.trim();
  }
}

export function resolveCreatorAgentProfilePath(
  providerId: ProfileStudioCreatorAgentProviderId
): string {
  const harnessHome =
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai");
  const providerDirectory = providerId === "codex" ? "Codex" : neverProvider();
  return path.join(
    harnessHome,
    "ProfileStudio",
    "CreatorAgents",
    providerDirectory
  );
}

async function readRequiredText(
  directoryPath: string,
  fileName: string
): Promise<string> {
  let content: string;
  try {
    content = await readFile(path.join(directoryPath, fileName), "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Creator Agent component ${fileName} is unreadable: ${detail}`
    );
  }
  const normalized = content.trim();
  if (!normalized) {
    throw new Error(`Creator Agent component ${fileName} must not be empty.`);
  }
  return normalized;
}

function parseToolDeclarations(
  source: string
): readonly Readonly<Record<string, unknown>>[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("Creator Agent tools.json must contain valid JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Creator Agent tools.json must contain a non-empty array.");
  }
  for (const declaration of parsed) {
    if (
      !isPlainRecord(declaration) ||
      typeof declaration.name !== "string" ||
      !declaration.name.trim()
    ) {
      throw new Error(
        "Every Creator Agent tool declaration must have a non-empty name."
      );
    }
  }
  return parsed;
}

function validateMessageTemplate(template: string): void {
  const placeholders = [...template.matchAll(PLACEHOLDER_PATTERN)].map(
    (match) => match[1]
  );
  const supported = new Set<string>(TEMPLATE_FIELDS);
  if (placeholders.some((placeholder) => !supported.has(placeholder))) {
    throw new Error(
      "Creator Agent initial message contains an unsupported placeholder."
    );
  }
  for (const field of TEMPLATE_FIELDS) {
    if (!placeholders.includes(field)) {
      throw new Error(`Creator Agent initial message is missing {{${field}}}.`);
    }
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function neverProvider(): never {
  throw new Error("Unsupported Profile Creator Agent provider.");
}
