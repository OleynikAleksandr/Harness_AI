import type { LocalizationSourceDictionary } from "./source-dictionary-registry.js";

const UI_LABELS_SOURCE_DICTIONARY = {
  category: "ui_labels",
  entries: {
    "settings.title": "Settings",
    "settings.general": "General",
    "session.new": "New Session",
    "session.settings": "Settings",
    "session.sidebar.workspaces": "Workspaces",
  },
  language: "en",
} as const satisfies LocalizationSourceDictionary;

const UI_HELPER_TEXT_SOURCE_DICTIONARY = {
  category: "ui_helper_text",
  entries: {
    "settings.localization.description":
      "Choose UI languages and translation engines.",
    "session.input.placeholder": "Message the active provider.",
  },
  language: "en",
} as const satisfies LocalizationSourceDictionary;

const MESSAGES_FOR_THE_USER_SOURCE_DICTIONARY = {
  category: "messages_for_the_user",
  entries: {
    "core.bridge.unavailable": "Core runtime bridge is unavailable.",
    "provider.setup.needed": "Provider setup needed: {error}",
    "session.empty": "Select or create a session.",
  },
  language: "en",
} as const satisfies LocalizationSourceDictionary;

const ARTIFACTS_FOR_THE_USER_SOURCE_DICTIONARY = {
  category: "artifacts_for_the_user",
  entries: {},
  language: "en",
} as const satisfies LocalizationSourceDictionary;

export const APPROVED_ENGLISH_SOURCE_DICTIONARIES = [
  UI_LABELS_SOURCE_DICTIONARY,
  UI_HELPER_TEXT_SOURCE_DICTIONARY,
  MESSAGES_FOR_THE_USER_SOURCE_DICTIONARY,
  ARTIFACTS_FOR_THE_USER_SOURCE_DICTIONARY,
] as const satisfies readonly LocalizationSourceDictionary[];
