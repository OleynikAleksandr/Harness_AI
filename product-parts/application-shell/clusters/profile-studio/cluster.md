# Profile Studio Cluster

## Boundary

Owns the Application Shell presentation of provider/model-scoped Profile
Studio. It renders only typed Core targets, compatible profile rows and
inspector snapshots, and forwards confirmed create/delete/approve intents;
lifecycle, authoring, capability, deletion and persistence truth remain in
Core Runtime.

Create preparation is rendered as the pending state of one Core RPC. The
renderer does not divide Capture into local stages or locate artifacts; it
only freezes the chosen target, shows the Core-operation explanation and
renders the returned structured failure or converged success.

The shell owns two accessible presentation-only separators between the three
columns. They resize the left target/profile sidebar and right inspector while
the reused central session surface absorbs the remaining width; explicit
minimum bounds prevent any divider from collapsing another pane.

## Owned Modules

- `profile-studio-sidebar`
- `profile-studio-inspector`
- `profile-studio-shell`

## Facade Rule

The renderer passes snapshots and raw user intents through facade props. These
modules never scan profile or capture files, compile prompts, infer provider
capabilities or parse creator-agent output.
