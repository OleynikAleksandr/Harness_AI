// Claude model labels follow the Harness-installed Claude Agent SDK: its
// bundled CLI decides what the `opus`/`sonnet`/`haiku` aliases mean and the
// `supportedModels()` descriptions. Updating that SDK (by hand or through
// the Claude auto-update toggle on Core start) is followed by a forced
// catalog re-read, so Settings shows the new models without waiting for the
// catalog TTL. Dependencies are injected so the policy stays testable.

export interface ClaudeSdkUpdateSteps {
  readonly refreshCatalog: () => Promise<unknown>;
  readonly update: () => Promise<unknown>;
}

export interface ClaudeSdkAutoUpdateSteps extends ClaudeSdkUpdateSteps {
  readonly enabled: boolean;
  readonly readCurrent: () => string | null;
  readonly readLatest: () => Promise<string | null>;
}

// Manual update: install, then re-read the catalog.
export async function updateClaudeSdkAndCatalog(
  steps: ClaudeSdkUpdateSteps
): Promise<void> {
  await steps.update();
  await steps.refreshCatalog();
}

// Auto-update on Core start: only when the toggle is on and the registry
// publishes a version other than the installed one (or none is installed).
// Returns whether an update ran.
export async function autoUpdateClaudeSdk(
  steps: ClaudeSdkAutoUpdateSteps
): Promise<boolean> {
  if (!steps.enabled) {
    return false;
  }
  const latest = await steps.readLatest();
  if (!latest || latest === steps.readCurrent()) {
    return false;
  }
  await updateClaudeSdkAndCatalog(steps);
  return true;
}
