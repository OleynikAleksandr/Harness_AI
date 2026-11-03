# Workflow Platform Module

## Responsibility

OS-neutral foundation of the Workflow Kit on macOS, Windows and Linux:
- canonical POSIX relative paths and safe resolution inside a project root;
- case-aware path comparison;
- atomic file writes, with retry on Windows sharing violations;
- exclusive operation locks that reclaim stale owners.

## Public Facade

`WorkflowPlatformFacade` (class, singleton `workflowPlatformFacade`). The
constructor takes a `WorkflowPlatform` (`darwin`, `linux`, `win32`) so tests
can simulate other operating systems.

## Contract

- `normalizeRelative(path)` returns the canonical form: forward slashes, no
  leading `./`, no trailing slash. It throws `WorkflowPathError`
  (`UNSAFE_PATH`) for absolute paths, drive letters, empty segments, `.` and
  `..`.
- `resolveInside(root, rel)` and `relativeFromRoot(root, abs)` convert
  between the canonical form and OS paths. Both refuse anything outside the
  root.
- `samePath(a, b)` ignores case on `win32` and `darwin`. `isWithin(rel,
  prefix)` checks prefixes by path segments.
- `writeFileAtomic(path, data, {mode})` writes to a temporary sibling and
  renames it into place. On Windows it retries up to 5 times on `EPERM`,
  `EBUSY` and `EACCES`.
- `withLock(lockPath, fn, {staleMs})` creates the lock with `wx` and records
  the pid and time. It throws `WorkflowLockError` (`LOCKED`) while a live
  owner holds the lock. A lock is reclaimed if its owner process is gone or
  it is older than 10 minutes.

## Test Support

`src/workflow-test-build.mjs` is shared by the tests of every
project-workflow module. It is not used by production code.

## Owned Paths

- `module.md`
- `src/**`
