// Built-in web tools: web_fetch (readable text from a URL) and web_search
// (DuckDuckGo HTML with a Bing fallback). Behavior ported from the reference
// glm-native tool executors. Contract: docs/architecture/UniversalClient.md 3.2.

import type { ToolDescriptor } from "../../client-contract/src/client-contract-facade.js";
import type {
  ToolExecutionContext,
  ToolExecutionResult,
} from "../../tool-registry/src/tool-registry-facade.js";
import { clampNumber, readRequiredString } from "./builtin-tools-shared.js";
import { truncateOutput } from "./builtin-tools-truncate.js";

const HTML_SCRIPT_STYLE_PATTERN =
  /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/giu;
const HTML_TAG_PATTERN = /<[^>]+>/gu;
const WHITESPACE_PATTERN = /\s+/gu;
const DUCK_RESULT_PATTERN =
  /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/giu;

export const WEB_DESCRIPTORS: readonly ToolDescriptor[] = [
  {
    description: "Fetch a URL and return its readable text.",
    name: "web_fetch",
    parametersSchema: {
      properties: {
        max_chars: {
          description: "Max characters (default 20000, max 100000).",
          type: "number",
        },
        url: { description: "http(s) URL.", type: "string" },
      },
      required: ["url"],
      type: "object",
    },
    qualifiedName: "web_fetch",
    source: "builtin",
  },
  {
    description: "Search the web and return result titles and URLs.",
    name: "web_search",
    parametersSchema: {
      properties: {
        query: { description: "Search query.", type: "string" },
        response_length: {
          description: '"short" | "medium" | "long".',
          type: "string",
        },
      },
      required: ["query"],
      type: "object",
    },
    qualifiedName: "web_search",
    source: "builtin",
  },
];

const decodeHtml = (value: string): string =>
  value
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'");

const cleanWebText = (value: string): string =>
  decodeHtml(
    value
      .replace(HTML_SCRIPT_STYLE_PATTERN, " ")
      .replace(HTML_TAG_PATTERN, " ")
      .replace(WHITESPACE_PATTERN, " ")
      .trim()
  );

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number
): Promise<Response> => {
  const parsed = new URL(url);
  if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) {
    throw new Error("Only http and https URLs are supported.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(parsed, {
      headers: { "User-Agent": "harness-ai-universal-client/1.0" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const decodeDuckUrl = (value: string): string => {
  const decoded = decodeHtml(value);
  try {
    return (
      new URL(decoded, "https://duckduckgo.com").searchParams.get("uddg") ??
      decoded
    );
  } catch {
    return decoded;
  }
};

const parseDuckResults = (
  html: string
): Array<{ readonly title: string; readonly url: string }> =>
  Array.from(html.matchAll(DUCK_RESULT_PATTERN), (match) => ({
    title: cleanWebText(match[2] ?? ""),
    url: decodeDuckUrl(match[1] ?? ""),
  })).filter((result) => result.title && result.url);

const webSearchCount = (value: unknown): number => {
  if (value === "long") {
    return 8;
  }
  if (value === "short") {
    return 3;
  }
  return 5;
};

const webFetchTool = async (
  args: Record<string, unknown>
): Promise<ToolExecutionResult> => {
  const url = readRequiredString(args.url, "url");
  const maxChars = clampNumber(args.max_chars, 1000, 100_000, 20_000);
  const response = await fetchWithTimeout(url, 30_000);
  const cleanText = cleanWebText(await response.text());
  const { output } = truncateOutput(cleanText, maxChars);
  return { output: `status=${response.status}\n${output}` };
};

const webSearchTool = async (
  args: Record<string, unknown>
): Promise<ToolExecutionResult> => {
  const query = readRequiredString(args.query, "query");
  const count = webSearchCount(args.response_length);
  const response = await fetchWithTimeout(
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    30_000
  );
  const results = parseDuckResults(await response.text()).slice(0, count);
  if (results.length === 0) {
    return { output: `No results for: ${query}` };
  }
  return {
    output: results.map((r) => `${r.title}\n${r.url}`).join("\n\n"),
  };
};

// Returns null when this module does not own the tool.
export const executeWebTool = (
  name: string,
  args: Record<string, unknown>,
  _ctx: ToolExecutionContext
): Promise<ToolExecutionResult> | null => {
  if (name === "web_fetch") {
    return webFetchTool(args);
  }
  if (name === "web_search") {
    return webSearchTool(args);
  }
  return null;
};
