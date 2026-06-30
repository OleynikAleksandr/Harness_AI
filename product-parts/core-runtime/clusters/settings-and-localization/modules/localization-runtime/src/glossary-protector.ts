import type { LocalizationCategoryId } from "./source-dictionary-registry.js";

export type GlossaryRule =
  | {
      readonly categories?: readonly LocalizationCategoryId[];
      readonly kind: "preserve" | "user_preserve";
      readonly sourceTerm: string;
    }
  | {
      readonly categories?: readonly LocalizationCategoryId[];
      readonly kind: "preferred_translation";
      readonly sourceTerm: string;
      readonly targetLanguage: string;
      readonly translatedTerm: string;
    };

export interface ProtectedGlossaryToken {
  readonly marker: string;
  readonly rule: GlossaryRule;
}

export interface ProtectedGlossaryText {
  readonly protectedText: string;
  readonly tokens: readonly ProtectedGlossaryToken[];
}

const MARKER_PREFIX = "[[HARNESS_AI_TERM_";
const MARKER_SUFFIX = "]]";

export class GlossaryProtector {
  protect(
    text: string,
    options: {
      readonly category: LocalizationCategoryId;
      readonly rules: readonly GlossaryRule[];
      readonly targetLanguage: string;
    }
  ): ProtectedGlossaryText {
    let protectedText = text;
    const tokens: ProtectedGlossaryToken[] = [];

    for (const rule of applicableRules(options)) {
      const pattern = new RegExp(escapeRegExp(rule.sourceTerm), "g");
      if (!pattern.test(protectedText)) {
        continue;
      }
      const marker = `${MARKER_PREFIX}${tokens.length}${MARKER_SUFFIX}`;
      protectedText = protectedText.replace(pattern, marker);
      tokens.push({ marker, rule });
    }

    return { protectedText, tokens };
  }

  restore(
    text: string,
    targetLanguage: string,
    tokens: readonly ProtectedGlossaryToken[]
  ): string {
    let restoredText = text;
    for (const token of tokens) {
      restoredText = restoredText
        .split(token.marker)
        .join(restoredValue(token.rule, targetLanguage));
    }
    return restoredText;
  }
}

function applicableRules(options: {
  readonly category: LocalizationCategoryId;
  readonly rules: readonly GlossaryRule[];
  readonly targetLanguage: string;
}): GlossaryRule[] {
  return options.rules
    .filter((rule) => matchesCategory(rule, options.category))
    .filter((rule) => matchesTargetLanguage(rule, options.targetLanguage))
    .sort((left, right) => right.sourceTerm.length - left.sourceTerm.length);
}

function matchesCategory(
  rule: GlossaryRule,
  category: LocalizationCategoryId
): boolean {
  return !rule.categories?.length || rule.categories.includes(category);
}

function matchesTargetLanguage(
  rule: GlossaryRule,
  targetLanguage: string
): boolean {
  return (
    rule.kind !== "preferred_translation" ||
    rule.targetLanguage.toLowerCase() === targetLanguage.toLowerCase()
  );
}

function restoredValue(rule: GlossaryRule, targetLanguage: string): string {
  return rule.kind === "preferred_translation" &&
    rule.targetLanguage.toLowerCase() === targetLanguage.toLowerCase()
    ? rule.translatedTerm
    : rule.sourceTerm;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
