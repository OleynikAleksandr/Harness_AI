#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PLAN_PATH = ".harness/plans/todo-plan.md";
const ARCHIVE_DIR = ".harness/plans/archive";
const DEBT_PATH = ".git/harness-plan-debt";
const COMMIT_MESSAGE_LINE_REGEX = /\r?\n/u;
const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/gu;
const EXPECTED_COMMIT_REGEX = /expected commit:\s*`([^`]+)`/u;
const NEXT_TASK_REGEX = /\n(\d+)\. \[TODO\] `([^`]+)` ([^\n]+)/u;
const STATE_RE =
  /<!-- harness-plan-state:start -->\n```json\n([\s\S]*?)\n```\n<!-- harness-plan-state:end -->/u;

function readPlan() {
  return readFileSync(PLAN_PATH, "utf8");
}

function writePlan(text) {
  writeFileSync(PLAN_PATH, text, "utf8");
}

export function readState(text = readPlan()) {
  const match = text.match(STATE_RE);
  if (!match) {
    throw new Error(`Missing plan state block in ${PLAN_PATH}`);
  }
  return JSON.parse(match[1]);
}

function replaceState(text, state) {
  const json = JSON.stringify(state, null, 2);
  return text.replace(
    STATE_RE,
    `<!-- harness-plan-state:start -->\n\`\`\`json\n${json}\n\`\`\`\n<!-- harness-plan-state:end -->`
  );
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function expectedCommitFromLine(line) {
  const match = line.match(EXPECTED_COMMIT_REGEX);
  if (!match || match[1] === "none") {
    return null;
  }
  return match[1];
}

function findNextTask(text, fromIndex) {
  const tail = text.slice(fromIndex);
  const match = tail.match(NEXT_TASK_REGEX);
  if (!match) {
    return null;
  }
  const lineStart = fromIndex + match.index + 1;
  return {
    lineStart,
    lineEnd: lineStart + match[0].trimStart().length,
    taskId: match[2],
    line: match[0].trim(),
    expectedCommitMessage: expectedCommitFromLine(match[0]),
  };
}

function validatePlan() {
  const text = readPlan();
  const state = readState(text);
  if (state.executionScopeStatus === "NONE") {
    return state;
  }
  if (state.executionScopeStatus !== "ACTIVE") {
    throw new Error(
      `Unsupported executionScopeStatus: ${state.executionScopeStatus}`
    );
  }
  if (!state.currentTaskId) {
    throw new Error("ACTIVE plan must have currentTaskId");
  }
  if (!text.includes(`\`${state.currentTaskId}\``)) {
    throw new Error(`Current task not found: ${state.currentTaskId}`);
  }
  if (
    state.expectedCommitMessage &&
    !text.includes(`Git Commit: \`${state.expectedCommitMessage}\``)
  ) {
    throw new Error(
      `Expected commit line not found: ${state.expectedCommitMessage}`
    );
  }
  return state;
}

function status() {
  const state = validatePlan();
  console.log(`Schema: ${state.schema}`);
  console.log(`Execution Scope Status: ${state.executionScopeStatus}`);
  console.log(`Plan ID: ${state.planId}`);
  console.log(`Branch: ${state.branch}`);
  console.log(`Current Task: ${state.currentTaskId ?? "none"}`);
  console.log(`Expected Commit: ${state.expectedCommitMessage ?? "none"}`);
  console.log(`Debt: ${existsSync(DEBT_PATH) ? "present" : "none"}`);
  console.log("Validation: OK");
}

function validateCommitMessage(filePath) {
  const message = readFileSync(filePath, "utf8")
    .split(COMMIT_MESSAGE_LINE_REGEX)[0]
    .trim();
  const text = readPlan();
  const state = readState(text);
  if (!message) {
    throw new Error("Commit message is empty");
  }
  if (state.executionScopeStatus === "NONE") {
    console.log("No active scope; commit message check skipped.");
    return;
  }
  if (
    state.expectedCommitMessage === message ||
    text.includes(`Git Commit: \`${message}\``)
  ) {
    console.log("Commit message matches active plan.");
    return;
  }
  throw new Error(`Commit message is not present in active plan: ${message}`);
}

function markCommitDone(text, state, message) {
  let nextText = text;
  const currentTaskPattern = new RegExp(
    "(\\d+\\. )\\[IN_PROGRESS\\]( `" +
      escapeRegExp(state.currentTaskId) +
      "`[^\\n]*)",
    "u"
  );
  nextText = nextText.replace(
    currentTaskPattern,
    `$1[DONE]$2 Result: Completed in commit \`${message}\`.`
  );

  const commitPattern = new RegExp(
    "(\\d+\\. )\\[TODO\\]( Git Commit: `" +
      escapeRegExp(message) +
      "` \\(hash: )TBD(\\))",
    "u"
  );
  const commitMatch = nextText.match(commitPattern);
  if (!commitMatch) {
    throw new Error(`Open Git Commit line not found for: ${message}`);
  }
  nextText = nextText.replace(commitPattern, "$1[DONE]$2self$3");

  const doneCommitIndex = nextText.indexOf(`Git Commit: \`${message}\``);
  const nextTask = findNextTask(nextText, doneCommitIndex);
  if (!nextTask) {
    state.executionScopeStatus = "NONE";
    state.currentTaskId = null;
    state.expectedCommitMessage = null;
    state.lastRecordedCommit = "self";
    return replaceState(nextText, state);
  }

  nextText =
    nextText.slice(0, nextTask.lineStart) +
    nextTask.line.replace("[TODO]", "[IN_PROGRESS]") +
    nextText.slice(nextTask.lineEnd);
  state.currentTaskId = nextTask.taskId;
  state.expectedCommitMessage = nextTask.expectedCommitMessage;
  state.lastRecordedCommit = "self";
  return replaceState(nextText, state);
}

function commit(message) {
  if (!message) {
    throw new Error(
      'Usage: npm run plan:commit -- "<expected commit message>"'
    );
  }
  let text = readPlan();
  const state = validatePlan();
  if (state.expectedCommitMessage !== message) {
    throw new Error(
      `Expected commit is "${state.expectedCommitMessage ?? "none"}", got "${message}"`
    );
  }
  text = markCommitDone(text, state, message);
  writePlan(text);
  run("git", ["add", "-A"]);
  run("git", ["commit", "-m", message]);
}

function repair() {
  if (existsSync(DEBT_PATH)) {
    rmSync(DEBT_PATH);
    console.log("Plan repair: removed local debt sentinel");
    return;
  }
  console.log("Plan repair: no local debt");
}

function postCommit() {
  if (existsSync(DEBT_PATH)) {
    rmSync(DEBT_PATH);
    console.log("Plan post-commit: cleared local debt");
    return;
  }
  console.log("Plan post-commit: no local debt");
}

export function planHasActiveTask(text) {
  return text.includes("[IN_PROGRESS]") || text.includes("[TODO]");
}

export function buildClosedPlan(branch) {
  const state = {
    schema: "harness-ai-plan-v1",
    executionScopeStatus: "NONE",
    planId: null,
    branch: branch ?? "main",
    lastRecordedCommit: "self",
    currentTaskId: null,
    expectedCommitMessage: null,
    debt: null,
  };
  const json = JSON.stringify(state, null, 2);
  return `# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
\`\`\`json
${json}
\`\`\`
<!-- harness-plan-state:end -->

## No Active Scope

No active execution scope. Per AGENTS.md, agree a new scope with the user, then
create the active plan from \`${PLAN_PATH.replace("todo-plan.md", "todo-plan.template.md")}\`.
`;
}

function archive(force) {
  const text = readPlan();
  const state = readState(text);
  if (
    !(force || state.executionScopeStatus === "NONE") &&
    planHasActiveTask(text)
  ) {
    throw new Error(
      "Active or pending tasks remain; finish the scope or pass --force to archive anyway."
    );
  }
  const planId = state.planId ?? "plan";
  const archivePath = join(ARCHIVE_DIR, `${planId}.md`);
  if (existsSync(archivePath)) {
    throw new Error(`Archive already exists: ${archivePath}`);
  }
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  writeFileSync(archivePath, text, "utf8");
  writePlan(buildClosedPlan(state.branch));
  run("git", ["add", "-A"]);
  run("git", ["commit", "-m", `chore: archive plan ${planId}`]);
  console.log(`Archived ${planId} to ${archivePath}`);
}

function escapeRegExp(value) {
  return value.replace(ESCAPE_REGEX, "\\$&");
}

const invokedDirectly =
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (invokedDirectly) {
  const [command, ...args] = process.argv.slice(2);

  try {
    if (command === "status") {
      status();
    } else if (command === "validate") {
      validatePlan();
      console.log("Plan validation: OK");
    } else if (command === "validate-commit-message") {
      validateCommitMessage(join(process.cwd(), args[0] ?? ""));
    } else if (command === "commit") {
      commit(args.join(" ").trim());
    } else if (command === "archive") {
      archive(args.includes("--force"));
    } else if (command === "repair") {
      repair();
    } else if (command === "post-commit") {
      postCommit();
    } else {
      throw new Error(`Unknown plan command: ${command ?? "(missing)"}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
