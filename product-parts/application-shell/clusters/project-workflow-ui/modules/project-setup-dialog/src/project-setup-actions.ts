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

/**
 * Only a new project asks for a name (it names the new folder); an opened
 * folder is named after itself by the Kit.
 */
export function asksProjectName(mode: "new" | "open"): boolean {
  return mode === "new";
}

/** The Core preparation stopped because git has no usable global identity. */
export function needsGitIdentity(failure: { code: string }): boolean {
  return failure.code === "GIT_IDENTITY_REQUIRED";
}

/**
 * A Core failure for the in-app alert: the message, and the next action on
 * its own line unless the message already contains it.
 */
export function failureText(failure: {
  message: string;
  nextAction: string | null;
}): string {
  const { message, nextAction } = failure;
  return nextAction && !message.includes(nextAction)
    ? `${message}\n${nextAction}`
    : message;
}
