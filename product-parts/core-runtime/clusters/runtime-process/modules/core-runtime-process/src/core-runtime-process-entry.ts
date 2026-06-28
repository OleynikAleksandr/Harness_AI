import { coreRuntimeProcessFacade } from "./core-runtime-process-facade.js";

coreRuntimeProcessFacade
  .start({
    onShutdown: () => {
      setTimeout(() => process.exit(0), 10);
    },
  })
  .then((handle) => {
    console.log(`Harness AI Core Runtime listening on port ${handle.port}`);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
