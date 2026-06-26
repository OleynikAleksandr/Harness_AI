#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PRODUCT_TREE_PATH = ".harness/product-tree/product-tree.json";
const MAX_LINES = 500;
const LINE_SPLIT_REGEX = /\r?\n/u;
const SOURCE_FILE_REGEX = /\.(mjs|js|ts|tsx)$/u;
const SKIP_DIRS = new Set([
  ".codeai-hub",
  ".git",
  "dist",
  "node_modules",
  "release",
]);
const SKIP_PATHS = new Set([".harness/runtime"]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertExists(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing required path: ${path}`);
  }
}

function walk(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (SKIP_DIRS.has(entry) || SKIP_PATHS.has(path)) {
      continue;
    }
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, result);
    } else {
      result.push(path);
    }
  }
  return result;
}

function lineCount(path) {
  return readFileSync(path, "utf8").split(LINE_SPLIT_REGEX).length;
}

function checkTree(tree) {
  let clusters = 0;
  let modules = 0;
  for (const part of tree.productParts) {
    const partDir = `product-parts/${part.id}`;
    assertExists(`${partDir}/product-part.md`);
    for (const cluster of part.clusters) {
      clusters += 1;
      const clusterDir = `${partDir}/clusters/${cluster.id}`;
      assertExists(`${clusterDir}/cluster.md`);
      for (const module of cluster.modules) {
        modules += 1;
        const moduleDir = `${clusterDir}/modules/${module.id}`;
        assertExists(`${moduleDir}/module.md`);
        assertExists(`${moduleDir}/src`);
      }
    }
  }
  return { productParts: tree.productParts.length, clusters, modules };
}

function checkLineLimits() {
  const offenders = [];
  for (const file of walk(".")) {
    if (!SOURCE_FILE_REGEX.test(file)) {
      continue;
    }
    const lines = lineCount(file);
    if (lines > MAX_LINES) {
      offenders.push(`${file} (${lines} lines)`);
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `Files exceed ${MAX_LINES} lines:\n${offenders.join("\n")}`
    );
  }
}

try {
  assertExists(PRODUCT_TREE_PATH);
  const summary = checkTree(readJson(PRODUCT_TREE_PATH));
  checkLineLimits();
  console.log(
    `Architecture check: OK (${summary.productParts} product parts, ${summary.clusters} clusters, ${summary.modules} modules)`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
