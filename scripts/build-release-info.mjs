#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RELEASE_TAG =
  /^v(\d{4})\.([1-9]|1[0-2])\.([1-9]|[12]\d|3[01])(?:\.([1-9]\d*))?$/u;

/** The single mapping from a release tag to display and package versions. */
export function createBuildInfo(tag) {
  if (tag === undefined || tag === "") {
    return {
      applicationVersion: null,
      buildNumber: null,
      channel: "development",
      releaseTag: null,
      releaseVersion: "Development",
      schema: "harness-build-info/1",
    };
  }
  const match = RELEASE_TAG.exec(tag);
  if (!match) {
    throw new Error("HARNESS_RELEASE_TAG must be vYYYY.M.D or vYYYY.M.D.N.");
  }
  const [, yearText, monthText, dayText, suffix] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const build = suffix === undefined ? 1 : Number(suffix);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1000 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    (suffix !== undefined && build < 2) ||
    !Number.isSafeInteger(build) ||
    build > 9999
  ) {
    throw new Error(
      "HARNESS_RELEASE_TAG must contain a valid date and build 2..9999."
    );
  }
  return {
    applicationVersion: `${year}.${month}.${day}`,
    buildNumber: String(build),
    channel: "release",
    releaseTag: tag,
    releaseVersion: tag.slice(1),
    schema: "harness-build-info/1",
  };
}

export function writeBuildInfo(root, tag) {
  const info = createBuildInfo(tag);
  const folder = path.join(root, "dist");
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    path.join(folder, "build-info.json"),
    `${JSON.stringify(info, null, 2)}\n`
  );
  return info;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const info = writeBuildInfo(process.cwd(), process.env.HARNESS_RELEASE_TAG);
  console.log(`Build version: ${info.releaseVersion}`);
}
