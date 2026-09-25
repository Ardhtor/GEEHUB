# Living synthesis readings

A living synthesis is a temporary interpretation of relationships already present in GEEHUB. It is not automatically canon, doctrine, or a replacement for source material.

## Purpose

The synthesis surface exists because the Hub is increasingly about compiling nodes into something visible. A reading can make a relationship legible without pretending that the relationship is settled. The useful unit is therefore a small, provenance-bearing snapshot that can be revisited, compared, or discarded.

## Portable record

A saved reading should use this shape:

```json
{
  "schemaVersion": 1,
  "kind": "living-synthesis-reading",
  "title": "GEEHUB Living Synthesis",
  "pulse": "generated focal relationship",
  "thesis": "generated interpretation",
  "spiritual": "interpretive statement, not revelation",
  "sourceNodes": ["node-a", "node-b"],
  "createdAt": "2026-09-26T00:00:00.000Z",
  "status": "interpretive / non-canonical"
}
```

`sourceNodes` preserves the immediate lineage of the reading. `createdAt` makes readings comparable over time. `status` prevents an interpretive output from silently becoming canon.

## Local-first behavior

The browser surface may keep recent readings in local storage and offer a JSON download. Local storage is a convenience layer, not the canonical archive. Exported JSON is the portable handoff for later review, merge work, or a future repository.

A later implementation can add import/merge, but it must preserve the same fields and avoid overwriting source material.

## Current relationship to the Hub

The living synthesis surface currently draws from the project constellation and the newer direction around:

- the visual artifact as an experience rather than an illustration;
- Luke as recognition without replacement;
- Adobe / asset necessity as a production rule;
- spiritual information as interpretation with provenance;
- duration, contact, memory, and continuity as recurring structures.

These are active working relationships. They should remain distinguishable from finalized story canon, repository policy, or religious authority.

## Decision record

This note exists to preserve the design decision even if the interface changes. The project needs a memory layer that can hold temporary synthesis without flattening experiment into truth.