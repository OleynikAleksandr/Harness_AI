import type { SessionProfileToolingCategory } from "../profile-document-parser.js";
import { CODEAI_WORKFLOW_CLAUDE_SEED_PROMPT } from "./codeai-workflow-seed-prompts.js";
import {
  CODEX_SYNTHETIC_NATIVE_CUSTOM_INSTRUCTIONS,
  CODEX_SYNTHETIC_NATIVE_REQUEST_TEMPLATE_JSON,
  CODEX_SYNTHETIC_NATIVE_SEED_PROMPT,
  CODEX_SYNTHETIC_NATIVE_TOOLS_JSON,
} from "./codex-synthetic-native-seed-prompt.js";
import {
  ARCHITECTURE_SPEC_SEED_PROMPT,
  PLAN_DOCUMENT_SEED_PROMPT,
  REVIEW_SEED_PROMPT,
  TODO_PLAN_DETERMINISTIC_SEED_PROMPT,
} from "./universal-seed-prompts.js";

export interface SeedSessionProfile {
  readonly customInstructions?: string;
  readonly id: string;
  readonly passportYaml: string;
  readonly promptBody: string;
  readonly providerDirectory?: string;
  readonly requestTemplateJson?: string;
  readonly toolingYaml?: string;
  readonly toolsJson?: string;
}

interface SeedDefinition {
  readonly categories: Readonly<Record<SessionProfileToolingCategory, boolean>>;
  readonly customInstructions?: string;
  readonly description: string;
  readonly id: string;
  readonly name: string;
  readonly omitToolingYaml?: boolean;
  readonly promptBody: string;
  readonly provider?: string;
  readonly providerDirectory?: string;
  readonly requestTemplateJson?: string;
  readonly toolsJson?: string;
}

const SEED_DEFINITIONS: readonly SeedDefinition[] = [
  {
    categories: {
      "file-read": true,
      "file-write": true,
      git: false,
      shell: false,
      tests: false,
      web: true,
    },
    description: "Build a structured planning document for a feature or scope.",
    id: "plan-document",
    name: "Plan Document",
    promptBody: PLAN_DOCUMENT_SEED_PROMPT,
  },
  {
    categories: {
      "file-read": true,
      "file-write": true,
      git: false,
      shell: false,
      tests: false,
      web: false,
    },
    description:
      "Produce a deterministic machine-manageable todo plan for an agreed scope.",
    id: "todo-plan-deterministic",
    name: "Deterministic Todo Plan",
    promptBody: TODO_PLAN_DETERMINISTIC_SEED_PROMPT,
  },
  {
    categories: {
      "file-read": true,
      "file-write": false,
      git: true,
      shell: true,
      tests: true,
      web: true,
    },
    description:
      "Review a change set or code area and report verified findings.",
    id: "review",
    name: "Review",
    promptBody: REVIEW_SEED_PROMPT,
  },
  {
    categories: {
      "file-read": true,
      "file-write": true,
      git: false,
      shell: false,
      tests: false,
      web: false,
    },
    description:
      "Write or update product part, cluster, or module specifications.",
    id: "architecture-spec",
    name: "Architecture Spec",
    promptBody: ARCHITECTURE_SPEC_SEED_PROMPT,
  },
  {
    categories: {
      "file-read": true,
      "file-write": true,
      git: false,
      shell: false,
      tests: false,
      web: true,
    },
    description:
      "Today's managed CodeAI workflow behavior for Claude, preserved as a selectable profile.",
    id: "codeai-workflow-claude",
    name: "CodeAI Workflow (Claude)",
    promptBody: CODEAI_WORKFLOW_CLAUDE_SEED_PROMPT,
    provider: "claude",
  },
  {
    categories: {
      "file-read": true,
      "file-write": true,
      git: true,
      shell: true,
      tests: true,
      web: true,
    },
    description:
      "Exact synthetic Codex native baseline for CodexUC from the accepted native request capture.",
    id: "codex-synthetic-native",
    name: "Codex Synthetic Native",
    promptBody: CODEX_SYNTHETIC_NATIVE_SEED_PROMPT,
    provider: "codex-uc",
    providerDirectory: "CodexUC",
    requestTemplateJson: CODEX_SYNTHETIC_NATIVE_REQUEST_TEMPLATE_JSON,
    toolsJson: CODEX_SYNTHETIC_NATIVE_TOOLS_JSON,
  },
  {
    categories: {
      "file-read": true,
      "file-write": true,
      git: true,
      shell: true,
      tests: true,
      web: true,
    },
    customInstructions: CODEX_SYNTHETIC_NATIVE_CUSTOM_INSTRUCTIONS,
    description:
      "Synthetic Codex native baseline for CodexUC plus embedded custom instructions.",
    id: "codex-synthetic-native-custom",
    name: "Codex Synthetic Native + Custom",
    promptBody: CODEX_SYNTHETIC_NATIVE_SEED_PROMPT,
    provider: "codex-uc",
    providerDirectory: "CodexUC",
    requestTemplateJson: CODEX_SYNTHETIC_NATIVE_REQUEST_TEMPLATE_JSON,
    toolsJson: CODEX_SYNTHETIC_NATIVE_TOOLS_JSON,
  },
  {
    categories: {
      "file-read": true,
      "file-write": true,
      git: true,
      shell: true,
      tests: true,
      web: true,
    },
    description:
      "Codex app-server synthetic native baseline; app-server owns the structured tool surface.",
    id: "codex-app-server-synthetic-native",
    name: "Codex App-Server Synthetic Native",
    omitToolingYaml: true,
    promptBody: CODEX_SYNTHETIC_NATIVE_SEED_PROMPT,
    provider: "codex",
    providerDirectory: "Codex",
  },
  {
    categories: {
      "file-read": true,
      "file-write": true,
      git: true,
      shell: true,
      tests: true,
      web: true,
    },
    customInstructions: CODEX_SYNTHETIC_NATIVE_CUSTOM_INSTRUCTIONS,
    description:
      "Codex app-server synthetic native baseline plus embedded custom instructions; app-server owns the structured tool surface.",
    id: "codex-app-server-synthetic-native-custom",
    name: "Codex App-Server Synthetic Native + Custom",
    omitToolingYaml: true,
    promptBody: CODEX_SYNTHETIC_NATIVE_SEED_PROMPT,
    provider: "codex",
    providerDirectory: "Codex",
  },
];

