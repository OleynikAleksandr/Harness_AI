const PROVIDER_SECTION_RE = /^\[providers\.[^\]]+\]/u;
const BASE_URL_LINE_RE = /^(\s*base_url\s*=\s*")([^"]*)(".*)$/u;
const TRAILING_SLASH_RE = /\/+$/u;

// Rewrites the `base_url` of every `[providers.*]` section to the reverse
// bridge, preserving the original URL path (so `/coding/v1/chat/completions`
// still routes correctly). Non-provider service URLs (`[services.*]` search /
// fetch) are left untouched. Pure transform, unit-tested in isolation.
export function rewriteKimiProviderBaseUrls(
  toml: string,
  bridgeBaseUrl: string
): string {
  const normalizedBridge = bridgeBaseUrl.replace(TRAILING_SLASH_RE, "");
  let inProviderSection = false;
  return toml
    .split("\n")
    .map((line) => {
      if (line.startsWith("[")) {
        inProviderSection = PROVIDER_SECTION_RE.test(line);
        return line;
      }
      if (!inProviderSection) {
        return line;
      }
      const match = line.match(BASE_URL_LINE_RE);
      if (!match) {
        return line;
      }
      const [, prefix, url, suffix] = match;
      return `${prefix}${normalizedBridge}${extractUrlPath(url)}${suffix}`;
    })
    .join("\n");
}

function extractUrlPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}
