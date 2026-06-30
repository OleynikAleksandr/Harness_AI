# App Bootstrap Module

## Responsibility

Own Electron lifecycle, window creation, and local application startup.

## Public Facade

`AppBootstrapFacade`

## Inputs

- App launch options.
- Core process bridge facade.

## Outputs

- Running Electron main window.
- Renderer preload/bootstrap state.
- Preload bridge methods for Core-owned localization runtime payloads and
  Core-owned dynamic text translation.
- Renderer-safe shell bridge method for full Electron app relaunch. The
  relaunch path first stops the supervised Core process through the Core Process
  Bridge, then schedules `app.relaunch(...)` and exits the current host so the
  next process reloads the packaged `app.asar` and starts a fresh Core runtime
  from disk.

## Owned Paths

- `module.md`
- `src/**`
