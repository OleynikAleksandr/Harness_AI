# Browser Localization Provider Module

## Responsibility

Own the shared renderer localization provider and `t(category, messageId,
fallback)` lookup boundary.

## Public Facade

`BrowserLocalizationProvider`

## Inputs

- Core-owned localization runtime payload.
- Stable localization category and message id.
- Bootstrap fallback string.

## Outputs

- Localized or fallback display string.

## Owned Paths

- `module.md`
- `src/**`
