import { Play, Square } from "lucide-react";
import { useState } from "react";

interface InputControlsProps {
  disabled?: boolean;
  onSubmit: (text: string) => void | Promise<void>;
}

export function InputControlsFacade({ disabled = false, onSubmit }: InputControlsProps) {
  const [draft, setDraft] = useState("");
  const canSubmit = draft.trim().length > 0 && !disabled;

  function submit() {
    if (!canSubmit) {
      return;
    }
    onSubmit(draft.trim());
    setDraft("");
  }

  return (
    <form
      className="input-controls"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        aria-label="Message"
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Message Harness AI"
        rows={3}
        value={draft}
      />
      <div className="input-actions">
        <button className="icon-button" disabled type="button" title="Stop">
          <Square size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button primary"
          disabled={!canSubmit}
          type="submit"
          title="Play"
        >
          <Play size={17} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
