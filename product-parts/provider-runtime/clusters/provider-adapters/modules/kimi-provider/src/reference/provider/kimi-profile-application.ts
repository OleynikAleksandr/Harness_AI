import type { ProviderSessionStartOptions } from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";

/**
 * Kimi profile application layer (docs/architecture/SessionProfiles.md):
 * managed session profiles are DEFERRED for Kimi — verification (2026-07-02)
 * found no provable channel binding the materialized agent.yaml to the
 * spawned CLI, and a profile that provably does not reach the model would be
 * a silent substitution. The catalog already excludes kimi from managed
 * support; this guard keeps a future catalog/adapter mismatch loud instead
 * of silent. Native/legacy sessions keep today's behavior (the materialized
 * managed agent) untouched. The follow-up stage must first verify a real
 * binding channel, then land immutable content-hash-keyed per-profile
 * artifacts.
 */
export function rejectManagedKimiProfile(
  startOptions?: ProviderSessionStartOptions
): void {
  if (startOptions?.profileKind === "managed") {
    throw new Error(
      "Kimi does not support managed session profiles yet: the managed agent binding is unverified. Start the session with the Native profile."
    );
  }
}
