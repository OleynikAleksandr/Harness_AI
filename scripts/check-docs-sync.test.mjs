#!/usr/bin/env node
import { strict as assert } from "node:assert/strict";
import { hasSkipMarker, modulesMissingDoc } from "./check-docs-sync.mjs";

const MOD =
  "product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui";

// Module src changed without its module.md -> flagged.
assert.deepEqual(
  modulesMissingDoc([`${MOD}/src/openrouter-settings-card.tsx`]),
  [MOD]
);

// Module src changed WITH its module.md -> clean.
assert.deepEqual(
  modulesMissingDoc([
    `${MOD}/src/openrouter-settings-card.tsx`,
    `${MOD}/module.md`,
  ]),
  []
);

// Tooling / non-module code is ignored (it has no module.md).
assert.deepEqual(modulesMissingDoc(["scripts/plan.mjs", "AGENTS.md"]), []);

// Style-only changes under src do not trigger the gate (presentation, not contract).
assert.deepEqual(modulesMissingDoc([`${MOD}/src/session-window.css`]), []);

// Each module is judged independently.
const other =
  "product-parts/core-runtime/clusters/session-runtime/modules/session-registry";
assert.deepEqual(
  modulesMissingDoc([
    `${MOD}/src/a.ts`,
    `${MOD}/module.md`,
    `${other}/src/b.ts`,
  ]),
  [other]
);

// Skip marker detection.
assert.equal(hasSkipMarker("fix: thing [skip-docs]"), true);
assert.equal(hasSkipMarker("fix: thing"), false);

console.log("check-docs-sync: OK");
