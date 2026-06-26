import type { SessionTelemetry } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";

interface SessionTelemetryProps {
  telemetry: SessionTelemetry;
}

export function SessionTelemetryFacade({ telemetry }: SessionTelemetryProps) {
  return (
    <section aria-label="Session telemetry" className="telemetry-strip">
      <TelemetryItem label="Provider" value={telemetry.provider} />
      <TelemetryItem label="Model" value={telemetry.model} />
      <TelemetryItem label="Context" value={telemetry.contextWindow} />
      <TelemetryItem label="Limits" value={telemetry.limitState} />
    </section>
  );
}

function TelemetryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="telemetry-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
