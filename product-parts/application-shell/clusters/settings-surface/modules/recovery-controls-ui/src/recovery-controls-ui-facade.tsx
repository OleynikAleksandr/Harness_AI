interface RecoveryControlsUiFacadeProps {
  allowRestart: boolean;
  onAllowRestartChange: (allowRestart: boolean) => void;
}

export function RecoveryControlsUiFacade({
  allowRestart,
  onAllowRestartChange
}: RecoveryControlsUiFacadeProps) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>Core Controls</h3>
      </div>
      <label className="settings-check">
        <input
          checked={allowRestart}
          type="checkbox"
          onChange={(event) => onAllowRestartChange(event.target.checked)}
        />
        <span>Allow Restart Core</span>
      </label>
      <button className="settings-secondary" disabled type="button">
        Restart Core
      </button>
    </section>
  );
}
