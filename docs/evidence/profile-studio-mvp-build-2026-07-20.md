# Profile Studio MVP Build Evidence (2026-07-20)

Production-build evidence for active plan `profile-studio-mvp-2026-07-20`.
This record covers the integrated source and `dist/**` artifacts before the
separate macOS packaging step.

## Build Basis

- Source revision: `a295fc0bd9296e7e959cfb5da00bde957c0e45b4`
  (`fix: route studio model through session picker`).
- The Profile Studio implementation range starts at architecture promotion
  `6a4f3f3c` and ends at the source revision above.
- Application composition is the accepted single-window mode: Studio sidebar,
  reused ordinary `SessionSurfaceFacade`, and compact read-only inspector.
- Ordinary profile selection and create-time resolution now carry the same
  exact provider/model target end to end.

## Verification

The following commands completed successfully from the repository root:

- commit hooks on the final source slices: architecture, Ultracite, Knip,
  typecheck, tests and docs-sync;
- `npm test` — `Tests: OK (145)`;
- `npm run check:dup` — repository/workspace duplication reports completed;
- `npm run check:security` — `0` production vulnerabilities;
- `npm run check:links` — `Link check: OK`;
- `npm run build` — runtime TypeScript build and Vite production renderer
  build completed.

Fresh renderer artifacts built at `2026-07-20T19:01:54+0200`:

- `dist/renderer/assets/index-THkRdbcg.js` — 482080 bytes;
- `dist/renderer/assets/index-w5xcLhNv.css` — 58809 bytes.

## Built-Artifact Proof

Fixed-string checks against the production artifacts returned the following
non-zero counts:

- renderer bundle: `Profile Studio` = 5, `Custom System Prompt` = 3,
  `Custom System Tools` = 3;
- renderer exact-target call: `listSessionProfiles({modelId:` = 1;
- runtime Studio read model: `listStudioProfilesForTarget` = 1;
- runtime Kimi guard: `Draft-only until the universal client reaches 25/25`
  = 1;
- runtime picker route: `listProfilesForProvider(providerId, modelId)` = 1;
- runtime immutable resolution route: `modelId: request.model` = 1;
- runtime Codex application truth: `baseInstructions full-replacement` = 1.

## Intentional MVP Boundaries

- Kimi Studio profiles can be authored and inspected, but remain Draft-only
  until the universal client reaches 25/25 captured Native tool executors.
- Codex accepts the custom system prompt through `baseInstructions`; tools
  remain provider-fixed and read-only.
- Custom Capture, automated behavioral benchmark/verification, Normalizer and
  direct document editing by the user are not simulated in this MVP.
- Manual behavior validation and explicit approval of the current content hash
  remain the release decision for a Draft.

The next plan task rebuilds `release/mac-arm64/Harness AI.app`, verifies its
packaged `app.asar`, launches it and records a separate package identity.
