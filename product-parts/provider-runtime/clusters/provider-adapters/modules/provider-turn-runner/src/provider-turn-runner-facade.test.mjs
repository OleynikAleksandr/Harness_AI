import assert from "node:assert/strict";
import {
  createCliAttempts,
  createCliEnv,
  runProviderTurn,
} from "./provider-turn-runner-facade.mjs";

const cliResult = await runProviderTurn(
  { providerId: "claude", model: "cli-default", prompt: "Hello" },
  {
    runCli: (commands, args) => {
      assert.deepEqual(commands, [
        "claude",
        `${process.env.HOME}/.local/bin/claude`,
      ]);
      assert.deepEqual(args, ["--print", "Hello"]);
      return { stdout: "Claude response\n", stderr: "" };
    },
  }
);
assert.deepEqual(cliResult, { ok: true, text: "Claude response" });

const httpResult = await runProviderTurn(
  { providerId: "glm-native", model: "glm-5.2", prompt: "Hello" },
  {
    fetchJson: (url, body, headers) => {
      assert.equal(url, "https://example.test/v4/chat/completions");
      assert.equal(body.model, "glm-5.2");
      assert.equal(body.messages[0].content, "Hello");
      assert.equal(headers.Authorization, "Bearer test-key");
      return { choices: [{ message: { content: "GLM response" } }] };
    },
    readRuntimeSettings: () => ({
      providers: {
        glmNative: {
          apiKey: "test-key",
          baseUrl: "https://example.test/v4",
        },
      },
    }),
  }
);
assert.deepEqual(httpResult, { ok: true, text: "GLM response" });

const missingOpenRouterModel = await runProviderTurn(
  { providerId: "openrouter", model: "openrouter-default", prompt: "Hello" },
  {
    readRuntimeSettings: () => ({
      providers: { openRouter: { apiKey: "test-key" } },
    }),
  }
);
assert.equal(missingOpenRouterModel.ok, false);
assert.match(missingOpenRouterModel.text, /OpenRouter model is missing/u);

const cliPath = createCliEnv({ PATH: "/tmp/custom-bin" }).PATH.split(":");
assert.ok(cliPath.includes("/tmp/custom-bin"));
assert.ok(cliPath.includes("/usr/local/bin"));
assert.ok(cliPath.includes(`${process.env.HOME}/.npm-global/bin`));

const codexAttempts = createCliAttempts(
  {
    commands: ["codex", `${process.env.HOME}/.npm-global/bin/codex`],
    nodeScript: `${process.env.HOME}/.npm-global/bin/codex`,
  },
  ["exec", "Hello"]
);
assert.equal(codexAttempts[0].command, "/usr/local/bin/node");
assert.deepEqual(codexAttempts[0].args, [
  `${process.env.HOME}/.npm-global/bin/codex`,
  "exec",
  "Hello",
]);
