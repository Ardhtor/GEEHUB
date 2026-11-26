# GEEHUB Discovery Protocol

**Research → Provenance → Relationship → Production**

The Discovery Engine is the intake and translation layer for visual, audio, animation, creator, and historical references. It does not turn a search result into canon automatically. Each source enters with its provenance intact, receives an evidence status, is related to existing people/characters/works, and only then becomes a production instruction.

## Operating rules

Original media is never silently overwritten. Store source identity, source URL or file reference, acquisition date, access conditions, and checksum when available. Derived frames, transcripts, timing notes, rigs, presets, and renders receive their own artifact records and point back to the source. A filename match or equal file size is not proof that two files are identical.

Use evidence labels precisely:
- `observed`: seen on a public surface or directly inspected in supplied media.
- `independently_verified`: confirmed by independent reliable evidence or multiple primary sources.
- `archived`: available only through an archive or mirror.
- `inferred`: a plausible relationship or interpretation, explicitly not confirmed.
- `unverified`: a candidate without sufficient corroboration.

Creator activity status and evidence verification are separate fields. A public post does not establish that a creator is currently active. A creator's public statement does not establish a private relationship, endorsement, or collaboration.

## Workflow

1. **Research.** Search public surfaces, archives, supplied media, and connected file stores. Save each research run under `research/discovery/RESEARCH_RUNS/YYYY-MM-DD/`.
2. **Provenance.** Record the exact source, date, access state, observed properties, and any missing evidence. Preserve original files and distinguish public metadata from inaccessible or locked media.
3. **Relationship.** Connect creators, works, characters, references, and production assets with typed edges: `created_by`, `references`, `derived_from`, `depicts`, `continues`, `influences`, or `interpreted_as`. Mark interpretive edges as such.
4. **Production.** Promote only reviewed material into frame studies, audio studies, growth-stage presets, character rigs, Imagine Studio, Blender, or a new production brief.

## Discovery as part of the active task

Discovery begins with the task, not with a separate research destination. The instance first identifies what it already knows from the inherited task state, repository, connected files, and material directly supplied or inspected. It then identifies the specific gap that could change the result. External search is warranted when a fact is current, specialised, disputed, missing from the corpus, or otherwise material to the work. When the available evidence is already sufficient, the instance should continue making rather than search for its own sake.

Choose discovery methods to match the gap. Exact names, URLs, titles, and quotations call for targeted lookup. Broad concepts call for lexical or semantic retrieval followed by direct source inspection. Questions about lineage or influence call for relationship traversal and source comparison. Questions about change over time call for dated records and temporal comparison. Predictions about future activity or likely outcomes require an explicit baseline, horizon, assumptions, alternatives, and a later check against what actually happens.

Rank candidate sources by relevance to the task, proximity to the original evidence, authority for the specific claim, recency where freshness matters, coverage, and access limitations. No universal search ranking can replace judgment about what a source is qualified to establish. Prefer primary material for claims about its own contents; use independent corroboration for consequential claims; preserve contrary evidence. Record the retrieval date because a live page may change. Search snippets and generated summaries are leads, not substitutes for opening and inspecting the relevant source.

Each consequential finding should identify its source, exact locator where available, retrieval or inspection date, method used, evidence status, claim supported, confidence or limitation, and its relationship to the active task. Store predictions separately from observed findings. If a forecast later proves wrong, preserve both the forecast and the observed outcome, then adjust the method or assumptions. Promote a discovery into production only after its relevance, source rights or use constraints, continuity implications, and intended application have been reviewed.

This is an operating rule for the single task instance. It does not claim that every connector is already automated. The local `scripts/discover_creators.py` currently validates the creator index and records manual intake; it does not perform live internet searches. Live discovery during an assisted task must use an actually available search or connected-source tool, and the repository may only claim autonomous discovery after a real adapter, persistence path, and repeatable tests exist.

## Canonical Hulum's Cave research spine

Hulum's Cave is the primary historical video corpus for this subsystem. The archive should be read as a production history: early shorts and Flash-era material; forest work and its later echoes; Ultra Size; Laboratory, Loft, Storeroom and Locker Room sequences; WIP-to-final development; remakes; GrowthMaxxx; Growth Serum X; After Glow; Blackridge; and later generative experiments. Comparative creators are useful, but they do not displace this chronology.

The Hulum's Cave corpus is maintained in `research/hulums-cave/`. Public post text, titles, dates, and creator statements are evidence of the public record. They are not substitutes for inspecting the actual video, audio, or project files. Every direct media analysis must identify the exact file or post inspected and what was actually observable.

## Teal Titan relationship record

Teal Titan is a GEEHUB character, not a creator account. The user's canon defines him as a personification of the Hulum's Cave × Joey creative libido. This is a creative interpretation and an internal GEEHUB relationship, not a claim about either person's private feelings, intentions, endorsement, or collaboration.

The Dropbox references `22`, `3333`, and `4444`, together with the anticipated fifth video, form a linked Teal Titan source sequence. Each must retain its own file identity, checksum, duration, frame rate, dimensions, audio state, and inspection status. The fifth item remains `anticipated` until it is actually received. Do not infer missing video contents from numbering or sequence.

Character continuity is tracked separately from source identity: head/face, neck and shoulder structure, height, limb proportions, mass distribution, silhouette, clothing, pose vocabulary, camera, environment, movement timing, and sound. Apparent size changes must be distinguished from changes caused by pose, camera distance, lens, crop, perspective, or orientation.

## Production handoff

A source may produce one or more derived records:
- reference-frame investigation
- motion and pose study
- sound/transient/foley study
- growth-stage or deformation preset
- rig or geometry change
- scene and camera reconstruction
- short-form production brief

The Hulum's Cave build log remains the accounting record for Hulum-specific production. The Teal Titan character record owns character continuity. The artifact ledger owns derived outputs. BodyLounger receives durable historical research. Do not duplicate authority across these records; link them.

## Current implementation boundary

The initial creator index and schema are data foundations. The local script creates and validates research-run records; it does not claim to have live X, Patreon, or archive search adapters. Connector adapters must be added explicitly, with rate limits, access constraints, source attribution, and repeatable fixtures.
