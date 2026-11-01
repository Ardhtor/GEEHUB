# GEEHUB Book Breeder

Books are reproductive works. A book can produce a continuation, counter-book,
commentary, fictional setting, visual adaptation, or a crossbred descendant.
The lineage graph preserves ancestry without requiring descendants to repeat
their parents.

## Core model

- **Book** — an independently versioned work with a stable identity.
- **Lineage** — a directed graph of books, parentage, crossbreeds, and events.
- **Material** — passages, concepts, and open questions retained with provenance.
- **Breeding operation** — an explicit instruction describing what to preserve
  and what to mutate.
- **Descendant** — a new work with one or more parents; parent works are not
  overwritten.

## Minimal use

```js
import {
  createBook, createBookLineage, addBookToLineage,
  breedBook, recordBookMaterial, exportBookManifest
} from "./core/lineage.js";

let lineage = createBookLineage("Religion as Dialogue");
const source = createBook("Religion as Dialogue", {
  kind: "manuscript",
  uri: "library://religion-as-dialogue"
});
lineage = addBookToLineage(lineage, source);

lineage = recordBookMaterial(lineage, source.id, {
  concepts: [{ label: "dialogue", provenance: source.id }],
  openQuestions: [{ question: "What makes dialogue possible?" }]
});

lineage = breedBook(lineage, [source.id], {
  title: "The Impossibility of Dialogue",
  premise: "A critical descendant that tests the limits of mutual understanding.",
  preserve: ["selected passages", "concept ancestry"],
  mutations: ["invert the central assumption", "introduce metacommunication"],
  instruction: "Develop an independent argument; do not paraphrase the parent."
});

const manifest = exportBookManifest(lineage);
```

## Production boundary

This module creates and maintains the generative lineage and its metadata. It
does not pretend to write complete manuscripts, perform semantic extraction,
or typeset books. Those are adapters to connect next: corpus extraction,
AI manuscript generation, editorial review, and batch publishing (for example,
InDesign Data Merge for template-driven output). A production run should retain
the source corpus, prompt/instruction, model/provider, review state, and output
artifact for every descendant.

## Breeding principles

1. Preserve source works as immutable references.
2. Give every descendant a distinct premise and editorial purpose.
3. Retain passage and concept provenance.
4. Allow one-to-many descent and many-to-one crossbreeding.
5. Record every operation so the family tree remains inspectable.
6. Never confuse a generated draft with a reviewed or published book.
