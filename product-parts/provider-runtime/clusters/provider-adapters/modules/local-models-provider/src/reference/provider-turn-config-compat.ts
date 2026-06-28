export interface AppliedProviderTurnConfig {
  readonly modelId?: string;
}

export const readAppliedProviderTurnConfig = (
  turnOptions?: Record<string, unknown>
): AppliedProviderTurnConfig | null => {
  const applied = turnOptions?.appliedTurnConfig;
  return typeof applied === "object" && applied !== null
    ? (applied as AppliedProviderTurnConfig)
    : null;
};
