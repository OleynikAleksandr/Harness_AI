import { readFileSync } from "node:fs";
import { workflowKitFacade } from "../../../../project-workflow/modules/workflow-kit/src/workflow-kit-facade.js";

const BUILD_INFO_FILE = new URL(
  "../../../../../../../../build-info.json",
  import.meta.url
);
const RELEASE_TAG =
  /^v(\d{4})\.([1-9]|1[0-2])\.([1-9]|[12]\d|3[01])(?:\.([1-9]\d*))?$/u;

export interface ProductInfo {
  /** Full release label, including a repeated-date suffix, or Development. */
  readonly applicationVersion: string;
  readonly buildNumber: string | null;
  readonly channel: "development" | "release";
  readonly releaseTag: string | null;
  readonly workflowKitVersion: string;
}

function invalid(): never {
  throw new Error(
    "Product version information is unavailable: invalid build metadata."
  );
}

/** Read immutable application metadata, never the active project's Kit state. */
export function readProductInfo(
  file: string | URL = BUILD_INFO_FILE
): ProductInfo {
  const data: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return invalid();
  }
  const info = data as Record<string, unknown>;
  if (info.schema !== "harness-build-info/1") {
    return invalid();
  }
  if (info.channel === "development") {
    if (
      info.releaseTag !== null ||
      info.applicationVersion !== null ||
      info.buildNumber !== null ||
      info.releaseVersion !== "Development"
    ) {
      return invalid();
    }
  } else if (info.channel === "release") {
    if (typeof info.releaseTag !== "string") {
      return invalid();
    }
    const match = RELEASE_TAG.exec(info.releaseTag);
    if (!match) {
      return invalid();
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
      !Number.isSafeInteger(build) ||
      build > 9999 ||
      (suffix !== undefined && build < 2) ||
      info.releaseVersion !== info.releaseTag.slice(1) ||
      info.applicationVersion !== `${year}.${month}.${day}` ||
      info.buildNumber !== String(build)
    ) {
      return invalid();
    }
  } else {
    return invalid();
  }
  return Object.freeze({
    applicationVersion: info.releaseVersion as string,
    buildNumber: info.buildNumber as string | null,
    channel: info.channel,
    releaseTag: info.releaseTag as string | null,
    workflowKitVersion: workflowKitFacade.installer.version,
  });
}
