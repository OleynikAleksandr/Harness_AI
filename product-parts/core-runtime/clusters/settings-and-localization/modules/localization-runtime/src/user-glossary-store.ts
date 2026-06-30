import { promises as fs } from "node:fs";
import path from "node:path";

export interface UserGlossaryOverrides {
  readonly preserve: readonly string[];
}

interface UserGlossaryStoreOptions {
  readonly glossaryDirectory?: string;
}

const USER_GLOSSARY_FILE_NAME = "do-not-translate-terms.txt";
const COMMENT_PREFIX = "#";
const LINE_SPLIT_PATTERN = /\r?\n/u;
const SEEDED_PRESERVE_TERMS = [
  "Harness AI",
  "CodeAI Hub",
  "Project Manager",
  "Claude",
  "Codex",
  "VS Code",
  "TypeScript",
  "Markdown",
] as const;
const HEADER_LINES = [
  "# Harness AI do-not-translate glossary",
  "# Add one English term per line. Blank lines and # comments are ignored.",
  "",
] as const;

export class UserGlossaryStore {
  private readonly glossaryDirectory: string;

  constructor(options: UserGlossaryStoreOptions = {}) {
    this.glossaryDirectory =
      options.glossaryDirectory ??
      path.join(
        process.cwd(),
        ".harness",
        "runtime",
        "localization",
        "glossary"
      );
  }

  async load(): Promise<UserGlossaryOverrides> {
    try {
      return normalizeOverrides(
        parseGlossary(await fs.readFile(this.userGlossaryPath, "utf8"))
      );
    } catch {
      return { preserve: [] };
    }
  }

  async ensureEditableGlossaryFile(): Promise<string> {
    await fs.mkdir(this.glossaryDirectory, { recursive: true });
    try {
      await fs.access(this.userGlossaryPath);
    } catch {
      await fs.writeFile(
        this.userGlossaryPath,
        serializeGlossary({ preserve: SEEDED_PRESERVE_TERMS }),
        "utf8"
      );
    }
    return this.userGlossaryPath;
  }

  async save(overrides: UserGlossaryOverrides): Promise<UserGlossaryOverrides> {
    const normalized = normalizeOverrides(overrides);
    await fs.mkdir(this.glossaryDirectory, { recursive: true });
    await fs.writeFile(
      this.userGlossaryPath,
      serializeGlossary(normalized),
      "utf8"
    );
    return normalized;
  }

  private get userGlossaryPath(): string {
    return path.join(this.glossaryDirectory, USER_GLOSSARY_FILE_NAME);
  }
}

function parseGlossary(raw: string): UserGlossaryOverrides {
  return {
    preserve: raw
      .split(LINE_SPLIT_PATTERN)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith(COMMENT_PREFIX)),
  };
}

function normalizeOverrides(
  overrides: UserGlossaryOverrides
): UserGlossaryOverrides {
  return {
    preserve: [
      ...new Set(overrides.preserve.map((term) => term.trim())),
    ].filter(Boolean),
  };
}

function serializeGlossary(overrides: UserGlossaryOverrides): string {
  return `${[...HEADER_LINES, ...normalizeOverrides(overrides).preserve].join("\n")}\n`;
}
