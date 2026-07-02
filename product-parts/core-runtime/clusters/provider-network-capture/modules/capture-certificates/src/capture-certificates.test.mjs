import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

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

  // Fake openssl: create the file each invocation asks to write via -out /
  // -keyout, so the store's file reads succeed without a real toolchain.
  const calls = [];
  const runOpenSsl = async (args) => {
    calls.push(args[0]);
    for (let i = 0; i < args.length; i += 1) {
      if ((args[i] === "-out" || args[i] === "-keyout") && args[i + 1]) {
        await writeFile(args[i + 1], `PEM ${args[i + 1]}\n`, "utf8");
      }
    }
  };

  const store = new NativeCaptureCertificateStore({ rootDir, runOpenSsl });
  const bundle = await store.prepareHostCredentials("api.anthropic.com");

  // Env hints point every client flavor at the diagnostic CA.
  assert.equal(bundle.envHints.NODE_EXTRA_CA_CERTS, bundle.caCertPath);
  assert.equal(bundle.envHints.SSL_CERT_FILE, bundle.caCertPath);
  assert.equal(bundle.envHints.REQUESTS_CA_BUNDLE, bundle.caCertPath);
  assert.match(bundle.caCertPath, /harness-native-capture-ca\.pem$/u);
  assert.match(bundle.hostCertPath, /api\.anthropic\.com\.cert\.pem$/u);

  // Credentials are read back as buffers from the generated files.
  const caText = await readFile(bundle.caCertPath, "utf8");
  assert.match(caText, /PEM/u);
  assert.ok(Buffer.isBuffer(bundle.credentials.ca));
  assert.ok(Buffer.isBuffer(bundle.credentials.cert));
  assert.ok(Buffer.isBuffer(bundle.credentials.key));

  // Second run reuses existing CA/host certs — no new openssl calls.
  const callsAfterFirst = calls.length;
  await store.prepareHostCredentials("api.anthropic.com");
  assert.equal(calls.length, callsAfterFirst);

  console.log("capture-certificates tests: OK");
} finally {
  await rm(buildDir, { force: true, recursive: true });
  await rm(rootDir, { force: true, recursive: true });
}
