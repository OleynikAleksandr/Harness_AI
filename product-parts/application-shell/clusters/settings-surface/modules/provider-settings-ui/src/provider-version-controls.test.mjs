import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cardSource = readFileSync(
  new URL("./provider-version-controls.tsx", import.meta.url),
  "utf8"
);
const tabContentSource = readFileSync(
  new URL("./settings-tab-content.tsx", import.meta.url),
  "utf8"
);
const kimiTabSource = tabContentSource.slice(
  tabContentSource.indexOf('if (activeTab === "kimi")'),
  tabContentSource.indexOf('if (activeTab === "glmClient")')
);

// Kimi joins the updatable providers with a single CLI row: no SDK row and
// no npm package name in its snapshot entry.
assert.match(
  cardSource,
  /UpdatableProviderId = "claude" \| "codex" \| "kimi"/u
);
assert.match(
  cardSource,
  /kimi: \{ cli: Omit<ProviderVersionEntry, "packageName"> \}/u
);
const kimiRowsSource = cardSource.slice(
  cardSource.indexOf('if (provider === "kimi")'),
  cardSource.indexOf("const providerSnapshot")
);
assert.match(kimiRowsSource, /snapshot\.kimi\.cli\.currentVersion/u);
assert.match(kimiRowsSource, /target: "cli" as const/u);
assert.doesNotMatch(kimiRowsSource, /sdk/iu);

// Providers without an SDK entry get the CLI-only auto-update helper text.
assert.match(
  cardSource,
  /settings\.provider\.versions\.autoUpdate\.cli\.description/u
);

// The Kimi tab renders the shared versions card wired to the Kimi settings.
assert.match(kimiTabSource, /<ProviderVersionsCard/u);
assert.match(kimiTabSource, /provider="kimi"/u);
assert.match(
  kimiTabSource,
  /next\.providers\.kimiClient\.autoUpdate\.enabled = enabled/u
);

console.log("provider version controls tests passed");
