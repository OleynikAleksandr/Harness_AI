import type { LocalizationSourceDictionary } from "./source-dictionary-registry.js";

const UI_LABELS_SOURCE_DICTIONARY = {
  category: "ui_labels",
  entries: {
    "settings.title": "Settings",
    "settings.general": "General",
    "settings.coreControls": "Core Controls",
    "settings.coreControls.restart": "Restart Core",
    "settings.localization": "Localization",
    "settings.localization.artifactsForTheUser": "Artifacts for the User",
    "settings.localization.category.artifacts": "Artifacts for the User",
    "settings.localization.category.messages": "Messages for the User",
    "settings.localization.category.reasoning": "Reasoning",
    "settings.localization.category.uiHelperText": "UI Helper Text",
    "settings.localization.category.uiLabels": "UI Labels",
    "settings.localization.glossary": "Glossary protection",
    "settings.localization.glossaryTerms": "Do-not-translate terms",
    "settings.localization.openGlossary": "Open glossary file",
    "settings.localization.reasoningEngine": "Reasoning Translation Engine",
    "settings.localization.uiEngine": "UI Translation Engine",
    "language.de": "German (de)",
    "language.en": "Default Language (English)",
    "language.es": "Spanish (es)",
    "language.fr": "French (fr)",
    "language.ru": "Russian (ru)",
    "language.uk": "Ukrainian (uk)",
    "session.new": "New Session",
    "session.settings": "Settings",
    "session.identifier": "Session identifier",
    "session.input": "Message input",
    "session.input.send": "Send message",
    "session.input.stop": "Stop current turn",
    "session.role.assistant": "Assistant",
    "session.role.system": "System",
    "session.role.thinking": "Thinking",
    "session.role.user": "User",
    "session.sidebar.workspaces": "Workspaces",
    "session.status.model": "Model:",
    "session.status.tokens": "Tokens:",
    "session.transcript": "Transcript",
  },
  language: "en",
} as const satisfies LocalizationSourceDictionary;

const UI_HELPER_TEXT_SOURCE_DICTIONARY = {
  category: "ui_helper_text",
  entries: {
    "settings.localization.description":
      "Choose UI languages and translation engines.",
    "settings.coreControls.description":
      "Restart the Harness AI core to trigger a fresh CLI detection cycle. Use this option after resolving CLI authentication or quota issues.",
    "settings.localization.category.artifacts.description":
      "Forms and final user-facing artifacts. Agent instructions and templates stay in English.",
    "settings.localization.category.messages.description":
      "Warnings, errors, hints, status updates, and other messages addressed to the user.",
    "settings.localization.category.reasoning.description":
      "Visible Thinking and Reasoning bubbles emitted by the provider during a turn. Hidden reasoning is never translated.",
    "settings.localization.category.uiHelperText.description":
      "Short interface explanations and helper copy that clarifies labels and settings.",
    "settings.localization.category.uiLabels.description":
      "Buttons, tabs, section names, step names, and short interface terms.",
    "settings.localization.glossary.description":
      "Keep protected terms, provider names, and product vocabulary stable during localization.",
    "settings.localization.glossary.prefilled":
      "File is prefilled with common terms such as: Project Manager, Description, CODEX_HOME, questionnaire.md.",
    "settings.localization.glossaryTerms.description":
      "Open the glossary file in VS Code and edit one English term per line. The file is created automatically on first open and starts with common product and workflow terms.",
    "settings.localization.workflowTerms":
      "`Workflow Terms` now follow `UI Labels`, and `Default Language (English)` is the reset state for every category.",
    "session.input.hint": "Press Enter to send, Shift+Enter for a new line",
    "session.input.placeholder": "Message the active provider.",
  },
  language: "en",
} as const satisfies LocalizationSourceDictionary;

const MESSAGES_FOR_THE_USER_SOURCE_DICTIONARY = {
  category: "messages_for_the_user",
  entries: {
    "core.bridge.unavailable": "Core runtime bridge is unavailable.",
    "provider.setup.needed": "Provider setup needed: {error}",
    "settings.coreControls.restarting": "Restarting...",
    "settings.localization.glossary.disabled":
      "Glossary protection is disabled. Terms may be translated.",
    "settings.localization.glossary.enabled":
      "Glossary protection is enabled. Terms from the glossary file remain protected during localization.",
    "session.empty": "Select or create a session.",
    "session.id.pending": "ID: pending...",
    "session.id.unavailable": "ID: unavailable",
    "session.input.wait": "Agent is working... Please wait.",
    "session.noMessages": "No messages yet.",
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
