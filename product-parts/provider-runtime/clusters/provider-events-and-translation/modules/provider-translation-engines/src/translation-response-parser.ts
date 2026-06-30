function isGoogleResponseSegment(
  segment: unknown
): segment is readonly unknown[] {
  return Array.isArray(segment) && segment.length > 0;
}

export function parseGoogleTranslateResponse(data: unknown): string | null {
  if (!(Array.isArray(data) && Array.isArray(data[0]))) {
    return null;
  }

  const translated = data[0]
    .filter(isGoogleResponseSegment)
    .map((segment) => (typeof segment[0] === "string" ? segment[0] : ""))
    .join("")
    .trim();

  return translated || null;
}