export const SEED_SESSION_PROFILES: readonly SeedSessionProfile[] =
  SEED_DEFINITIONS.map((definition) => ({
    ...(definition.customInstructions === undefined
      ? {}
      : {
          customInstructions: ensureTrailingNewline(
            definition.customInstructions
          ),
        }),
    id: definition.id,
    passportYaml: buildPassportYaml(definition),
    promptBody: ensureTrailingNewline(definition.promptBody),
    ...(definition.providerDirectory === undefined
      ? {}
      : { providerDirectory: definition.providerDirectory }),
    ...(definition.requestTemplateJson === undefined
      ? {}
      : { requestTemplateJson: definition.requestTemplateJson }),
    ...(definition.omitToolingYaml
      ? {}
      : { toolingYaml: buildToolingYaml(definition.categories) }),
    ...(definition.toolsJson === undefined
      ? {}
      : { toolsJson: definition.toolsJson }),
  }));

function buildPassportYaml(definition: SeedDefinition): string {
  const lines = [
    "# Session profile passport. Shown in the profile picker.",
    `name: ${definition.name}`,
    `description: ${definition.description}`,
  ];
  if (definition.provider) {
    lines.push(`provider: ${definition.provider}`);
  }
  return `${lines.join("\n")}\n`;
}

function buildToolingYaml(
  categories: Readonly<Record<SessionProfileToolingCategory, boolean>>
): string {
  const lines = [
    "# Tooling categories for this profile.",
    "# on  = the adapter enables its native tools of this category",
    "# off = the adapter removes/disables them",
    "categories:",
  ];
  for (const [category, enabled] of Object.entries(categories)) {
    lines.push(`  ${category}: ${enabled ? "on" : "off"}`);
  }
  return `${lines.join("\n")}\n`;
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}
