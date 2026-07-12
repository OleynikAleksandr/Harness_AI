import { type ComponentProps, type ReactNode, useMemo } from "react";
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
// Any leading "scheme:" (https:, mailto:, vscode:) means the href is not a
// schemeless workspace-relative path.
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/iu;
const TRAILING_SLASHES_PATTERN = /\/+$/u;

export function SessionMarkdownContent({
  className,
  text,
  workspaceRoot,
}: {
  className: string;
  text: string;
  workspaceRoot?: string;
}) {
  const components = useMemo(
    () => createMarkdownComponents(workspaceRoot),
    [workspaceRoot]
  );
  return (
    <div className={className}>
      <ReactMarkdown
        components={components}
        remarkPlugins={REMARK_PLUGINS}
        skipHtml
        urlTransform={keepFileUrl}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function createMarkdownComponents(
  workspaceRoot: string | undefined
): Components {
  return {
    a(props) {
      return <MarkdownExternalLink {...props} workspaceRoot={workspaceRoot} />;
    },
    p: MarkdownSentenceParagraph,
  };
}

function MarkdownExternalLink({
  href,
  node: _node,
  workspaceRoot,
  ...anchorProps
}: ComponentProps<"a"> & ExtraProps & { workspaceRoot?: string }) {
  // Absolute and workspace-relative file:line hrefs become vscode://file
  // links so a click opens the file at that line in the workspace VS Code
  // window through the existing Electron window-open handler; other targets
  // keep the same handler route.
  const vsCodeHref = resolveVsCodeFileHref(href, workspaceRoot);
  return (
    <a
      {...anchorProps}
      href={vsCodeHref ?? href}
      rel="noreferrer"
      target="_blank"
    />
  );
}

function resolveVsCodeFileHref(
  href: string | undefined,
  workspaceRoot: string | undefined
): string | null {
  if (!href) {
    return null;
  }
  const path = resolveAbsoluteFilePath(href.trim(), workspaceRoot);
  if (!path) {
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

function resolveAbsoluteFilePath(
  raw: string,
  workspaceRoot: string | undefined
): string | null {
  if (!raw || raw.startsWith("#")) {
    return null;
  }
  if (raw.startsWith(FILE_URI_PREFIX)) {
    return decodeFileUriPath(raw);
  }
  if (raw.startsWith("/")) {
    return raw;
  }
  // Schemeless relative hrefs address files of the active workspace.
  if (!workspaceRoot || URL_SCHEME_PATTERN.test(raw)) {
    return null;
  }
  const relative = raw.startsWith("./") ? raw.slice(2) : raw;
  if (!relative) {
    return null;
  }
  return `${workspaceRoot.replace(TRAILING_SLASHES_PATTERN, "")}/${relative}`;
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
