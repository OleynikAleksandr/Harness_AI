import {
  ensure,
  WorkflowError,
} from "../../workflow-platform/src/workflow-platform-facade.js";
import type { GitRunner } from "./git-runner.js";

export interface GitIdentity {
  email: string;
  name: string;
}

export type IdentityScope = "global" | "local";

export interface ResolvedIdentity extends GitIdentity {
  source: IdentityScope;
}

const PLACEHOLDER_NAMES = new Set(["your name", "ваше имя"]);
const PLACEHOLDER_EMAILS = new Set(["you@example.com"]);
const PLACEHOLDER_DOMAINS = new Set(["example", "invalid", "localhost"]);

const FIX_COMMANDS =
  'Run once: `git config --global user.name "Your Real Name"` and `git config --global user.email "you@your-domain"`; then `scripts/workflow doctor --fix` applies it to the project.';

function isPlaceholderDomain(domain: string): boolean {
  return (
    domain === "" ||
    PLACEHOLDER_DOMAINS.has(domain) ||
    domain.startsWith("example.") ||
    domain.endsWith(".invalid")
  );
}

/** True for empty, sample or reserved identities that must never sign commits. */
export function isPlaceholderIdentity(identity: GitIdentity): boolean {
  const name = identity.name.trim().toLowerCase();
  const email = identity.email.trim().toLowerCase();
  if (name === "" || email === "" || PLACEHOLDER_NAMES.has(name)) {
    return true;
  }
  if (PLACEHOLDER_EMAILS.has(email)) {
    return true;
  }
  const at = email.lastIndexOf("@");
  return at < 0 || isPlaceholderDomain(email.slice(at + 1));
}

/** Identity stored in one config file only (`--local` or `--global`); null when incomplete. */
export function readScopedIdentity(
  git: GitRunner,
  root: string,
  scope: IdentityScope
): GitIdentity | null {
  const value = (key: string) =>
    git
      .run(root, ["config", `--${scope}`, "--get", key], { allowFailure: true })
      .stdout.trim();
  const name = value("user.name");
  const email = value("user.email");
  return name && email ? { email, name } : null;
}

/** The repository-local identity, else the global one; placeholders are skipped. */
export function resolveIdentity(
  git: GitRunner,
  root: string
): ResolvedIdentity | null {
  for (const source of ["local", "global"] as const) {
    const identity = readScopedIdentity(git, root, source);
    if (identity && !isPlaceholderIdentity(identity)) {
      return { ...identity, source };
    }
  }
  return null;
}

/** Writes a real identity into the repository-local config. */
export function writeLocalIdentity(
  git: GitRunner,
  root: string,
  identity: GitIdentity
): void {
  ensure(
    !isPlaceholderIdentity(identity),
    "GIT_IDENTITY_PLACEHOLDER",
    `"${identity.name} <${identity.email}>" is a placeholder git identity.`,
    {},
    FIX_COMMANDS
  );
  git.run(root, ["config", "--local", "user.name", identity.name.trim()]);
  git.run(root, ["config", "--local", "user.email", identity.email.trim()]);
}

/**
 * The repository-local identity every Kit commit is signed with; fails with
 * GIT_IDENTITY_REQUIRED when it is missing or a placeholder.
 */
export function requireCommitIdentity(
  git: GitRunner,
  root: string
): GitIdentity {
  const identity = readScopedIdentity(git, root, "local");
  if (identity && !isPlaceholderIdentity(identity)) {
    return identity;
  }
  throw new WorkflowError(
    "GIT_IDENTITY_REQUIRED",
    `Kit commits need a real git identity in the repository config; ${identity ? "the configured one is a placeholder" : "none is set"}. ${FIX_COMMANDS}`,
    { placeholder: identity !== null },
    FIX_COMMANDS
  );
}

/** `-c` arguments that pass an identity to one git command explicitly. */
/**
 * Author and committer variables for a Kit commit. Git exports
 * `GIT_AUTHOR_*` to hooks and they win over `-c user.*`, so a Kit commit made
 * from inside another commit's hook would otherwise inherit that author.
 */
export function identityEnv(identity: GitIdentity): NodeJS.ProcessEnv {
  return {
    GIT_AUTHOR_EMAIL: identity.email,
    GIT_AUTHOR_NAME: identity.name,
    GIT_COMMITTER_EMAIL: identity.email,
    GIT_COMMITTER_NAME: identity.name,
  };
}

export function identityArgs(identity: GitIdentity): string[] {
  return [
    "-c",
    `user.name=${identity.name}`,
    "-c",
    `user.email=${identity.email}`,
  ];
}
