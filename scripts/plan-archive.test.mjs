#!/usr/bin/env node
import { strict as assert } from "node:assert/strict";
import { buildClosedPlan, planHasActiveTask, readState } from "./plan.mjs";

// A closed plan parses back as an inactive (NONE) scope.
const closed = buildClosedPlan("main");
const state = readState(closed);
assert.equal(state.executionScopeStatus, "NONE");
assert.equal(state.planId, null);
assert.equal(state.currentTaskId, null);
assert.equal(state.branch, "main");

// The archive guard sees unfinished work as active.
assert.equal(planHasActiveTask("1. [IN_PROGRESS] `x` foo"), true);
assert.equal(planHasActiveTask("2. [TODO] Git Commit: `m` (hash: TBD)"), true);
assert.equal(planHasActiveTask("1. [DONE] `x` foo"), false);

console.log("plan-archive: OK");
