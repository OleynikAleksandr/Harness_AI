const PROTECTED_SPAN_REGEX = /```[\s\S]*?```|`[^`\n]+`/g;
const LATIN_TO_CYRILLIC_REGEX = /([A-Za-z])([\u0400-\u04ff])/g;
const CYRILLIC_TO_LATIN_REGEX = /([\u0400-\u04ff])([A-Za-z])/g;
const SPLIT_WHITESPACE_REGEX = /\s+/u;
const STANDALONE_BOLD_TITLE_START_REGEX = /^[A-Z\u0400-\u04ff]/u;
const STANDALONE_BOLD_TITLE_PUNCTUATION_REGEX = /[.!?]/u;
const BOLD_TITLE_BEFORE_REGEX =
  /([^\n])(?:[ \t]*\n)?[ \t]*(\*\*([^*\n]{1,80})\*\*)(?=\n{2,})/g;
const BOLD_TITLE_AFTER_REGEX =
  /(^|\n{2,})(\*\*([^*\n]{1,80})\*\*)(?:[ \t]+|\n(?!\n))(?=\S)/g;

interface TextSegment {
  readonly protected: boolean;
  readonly text: string;
}

export function normalizeTranslationTextFormatting(text: string): string {
  if (text.length === 0) {
    return text;
  }
  return splitProtectedSegments(text)
    .map((segment) =>
      segment.protected ? segment.text : normalizePlainTextSegment(segment.text)
    )
    .join("");
}

function splitProtectedSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  PROTECTED_SPAN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = PROTECTED_SPAN_REGEX.exec(text);
  while (match) {
    if (match.index > lastIndex) {
      segments.push({
        protected: false,
        text: text.slice(lastIndex, match.index),
      });
    }
    segments.push({ protected: true, text: match[0] });
    lastIndex = match.index + match[0].length;
    match = PROTECTED_SPAN_REGEX.exec(text);
  }
  if (lastIndex < text.length) {
    segments.push({ protected: false, text: text.slice(lastIndex) });
  }
  return segments;
}

function normalizePlainTextSegment(text: string): string {
  return normalizeScriptSpacing(normalizeStandaloneBoldTitleBoundaries(text));
}

function normalizeScriptSpacing(text: string): string {
  return text
    .replace(LATIN_TO_CYRILLIC_REGEX, "$1 $2")
    .replace(CYRILLIC_TO_LATIN_REGEX, "$1 $2");
}

function normalizeStandaloneBoldTitleBoundaries(text: string): string {
  return text
    .replace(BOLD_TITLE_BEFORE_REGEX, (match, prefix: string, title: string) =>
      isLikelyStandaloneBoldTitle(title) ? `${prefix}\n\n${title}` : match
    )
    .replace(BOLD_TITLE_AFTER_REGEX, (match, prefix: string, title: string) =>
      isLikelyStandaloneBoldTitle(title) ? `${prefix}${title}\n\n` : match
    );
}

function isLikelyStandaloneBoldTitle(value: string): boolean {
  const normalized = value.replace(/\*\*/g, "").trim();
  if (normalized.length < 8 || normalized.length > 80) {
    return false;
  }
  if (!STANDALONE_BOLD_TITLE_START_REGEX.test(normalized)) {
    return false;
  }
  if (STANDALONE_BOLD_TITLE_PUNCTUATION_REGEX.test(normalized)) {
    return false;
  }
  return normalized.split(SPLIT_WHITESPACE_REGEX).length <= 12;
}
