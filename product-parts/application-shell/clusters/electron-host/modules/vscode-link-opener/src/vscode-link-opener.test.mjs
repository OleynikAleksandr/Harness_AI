import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const facadeSource = readFileSync(
  new URL("./vscode-link-opener-facade.mjs", import.meta.url),
  "utf8"
);

// The window-open route keeps an explicit protocol allowlist: workspace file
// links (vscode://file/) plus web links (https/http) and nothing else.
assert.match(
  facadeSource,
  /OPENABLE_URL_PREFIXES = \["vscode:\/\/file\/", "https:\/\/", "http:\/\/"\]/u
);
assert.match(
  facadeSource,
  /OPENABLE_URL_PREFIXES\.some\(\(prefix\) => url\.startsWith\(prefix\)\)/u
);
assert.match(facadeSource, /shell\.openExternal\(url\)/u);

// Denied targets return false before reaching shell.openExternal.
assert.match(
  facadeSource,
  /if \(!canOpenExternalUrl\(url\)\) \{\s*return false;/u
);
assert.doesNotMatch(facadeSource, /"file:\/\/"/u);
assert.doesNotMatch(facadeSource, /javascript/u);

assert.equal(facadeSource.split("\n").length <= 500, true);

console.log("vscode-link-opener tests: OK");
