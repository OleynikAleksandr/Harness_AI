import type { KitStatus, ValidationReport } from "./workflow-kit-facade.js";

function statusText(status: KitStatus): string {
  const lines = [
    `project: ${status.project ? `${status.project.name} (${status.project.id})` : "not installed"}`,
    status.scope
      ? `scope: ${status.scope.id} ${status.scope.status}, result ${status.scope.delivery}, revision ${status.revision}`
      : `scope: NONE, revision ${status.revision}`,
  ];
  if (status.scope?.blockedReason) {
    lines.push(`blocked: ${status.scope.blockedReason}`);
  }
  lines.push(
    `progress: ${status.progress.done}/${status.progress.total}`,
    `current: ${status.currentTask ? `${status.currentTask.id} ${status.currentTask.title}` : "none"}`,
    `next: ${status.nextTask ? `${status.nextTask.id} [${status.nextTask.kind}] ${status.nextTask.title}` : "none"}`,
    `quality: ${status.quality.status}${status.quality.stacks.length > 0 ? ` (${status.quality.stacks.join(", ")})` : ""}, drift ${status.quality.drift.status}`,
    `head: ${status.head ? status.head.slice(0, 8) : "none"}`,
    `transaction: ${status.transaction ? `${status.transaction.id} ${status.transaction.phase}` : "none"}`,
    `changes: ${status.changes.length === 0 ? "none" : status.changes.join(", ")}`
  );
  return `${lines.join("\n")}\n`;
}

function validationText(report: ValidationReport): string {
  return report.ok
    ? "Plan and history are consistent.\n"
    : `${report.errors.map((error) => `${error.code}: ${error.message}`).join("\n")}\n`;
}

/** Human-readable output of `--format text`. */
export function renderText(command: string, result: unknown): string {
  const value = result as Record<string, unknown>;
  switch (command) {
    case "status":
      return statusText(result as KitStatus);
    case "validate":
      return validationText(result as ValidationReport);
    case "recover":
    case "history":
    case "show-task":
      return String(value.text ?? "");
    default:
      return `${JSON.stringify(result, null, 2)}\n`;
  }
}
