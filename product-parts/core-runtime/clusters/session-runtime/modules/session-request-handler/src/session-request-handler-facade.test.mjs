import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./session-request-handler-facade.ts", import.meta.url),
  "utf8"
);

assert.match(
  source,
  /sessionReasoningDisplayFacade\.projectProviderEvent\(event\)/u
);
assert.match(source, /role: message\.role/u);
assert.doesNotMatch(source, /event\.tag === "thinking"/u);
