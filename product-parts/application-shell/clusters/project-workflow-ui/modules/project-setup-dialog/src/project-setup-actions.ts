import type { FolderAction } from "../../../../../../core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-facade.js";

export interface SetupButton {
  fallback: string;
  messageId: string;
}

/**
 * The primary button of the Open Project dialog for the Core inspect
 * action; null when the folder cannot be opened with the Kit.
 */
export function primarySetupButton(action: FolderAction): SetupButton | null {
  switch (action) {
    case "install":
    case "install-migrate":
      return {
        fallback: "Install Workflow Kit",
        messageId: "project.setup.install",
      };
    case "update":
      return {
        fallback: "Update Workflow Kit",
        messageId: "project.setup.update",
      };
    case "open":
    case "doctor":
      return { fallback: "Open Project", messageId: "project.setup.open" };
    default:
      return null;
  }
}

/** Folders the user may still open as a plain workspace without the Kit. */
export function offersOpenWithoutKit(action: FolderAction): boolean {
  return (
    action === "install" ||
    action === "install-migrate" ||
    action === "update" ||
    action === "unsupported"
  );
}

/** A project name is asked for a new project and before an installation. */
export function asksProjectName(
  mode: "new" | "open",
  action: FolderAction | null
): boolean {
  return mode === "new" || action === "install" || action === "install-migrate";
}
