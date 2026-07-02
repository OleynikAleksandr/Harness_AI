import type { SessionProfileToolingCategory } from "../profile-document-parser.js";
import {
  CODEAI_WORKFLOW_CLAUDE_SEED_PROMPT,
  CODEAI_WORKFLOW_GLM_NATIVE_SEED_PROMPT,
  CODEAI_WORKFLOW_KIMI_SEED_PROMPT,
} from "./codeai-workflow-seed-prompts.js";
import {
  ARCHITECTURE_SPEC_SEED_PROMPT,
  PLAN_DOCUMENT_SEED_PROMPT,
  REVIEW_SEED_PROMPT,
  TODO_PLAN_DETERMINISTIC_SEED_PROMPT,
} from "./universal-seed-prompts.js";

export interface SeedSessionProfile {
  readonly id: string;
  readonly passportYaml: string;
  readonly promptBody: string;
  readonly toolingYaml: string;
}

interface SeedDefinition {
  readonly categories: Readonly<Record<SessionProfileToolingCategory, boolean>>;
  readonly description: string;
  readonly id: string;
  readonly name: string;
  readonly promptBody: string;
  readonly provider?: string;
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
      git: false,
      shell: true,
      tests: false,
      web: false,
    },
    description:
      "Today's managed CodeAI workflow behavior for Kimi, preserved as a selectable profile.",
    id: "codeai-workflow-kimi",
    name: "CodeAI Workflow (Kimi)",
    promptBody: CODEAI_WORKFLOW_KIMI_SEED_PROMPT,
    provider: "kimi",
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
      "Today's built-in GLM Native workflow behavior, preserved as a selectable profile.",
    id: "codeai-workflow-glm-native",
    name: "CodeAI Workflow (GLM Native)",
    promptBody: CODEAI_WORKFLOW_GLM_NATIVE_SEED_PROMPT,
    provider: "glm-native",
  },
];

export const SEED_SESSION_PROFILES: readonly SeedSessionProfile[] =
  SEED_DEFINITIONS.map((definition) => ({
    id: definition.id,
    passportYaml: buildPassportYaml(definition),
    promptBody: ensureTrailingNewline(definition.promptBody),
    toolingYaml: buildToolingYaml(definition.categories),
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
