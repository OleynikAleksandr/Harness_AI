# CodeAI Settings Layout Packaged App Rebuild - 2026-06-26

## Problem

The source Settings surface had been updated in `ad3e077`, but the delivered
unsigned macOS app was still the old artifact from 19:53. The user screenshot
showed the old vertical Settings sidebar, range slider, `Reset Workspace`, and
icon-only footer actions.

## Rebuild

```text
npm run package:mac
OK: build, runtime TypeScript, Vite renderer build, electron-builder mac dir.
```

Updated artifact:

```text
release/mac-arm64/Harness AI.app
timestamp: Jun 26 20:50:32 2026
```

## Relaunch Check

The old process was still running from before the rebuild:

```text
old process start: Fri Jun 26 20:48:51 2026
rebuilt app.asar:  Jun 26 20:50:32 2026
```

The app was quit and reopened from the same path:

```text
/Users/oleksandroliinyk/VSCODE/harness-ai/release/mac-arm64/Harness AI.app
new process start: Fri Jun 26 20:51:49 2026
```

## Packaged Renderer Check

`app.asar` was extracted to `/tmp/harness-ai-app-asar` and the renderer bundle
was checked.

Present in packaged renderer:

```text
Reset to Defaults
Save Changes
Choose the default model used for new sessions.
Remaining context threshold (%)
```

Not present as old visible UI copy in packaged renderer:

```text
Reset Workspace
Session Continuity:
Harness AI</span>
```
