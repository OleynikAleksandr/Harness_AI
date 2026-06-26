interface RecoveryControlsUiFacadeProps {
  allowRestart: boolean;
  busy: boolean;
  onAllowRestartChange: (allowRestart: boolean) => void;
  onRestart: () => void;
  status: string;
}

export function RecoveryControlsUiFacade({
  allowRestart,
  busy,
  onAllowRestartChange,
  onRestart,
  status,
}: RecoveryControlsUiFacadeProps) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>Core Controls</h3>
      </div>
      <label className="settings-check">
        <input
          checked={allowRestart}
          onChange={(event) => onAllowRestartChange(event.target.checked)}
          type="checkbox"
        />
        <span>Allow Restart Core</span>
      </label>
      <button
        className="settings-secondary"
        disabled={!allowRestart || busy}
        onClick={onRestart}
        type="button"
      >
        {busy ? "Restarting..." : "Restart Core"}
      </button>
      <span className="settings-status">{status}</span>
    </section>
  );
}
