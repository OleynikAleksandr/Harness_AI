import assert from "node:assert/strict";
import { runProviderTurn } from "./provider-turn-runner-facade.mjs";

const cliResult = await runProviderTurn(
  { providerId: "claude", model: "cli-default", prompt: "Hello" },
  {
    runCli: async (commands, args) => {
      assert.deepEqual(commands, ["claude", `${process.env.HOME}/.local/bin/claude`]);
      assert.deepEqual(args, ["--print", "Hello"]);
      return { stdout: "Claude response\n", stderr: "" };
    }
  }
);
assert.deepEqual(cliResult, { ok: true, text: "Claude response" });

const httpResult = await runProviderTurn(
  { providerId: "glm-native", model: "glm-5.2", prompt: "Hello" },
  {
    fetchJson: async (url, body, headers) => {
      assert.equal(url, "https://example.test/v4/chat/completions");
      assert.equal(body.model, "glm-5.2");
      assert.equal(body.messages[0].content, "Hello");
      assert.equal(headers.Authorization, "Bearer test-key");
      return { choices: [{ message: { content: "GLM response" } }] };
    },
    readRuntimeSettings: async () => ({
      providers: {
        glmNative: {
          apiKey: "test-key",
          baseUrl: "https://example.test/v4"
        }
      }
    })
  }
);
assert.deepEqual(httpResult, { ok: true, text: "GLM response" });

const missingOpenRouterModel = await runProviderTurn(
  { providerId: "openrouter", model: "openrouter-default", prompt: "Hello" },
  {
    readRuntimeSettings: async () => ({
      providers: { openRouter: { apiKey: "test-key" } }
    })
  }
);
assert.equal(missingOpenRouterModel.ok, false);
assert.match(missingOpenRouterModel.text, /OpenRouter model is missing/u);
