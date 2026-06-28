#!/usr/bin/env node
import { strict as assert } from "node:assert/strict";
import {
  codeChanges,
  docChanges,
  hasSkipMarker,
  moduleDocTargets,
} from "./check-docs-sync.mjs";

const MOD =
  "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap";

// Code detection: only source under product-parts/ or scripts/.
assert.deepEqual(
  codeChanges([`${MOD}/src/main.mjs`, `${MOD}/src/app.css`, "AGENTS.md"]),
  [`${MOD}/src/main.mjs`]
);
assert.deepEqual(codeChanges(["scripts/plan.mjs"]), ["scripts/plan.mjs"]);

// Doc detection: code docs only, NOT the plan or evidence logs.
assert.deepEqual(docChanges([`${MOD}/module.md`]), [`${MOD}/module.md`]);
assert.deepEqual(docChanges(["docs/architecture/x.md", "AGENTS.md"]), [
  "docs/architecture/x.md",
  "AGENTS.md",
]);
assert.deepEqual(docChanges([".harness/product-tree/product-tree.json"]), [
  ".harness/product-tree/product-tree.json",
]);
// The plan and evidence are NOT documentation of the code.
assert.deepEqual(docChanges([".harness/plans/todo-plan.md"]), []);
assert.deepEqual(docChanges(["docs/evidence/run-2026.md"]), []);

// Module doc targets climb module -> cluster -> part.
assert.deepEqual(moduleDocTargets([`${MOD}/src/main.mjs`]), [
  `${MOD}/module.md`,
  "product-parts/application-shell/clusters/electron-host/cluster.md",
  "product-parts/application-shell/product-part.md",
]);
assert.deepEqual(moduleDocTargets(["scripts/plan.mjs"]), []);

// Skip marker.
assert.equal(hasSkipMarker("fix: thing [skip-docs]"), true);
assert.equal(hasSkipMarker("fix: thing"), false);

console.log("check-docs-sync: OK");
