import type { LocalizationSourceDictionary } from "./source-dictionary-registry.js";

const UI_LABELS_SOURCE_DICTIONARY = {
  category: "ui_labels",
  entries: {
    "settings.title": "Settings",
    "settings.closeSettings": "Close Settings",
    "settings.general": "General",
    "settings.loading": "Loading settings...",
    "settings.resetDefaults": "Reset to Defaults",
    "settings.saveChanges": "Save Changes",
    "settings.sections": "Settings sections",
    "settings.coreControls": "App Controls",
    "settings.coreControls.restart": "Restart App",
    "settings.coreControls.restartStatus": "Restart app status",
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
    "settings.openRouter.modelSlugSearch": "Model slug search",
    "settings.openRouter.endpoint": "Endpoint",
    "settings.openRouter.endpointAutomatic": "OpenRouter - automatic",
    "settings.openRouter.latency": "OpenRouter Endpoint Latency",
    "settings.openRouter.latency.test": "Test latency",
    "settings.openRouter.profiles": "OpenRouter Profiles",
    "settings.openRouter.reasoningTranslationModel":
      "Reasoning Translation Model",
    "settings.openRouter.uiTranslationModel": "UI Translation Model",
    "settings.provider.claude.sessionContinuity": "Claude Session Continuity",
    "settings.provider.codex.sessionContinuity": "Codex Session Continuity",
    "settings.provider.glm": "GLM",
    "settings.provider.glm.defaultModel": "GLM Default model",
    "settings.provider.apiKey": "API Key",
    "settings.provider.baseUrl": "Base URL",
    "settings.provider.defaultModel": "Default Model",
    "settings.provider.kimi.defaultModel": "Kimi Default model",
    "settings.provider.localModels": "Local Models",
    "settings.provider.openCode": "OpenCode",
    "settings.provider.openCode.config": "Config",
    "settings.provider.openCode.defaultModel": "Default model",
    "settings.provider.openCode.optionalApiKey": "Optional Z.AI API key",
    "settings.provider.openRouter": "OpenRouter",
    "settings.provider.sessionContinuity.threshold":
      "Remaining context threshold (%)",
    "settings.thinking.reasoningInDialog": "Reasoning in dialog",
    "settings.tab.claude": "Claude",
    "settings.tab.codex": "Codex",
    "settings.tab.general": "General",
    "settings.tab.glmNative": "GLM",
    "settings.tab.glmOpenCode": "OpenCode",
    "settings.tab.kimi": "Kimi",
    "settings.tab.localModels": "Local Models",
    "settings.tab.openRouter": "OpenRouter",
    "settings.thinking": "Thinking",
    "settings.thinking.displaySync": "Thinking Display Sync",
    "settings.thinking.enabled": "Thinking Enabled",
    "language.de": "German (de)",
    "language.en": "Default Language (English)",
    "language.es": "Spanish (es)",
    "language.fr": "French (fr)",
    "language.ru": "Russian (ru)",
    "language.uk": "Ukrainian (uk)",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "sidebar.addWorkspace": "Add Workspace",
    "sidebar.detachSession": "Detach session",
    "sidebar.nextSessionMode": "Next Session Mode",
    "sidebar.sessions": "Sessions",
    "sidebar.startNewSession": "Start New Session",
    "sidebar.workspaceMenu": "Workspace menu",
    "sidebar.workspaceSessions": "Workspace sessions",
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
      "Restart the Harness AI app. The current app closes and relaunches, so the Electron host and Core runtime both reload from disk.",
    "settings.coreControls.restartStatus.ready":
      "App restart status will appear here.",
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
    "settings.provider.claude.defaultModel.description":
      "Choose the Claude alias used when new sessions start. Each model stores its own thinking level.",
    "settings.provider.claude.model.haiku.description":
      "Fastest alias for quick answers and prototyping.",
    "settings.provider.claude.model.opus.description":
      "Most powerful option for complex agentic workloads.",
    "settings.provider.claude.model.sonnet.description":
      "Best fit for everyday tasks (claude-sonnet-4-5-20250929).",
    "settings.provider.claude.newSessions.note":
      "Applies only to newly created Claude sessions.",
    "settings.provider.claude.thinking.dialog.description":
      "Show Claude reasoning as a normal assistant bubble with a Thinking label.",
    "settings.provider.claude.thinking.enabled.description":
      "When enabled, Claude can use its adaptive thinking path for complex requests.",
    "settings.provider.codex.defaultModel.description":
      "Select which Codex model to use when starting new sessions. Each model stores its own reasoning effort level.",
    "settings.provider.codex.model.gpt-5.2.description":
      "Optimized for professional work and long-running agents",
    "settings.provider.codex.model.gpt-5.3-codex-spark.description":
      "Ultra-fast coding model for lower-latency engineering tasks",
    "settings.provider.codex.model.gpt-5.4-mini.description":
      "Smaller GPT-5.4 variant for faster everyday coding tasks",
    "settings.provider.codex.model.gpt-5.4.description":
      "Best general agentic model for tasks across industries",
    "settings.provider.codex.model.gpt-5.5.description":
      "Best general agentic model for tasks across industries",
    "settings.provider.codex.newSessions.note":
      "Changes apply when creating a new Codex session.",
    "settings.provider.codex.reasoningSummary.description":
      "Show Codex reasoning summaries in the dialog when the model provides them.",
    "settings.provider.kimi.defaultModel.description":
      "Choose the Kimi model used when new sessions start.",
    "settings.provider.kimi.defaultModel.note":
      "Uses the installed Kimi Code CLI through ACP.",
    "settings.provider.kimi.model.kimi-k2.7-code.description":
      "Kimi K2.7 Code model exposed through Kimi Code ACP.",
    "settings.provider.kimi.model.kimi-k2.7-code-highspeed.description":
      "Lower-latency Kimi K2.7 coding model exposed through ACP.",
    "settings.provider.sessionContinuity.description":
      "When the remaining context window drops to or below this percentage, Harness AI can automatically wrap up the current session and start a new one. Default: 30%.",
    "settings.provider.glm.defaultModel.description":
      "Choose the GLM model used when new sessions start.",
    "settings.provider.localModels.description":
      "Select the default LM Studio model used for new Local Models sessions.",
    "settings.provider.openCode.description":
      "Runs models already configured in OpenCode. Tested selectors: zai-coding-plan/glm-5.2 and kimi-for-coding/k2p7.",
    "settings.provider.openCode.auth.placeholder":
      "Optional; OpenCode auth is used first",
    "settings.provider.openCode.home.note":
      "Uses isolated home at .harness/runtime/providers/glm-opencode/home.",
    "settings.provider.openCode.defaultModel.description": "Default model",
    "settings.provider.openCode.model.glm-5.2.description":
      "Z.AI Coding Plan selector",
    "settings.provider.openCode.model.kimi-for-coding/k2p7.description":
      "Kimi for Coding selector",
    "settings.provider.openCode.reasoning.dialog.description":
      "Show OpenCode reasoning as a normal assistant bubble in the dialog.",
    "settings.provider.openRouter.description":
      "Uses OpenRouter chat completions with an exact model slug.",
    "settings.openRouter.defaultRouting.description": "default routing",
    "settings.openRouter.latency.description":
      "Tests this selected model against concrete provider endpoints.",
    "settings.provider.localModels.empty":
      "No downloaded LM Studio models are currently visible to Core.",
    "session.input.hint": "Press Enter to send, Shift+Enter for a new line",
    "session.input.placeholder": "Message the active provider.",
    "sidebar.nextSessionMode.description": "Next session starts as Native Raw",
  },
  language: "en",
} as const satisfies LocalizationSourceDictionary;

