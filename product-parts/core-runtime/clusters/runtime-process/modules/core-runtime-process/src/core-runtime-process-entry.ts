import { applyLoginShellPath } from "./core-login-path.js";
import { coreRuntimeApi } from "./core-runtime-api.js";
import { coreRuntimeProcessFacade } from "./core-runtime-process-facade.js";

async function main(): Promise<void> {
  // Provider processes and Kit commands inherit process.env, so the login
  // shell PATH must be merged before any service starts.
  await applyLoginShellPath();
  coreRuntimeApi.initialize();
  const handle = await coreRuntimeProcessFacade.start({
    api: coreRuntimeApi,
    onShutdown: () => {
      coreRuntimeApi.shutdown();
      setTimeout(() => process.exit(0), 10);
    },
  });
  console.log(`Harness AI Core Runtime listening on port ${handle.port}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
