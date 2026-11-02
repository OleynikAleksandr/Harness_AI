import { useEffect, useState } from "react";
import type { ProviderModelCatalogs } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";

interface DescribedModel {
  readonly description?: string;
  readonly id: string;
}

const EMPTY_CATALOGS: ProviderModelCatalogs = {
  claude: [],
  codex: [],
  kimiClient: [],
};

// Claude/Codex/Kimi model choices as Core serves them (live provider
// catalogs with per-model efforts and defaults); the renderer keeps no model
// list of its own. Loaded once per Settings mount; Core refreshes the live
// catalogs before answering.
export function useProviderModelCatalogs(): ProviderModelCatalogs {
  const [catalogs, setCatalogs] =
    useState<ProviderModelCatalogs>(EMPTY_CATALOGS);

  useEffect(() => {
    let cancelled = false;
    window.harnessCore
      ?.listProviderModelCatalogs()
      .then((next) => {
        if (!cancelled) {
          setCatalogs(next);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return catalogs;
}

// Provider-written model descriptions (OpenRouter search results, live
// catalog rows) translated through the Core dynamic-text route; untranslated
// rows keep the provider text.
export function useTranslatedModelDescriptions(
  models: readonly DescribedModel[]
): Record<string, string> {
  const [translated, setTranslated] = useState<Record<string, string>>({});

  useEffect(() => {
    const described = models.flatMap((model) =>
      model.description?.trim()
        ? [{ description: model.description, id: model.id }]
        : []
    );
    if (described.length === 0) {
      setTranslated({});
      return;
    }
    let cancelled = false;
    Promise.all(
      described.map(async (model) => {
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
