import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  createKimiSubagentWireReader,
  type KimiSubagentWireEvent,
  type KimiSubagentWireReader,
  resolveKimiSubagentWirePath,
} from "../../kimi-subagent-wire/src/kimi-subagent-wire-facade.js";

// The live event channel of one native session's synthesized children
// (`kimi-agent-*`). The Kimi ACP stream is silent about subagent internals
// (verified live 2026-07-19, CLI 0.26.0), so each child gets its dialog,
// turn lifecycle and telemetry from its own `agents/agent-<n>/wire.jsonl`
// through the kimi-subagent-wire reader. One hub serves one runtime: the
// runtime pumps it on the existing swarm-poll cadence (no extra timer),
// reports terminal child statuses from its own event stream
// (`observeEvent`), and settles terminal children when the turn ends
// (`finishTurn`).
//
// Lifecycle of one child channel:
// - subscribe: resolve the child's wire (retried on every pump until the
//   store attributes the id) and drain immediately, so the listener replays
//   the full wire history from offset 0 (deterministic wire ids make the
//   replay idempotent downstream).
// - pump: deliver the appended delta; a terminal child whose drain comes
//   back empty has a settled wire and is finished.
// - terminal (observed `subagent_status` completed/failed/interrupted):
//   drain immediately, then finish on the next quiet pump or at turn end —
//   whichever comes first. Finishing a child whose last turn stayed open
//   (turn_started without turn_completed) synthesizes the closing
//   `turn_completed` with a non-wire uuid so the child's telemetry leaves
//   `running`; the event carries no native turnCount, letting Core count
//   exactly one extra turn for the interrupted one.
// - unsubscribe: drop the channel; tailing stops with it. The hub owns no
//   timer of its own, so nothing else needs tearing down.
const TERMINAL_SUBAGENT_STATUSES: ReadonlySet<string> = new Set([
  "completed",
  "failed",
  "interrupted",
]);

interface KimiSubagentChannel {
  listener: (event: KimiSubagentWireEvent) => void;
  openTurn: boolean;
  reader: KimiSubagentWireReader | null;
  terminal: boolean;
  wirePath: string | null;
}

export interface KimiSubagentWireChannelHubOptions {
  // The runtime's live ACP session id (null while the CLI is closed); the
  // session store directory is re-probed when it changes (relaunch).
  readonly readAcpSessionId: () => string | null;
  // `<workspace home>/.kimi-code/sessions` — the same root the swarm
  // progress reader and the usage reader poll.
  readonly sessionsRoot: string;
}

export class KimiSubagentWireChannelHub {
  private readonly channels = new Map<string, KimiSubagentChannel>();
  private readonly options: KimiSubagentWireChannelHubOptions;
  private storeDirCache: {
    readonly acpSessionId: string;
    readonly dir: string;
  } | null = null;

  constructor(options: KimiSubagentWireChannelHubOptions) {
    this.options = options;
  }

  subscribe(
    childProviderSessionId: string,
    listener: (event: KimiSubagentWireEvent) => void
  ): () => void {
    const channel: KimiSubagentChannel = {
      listener,
      openTurn: false,
      reader: null,
      terminal: false,
      wirePath: null,
    };
    this.channels.set(childProviderSessionId, channel);
    // Replay from offset 0 right away; a wire the store cannot attribute
    // yet resolves on a later pump.
    this.drain(childProviderSessionId, channel);
    return () => {
      this.channels.delete(childProviderSessionId);
    };
  }

  // The runtime forwards its own emitted events: a terminal child status
  // arms the drain. Non-terminal and foreign events are ignored.
  observeEvent(event: unknown): void {
    if (!isRecord(event) || event.type !== "subagent_status") {
      return;
    }
    const childId = event.providerSessionId;
    const status = event.status;
    if (
      typeof childId !== "string" ||
      typeof status !== "string" ||
      !TERMINAL_SUBAGENT_STATUSES.has(status)
    ) {
      return;
    }
    const channel = this.channels.get(childId);
    if (channel && !channel.terminal) {
      channel.terminal = true;
      this.drain(childId, channel);
    }
  }

  // One swarm-poll tick: deliver appended wire rows for every child and
  // finish terminal children whose wire stopped growing.
  pump(): void {
    for (const [childId, channel] of this.channels) {
      const delivered = this.drain(childId, channel);
      if (channel.terminal && delivered === 0) {
        this.finish(childId, channel);
      }
    }
  }

  // The turn boundary stops the swarm poller, so terminal children still
  // waiting for their quiet pump settle here with one last drain.
  finishTurn(): void {
    for (const [childId, channel] of this.channels) {
      if (channel.terminal) {
        this.drain(childId, channel);
        this.finish(childId, channel);
      }
    }
  }

  private finish(childId: string, channel: KimiSubagentChannel): void {
    if (channel.openTurn) {
      channel.openTurn = false;
      this.deliver(channel, {
        timestamp: new Date().toISOString(),
        type: "turn_completed",
        uuid: `${childId}:wire:drain:turn_completed`,
      });
    }
    this.channels.delete(childId);
  }

  // Resolve (until attributed) and read the appended delta; returns the
  // number of delivered events so the caller can tell a quiet wire.
  private drain(childId: string, channel: KimiSubagentChannel): number {
    if (!channel.reader) {
      channel.wirePath ??= this.resolveWirePath(childId);
      if (!channel.wirePath) {
        return 0;
      }
      channel.reader = createKimiSubagentWireReader({
        childProviderSessionId: childId,
        wirePath: channel.wirePath,
      });
    }
    const events = channel.reader.readNewEvents();
    for (const event of events) {
      if (event.type === "turn_started") {
        channel.openTurn = true;
      } else if (event.type === "turn_completed") {
        channel.openTurn = false;
      }
      this.deliver(channel, event);
    }
    return events.length;
  }

  private resolveWirePath(childId: string): string | null {
    const storeDir = this.sessionStoreDir();
    return storeDir ? resolveKimiSubagentWirePath(childId, storeDir) : null;
  }

  private sessionStoreDir(): string | null {
    const acpSessionId = this.options.readAcpSessionId();
    if (!acpSessionId) {
      return null;
    }
    if (this.storeDirCache?.acpSessionId === acpSessionId) {
      return this.storeDirCache.dir;
    }
    const dir = probeSessionStoreDir(this.options.sessionsRoot, acpSessionId);
    if (dir) {
      this.storeDirCache = { acpSessionId, dir };
    }
    return dir;
  }

  // Listener isolation, same contract as the driver fan-out: one throwing
  // consumer must not break the tailing of the other children.
  private deliver(
    channel: KimiSubagentChannel,
    event: KimiSubagentWireEvent
  ): void {
    try {
      channel.listener(event);
    } catch {
      // Listener failures are the consumer's concern; delivery goes on.
    }
  }
}

// The CLI session store directory (`<sessionsRoot>/<wd_*>/<acpSessionId>`)
// holding `agents/` and `state.json`; the same workdir scan the usage
// reader applies for the main agent wire.
function probeSessionStoreDir(
  sessionsRoot: string,
  acpSessionId: string
): string | null {
  let workDirs: string[];
  try {
    workDirs = readdirSync(sessionsRoot);
  } catch {
    return null;
  }
  for (const workDir of workDirs) {
    const candidate = path.join(sessionsRoot, workDir, acpSessionId);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
