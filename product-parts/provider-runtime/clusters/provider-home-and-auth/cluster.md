# Provider Home And Auth Cluster

## Boundary

Owns isolated provider homes, API key/auth references, and ignored runtime files.
Because agent processes run with `HOME` set to a provider home,
`provider-home-manager` also gives them `GIT_CONFIG_GLOBAL` pointing at the
real `~/.gitconfig` (`withRealGitConfig`).

## Owned Modules

- `provider-home-manager`
- `provider-auth-store`

`provider-runtime-files` was scaffolded as a `module.md`-only placeholder early
in the project and never implemented; it was removed from the product tree
(2026-07-01) rather than kept as unimplemented debt. Isolating provider
runtime caches/logs inside each provider home is covered by
`provider-home-manager`'s home layout ownership. Re-add a dedicated module here
if that responsibility is split out again.

## Facade Rule

Tracked workspace files never store provider secrets or runtime residue.
