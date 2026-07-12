import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const markdownSource = readFileSync(
  new URL("./session-markdown-content.tsx", import.meta.url),
  "utf8"
);
const dialogSource = readFileSync(
  new URL("./session-dialog-panel.tsx", import.meta.url),
  "utf8"
);
const rootPackageJson = JSON.parse(
  readFileSync(
    new URL("../../../../../../../package.json", import.meta.url),
    "utf8"
  )
);

// The markdown component is a renderer-only formatter: GFM through
// remark-gfm, raw HTML skipped, external links delegated to the Electron
// window-open bridge.
assert.match(markdownSource, /from "react-markdown"/u);
assert.match(markdownSource, /from "remark-gfm"/u);
assert.match(markdownSource, /skipHtml/u);
assert.match(markdownSource, /rel="noreferrer"/u);
assert.match(markdownSource, /target="_blank"/u);
assert.doesNotMatch(markdownSource, /dangerouslySetInnerHTML/u);

// Assistant and thinking bubbles render markdown; user/system messages stay
// plain text.
assert.match(dialogSource, /<SessionMarkdownContent/u);
assert.match(dialogSource, /session-dialog__content--markdown/u);
assert.match(
  dialogSource,
  /renderMarkdown=\{isThinking \|\| message\.role === "assistant"\}/u
);
assert.match(dialogSource, /<div className=\{className\}>\{text\}<\/div>/u);

// The markdown dependencies stay declared beside their first renderer use.
assert.equal(typeof rootPackageJson.dependencies["react-markdown"], "string");
assert.equal(typeof rootPackageJson.dependencies["remark-gfm"], "string");

assert.equal(markdownSource.split("\n").length <= 500, true);
assert.equal(dialogSource.split("\n").length <= 500, true);

console.log("session-markdown-content tests: OK");
