import type { ComponentProps } from "react";
import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from "react-markdown";
import remarkGfm from "remark-gfm";

const REMARK_PLUGINS = [remarkGfm];

const MARKDOWN_COMPONENTS: Components = {
  a: MarkdownExternalLink,
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
