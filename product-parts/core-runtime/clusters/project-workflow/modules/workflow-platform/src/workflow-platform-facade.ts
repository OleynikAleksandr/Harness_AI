import {
  type AtomicWriteOptions,
  atomicWriteFile,
  type FileLockOptions,
  readTextIfExists,
  withFileLock,
} from "./platform-fs.js";
import {
  currentWorkflowPlatform,
  isWithin,
  normalizeRelativePath,
  relativeFromRoot,
  resolveInside,
  samePath,
  toPosixPath,
  type WorkflowPlatform,
} from "./platform-paths.js";

export { WorkflowLockError } from "./platform-fs.js";
export { WorkflowPathError, type WorkflowPlatform } from "./platform-paths.js";

/**
 * Public boundary of the workflow-platform module: OS-neutral paths, atomic
 * files and locks. Every other project-workflow module reaches the
 * filesystem and processes through this facade.
 */
export class WorkflowPlatformFacade {
  readonly platform: WorkflowPlatform;

  constructor(platform: WorkflowPlatform = currentWorkflowPlatform()) {
    this.platform = platform;
  }

  toPosix(value: string): string {
    return toPosixPath(value);
  }

  normalizeRelative(value: string): string {
    return normalizeRelativePath(value);
  }

  resolveInside(root: string, relativePath: string): string {
    return resolveInside(root, relativePath);
  }

  relativeFromRoot(root: string, absolutePath: string): string {
    return relativeFromRoot(root, absolutePath);
  }

  samePath(left: string, right: string): boolean {
    return samePath(left, right, this.platform);
  }

  isWithin(relativePath: string, prefix: string): boolean {
    return isWithin(relativePath, prefix);
  }

  writeFileAtomic(
    filePath: string,
    data: string | Uint8Array,
    options?: AtomicWriteOptions
  ): void {
    atomicWriteFile(filePath, data, options);
  }

  readTextIfExists(filePath: string): string | null {
    return readTextIfExists(filePath);
  }

  withLock<T>(lockPath: string, fn: () => T, options?: FileLockOptions): T {
    return withFileLock(lockPath, fn, options);
  }
}

export const workflowPlatformFacade = new WorkflowPlatformFacade();
