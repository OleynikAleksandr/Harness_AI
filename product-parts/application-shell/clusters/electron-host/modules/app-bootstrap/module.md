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
- Preload bridge methods for Core-owned localization runtime payloads.
- Renderer-safe shell bridge method for full Electron app relaunch. The
  relaunch path schedules `app.relaunch(...)` and exits the current host so the
  next process reloads the packaged `app.asar` from disk.

## Owned Paths

- `module.md`
- `src/**`
