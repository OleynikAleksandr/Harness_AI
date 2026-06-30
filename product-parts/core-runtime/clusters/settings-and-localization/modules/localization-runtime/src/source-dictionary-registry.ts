import { APPROVED_ENGLISH_SOURCE_DICTIONARIES } from "./source-dictionaries.js";

export const DEFAULT_LOCALIZATION_SOURCE_LANGUAGE = "en";

export const LOCALIZATION_CATEGORY_IDS = [
  "ui_labels",
  "ui_helper_text",
  "messages_for_the_user",
  "artifacts_for_the_user",
  "reasoning",
  "ui_interface",
  "user_guidance",
  "system_feedback",
  "interactive_templates",
  "workflow_terms",
] as const;

export type LocalizationCategoryId = (typeof LOCALIZATION_CATEGORY_IDS)[number];

export type LocalizationSourceDictionaryEntries = Readonly<
  Record<string, string>
>;

export interface LocalizationSourceDictionary {
  readonly category: LocalizationCategoryId;
  readonly entries: LocalizationSourceDictionaryEntries;
  readonly language: string;
}

export class SourceDictionaryRegistry {
  private readonly dictionaries = new Map<
    string,
    LocalizationSourceDictionary
  >();

  constructor(
    sourceDictionaries: readonly LocalizationSourceDictionary[] = APPROVED_ENGLISH_SOURCE_DICTIONARIES
  ) {
    for (const dictionary of sourceDictionaries) {
      this.register(dictionary);
    }
  }

  register(dictionary: LocalizationSourceDictionary): void {
    const normalized = normalizeDictionary(dictionary);
    this.dictionaries.set(
      registryKey(normalized.category, normalized.language),
      normalized
    );
  }

  resolve(
    category: LocalizationCategoryId,
    language = DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
  ): LocalizationSourceDictionary | null {
    return this.dictionaries.get(registryKey(category, language)) ?? null;
  }

  getMessage(
    category: LocalizationCategoryId,
    messageId: string,
    language = DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
  ): string | null {
    const dictionary = this.resolve(category, language);
    return dictionary?.entries[messageId.trim()] ?? null;
  }

  fingerprint(): string {
    return JSON.stringify(
      [...this.dictionaries.values()]
        .map((dictionary) => ({
          category: dictionary.category,
          entries: Object.entries(dictionary.entries).sort(([left], [right]) =>
            left.localeCompare(right)
          ),
          language: dictionary.language,
        }))
        .sort((left, right) =>
          `${left.category}:${left.language}`.localeCompare(
            `${right.category}:${right.language}`
          )
        )
    );
  }
}

function normalizeDictionary(
  dictionary: LocalizationSourceDictionary
): LocalizationSourceDictionary {
  const entries: Record<string, string> = {};
  for (const [messageId, text] of Object.entries(dictionary.entries)) {
    const normalizedMessageId = messageId.trim();
    if (normalizedMessageId) {
      entries[normalizedMessageId] = text;
    }
  }
  return {
    category: dictionary.category,
    entries,
    language: normalizeIdentifier(
      dictionary.language,
      DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
    ),
  };
}

function registryKey(
  category: LocalizationCategoryId,
  language: string
): string {
  return `${category}::${normalizeIdentifier(
    language,
    DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
  )}`;
}

function normalizeIdentifier(value: string, fallback: string): string {
  const trimmed = value.trim().toLowerCase();
  return trimmed || fallback;
}
