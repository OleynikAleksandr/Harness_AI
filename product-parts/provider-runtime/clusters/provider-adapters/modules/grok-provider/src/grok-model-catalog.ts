import { isRecord } from "./grok-acp-contracts.js";

export interface GrokReasoningEffortDescriptor {
  readonly description: string | null;
  readonly id: string;
  readonly isDefault: boolean;
  readonly label: string;
}

export interface GrokModelDescriptor {
  readonly contextWindowTokens: number | null;
  readonly description: string | null;
  readonly id: string;
  readonly isDefault: boolean;
  readonly label: string;
  readonly reasoningEfforts: readonly GrokReasoningEffortDescriptor[];
  readonly supportsReasoningSelection: boolean;
}

export interface GrokModelCatalog {
  readonly currentModelId: string | null;
  readonly models: readonly GrokModelDescriptor[];
  readonly source: "grok_acp";
}

export function normalizeGrokModelCatalog(payload: unknown): GrokModelCatalog {
  const state = findModelState(payload);
  const currentModelId = readString(state?.currentModelId);
  const models = Array.isArray(state?.availableModels)
    ? state.availableModels.flatMap((value) => {
        const model = normalizeModel(value, currentModelId);
        return model ? [model] : [];
      })
    : [];
  return {
    currentModelId,
    models: deduplicateModels(models),
    source: "grok_acp",
  };
}

function normalizeModel(
  value: unknown,
  currentModelId: string | null
): GrokModelDescriptor | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value.modelId) ?? readString(value.id);
  if (!id) {
    return null;
  }
  const meta = readMeta(value);
  const defaultEffort = readString(meta?.reasoningEffort);
  const reasoningEfforts = normalizeReasoningEfforts(
    meta?.reasoningEfforts,
    defaultEffort
  );
  return {
    contextWindowTokens: readPositiveInteger(meta?.totalContextTokens),
    description: readString(value.description),
    id,
    isDefault: id === currentModelId,
    label: readString(value.name) ?? id,
    reasoningEfforts,
    supportsReasoningSelection:
      meta?.supportsReasoningEffort === true || reasoningEfforts.length > 0,
  };
}

function normalizeReasoningEfforts(
  value: unknown,
  defaultEffort: string | null
): readonly GrokReasoningEffortDescriptor[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const efforts: GrokReasoningEffortDescriptor[] = [];
  for (const entry of value) {
    const record = isRecord(entry) ? entry : null;
    const id = record
      ? (readString(record.value) ?? readString(record.id))
      : readString(entry);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    efforts.push({
      description: record ? readString(record.description) : null,
      id,
      isDefault:
        id === defaultEffort ||
        (defaultEffort === null && record?.default === true),
      label: (record ? readString(record.label) : null) ?? effortLabel(id),
    });
  }
  return efforts;
}

function findModelState(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null;
  }
  if (isRecord(payload.modelState)) {
    return payload.modelState;
  }
  if (isRecord(payload.models)) {
    return payload.models;
  }
  for (const key of ["_meta", "meta", "result"]) {
    const nested = findModelState(payload[key]);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function readMeta(
  value: Record<string, unknown>
): Record<string, unknown> | null {
  if (isRecord(value._meta)) {
    return value._meta;
  }
  return isRecord(value.meta) ? value.meta : null;
}

function deduplicateModels(
  models: readonly GrokModelDescriptor[]
): readonly GrokModelDescriptor[] {
  const seen = new Set<string>();
  return models.filter((model) => {
    if (seen.has(model.id)) {
      return false;
    }
    seen.add(model.id);
    return true;
  });
}

function effortLabel(value: string): string {
  if (value === "xhigh") {
    return "x-High";
  }
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
