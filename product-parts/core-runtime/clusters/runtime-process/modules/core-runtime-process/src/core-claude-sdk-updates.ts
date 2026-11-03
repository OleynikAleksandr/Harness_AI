// Provider install update policy shared by the Settings update buttons and
// the auto-update toggles. Claude runs like Codex on one shared install (the
// global npm Claude Agent SDK); a Claude SDK update installs it and then
// re-reads the model catalog, so the Settings labels follow the new SDK at
// once. Dependencies are injected so the policy stays testable.

export interface ClaudeSdkUpdateSteps {
  readonly refreshCatalog: () => Promise<unknown>;
  readonly update: () => Promise<unknown>;
}

export type AutoUpdateProviderId = "claude" | "codex";
export type AutoUpdateTarget = "cli" | "sdk";

export interface ProviderInstallStatus {
  // Versions of every install the target covers; `null` = not installed.
  readonly installedVersions: readonly (string | null)[];
  readonly latestVersion: string | null;
  readonly provider: AutoUpdateProviderId;
  readonly target: AutoUpdateTarget;
}

// The catalog is re-read even when the install fails (a partial npm run may
// still have changed the SDK); the failure is reported afterwards.
export async function updateClaudeSdkInstall(
  steps: ClaudeSdkUpdateSteps
): Promise<void> {
  let failure: unknown = null;
  try {
    await steps.update();
  } catch (error) {
    failure = error;
  }
  await steps.refreshCatalog();
  if (failure !== null) {
    throw failure;
  }
}

// Outdated = the registry publishes a version and an existing install has a
// different one. Missing installs are left alone (auto-update never installs
// something the user did not install).
export function isInstallOutdated(status: ProviderInstallStatus): boolean {
  const latest = status.latestVersion;
  return (
    Boolean(latest) &&
    status.installedVersions.some(
      (version) => version !== null && version !== latest
    )
  );
}

// Auto-update on Core start: for each provider whose toggle is on, update
// every outdated target one after another; a failed target does not stop
// the others. Returns the updated `provider:target` keys.
export async function autoUpdateProviderInstalls(options: {
  readonly enabled: ReadonlySet<AutoUpdateProviderId>;
  readonly statuses: readonly ProviderInstallStatus[];
  readonly update: (
    provider: AutoUpdateProviderId,
    target: AutoUpdateTarget
  ) => Promise<unknown>;
}): Promise<string[]> {
  const updated: string[] = [];
  for (const status of options.statuses) {
    if (!(options.enabled.has(status.provider) && isInstallOutdated(status))) {
      continue;
    }
    try {
      await options.update(status.provider, status.target);
      updated.push(`${status.provider}:${status.target}`);
    } catch {
      // The installed version stays; the next Core start retries.
    }
  }
  return updated;
}
