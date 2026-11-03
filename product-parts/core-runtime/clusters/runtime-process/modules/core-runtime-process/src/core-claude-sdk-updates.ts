// Provider install update policy shared by the Settings update buttons and
// the auto-update toggles. Claude has two SDK installs: the Harness copy the
// sessions and the live model catalog run on, and the user's global npm
// SDK; one Claude SDK update refreshes both and then re-reads the model
// catalog, so the Settings labels follow the new SDK at once. Dependencies
// are injected so the policy stays testable.

export interface ClaudeSdkUpdateSteps {
  readonly refreshCatalog: () => Promise<unknown>;
  readonly updateGlobal: () => Promise<unknown>;
  readonly updateHarness: () => Promise<unknown>;
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

// Both installs are attempted even when one fails; the catalog is re-read
// either way and the first failure is reported afterwards.
export async function updateClaudeSdkInstalls(
  steps: ClaudeSdkUpdateSteps
): Promise<void> {
  const failures: unknown[] = [];
  for (const update of [steps.updateHarness, steps.updateGlobal]) {
    try {
      await update();
    } catch (error) {
      failures.push(error);
    }
  }
  await steps.refreshCatalog();
  if (failures.length > 0) {
    throw failures[0];
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
