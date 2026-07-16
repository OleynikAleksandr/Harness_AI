import readline from "node:readline";

const input = readline.createInterface({ input: process.stdin });
const pendingReverse = new Map();
let reverseCounter = 0;

input.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "test/hold") {
    return;
  }
  if (message.method === "test/stderr") {
    process.stderr.write("x".repeat(32_768));
    send({ id: message.id, jsonrpc: "2.0", result: true });
    return;
  }
  if (message.method === "test/exit") {
    process.exit(7);
    return;
  }
  if (message.method === "test/reverse") {
    const reverseId = `fake-reverse-${++reverseCounter}`;
    pendingReverse.set(reverseId, message.id);
    send({
      id: reverseId,
      jsonrpc: "2.0",
      method: "session/request_permission",
      params: { options: ["allow", "deny"] },
    });
    return;
  }
  if (pendingReverse.has(message.id)) {
    const requestId = pendingReverse.get(message.id);
    pendingReverse.delete(message.id);
    send({ id: requestId, jsonrpc: "2.0", result: message.result });
    return;
  }
  if (message.id !== undefined) {
    send({ id: message.id, jsonrpc: "2.0", result: message.params ?? null });
  }
});

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
