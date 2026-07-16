import type { ProviderEventListener } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";

export class GrokSessionEventRouter {
  readonly #listeners = new Map<string, Set<ProviderEventListener>>();
  readonly #pending = new Map<string, unknown[]>();

  clearAll(): void {
    this.#listeners.clear();
    this.#pending.clear();
  }

  clearSession(providerSessionId: string): void {
    this.#listeners.delete(providerSessionId);
    this.#pending.delete(providerSessionId);
  }

  dispatch(providerSessionId: string, event: unknown): void {
    const listeners = this.#listenersFor(providerSessionId);
    if (listeners.size === 0) {
      const pending = this.#pending.get(providerSessionId) ?? [];
      pending.push(event);
      this.#pending.set(providerSessionId, pending);
      return;
    }
    for (const listener of listeners) {
      listener(event);
    }
  }

  ensureSession(providerSessionId: string): void {
    this.#listenersFor(providerSessionId);
  }

  subscribe(
    providerSessionId: string,
    listener: ProviderEventListener
  ): () => void {
    const listeners = this.#listenersFor(providerSessionId);
    listeners.add(listener);
    for (const event of this.#pending.get(providerSessionId)?.splice(0) ?? []) {
      listener(event);
    }
    return () => listeners.delete(listener);
  }

  #listenersFor(providerSessionId: string): Set<ProviderEventListener> {
    let listeners = this.#listeners.get(providerSessionId);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(providerSessionId, listeners);
    }
    return listeners;
  }
}
