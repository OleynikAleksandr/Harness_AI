import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";

const execFileAsync = promisify(execFile);

function compile(file) {
  return ts.transpileModule(
    readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
}

const buildDir = await mkdtemp(path.join(tmpdir(), "capture-certs-build-"));
const rootDir = await mkdtemp(path.join(tmpdir(), "capture-certs-root-"));

try {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    path.join(buildDir, "capture-certificates-facade.js"),
    compile("capture-certificates-facade.ts"),
    "utf8"
  );
  const { NativeCaptureCertificateStore } = await import(
    pathToFileURL(path.join(buildDir, "capture-certificates-facade.js")).href
  );

  let now = new Date();
  const calls = [];
  const runOpenSsl = async (args, options) => {
    calls.push(args[0]);
    await execFileAsync("openssl", args, { cwd: options.cwd });
  };

  const store = new NativeCaptureCertificateStore({
    now: () => now,
    rootDir,
    runOpenSsl,
  });
  const bundle = await store.prepareHostCredentials("api.anthropic.com");

  // Env hints point every client flavor at the diagnostic CA.
  assert.equal(bundle.envHints.NODE_EXTRA_CA_CERTS, bundle.caCertPath);
  assert.equal(bundle.envHints.SSL_CERT_FILE, bundle.caCertPath);
  assert.equal(bundle.envHints.REQUESTS_CA_BUNDLE, bundle.caCertPath);
  assert.match(bundle.caCertPath, /harness-native-capture-ca\.pem$/u);
  assert.match(bundle.hostCertPath, /api\.anthropic\.com\.cert\.pem$/u);

  // Credentials are read back as buffers from the generated files.
  const caText = await readFile(bundle.caCertPath, "utf8");
  const firstHostText = await readFile(bundle.hostCertPath, "utf8");
  assert.match(caText, /BEGIN CERTIFICATE/u);
  assert.ok(Buffer.isBuffer(bundle.credentials.ca));
  assert.ok(Buffer.isBuffer(bundle.credentials.cert));
  assert.ok(Buffer.isBuffer(bundle.credentials.key));

  // Second run reuses existing CA/host certs — no new openssl calls.
  now = new Date();
  const callsAfterFirst = calls.length;
  await store.prepareHostCredentials("api.anthropic.com");
  assert.equal(calls.length, callsAfterFirst);

  // Host leaves last seven days while the CA lasts thirty. Advancing eight
  // days rotates only the expired host material and keeps the current CA.
  now = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  await store.prepareHostCredentials("api.anthropic.com");
  assert.equal(calls.length, callsAfterFirst + 2);
  assert.equal(await readFile(bundle.caCertPath, "utf8"), caText);
  assert.notEqual(await readFile(bundle.hostCertPath, "utf8"), firstHostText);

  // Once the CA expires, its key/cert and every signed host artifact are
  // cleared and regenerated together before the requested leaf is issued.
  const callsAfterLeafRotation = calls.length;
  now = new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000);
  await store.prepareHostCredentials("api.anthropic.com");
  assert.equal(calls.length, callsAfterLeafRotation + 3);
  assert.notEqual(await readFile(bundle.caCertPath, "utf8"), caText);

  console.log("capture-certificates tests: OK");
} finally {
  await rm(buildDir, { force: true, recursive: true });
  await rm(rootDir, { force: true, recursive: true });
}
