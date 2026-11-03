import {
  buildManifest,
  buildPayload,
  KIT_VERSION,
  type KitManifest,
  MANIFEST_PATH,
  type PayloadEntry,
  type PayloadOptions,
  renderManifest,
} from "./installer-payload.js";
import { agentRules } from "./installer-texts.js";

export type {
  EntryKind,
  KitManifest,
  ManifestFile,
  PayloadEntry,
  PayloadOptions,
} from "./installer-payload.js";

/**
 * Public facade of the workflow-installer module: the installation payload,
 * folder inspection, install and update, the project doctor and the
 * migration of legacy Harness plans.
 */
export class WorkflowInstallerFacade {
  readonly version = KIT_VERSION;
  readonly manifestPath = MANIFEST_PATH;

  /** Every file the Kit writes into a project, with its writing rule. */
  payload(options: PayloadOptions): PayloadEntry[] {
    return buildPayload(options);
  }

  manifest(entries: PayloadEntry[]): KitManifest {
    return buildManifest(entries);
  }

  renderManifest(manifest: KitManifest): string {
    return renderManifest(manifest);
  }

  /** The English agent rules of the managed AGENTS.md section. */
  agentRules(): string {
    return agentRules();
  }
}

export const workflowInstallerFacade = new WorkflowInstallerFacade();
