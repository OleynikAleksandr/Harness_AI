import { createContext, type ReactNode, useContext, useMemo } from "react";
import type {
  LocalizationCategoryId,
  LocalizationRuntimePayload,
} from "../../../../../../core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.js";

export interface BrowserLocalizationLookup {
  t(
    category: LocalizationCategoryId,
    messageId: string,
    fallback: string
  ): string;
}

interface BrowserLocalizationProviderProps {
  readonly children: ReactNode;
  readonly payload: LocalizationRuntimePayload | null;
}

const BrowserLocalizationContext = createContext<BrowserLocalizationLookup>({
  t: (_category, _messageId, fallback) => fallback,
});

export function BrowserLocalizationProvider({
  children,
  payload,
}: BrowserLocalizationProviderProps) {
  const lookup = useMemo(
    () => createBrowserLocalizationLookup(payload),
    [payload]
  );
  return (
    <BrowserLocalizationContext.Provider value={lookup}>
      {children}
    </BrowserLocalizationContext.Provider>
  );
}

export function useBrowserLocalization(): BrowserLocalizationLookup {
  return useContext(BrowserLocalizationContext);
}

export function createBrowserLocalizationLookup(
  payload: LocalizationRuntimePayload | null
): BrowserLocalizationLookup {
  return {
    t(category, messageId, fallback) {
      return (
        payload?.resolvedBundlesByCategory[category]?.entries[messageId] ??
        fallback
      );
    },
  };
}
