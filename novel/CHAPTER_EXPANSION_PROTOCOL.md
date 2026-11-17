# Whole-Manuscript Chapter Expansion

**Status:** editorial contract established; dedicated runtime integration still pending.  
**Primary target:** `novel/BOOK_I.md` — *The Road of Seven Wells*, Book I.  
**Progress register:** [BOOK_I_EXPANSION_REGISTER.json](BOOK_I_EXPANSION_REGISTER.json).  
**Length authority:** [PUBLISHING_STANDARD.md](PUBLISHING_STANDARD.md).

## Meaning of “update the story”

When the user asks to update, develop, enlarge, or improve the story, the default operation is a whole-manuscript chapter expansion sweep, not the addition of one more chapter. The engine must consider every existing chapter in the selected book, including early chapters that have already been passed, and make the existing manuscript more fully inhabited. A new chapter is appropriate when the sequence genuinely needs one; it is not a substitute for developing the chapters already there.

The sweep is global in scope and incremental in execution. It may take many bounded writing operations to complete. Each operation leaves a durable cursor and verified result so the work can resume without re-reading the entire history from chat or losing the place in the book.

## The expansion pass

### 1. Census and map

Read the complete selected manuscript and its chapter index. Identify every chapter heading, its current text span, current word count, position, neighbouring chapters, and links to relevant continuity records. Build a chapter register before editing. Record missing prose, duplicate or conflicting numbering, empty headings, separate chapter files, and alternate branches without silently merging them.

The current Book I register records 72 chapter headings in `novel/BOOK_I.md`. Its initial word counts are a baseline for progress tracking, not a quality score or a quota. Update the register whenever the manuscript changes.

### 2. Whole-book context

Before expanding an individual chapter, retrieve the book-level continuity atlas, character and relationship records, spatial and artifact history, the chapter's immediate predecessors and successors, and any later chapter that depends on the material being revised. The selected chapter is the focus of composition, but it is never treated as an isolated text.

The associative pass should surface distant connections as well as local continuity: a gesture introduced early and paid off much later, a place whose architecture changes, an object that carries history, a relationship whose meaning has developed, or a question that remains open across several movements. Attach source paths to these connections. Similarity alone is not proof.

### 3. Expand the existing chapter

Revise the chapter in place. Retain its established dramatic events, character identities, chronology, meaningful dialogue, and intended unresolved questions. Give each existing event the room it needs: arrival, setting, physical action, differentiated perception, character intention, interaction, consequence, and transition. Add scenes where the chapter's dramatic movement requires them. Develop ordinary life and the material world alongside central events.

Use the established long-form GEEHUB prose standard: substantial connected paragraphs, sustained scenes, lived environmental detail, distinct character behaviour, and a sense that the world continues beyond the immediate plot. Let characters notice, infer, decide, and act with pace. Do not make them repeat obvious points or wait through artificial rounds of exposition.

Expansion is not padding. Do not repeat the same emotional conclusion, restate an event in different words, inflate a minor beat into a revelation, or add unrelated spectacle to reach a word count. A short chapter may remain short when it has a deliberate structural function; record the reason rather than forcing it to 4,000 words.

### 4. Publishing scale

Use the publishing standard as the default scale: 4,000–7,000 words for a full chapter, and 6,000–9,000 for a major turning-point chapter when the material sustains it. Interludes and deliberately compressed transitions may remain shorter when structurally necessary. Length is evidence of developed dramatic material, not the objective by itself.

### 5. Continuity propagation

After revising a chapter, check its preceding and following chapters. Update the relevant character, relationship, location, object, and event records if the expanded material establishes a durable fact. If the new detail changes how an earlier event is understood, record the proposed revision and reconcile the affected chapter rather than allowing incompatible versions to accumulate unnoticed.

Keep observation, interpretation, experiment, and canon distinct. Preserve the prior version and its provenance. Do not silently change established events to make the expanded chapter easier to write. Unresolved questions remain active material.

### 6. Verification and progress

A chapter is not complete because a draft was generated. It is complete only after:

- the revised chapter has replaced or deliberately revised the existing chapter in its source file;
- its chronology, names, relationships, setting, artifacts, and unresolved threads have been checked against its neighbours and continuity atlas;
- the resulting file has been fetched again and checked;
- the prior and resulting revision identifiers or hashes have been recorded;
- the register records its new word count, completion state, source revision, and remaining issues.

The next operation resumes from the first incomplete chapter in canonical order, unless the user chooses a different target. A global pass may pause and resume at any chapter boundary. It must never mark untouched chapters complete.

## Runtime separation

The existing spaced-retrieval writer in `scripts/tractus_engine.py` is designed around one due thread and at most one bounded addition to a restricted set of destinations. It is not yet the chapter-sweep executor and currently does not revise `novel/BOOK_I.md` in place. The register is durable working memory and the protocol defines the required operation, but the dedicated executor must still be implemented and tested before automated whole-book revision can be claimed.

Chapter expansion must not be gated by the 1/3/7/14/30-day spaced-retrieval schedule. Retrieval protects recall; the chapter register controls editorial coverage. They are complementary systems with separate cursors.

## Boundaries across books

This register covers *The Road of Seven Wells*, Book I, in its canonical `BOOK_I.md` file. Standalone chapters, continuation files, spinoffs, and other novels remain separate source branches until their relationship to Book I is confirmed. A global story update can encompass multiple books, but each book needs its own chapter census, register, continuity context, and progress cursor.

The governing rule is simple: **update the manuscript, not just its frontier. Every chapter remains eligible for development, and the whole book must grow together.**
