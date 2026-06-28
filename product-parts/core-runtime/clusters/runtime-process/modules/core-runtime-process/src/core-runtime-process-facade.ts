import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

export interface CoreRuntimeProcessApi {
  invoke(method: string, payload: unknown): Promise<unknown> | unknown;
  subscribe(listener: (event: unknown) => void): () => void;
}

export interface CoreRuntimeProcessOptions {
  readonly api?: CoreRuntimeProcessApi;
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
      if (request.method === "GET" && request.url === "/api/v1/events") {
        this.openEventStream(response, options.api);
        request.on("close", () => {
          response.end();
        });
        return;
      }
      if (request.method === "POST" && request.url === "/api/v1/rpc") {
        this.handleRpcRequest(request, response, options.api).catch(
          (error: unknown) => {
            writeJson(response, 500, {
              error: describeError(error),
              ok: false,
            });
          }
        );
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

  private async handleRpcRequest(
    request: IncomingMessage,
    response: ServerResponse,
    api: CoreRuntimeProcessApi | undefined
  ): Promise<void> {
    if (!api) {
      writeJson(response, 503, {
        error: "Core API is unavailable.",
        ok: false,
      });
      return;
    }
    const envelope = readRecord(JSON.parse(await readBody(request)));
    const method = readString(envelope?.method);
    if (!method) {
      writeJson(response, 400, {
        error: "Core method is required.",
        ok: false,
      });
      return;
    }
    const result = await api.invoke(method, envelope?.payload);
    writeJson(response, 200, { ok: true, result });
  }

  private openEventStream(
    response: ServerResponse,
    api: CoreRuntimeProcessApi | undefined
  ): void {
    response.writeHead(200, {
      "cache-control": "no-cache",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
    });
    if (!api) {
      response.write(`event: error\ndata: "Core API is unavailable."\n\n`);
      return;
    }
    response.write(": connected\n\n");
    const unsubscribe = api.subscribe((event) => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    response.on("close", unsubscribe);
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
  response: ServerResponse,
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

const readBody = async (request: IncomingMessage): Promise<string> => {
  let body = "";
  for await (const chunk of request) {
    body += String(chunk);
  }
  return body || "{}";
};

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const coreRuntimeProcessFacade = new CoreRuntimeProcessFacade();
