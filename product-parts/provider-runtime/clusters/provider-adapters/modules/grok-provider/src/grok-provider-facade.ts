import type {
  GrokCliLocationOptions as GrokCliLocationOptionsInput,
  GrokCliProbe as GrokCliProbeResult,
} from "./grok-cli-locator.js";
import { locateGrokCli, probeGrokCli } from "./grok-cli-locator.js";

export class GrokProviderFacade {
  readonly #locationOptions: GrokCliLocationOptionsInput;

  constructor(options: GrokCliLocationOptionsInput = {}) {
    this.#locationOptions = options;
  }

  locateBinary(): Promise<string | null> {
    return locateGrokCli(this.#locationOptions);
  }

  probeReadiness(): Promise<GrokCliProbeResult> {
    return probeGrokCli(this.#locationOptions);
  }
}

export const grokProviderFacade = new GrokProviderFacade();

export type {
  GrokCliLocationOptions,
  GrokCliProbe,
} from "./grok-cli-locator.js";
