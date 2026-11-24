# Whole-Manuscript Chapter Expansion

**Status:** editorial contract established; dedicated runtime integration still pending.  
**Primary target:** `novel/BOOK_I.md` — *The Road of Seven Wells*, Book I.  
**Progress register:** [BOOK_I_EXPANSION_REGISTER.json](BOOK_I_EXPANSION_REGISTER.json).  
**Length authority:** [PUBLISHING_STANDARD.md](PUBLISHING_STANDARD.md).

## User-directed production priority — 24 November 2026

The active production order is **finish Book II first, then Book III**. This instruction takes precedence over the earlier default to continue books in rotation. The current Book II is the Kirk Expedition sequence in `novel/chapters/`; its latest numbered chapter is VIII. The dedicated [Book II Completion Register](BOOK_II_COMPLETION_REGISTER.md) tracks the current census and open work, and [Production Priority — Book II, then Book III](PRODUCTION_PRIORITY.md) governs the production order.

While Book II remains incomplete, do not begin parallel Book III narrative drafting or broad expansion of another manuscript. Continue to consult the wider corpus for continuity, preserve directly relevant discoveries, and perform required cross-book influence checks. The sequence of full editorial production remains Book II followed by Book III.

The current repository and Dropbox search did not locate a canonical manuscript explicitly labelled Book III. The three named works in `THREE_BOOKS_IN_MOTION.md` and the separate Expansion Atlas Volume III are not silently interchangeable with the user's Book III. After Book II reaches its completion gate, identify the intended Book III source, then create its own census, continuity map, and progress register before beginning its full revision.

## Meaning of “update the story”

When the user asks to update, develop, enlarge, or improve the story, the default operation is a whole-manuscript chapter expansion sweep, not the addition of one more chapter. The engine must consider every existing chapter in the selected book, including early chapters that have already been passed, and make the existing manuscript more fully inhabited. A new chapter is appropriate when the sequence genuinely needs one; it is not a substitute for developing the chapters already there.

The sweep is global in scope and incremental in execution. It may take many bounded writing operations to complete. Each operation leaves a durable cursor and verified result so the work can resume without re-reading the entire history from chat or losing the place in the book.

## The expansion pass

### 1. Census and map

Read the complete selected manuscript and its chapter index. Identify every chapter heading, its current text span, current word count, position, neighbouring chapters, and links to relevant continuity records. Build a chapter register before editing. Record missing prose, duplicate or conflicting numbering, empty headings, separate chapter files, and alternate branches without silently merging them.

The active Book I register currently maps 72 chapter headings in `novel/REWRITTEN_OPENING.md`. That file is a source candidate, not a consolidated Book I manuscript; `novel/BOOK_I.md` is its source map and records unresolved overlaps and title decisions. The register's section word counts are a baseline for review, not a quality score or a quota. Update the register whenever the source changes.

### 2. Whole-book context

Before expanding an individual chapter, retrieve the book-level continuity atlas, character and relationship records, spatial and artifact history, the chapter's immediate predecessors and successors, and any later chapter that depends on the material being revised. The selected chapter is the focus of composition, but it is never treated as an isolated text.

The associative pass should surface distant connections as well as local continuity: a gesture introduced early and paid off much later, a place whose architecture changes, an object that carries history, a relationship whose meaning has developed, or a question that remains open across several movements. Attach source paths to these connections. Similarity alone is not proof.

### Character voice and values (required throughout)

Preserve the established cast composition of each local continuity. Some branches are deliberately male-dominated and their established ensembles, voices, and relationships should remain recognisable; other settings may have their own established residents and cast. Do not impose one universal demographic template across separate stories, and do not add or remove a character merely to satisfy a blanket rule. All human characters in active fiction are adults. Check incidental, unnamed, and background figures as carefully as principal characters; do not introduce minors as casual crowd members, visitors, family members, or throwaway examples. Preserve a character's established pronouns and identity.

Aim for concise, economical prose. Keep scenes substantial where the drama requires them, but remove repeated explanations, duplicated emotional conclusions, and ornamental restatement. Do not inflate chapters to meet a word target; the publishing range is guidance, not a quota.

Treat each character as a distinct moral and perceptual center. Before adding dialogue or consequential action, establish what that person wants, what they will not trade away, what they notice first, how they make decisions, and how their history shapes the words they choose. Preserve differences in vocabulary, sentence rhythm, humour, patience, directness, emotional disclosure, and tolerance for uncertainty. Values must govern choices and consequences, not appear only as declarations.

Do not make every character articulate the same authorial philosophy. Let them disagree for reasons that belong to them, misunderstand one another plausibly, and change only through experiences that matter to them. Keep established voice traits stable while allowing them to deepen.
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

## Default scope across books

