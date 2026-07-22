# Profile Studio Creator Profile Module

## Responsibility

Loads the settings-selected Profile Creator Agent profile from the
HARNESS_AI_HOME-aware `ProfileStudio/CreatorAgents/<Provider>` directory. The
first supported provider is Codex and maps to `CreatorAgents/Codex`.

The module requires four readable components: `system-prompt.md`,
`custom-instructions.md`, `tools.json` and `initial-user-message.md`. It
validates non-empty prompt parts, a non-empty array of named declarative tool
objects and the exact Core-owned initial-message placeholders. There is no
inline, workspace-instruction or default-file fallback.

Base system prompt composition is the Native foundation, one blank line and
the stable custom instructions. For a concrete Creator Session,
`composeEffectiveSystemPrompt()` appends a Core-generated custom directive
that names the current Settings communication language and requires every
interview question, explanation, summary and approval request to use it even
when the static instructions and first assignment are English. Initial
assignment rendering uses only values supplied by Core after Capture
validation and rejects unknown or unresolved placeholders.

## Public Facade

`ProfileStudioCreatorProfileFacade`

## Inputs

- Selected Creator Agent provider id (`codex` in the first catalog).
- Core-resolved user communication language.
- Core-owned initial assignment values.
- HARNESS_AI_HOME-aware user-space profile components.

## Outputs

- Validated `ProfileStudioCreatorProfile`, dynamically localized effective
  prompt and declarative tool inventory.
- Rendered first user-role assignment.
- Structured errors for missing, empty or malformed components/templates.

## Owned Paths

- `module.md`
- `src/**`
