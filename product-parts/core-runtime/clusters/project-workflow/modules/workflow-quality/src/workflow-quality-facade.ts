import path from "node:path";
import {
  ensure,
  WorkflowError,
  workflowPlatformFacade,
} from "../../workflow-platform/src/workflow-platform-facade.js";
import {
  type CheckDefinition,
  type CheckInput,
  CONFIG_PATH,
  defaultConfig,
  normalizeCheck,
  validateCheck,
  validateConfig,
  type WorkflowConfig,
} from "./quality-config.js";
import {
  detectStacks,
  STACK_ORDER,
  type StackDetection,
  type StackId,
} from "./quality-detect.js";
import { proposeQuality, type QualityProposal } from "./quality-proposal.js";

export type {
  CheckDefinition,
  CheckInput,
  CheckRole,
  CheckStage,
  CommandSpec,
  DocsContract,
  WorkflowConfig,
} from "./quality-config.js";
export type { StackDetection, StackId } from "./quality-detect.js";
export type { ProposalEntry, QualityProposal } from "./quality-proposal.js";

/** Public facade of the workflow-quality module: configuration, detection and checks. */
export class WorkflowQualityFacade {
  readonly configPath = CONFIG_PATH;

  defaultConfig(): WorkflowConfig {
    return defaultConfig();
  }

  validateConfig(config: WorkflowConfig): WorkflowConfig {
    return validateConfig(config);
  }

  normalizeCheck(input: CheckInput): CheckDefinition {
    const check = normalizeCheck(input);
    validateCheck(check);
    return check;
  }

  configFile(root: string): string {
    return path.join(root, ...CONFIG_PATH.split("/"));
  }

  /** Reads the project configuration; a missing file means the default DISCOVERY profile. */
  readConfig(root: string): WorkflowConfig {
    const text = workflowPlatformFacade.readTextIfExists(this.configFile(root));
    if (text === null) {
      return defaultConfig();
    }
    let parsed: WorkflowConfig;
    try {
      parsed = JSON.parse(text) as WorkflowConfig;
    } catch (cause) {
      throw new WorkflowError(
        "CONFIG_JSON",
        `${CONFIG_PATH} is not valid JSON: ${(cause as Error).message}`
      );
    }
    return validateConfig(parsed);
  }

  renderConfig(config: WorkflowConfig): string {
    return `${JSON.stringify(validateConfig(config), null, 2)}\n`;
  }

  /** Ecosystems recognised by detection and the catalog, in priority order. */
  stacks(): readonly StackId[] {
    return STACK_ORDER;
  }

  detect(root: string): StackDetection[] {
    return detectStacks(root);
  }

  /**
   * Proposes a quality profile from detection and the catalog. `stacks`
   * overrides detection; `which` defaults to a PATH lookup.
   */
  propose(
    root: string,
    options: { stacks?: string[]; which?: (name: string) => boolean } = {}
  ): QualityProposal {
    const unknown = (options.stacks ?? []).filter(
      (id) => !STACK_ORDER.includes(id as StackId)
    );
    ensure(
      unknown.length === 0,
      "UNKNOWN_STACK",
      `Unknown stack: ${unknown.join(", ")}. Known: ${STACK_ORDER.join(", ")}.`
    );
    return proposeQuality(root, {
      stacks: options.stacks as StackId[] | undefined,
      which:
        options.which ??
        ((name) => workflowPlatformFacade.findExecutable(name) !== null),
    });
  }

  writeConfig(root: string, config: WorkflowConfig): void {
    workflowPlatformFacade.writeFileAtomic(
      this.configFile(root),
      this.renderConfig(config)
    );
  }
}

export const workflowQualityFacade = new WorkflowQualityFacade();
