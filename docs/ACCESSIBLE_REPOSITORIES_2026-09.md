# Accessible repository inventory — September 2026

This snapshot records the repositories visible to the current GitHub connection when the constellation was inspected. It is a boundary document, not a claim that every accessible repository belongs in the public hub.

## Canonical / linked surface

- `Ardhtor/GEEHUB` — public umbrella repository; canonical constellation interface and memory layer.
- `Ardhtor/ModernTexts` — public writing/research repository; linked as a research node.
- `Ardhtor/LINUX_S` — public systems/tooling repository; linked as a systems node.

## Accessible but not promoted

- `Ardhtor/lp9hppuio88` — public and accessible, but a large visual/application surface. It remains incubating rather than being promoted into canonical navigation until its purpose, dependency boundary, and safe integration surface are clearer.

## Intentionally excluded

- `Ardhtor/PgkKKGLu966` — private repository. Its existence may inform private work, but its contents and direct navigation should not be surfaced in the public hub.

## Why this is kept separately

The project registry answers “what is in the constellation?” This inventory answers “what repositories were actually visible to the connected workspace, and what boundary applies to each one?” Keeping those questions separate prevents accidental canonization, prevents private leakage, and gives future automation a small provenance-bearing input it can compare against later snapshots.

The machine-readable counterpart is [`hub/repositories.json`](../hub/repositories.json).

This document records inspection state only; it is not a synchronization mechanism. A later pass may update it when repository access, visibility, or integration status materially changes.
