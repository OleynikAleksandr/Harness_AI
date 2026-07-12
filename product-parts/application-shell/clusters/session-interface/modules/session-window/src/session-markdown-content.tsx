import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, {
  type Components,
  defaultUrlTransform,
  type ExtraProps,
} from "react-markdown";
import remarkGfm from "remark-gfm";

const REMARK_PLUGINS = [remarkGfm];

// Sentence end (.!?) followed by whitespace and an uppercase letter starts a
// new display line; paragraphs render with pre-line so the inserted newlines
// (and author soft breaks) become visible without touching code or tables.
const SENTENCE_BREAK_PATTERN = /([.!?])\s+(?=\p{Lu})/gu;

// Absolute unix path with an optional :line[:column] suffix, as emitted by
// agent replies referencing workspace files.
const FILE_PATH_LOCATION_PATTERN = /^(\/.+?)(?::(\d+)(?::(\d+))?)?$/u;
const FILE_URI_PREFIX = "file://";

const MARKDOWN_COMPONENTS: Components = {
  a: MarkdownExternalLink,
  p: MarkdownSentenceParagraph,
};

export function SessionMarkdownContent({
  className,
  text,
}: {
  className: string;
  text: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={MARKDOWN_COMPONENTS}
        remarkPlugins={REMARK_PLUGINS}
        skipHtml
        urlTransform={keepFileUrl}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function MarkdownExternalLink({
  href,
  node: _node,
  ...anchorProps
}: ComponentProps<"a"> & ExtraProps) {
  // Absolute file:line hrefs become vscode://file links so a click opens the
  // file at that line in the workspace VS Code window through the existing
  // Electron window-open handler; other targets keep the same handler route.
  const vsCodeHref = resolveVsCodeFileHref(href);
  return (
    <a
      {...anchorProps}
      href={vsCodeHref ?? href}
      rel="noreferrer"
      target="_blank"
    />
  );
}

function resolveVsCodeFileHref(href: string | undefined): string | null {
  if (!href) {
    return null;
  }
  const raw = href.trim();
  const path = raw.startsWith(FILE_URI_PREFIX) ? decodeFileUriPath(raw) : raw;
  if (!path?.startsWith("/")) {
    return null;
  }
  const match = FILE_PATH_LOCATION_PATTERN.exec(path);
  if (!match) {
    return null;
  }
  const line = parsePositiveInteger(match[2]);
  const column = parsePositiveInteger(match[3]);
  return `vscode://file/${match[1]}:${line}:${column}`;
}

function decodeFileUriPath(href: string): string | null {
  try {
    const uri = new URL(href);
    if (uri.protocol !== "file:") {
      return null;
    }
    return decodeURIComponent(uri.pathname);
  } catch {
    return null;
  }
}

function parsePositiveInteger(value: string | undefined): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function keepFileUrl(url: string): string {
  // The default react-markdown transform would strip file:// hrefs before
  // the anchor component can turn them into vscode://file links.
  return url.startsWith(FILE_URI_PREFIX) ? url : defaultUrlTransform(url);
}

function MarkdownSentenceParagraph({
  children,
  node: _node,
  ...paragraphProps
}: ComponentProps<"p"> & ExtraProps) {
  return <p {...paragraphProps}>{splitSentencesOntoLines(children)}</p>;
}

function splitSentencesOntoLines(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    return breakSentences(children);
  }
  if (!Array.isArray(children)) {
    return children;
  }
  // Only plain text nodes are rewritten; inline elements (code, links,
  // emphasis) keep their own keys and stay untouched.
  return children.map((child) =>
    typeof child === "string" ? breakSentences(child) : child
  );
}

function breakSentences(text: string): string {
  return text.replace(SENTENCE_BREAK_PATTERN, "$1\n");
}
