import { useEffect, useState } from "react";
import type { OpenRouterModelSearchResult } from "./openrouter-model-search.js";

export function OpenRouterModelRow({
  model,
  onSelect,
  selected,
  translatedDescription,
}: {
  model: OpenRouterModelSearchResult;
  onSelect: () => void;
  selected: boolean;
  translatedDescription?: string;
}) {
  const description = translatedDescription ?? model.description;
  return (
    <button
      aria-pressed={selected}
      className={selected ? "active settings-model-row" : "settings-model-row"}
      onClick={onSelect}
      type="button"
    >
      <span className="settings-model-title">{model.name}</span>
      <span className="settings-model-id">{model.id}</span>
      {description ? (
        <p className="settings-model-description">{description}</p>
      ) : null}
    </button>
  );
}

export function useTranslatedOpenRouterDescriptions(
  models: readonly OpenRouterModelSearchResult[]
): Record<string, string> {
  const [translated, setTranslated] = useState<Record<string, string>>({});

  useEffect(() => {
    const descriptions = models.filter((model) => model.description.trim());
    if (descriptions.length === 0) {
      setTranslated({});
      return;
    }
    let cancelled = false;
    Promise.all(
      descriptions.map(async (model) => {
        const result = await window.harnessCore?.translateDynamicText({
          category: "reasoning",
          text: model.description,
        });
        return [
          model.id,
          result?.ok ? result.text : model.description,
        ] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) {
          setTranslated(Object.fromEntries(entries));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTranslated({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [models]);

  return translated;
}