const MESSAGES_FOR_THE_USER_SOURCE_DICTIONARY = {
  category: "messages_for_the_user",
  entries: {
    "core.bridge.unavailable": "Core runtime bridge is unavailable.",
    "provider.setup.needed": "Provider setup needed: {error}",
    "settings.coreControls.restarting": "Restarting app...",
    "settings.resetting": "Resetting...",
    "settings.saving": "Saving...",
    "settings.openRouter.endpoints.loading": "Loading endpoints...",
    "settings.openRouter.apiKeyRequired": "OpenRouter API key is required.",
    "settings.openRouter.latency.noTargets":
      "No OpenRouter endpoints are available for this model.",
    "settings.openRouter.latency.testing": "Testing...",
    "settings.openRouter.models.searching": "Searching...",
    "settings.provider.localModels.empty":
      "No downloaded LM Studio models are currently visible to Core.",
    "settings.localization.glossary.disabled":
      "Glossary protection is disabled. Terms may be translated.",
    "settings.localization.glossary.enabled":
      "Glossary protection is enabled. Terms from the glossary file remain protected during localization.",
    "settings.localization.refreshing.description":
      "Harness AI is saving translated interface resources. Settings will be available again when this finishes.",
    "settings.localization.refreshing.title": "Updating localization",
    "session.empty": "Select or create a session.",
    "session.id.pending": "ID: pending...",
    "session.id.unavailable": "ID: unavailable",
    "session.input.wait": "Agent is working... Please wait.",
    "session.noMessages": "No messages yet.",
    "sidebar.deleteConfirm": "Delete session?",
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
