import { promises as fs } from "node:fs";
import path from "node:path";

export interface UserGlossaryTranslation {
  readonly sourceTerm: string;
  readonly translatedTerm: string;
}

export interface UserGlossaryOverrides {
  readonly preserve: readonly string[];
  readonly translations: readonly UserGlossaryTranslation[];
}

interface UserGlossaryStoreOptions {
  readonly glossaryDirectory?: string;
}

const USER_GLOSSARY_FILE_NAME = "do-not-translate-terms.txt";
const COMMENT_PREFIX = "#";
const LINE_SPLIT_PATTERN = /\r?\n/u;
const TRANSLATION_SEPARATOR = " - ";
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
const SEEDED_TRANSLATIONS = [
  { sourceTerm: "Pull Request", translatedTerm: "Пул-реквест" },
  { sourceTerm: "Endpoint", translatedTerm: "Эндпоинт" },
] as const;
const HEADER_LINES = [
  "# Harness AI do-not-translate glossary",
  "# One entry per line. Blank lines and # comments are ignored.",
  "# - A term alone stays untranslated, e.g.: Harness AI",
  '# - "Term - Desired translation" controls exactly how a term is',
  "#   translated, e.g.: Pull Request - Пул-реквест",
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
      return { preserve: [], translations: [] };
    }
  }

  async ensureEditableGlossaryFile(): Promise<string> {
    await fs.mkdir(this.glossaryDirectory, { recursive: true });
    try {
      await fs.access(this.userGlossaryPath);
    } catch {
      await fs.writeFile(
        this.userGlossaryPath,
        serializeGlossary({
          preserve: SEEDED_PRESERVE_TERMS,
          translations: SEEDED_TRANSLATIONS,
        }),
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
  const preserve: string[] = [];
  const translations: UserGlossaryTranslation[] = [];
  for (const rawLine of raw.split(LINE_SPLIT_PATTERN)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(COMMENT_PREFIX)) {
      continue;
    }
    const separatorIndex = line.indexOf(TRANSLATION_SEPARATOR);
    if (separatorIndex === -1) {
      preserve.push(line);
      continue;
    }
    const sourceTerm = line.slice(0, separatorIndex).trim();
    const translatedTerm = line
      .slice(separatorIndex + TRANSLATION_SEPARATOR.length)
      .trim();
    if (sourceTerm && translatedTerm) {
      translations.push({ sourceTerm, translatedTerm });
    }
  }
  return { preserve, translations };
}

function normalizeOverrides(
  overrides: UserGlossaryOverrides
): UserGlossaryOverrides {
  return {
    preserve: [
      ...new Set(overrides.preserve.map((term) => term.trim())),
    ].filter(Boolean),
    translations: dedupeTranslations(overrides.translations),
  };
}

function dedupeTranslations(
  translations: readonly UserGlossaryTranslation[]
): UserGlossaryTranslation[] {
  const bySourceTerm = new Map<string, UserGlossaryTranslation>();
  for (const entry of translations) {
    const sourceTerm = entry.sourceTerm.trim();
    const translatedTerm = entry.translatedTerm.trim();
    if (sourceTerm && translatedTerm) {
      bySourceTerm.set(sourceTerm, { sourceTerm, translatedTerm });
    }
  }
  return [...bySourceTerm.values()];
}

function serializeGlossary(overrides: UserGlossaryOverrides): string {
  const normalized = normalizeOverrides(overrides);
  const lines = [
    ...normalized.preserve,
    ...normalized.translations.map(
      ({ sourceTerm, translatedTerm }) =>
        `${sourceTerm}${TRANSLATION_SEPARATOR}${translatedTerm}`
    ),
  ];
  return `${[...HEADER_LINES, ...lines].join("\n")}\n`;
}
