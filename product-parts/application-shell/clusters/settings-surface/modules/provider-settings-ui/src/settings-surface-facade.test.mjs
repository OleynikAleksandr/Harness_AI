import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./settings-surface-facade.tsx", import.meta.url),
  "utf8"
);

const saveSource = source.slice(
  source.indexOf("const save = async () =>"),
  source.indexOf("const restartCore = async () =>")
);
const refreshSource = source.slice(
  source.indexOf("const refreshLocalizationRuntimeAfterSave = () =>"),
  source.indexOf("const restartCore = async () =>")
);

assert.doesNotMatch(
  saveSource,
  /await onLocalizationRuntimeRefresh\(\)/u,
  "Settings Save must not stay busy while localization runtime payload refreshes."
);
assert.match(saveSource, /refreshLocalizationRuntimeAfterSave\(\)/u);
assert.match(refreshSource, /setLocalizationRefreshBusy\(true\)/u);
assert.match(refreshSource, /onLocalizationRuntimeRefresh\(\)[\s\S]*\.catch/u);
assert.match(
  refreshSource,
  /\.finally\(\(\) => \{[\s\S]*setLocalizationRefreshBusy\(false\)/u
);
assert.match(source, /settings-localization-blocker/u);
