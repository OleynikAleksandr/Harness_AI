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
