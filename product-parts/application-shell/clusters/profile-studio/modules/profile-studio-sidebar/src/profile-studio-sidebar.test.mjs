import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sidebarSource = readFileSync(
  new URL("./profile-studio-sidebar-facade.tsx", import.meta.url),
  "utf8"
);
const inspectorSource = readFileSync(
  new URL(
    "../../profile-studio-inspector/src/profile-studio-inspector-facade.tsx",
    import.meta.url
  ),
  "utf8"
);

assert.match(sidebarSource, /Profile Studio/u);
assert.match(sidebarSource, /Создать профиль/u);
assert.match(sidebarSource, /Вернуться к рабочим пространствам и сессиям/u);
assert.match(sidebarSource, /onSelectProfile\(profile\)/u);
assert.match(sidebarSource, /profile\.status/u);
assert.doesNotMatch(sidebarSource, /window\.harnessCore/u);
assert.doesNotMatch(sidebarSource, /Native Profile/u);

for (const tab of ["Overview", "Custom System Prompt", "Custom System Tools"]) {
  assert.match(inspectorSource, new RegExp(`label: "${tab}"`, "u"));
}
assert.match(inspectorSource, /snapshot\.overview\.donorLabel/u);
assert.match(inspectorSource, /snapshot\.prompt/u);
assert.match(inspectorSource, /snapshot\.tools/u);
assert.doesNotMatch(inspectorSource, /label: "Components"/u);
assert.doesNotMatch(inspectorSource, /label: "Capture"/u);
assert.doesNotMatch(inspectorSource, /window\.harnessCore/u);
assert.doesNotMatch(inspectorSource, /<textarea/u);

console.log("profile-studio sidebar and inspector tests: OK");
