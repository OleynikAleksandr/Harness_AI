import { Check, X } from "lucide-react";

interface NextSessionModePanelProps {
  onClose: () => void;
}

const ACTIVE_MODE = "Native · Raw";

export function NextSessionModePanel({ onClose }: NextSessionModePanelProps) {
  return (
    <div className="next-mode-backdrop" role="presentation">
      <section
        aria-label="Next Session Mode"
        aria-modal="true"
        className="next-mode-panel"
        role="dialog"
      >
        <header className="next-mode-panel__header">
          <div>
            <h2>Next Session Mode</h2>
            <p>{ACTIVE_MODE}</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </header>

        <div className="next-mode-panel__body">
          <section className="next-mode-section">
            <h3>Provider startup</h3>
            <div className="next-mode-card is-active">
              <span>Native</span>
              <Check aria-hidden="true" size={16} />
            </div>
            <div className="next-mode-card is-preview">
              <span>Managed</span>
              <small>Preview</small>
            </div>
          </section>

          <section className="next-mode-section">
            <h3>User request</h3>
            <div className="next-mode-card is-active">
              <span>Raw</span>
              <Check aria-hidden="true" size={16} />
            </div>
            <div className="next-mode-card is-preview">
              <span>Normalized</span>
              <small>Preview</small>
            </div>
          </section>

          <section className="next-mode-section next-mode-section--wide">
            <h3>Managed profile</h3>
            <div className="next-mode-profile">
              <span>Auto Normalizer</span>
              <small>Preview</small>
            </div>
            <div className="next-mode-profile">
              <span>User Profile</span>
              <small>Preview</small>
            </div>
          </section>
        </div>

        <footer className="next-mode-panel__footer">
          <span>Active: {ACTIVE_MODE}</span>
          <button
            className="start-session-button"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
