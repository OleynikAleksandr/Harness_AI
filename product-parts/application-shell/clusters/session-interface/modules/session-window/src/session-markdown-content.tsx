import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from "react-markdown";
import remarkGfm from "remark-gfm";

const REMARK_PLUGINS = [remarkGfm];

// Sentence end (.!?) followed by whitespace and an uppercase letter starts a
// new display line; paragraphs render with pre-line so the inserted newlines
// (and author soft breaks) become visible without touching code or tables.
const SENTENCE_BREAK_PATTERN = /([.!?])\s+(?=\p{Lu})/gu;

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
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function MarkdownExternalLink({
  node: _node,
  ...anchorProps
}: ComponentProps<"a"> & ExtraProps) {
  // target="_blank" hands the URL to the Electron window-open handler, which
  // opens external links in the system browser instead of a new app window.
  return <a {...anchorProps} rel="noreferrer" target="_blank" />;
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
