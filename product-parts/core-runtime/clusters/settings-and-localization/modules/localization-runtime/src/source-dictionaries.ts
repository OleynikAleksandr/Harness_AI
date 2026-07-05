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
    "settings.localization.rebuildTranslations": "Rebuild translations",
    "settings.localization.reasoningEngine": "Reasoning Translation Engine",
    "settings.localization.uiEngine": "UI Translation Engine",
    "settings.openRouter.modelSlugSearch": "Model slug search",
    "settings.openRouter.searchRefresh": "Refresh model matches",
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
    "settings.provider.glmClient.apiKey": "Z.ai Coding Plan API Key",
    "settings.provider.glmClient.defaultModel": "GLM Default model",
    "settings.provider.apiKey": "API Key",
    "settings.provider.baseUrl": "Base URL",
    "settings.provider.defaultModel": "Default Model",
    "settings.provider.kimi.defaultModel": "Kimi Default model",
    "settings.provider.kimiClient.apiKey": "Kimi For Coding API Key",
    "settings.provider.localModels": "Local Models",
    "settings.provider.localModelsClient.connection": "Local Models Server",
    "settings.provider.localModelsClient.contextLength": "Context Length",
    "settings.provider.localModelsClient.contextLength.apply": "Apply Context",
    "settings.provider.localModelsClient.maxContext": "max",
    "settings.provider.localModelsClient.loadedContext": "loaded",
    "settings.provider.localModelsClient.tools": "tools",
    "settings.provider.openRouter": "OpenRouter",
    "settings.provider.sessionContinuity.threshold":
      "Remaining context threshold (%)",
    "settings.nativeCapture.title": "Native Request Capture",
    "settings.nativeCapture.provider": "Provider",
    "settings.nativeCapture.model": "Model",
    "settings.nativeCapture.capture": "Capture",
    "settings.nativeCapture.markdownPath": "Markdown artifact",
    "settings.nativeCapture.jsonlPath": "JSONL artifact",
    "settings.profileCreator.title": "Session Profiles",
    "settings.profileCreator.newProfile": "New Profile",
    "settings.profileCreator.type": "Profile type",
    "settings.profileCreator.type.universal":
      "Universal (all supported providers)",
    "settings.profileCreator.type.individual": "Individual (one provider)",
    "settings.profileCreator.provider": "Provider",
    "settings.profileCreator.name": "Profile name",
    "settings.profileCreator.create": "Create",
    "settings.profileCreator.profiles": "Profiles",
    "settings.profileCreator.kind.universal": "Universal",
    "settings.profileCreator.kind.individual": "Individual",
    "settings.profileCreator.valid": "Valid",
    "settings.profileCreator.invalid": "Invalid",
    "settings.profileCreator.edit": "Edit in VS Code",
    "settings.thinking.reasoningInDialog": "Reasoning in dialog",
    "settings.tab.claude": "Claude",
    "settings.tab.codex": "Codex",
    "settings.tab.general": "General",
    "settings.tab.glmNative": "GLM",
    "settings.tab.kimi": "Kimi",
    "settings.tab.localModels": "Local Models",
    "settings.tab.openRouter": "OpenRouter",
    "settings.tab.profileCreator": "Profile Creator",
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
    "settings.nativeCapture.description":
      "Capture a provider's native request locally for reference. Runs a diagnostic probe through a capture-and-abort proxy, records the vendor-default system prompt and tools, and never sends the request upstream. Diagnostic dev tool.",
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
      "Visible Thinking and Reasoning messages emitted by the provider during a turn. Hidden reasoning is never translated.",
    "settings.localization.category.uiHelperText.description":
      "Short interface explanations and helper copy that clarifies labels and settings.",
    "settings.localization.category.uiLabels.description":
      "Buttons, tabs, section names, step names, and short interface terms.",
    "settings.localization.glossary.description":
      "Keep protected terms, provider names, and product vocabulary stable during localization.",
    "settings.localization.glossary.prefilled":
      "File is prefilled with do-not-translate terms such as: Harness AI, CodeAI Hub, Project Manager, Claude, plus translation examples such as: Pull Request - Пул-реквест.",
    "settings.localization.glossaryTerms.description":
      'Open the glossary file in VS Code. Write a term alone on a line to keep it untranslated, for example: Harness AI. Write "Term - Desired translation" to control exactly how a term is translated instead, for example: Pull Request - Пул-реквест. The file is created automatically on first open and starts with a few examples of both.',
    "settings.localization.workflowTerms":
      "`Workflow Terms` now follow `UI Labels`, and `Default Language (English)` is the reset state for every category.",
    "settings.provider.claude.defaultModel.description":
      "Choose the Claude alias used when new sessions start. Each model stores its own thinking level.",
    "settings.provider.claude.model.haiku.description":
      "Fastest alias for quick answers and prototyping.",
    "settings.provider.claude.model.opus.description":
      "Most powerful option for complex agentic workloads.",
    "settings.provider.claude.model.sonnet.description":
      "Best fit for everyday tasks.",
    "settings.provider.claude.newSessions.note":
      "Applies only to newly created Claude sessions.",
    "settings.provider.claude.thinking.dialog.description":
      "Show Claude reasoning as a normal assistant message with a Thinking label.",
    "settings.provider.claude.thinking.enabled.description":
      "When enabled, Claude can use its adaptive thinking path for complex requests.",
    "settings.provider.versions.autoUpdate.description":
      "Automatically check and update the CLI and SDK when the Core starts. Manual updates are available below.",
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
    "settings.provider.kimiClient.description":
      "Runs Kimi Code on the Harness universal client with a subscription API key. Nothing is downloaded or installed.",
    "settings.provider.kimiClient.apiKey.description":
      "Paste a Kimi For Coding API key from the Kimi Code Console at kimi.com. A Kimi Code subscription allows up to 5 keys; each key is shown only once when created.",
    "settings.provider.sessionContinuity.description":
      "When the remaining context window drops to or below this percentage, Harness AI can automatically wrap up the current session and start a new one. Default: 30%.",
    "settings.provider.glmClient.defaultModel.description":
      "Choose the GLM model used by the universal client when new sessions start.",
    "settings.provider.glmClient.description":
      "Runs GLM on the Harness universal client with a Z.ai Coding Plan subscription key. Nothing is downloaded or installed.",
    "settings.provider.glmClient.apiKey.description":
      "Paste the Z.ai Coding Plan API key used for GLM coding access. Harness stores it in Core settings for the universal client and also accepts GLM_API_KEY or ZAI_API_KEY from the environment.",
    "settings.provider.glmClient.model.glm-4.6.description":
      "GLM 4.6 coding model on the Z.ai endpoint.",
    "settings.provider.glmClient.model.glm-4.7.description":
      "GLM 4.7 coding model on the Z.ai endpoint.",
    "settings.provider.glmClient.model.glm-5-turbo.description":
      "Lower-latency GLM coding model.",
    "settings.provider.glmClient.model.glm-5.1.description":
      "Previous-generation GLM coding model for compatibility checks.",
    "settings.provider.glmClient.model.glm-5.2.description":
      "Default GLM coding model for the Z.ai Coding Plan endpoint.",
    "settings.provider.localModels.description":
      "Select the default local model used for new Local Models sessions.",
    "settings.provider.localModelsClient.contextLength.applying":
      "Reloading...",
    "settings.provider.localModelsClient.description":
      "Runs local OpenAI-compatible servers (Ollama, LM Studio, llama.cpp) on the Harness universal client. Nothing is downloaded or installed.",
    "settings.provider.localModelsClient.baseUrl.description":
      "Base URL of the local OpenAI-compatible server — the server root (http://127.0.0.1:1234) or its /v1 prefix; both are accepted. Harness also reads HARNESS_AI_LOCAL_MODELS_BASE_URL or LMSTUDIO_BASE_URL from the environment.",
    "settings.provider.localModelsClient.contextLength.description":
      "Per-model context window in tokens, applied by reloading the model in LM Studio. 0 or empty keeps the server default.",
    "settings.provider.openRouter.description":
      "Uses OpenRouter chat completions with an exact model slug.",
    "settings.openRouter.defaultRouting.description": "default routing",
    "settings.openRouter.latency.description":
      "Tests this selected model against concrete provider endpoints.",
    "settings.provider.localModels.empty":
      "No local models are currently visible to Core. Start the local server and load a model.",
    "settings.profileCreator.description":
      "Session profiles define the workflow instructions and tooling categories a new session starts with. Profile documents live in ~/.harness-ai/Profiles and are plain files owned by you.",
    "settings.profileCreator.namePlaceholder": "e.g. Deep Review",
    "settings.profileCreator.applicability.universal":
      "All supported providers",
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
    "settings.nativeCapture.capturing": "Capturing...",
    "settings.nativeCapture.failed": "Capture failed: {error}",
    "settings.nativeCapture.done": "Capture complete. Artifacts written below.",
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
      "No local models are currently visible to Core. Start the local server and load a model.",
    "settings.localization.glossary.disabled":
      "Glossary protection is disabled. Terms may be translated.",
    "settings.localization.glossary.enabled":
      "Glossary protection is enabled. Terms from the glossary file remain protected during localization.",
    "settings.localization.rebuilding": "Rebuilding translations...",
    "settings.localization.rebuilt": "Translations rebuilt.",
    "settings.localization.refreshing.description":
      "Harness AI is saving translated interface resources. Settings will be available again when this finishes.",
    "settings.localization.refreshing.title": "Updating localization",
    "settings.provider.versions.warning":
      "Warning: updating is at your own risk. New versions may be incompatible. Updating will close active sessions.",
    "settings.profileCreator.created": "Profile created and opened in VS Code:",
    "settings.profileCreator.creating": "Creating...",
    "settings.profileCreator.loading": "Loading profiles...",
    "settings.profileCreator.empty":
      "No profiles yet. Create one with New Profile above.",
    "settings.profileCreator.opening": "Opening...",
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
