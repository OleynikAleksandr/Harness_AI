import assert from "node:assert/strict";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./core-login-path.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const MARKER_PATTERN = /'(__HARNESS_LOGIN_PATH_[^']+)'/u;
const buildDir = await mkdtemp(path.join(tmpdir(), "core-login-path-"));

try {
  writeFileSync(path.join(buildDir, "core-login-path.js"), compiled, "utf8");
  const { applyLoginShellPath } = await import(
    pathToFileURL(path.join(buildDir, "core-login-path.js")).href
  );

  // A fake runner that answers like a login shell printing `value`
  // between the markers, with banner noise around it.
  const calls = [];
  const shellPrinting =
    (value, noise = "") =>
    (shell, args, timeoutMs) => {
      calls.push({ args, shell, timeoutMs });
      const marker = MARKER_PATTERN.exec(args[1])[1];
      return Promise.resolve({
        error: null,
        stdout: `${noise}Welcome!\n${marker}${value}${marker}\nbye\n`,
      });
    };

  // Marker parsing ignores banners, login entries come first, inherited
  // entries follow without duplicates, well-known darwin dirs only when
  // they exist on disk.
  const env = { PATH: "/usr/bin:/bin:/usr/sbin:/sbin", SHELL: "/bin/fish" };
  const logs = [];
  const merged = await applyLoginShellPath({
    directoryExists: (directory) => directory === "/usr/local/bin",
    env,
    log: (line) => logs.push(line),
    platform: "darwin",
    run: shellPrinting("/opt/homebrew/bin:/usr/bin:/Users/me/.local/bin", "%"),
  });
  assert.equal(merged.status, "merged");
  assert.equal(
    env.PATH,
    "/opt/homebrew/bin:/usr/bin:/Users/me/.local/bin:/bin:/usr/sbin:/sbin:/usr/local/bin"
  );
  assert.equal(merged.path, env.PATH);
  assert.deepEqual(logs, []);
  assert.equal(calls[0].shell, "/bin/fish");
  assert.equal(calls[0].args[0], "-ilc");
  assert.equal(calls[0].timeoutMs, 3000);

  // Default shells: zsh on darwin, bash elsewhere; Linux adds no
  // well-known dirs.
  calls.length = 0;
  const linuxEnv = { PATH: "/usr/bin" };
  await applyLoginShellPath({
    directoryExists: () => true,
    env: linuxEnv,
    log: () => undefined,
    platform: "linux",
    run: shellPrinting("/home/me/bin:/usr/bin"),
  });
  assert.equal(calls[0].shell, "/bin/bash");
  assert.equal(linuxEnv.PATH, "/home/me/bin:/usr/bin");
  calls.length = 0;
  await applyLoginShellPath({
    directoryExists: () => false,
    env: { PATH: "/usr/bin" },
    platform: "darwin",
    run: shellPrinting("/usr/bin"),
  });
  assert.equal(calls[0].shell, "/bin/zsh");

  // Failure, timeout, a missing marker and a throwing runner keep the
  // inherited PATH (plus existing well-known dirs) and log one line.
  const failures = [
    () => Promise.resolve({ error: "timed out after 3000 ms", stdout: "" }),
    () => Promise.resolve({ error: "spawn /bin/zsh ENOENT", stdout: "" }),
    () => Promise.resolve({ error: null, stdout: "no markers here" }),
    () => Promise.reject(new Error("boom")),
  ];
  for (const run of failures) {
    const failedEnv = { PATH: "/usr/bin:/bin" };
    const failedLogs = [];
    const outcome = await applyLoginShellPath({
      directoryExists: (directory) => directory === "/opt/homebrew/bin",
      env: failedEnv,
      log: (line) => failedLogs.push(line),
      platform: "darwin",
      run,
    });
    assert.equal(outcome.status, "fallback");
    assert.equal(failedEnv.PATH, "/usr/bin:/bin:/opt/homebrew/bin");
    assert.equal(failedLogs.length, 1);
    assert.match(failedLogs[0], /login shell PATH unavailable/u);
    assert.match(failedLogs[0], /keeping the inherited PATH/u);
  }

  // Windows is skipped: no shell runs and PATH stays untouched.
  let windowsRuns = 0;
  const windowsEnv = { PATH: "C:\\Windows" };
  const skipped = await applyLoginShellPath({
    env: windowsEnv,
    platform: "win32",
    run: () => {
      windowsRuns += 1;
      return Promise.resolve({ error: null, stdout: "" });
    },
  });
  assert.equal(skipped.status, "skipped");
  assert.equal(windowsRuns, 0);
  assert.equal(windowsEnv.PATH, "C:\\Windows");

  // The real runner: a fake login shell with a noisy rc prints the PATH
  // between the markers.
  const noisyShell = path.join(buildDir, "noisy-shell.sh");
  writeFileSync(
    noisyShell,
    '#!/bin/sh\necho "rc banner"\nPATH="/fake/login/bin:$PATH"\neval "$2"\necho "rc tail"\n',
    "utf8"
  );
  chmodSync(noisyShell, 0o755);
  const realEnv = { PATH: process.env.PATH, SHELL: noisyShell };
  const real = await applyLoginShellPath({
    env: realEnv,
    log: () => undefined,
    platform: process.platform === "win32" ? "linux" : process.platform,
  });
  assert.equal(real.status, "merged");
  assert.ok(realEnv.PATH.startsWith("/fake/login/bin:"));

  // The real runner kills a shell that does not answer in time.
  const slowShell = path.join(buildDir, "slow-shell.sh");
  writeFileSync(slowShell, "#!/bin/sh\nsleep 30\n", "utf8");
  chmodSync(slowShell, 0o755);
  const slowLogs = [];
  const startedAt = Date.now();
  const slow = await applyLoginShellPath({
    env: { PATH: "/usr/bin", SHELL: slowShell },
    log: (line) => slowLogs.push(line),
    platform: "linux",
    timeoutMs: 200,
  });
  assert.equal(slow.status, "fallback");
  assert.ok(Date.now() - startedAt < 5000);
  assert.match(slowLogs[0], /timed out after 200 ms/u);
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
