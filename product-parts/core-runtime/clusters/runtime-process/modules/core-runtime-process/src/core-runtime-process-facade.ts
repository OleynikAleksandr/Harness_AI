import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface CoreRuntimeProcessOptions {
  readonly host?: string;
  readonly onShutdown?: () => void;
  readonly port?: number;
  readonly version?: string;
}

export interface CoreRuntimeProcessHandle {
  close(): Promise<void>;
  readonly port: number;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 38_971;

export class CoreRuntimeProcessFacade {
  private server: Server | null = null;

  async start(
    options: CoreRuntimeProcessOptions = {}
  ): Promise<CoreRuntimeProcessHandle> {
    if (this.server) {
      throw new Error("Core runtime process is already started.");
    }

    const host = options.host ?? process.env.CORE_HOST ?? DEFAULT_HOST;
    const port = options.port ?? readPort(process.env.CORE_PORT);
    const server = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/api/v1/health") {
        writeJson(response, 200, this.createHealthPayload(options.version));
        return;
      }
      if (request.method === "GET" && request.url === "/api/v1/status") {
        writeJson(response, 200, this.createHealthPayload(options.version));
        return;
      }
      if (request.method === "POST" && request.url === "/api/v1/shutdown") {
        writeJson(response, 200, { ok: true });
        queueMicrotask(() => {
          options.onShutdown?.();
        });
        return;
      }
      drainRequest(request);
      writeJson(response, 404, { error: "Not found", ok: false });
    });

    await listen(server, port, host);
    this.server = server;
    return {
      port: resolveServerPort(server),
      close: async () => {
        await closeServer(server);
        if (this.server === server) {
          this.server = null;
        }
      },
    };
  }

  private createHealthPayload(version?: string): {
    readonly pid: number;
    readonly status: "ok";
    readonly version: string;
  } {
    return {
      pid: process.pid,
      status: "ok",
      version: version ?? process.env.npm_package_version ?? "0.0.0",
    };
  }
}

const readPort = (raw: string | undefined): number => {
  const port = Number(raw);
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT;
};

const listen = (server: Server, port: number, host: string): Promise<void> =>
  new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const resolveServerPort = (server: Server): number => {
  const address = server.address() as AddressInfo | null;
  return address?.port ?? DEFAULT_PORT;
};

const writeJson = (
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown
): void => {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(payload)}\n`);
};

const drainRequest = (request: IncomingMessage): void => {
  request.resume();
};

export const coreRuntimeProcessFacade = new CoreRuntimeProcessFacade();
