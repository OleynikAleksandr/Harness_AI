# Browser Localization Cluster

## Boundary

Owns renderer-local access to Core-provided localization runtime payloads.

## Owned Modules

- `browser-localization-provider`

## Facade Rule

Browser UI resolves display copy through the shared localization provider
facade. It does not derive localization policy or translation truth locally.
