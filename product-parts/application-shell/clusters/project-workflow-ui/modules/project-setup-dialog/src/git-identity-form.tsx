import { type FormEvent, useState } from "react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import "../../../src/project-workflow-ui.css";
import "./git-identity-form.css";

interface GitIdentityFormProps {
  /** The Kit saved the global identity; the caller continues its work. */
  onSaved: () => void;
}

/**
 * The one-time git identity form: name and email go to Core
 * (`setGitIdentity`), which runs the Kit `identity:set --global`. The Kit
 * validates the values; a refusal is shown under the fields (message only).
 */
export function GitIdentityForm({ onSaved }: GitIdentityFormProps) {
  const { t } = useBrowserLocalization();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const result = await window.harnessCore?.setGitIdentity({ email, name });
      if (!result) {
        setError(
          t(
            "messages_for_the_user",
            "core.bridge.unavailable",
            "Core runtime bridge is unavailable."
          )
        );
      } else if (result.ok) {
        onSaved();
      } else {
        setError(result.message);
      }
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    save().catch((reason: unknown) => setError(String(reason)));
  }

  return (
    <form className="project-workflow-identity" onSubmit={submit}>
      <p className="project-workflow-description">
        {t(
          "ui_helper_text",
          "project.identity.description",
          "Git signs every commit. Enter your name and email once for all projects on this computer."
        )}
      </p>
      <label className="project-workflow-field">
        <span>{t("ui_labels", "project.identity.name", "Name")}</span>
        <input
          autoComplete="name"
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </label>
      <label className="project-workflow-field">
        <span>{t("ui_labels", "project.identity.email", "Email")}</span>
        <input
          autoComplete="email"
          disabled={pending}
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          value={email}
        />
      </label>
      {error ? (
        <p className="project-workflow-error" role="alert">
          {error}
        </p>
      ) : null}
      <footer className="project-workflow-actions">
        <button
          className="project-workflow-primary"
          disabled={pending}
          type="submit"
        >
          {t("ui_labels", "project.identity.save", "Save and continue")}
        </button>
      </footer>
    </form>
  );
}
