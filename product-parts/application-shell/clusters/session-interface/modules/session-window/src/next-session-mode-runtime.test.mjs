import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const windowSource = readFileSync(
  new URL("./session-window-facade.tsx", import.meta.url),
  "utf8"
);
const panelSource = readFileSync(
  new URL("./next-session-mode-panel.tsx", import.meta.url),
  "utf8"
);

assert.match(
  windowSource,
  /nextSessionMode: \{ invocationMode: "native", requestMode: "raw" \}/u
);
assert.match(panelSource, /const ACTIVE_MODE = "Native · Raw"/u);
assert.match(panelSource, /<small>Preview<\/small>/u);
