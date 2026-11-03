import path from "node:path";
import {
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

export type {
  CheckDefinition,
  CheckInput,
  CheckRole,
  CheckStage,
  CommandSpec,
  DocsContract,
  WorkflowConfig,
} from "./quality-config.js";

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

  writeConfig(root: string, config: WorkflowConfig): void {
    workflowPlatformFacade.writeFileAtomic(
      this.configFile(root),
      this.renderConfig(config)
    );
  }
}

export const workflowQualityFacade = new WorkflowQualityFacade();
