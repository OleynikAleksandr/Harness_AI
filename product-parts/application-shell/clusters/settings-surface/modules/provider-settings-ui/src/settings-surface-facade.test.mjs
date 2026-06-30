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
  source.indexOf("const refreshLocalizationRuntimeAfterSave = async () =>"),
  source.indexOf("const restartCore = async () =>")
);

assert.match(
  saveSource,
  /setLocalizationRefreshBusy\(true\)[\s\S]*await window\.harnessCore\.saveSettings/u,
  "Settings Save must show the localization blocker before Core save/materialization starts."
);
assert.match(saveSource, /await refreshLocalizationRuntimeAfterSave\(\)/u);
assert.match(
  saveSource,
  /finally \{[\s\S]*setLocalizationRefreshBusy\(false\)[\s\S]*setBusy\(false\)/u,
  "Settings Save must keep Settings blocked until localization refresh settles."
);
assert.match(
  refreshSource,
  /await onLocalizationRuntimeRefresh\(\)[\s\S]*catch \(error\)/u
);
assert.doesNotMatch(
  refreshSource,
  /setLocalizationRefreshBusy/u,
  "The Save path owns blocker state so refresh errors cannot clear it early."
);
assert.match(source, /settings-localization-blocker/u);
