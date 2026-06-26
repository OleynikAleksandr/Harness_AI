# Provider Home And Auth Cluster

## Boundary

Owns isolated provider homes, API key/auth references, and ignored runtime files.

## Owned Modules

- `provider-home-manager`
- `provider-auth-store`
- `provider-runtime-files`

## Facade Rule

Tracked workspace files never store provider secrets or runtime residue.
