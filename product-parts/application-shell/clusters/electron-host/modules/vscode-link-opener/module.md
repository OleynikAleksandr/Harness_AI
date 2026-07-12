# VS Code Link Opener Module

## Responsibility

Open external links from the window-open route against an explicit protocol
allowlist: absolute workspace file links (`vscode://file/`) open in Visual
Studio Code, and web links (`https://`, `http://`) open in the default system
browser. Every other protocol is denied.

## Public Facade

`VsCodeLinkOpenerFacade`

## Inputs

- Absolute file path.
- Optional line and column.
- Window-open URL (file or web target).

## Outputs

- VS Code open result for `vscode://file/` targets.
- System-browser open result for `https://` / `http://` targets.
- `false` (deny) for every other protocol.
- User-visible failure state when the path cannot be opened.

## Owned Paths

- `module.md`
- `src/**`