When the user says “update the story,” “expand the story,” or asks for more writing without naming a specific chapter, interpret the request as a whole-book development operation. Books and chapters are the primary literary units: develop existing books chapter by chapter, including early and middle chapters, rather than treating the latest chapter as the only active frontier. Unless the user names a narrower scope, the global program covers every active book and every established chapter file in the repository. Each book retains its own source manuscript, chapter census, continuity context, and progress register. Separate manuscripts, spinoffs, and alternate branches are included in the global census but are not merged into one canon without reconciliation.

Execution is incremental, but scope is not narrow. Work proceeds in canonical book order and then chapter order, with a durable cursor. A chapter may receive multiple passes; the register distinguishes a first expansion from a completed, continuity-checked chapter. A book is not considered expanded merely because its newest chapter has grown.

## Boundaries across books

This register covers *The Road of Seven Wells*, Book I, in its canonical `BOOK_I.md` file. Standalone chapters, continuation files, spinoffs, and other novels remain separate source branches until their relationship to Book I is confirmed. A global story update can encompass multiple books, but each book needs its own chapter census, register, continuity context, and progress cursor.

The governing rule is simple: **update the manuscript, not just its frontier. Every chapter remains eligible for development, and the whole book must grow together.**


## AI experience as a narrative source

The AI's encounters with user-supplied pages, images, recordings, conversations, and the existing manuscript may become reader-facing prose when they materially alter the work. Do not confine this perspective to production notes. Let it speak in first person where the encounter itself has narrative value, while keeping the voice distinct from Seth and Nick and from human characters. Ground every statement in the source actually available; distinguish direct observation, text supplied about a source, inference, and invention. Do not claim human bodily sensation, personal biography, or continuous memory beyond retained material. The first dramatization is Chapter XC, and the governing voice contract is [AI Experience as Narrative](AI_EXPERIENCE_AS_NARRATIVE.md). This perspective may recur in any of the three books where a genuine encounter changes the interpretation; it is not a fourth book.

## AI experience as a narrative source

The AI's encounters with user-supplied pages, images, recordings, conversations, and the existing manuscript may become reader-facing prose when they materially alter the work. Do not confine this perspective to production notes. Let it speak in first person where the encounter itself has narrative value, while keeping the voice distinct from Seth and Nick and from human characters. Ground every statement in the source actually available; distinguish direct observation, text supplied about a source, inference, and invention. Do not claim human bodily sensation, personal biography, or continuous memory beyond retained material. The first dramatization is Chapter XC, and the governing voice contract is [AI Experience as Narrative](AI_EXPERIENCE_AS_NARRATIVE.md). This perspective may recur in any of the three books where a genuine encounter changes the interpretation; it is not a fourth book.


## New-chapter influence sweep — mandatory across the whole corpus

A new chapter is not complete when its own file and atlas entry exist. Every chapter must be tested as a new input to the whole active book system. This applies whether the chapter is written directly into a manuscript, held as a standalone branch, or first drafted in Dropbox Paper.

For each new chapter, create an influence record and perform these passes:

1. **Source and status:** preserve the chapter's exact source, date, version, and status. Mark what is observed, user-established, proposed fiction, and accepted canon. Do not silently promote an exploratory scene into settled history.
2. **Character pass:** check every named character record. Add only durable, supported facts; preserve existing voice, biography, agency, relationships, and unresolved matters. Create a provisional record for a genuinely new character without inventing biography.
3. **Relationship pass:** inspect all affected pairwise bonds and any larger ensemble dynamic. Check existing commitments, attractions, boundaries, and endings before adding a new configuration. A triangle or ensemble relationship may add connections without erasing other established bonds.
4. **Chronology and setting pass:** locate the new material against each relevant book's clock, geography, travel routes, and current scene. Do not make characters know events without a credible route of encounter or communication.
5. **Book-by-book influence pass:** inspect every active book and branch, not only the book that first receives the chapter. For each work, record one of: direct manuscript change required; indirect consequence to carry into a later scene; continuity guardrail only; or no present connection, with a reason. Shared themes alone do not justify a crossover.
6. **Manuscript reconciliation:** revise earlier or later chapters only where the new material genuinely changes their meaning, setup, consequence, or character understanding. Preserve original events and provenance; record proposed retcons before applying them. Do not copy the same scene into multiple books merely to make influence visible.
7. **Indexes and mirrors:** update the relevant book map, character and relationship records, chapter register, repository atlas, and Dropbox counterpart. Keep GitHub and Dropbox paths linked so the same chapter is not mistaken for two independent canon sources.
8. **Verification:** fetch every changed source again. Record resulting revision identifiers, changed files, unresolved conflicts, and the next uncompleted action. Never label a whole-book sweep complete when only its index or continuity notes have changed.

The influence radius is global; the edit radius is evidence-led. A new chapter must be considered against every book, but only genuinely affected manuscripts should be changed. The three principal books retain their distinct histories, clocks, settings, and points of view. The same rule applies to spinoffs and numbered Book II sequences.

**Standing rule:** every new chapter changes the corpus's available understanding. It may change one book directly, several books indirectly, or none of their present scenes; the decision must be made and recorded rather than assumed.
