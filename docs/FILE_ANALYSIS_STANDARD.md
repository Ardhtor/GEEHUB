# GEEHUB File Analysis Standard

**Status:** operational standard, version 1  
**Purpose:** move from file inventory and brief description to repeatable, source-grounded analysis that can be compared, revisited, and used in production.

## The central correction

A file is not analysed merely because its name, dimensions, duration, or general subject has been recorded. Those facts are inventory or technical inspection. Content analysis requires examination of the source itself, observations tied to exact locations inside it, a record of what was and was not examined, and interpretations that remain visibly separate from evidence.

GEEHUB should retain the source in its full specificity. A small detail is not disposable because it does not fit the headline description. A gesture, clothing fold, camera shift, recurring object, line of text, background structure, lighting change, or change between two frames may become important when compared with other material. Do not flatten a rich file into one caption or make every file serve the same project purpose.

This standard joins the existing Visual Evidence Ledger, Library Image Atlas, chat/asset Memory Bridge, source-review page, video analysis scripts, and corpus graph. It does not claim that those components are already one automated service. It supplies the common record they can share.

## Four layers, always kept distinct

1. **Source and provenance.** Identify the exact original file, its stable source ID, location, format, technical properties, integrity state, and relationship to any copies or derivatives. Preserve the original unchanged. A filename, search result, thumbnail, attachment pointer, or Dropbox listing is not proof that the underlying binary has been opened.
2. **Direct observations.** Record what can actually be seen, heard, read, or measured in the source. Every consequential observation should point to a page, timecode, frame, region, paragraph, line, sheet, row, or other locator. Use concrete descriptions before labels. Preserve uncertainty and contradictions.
3. **Interpretations and hypotheses.** Explain what observations might mean, what other explanations remain plausible, and what evidence would distinguish them. An interpretation must cite the observation IDs it depends on. Similarity is a candidate relationship, not proof of common identity, intent, chronology, or causation.
4. **Generative applications.** Record what the source might contribute to a character, environment, mechanism, model, scene, research question, or production task. State what is preserved, what is transformed, and what is newly invented. A creative result never becomes evidence about the original source.

## A standing embodiment / psychosomatic reading

Consider embodiment as a regular analytical layer where the material supports it, not as a compulsory explanation of every file and not as the only interpretive lens. Relevant visual material can include posture, pose, gesture, muscular organization, balance, effort, relaxation, contact with objects or surroundings, repeated bodily motifs, and changes across a sequence. A reading may explore identification, expectation, somatic memory, anticipation, self-presentation, strain, comfort, or transformation, but it must be labelled as a hypothesis and linked to the observable cues that prompted it.

Describe what is visible before assigning meaning. Separate a body position from a claim about a person's feelings or intentions. Do not infer a real person's private desires, consent, relationships, diagnosis, or inner state from an image or recording. For fictional characters, these can be explored as narrative possibilities, while still preserving the distinction between established canon and interpretation. When the source does not support a psychosomatic reading, record that it was considered and leave it open rather than inventing one.

## The analysis pass

### 1. Resolve the source

Start from the original or the best available verified copy. Record the stable source ID, exact path or URL, provider, filename, file kind, size, modification/acquisition dates when available, and a SHA-256 digest when the binary can actually be read. Record whether the file is original, copy, crop, transcode, screenshot, frame extraction, or generated derivative. Link derivatives to their parents; never overwrite the original.

If only a listing, thumbnail, cached extract, partial text, or attachment reference is accessible, say so. Do not describe the source as fully inspected.

### 2. Establish scope and coverage

State the question or reason for examining the file and the level of coverage achieved. Count the units that could be reviewed and the units actually reviewed. List skipped or inaccessible units and why. Sampling is acceptable for discovery, but a sample must be described as a sample.

Use these completion levels consistently:

- **Inventoried:** file and source locator recorded; content not yet examined.
- **Technically inspected:** metadata, structure, or file integrity examined; content review may still be pending.
- **Content inspected:** the relevant source content has been directly examined and observations recorded with locators.
- **Comparatively analysed:** content-inspected sources have been compared and candidate relationships or differences recorded.
- **Production ready:** source, observations, limitations, permissions/use boundaries, continuity decisions, and intended derivative requirements have been reviewed for a named production task.

Never promote a file to a higher level because a tool ran successfully. The level describes what was actually examined.

### 3. Inspect at the right scale

Use a broad pass to understand the whole source, then return at higher resolution to passages or regions that matter. Record the broad structure first, then the details. A second pass should refine or correct the first rather than silently replace it. Preserve both passes and their dates.

**Images:** inspect the complete image before selecting crops. Record composition, camera angle and distance, perspective, visible subjects or objects, pose, clothing, body proportions where relevant, environment, lighting, material, text, and meaningful background details. Add region locators or crops for subtle features. When physique or shape continuity matters, compare like with like: orientation, pose, framing, lens perspective, distance, scale references, and clothing must be considered before treating a difference as physical change. Measurements require a stated method and confidence; do not manufacture precise anatomy from an uncalibrated photograph.

**Video:** establish duration, frame rate, dimensions, audio streams, and shot boundaries. Review the entire runtime at least once for sequence and context. Use adaptive sampling: sparse checkpoints for stable passages, denser frames around cuts, gestures, pose changes, transformations, or other events. Preserve exact timestamps and return to playback around important transitions. A six-frame contact sheet or motion-energy pass is a navigation aid, not complete visual analysis. Record camera movement separately from subject movement, and distinguish pose, crop, perspective, lighting, and clothing changes from actual shape change.

**Audio:** establish duration, channels, sample rate, and codec, then listen across the full relevant duration. Segment speech, music, environmental sound, silence, and transitions with timestamps. Distinguish heard words from uncertain transcription, speaker attribution, and interpretation. Preserve a no-speech or inaudible finding when that is what the source supports.

**Documents and PDFs:** inspect the page sequence, headings, paragraphs, tables, captions, footnotes, annotations, and embedded figures relevant to the task. Cite page and section locations. A text extract is not a substitute for inspecting a page when layout, diagrams, handwriting, scans, or image content matter. Treat OCR as fallible auxiliary text, not as the visual source of truth.

**Code and project files:** identify language, entry points, dependencies, data contracts, callers, outputs, configuration, and tests. Separate static reading from executed behavior. State whether a test was run and its result; do not describe code as working merely because it parses or looks plausible. Follow relationships between source files rather than analysing an isolated function when system behavior depends on its callers.

**Spreadsheets and datasets:** record workbook/sheet structure, headers, dimensions, formulas, units, missing values, duplicates, outliers, filters, and relevant row/cell locations. Separate displayed values from formulas and calculated results. Inspect the full relevant range before making corpus-wide claims; disclose any sampling.

**Archives and folders:** inventory nested paths and file types, note unreadable or unsupported entries, and preserve the original hierarchy. Do not infer archive contents from its filename. Record duplicate candidates and distinguish byte-identical duplicates from visually or semantically similar files.

### 4. Write observations before interpretations

Each observation should contain:
- one source ID and precise locator;
- one or more specific details, preferably one claim per observation;
- evidence type: direct visual, literal text, technical metadata, computed measurement, structural, or audio-perceptual;
- confidence and any visibility/access limitation;
- measurement name, value, units, and method where applicable.

Do not combine a visible fact and its explanation in one sentence. Prefer “the shoulder line is higher in frame 18 than in frame 12” to “the subject becomes more confident.” If the cause is unclear, record the difference and leave the cause unresolved.

### 5. Compare sources without collapsing them

Compare files only after each has a source record and enough content observations to make the comparison meaningful. Use exact hashes for byte-identical matches. Use image/audio/video similarity, filenames, dates, or textual overlap to find candidates, not to confirm a relationship automatically.

For visual continuity, compare stable features and capture conditions. Preserve alternate crops, edits, and contradictory appearances. For chronological claims, require source dates or sequence evidence; filename order alone is weak. For claims about a real person's identity or private relationship, do not turn visual resemblance or recurring motifs into identification.

Every proposed connection should name both endpoints, explain the shared or contrasting evidence, record confidence, and remain **proposed** until reviewed. Confirmed, rejected, and unresolved relationships all remain in the graph so that future passes do not silently revive a rejected match.

### 6. Preserve the negative space

Record important absences and limits: an object not visible in a crop, an unreadable label, a missing audio segment, an inaccessible page, a pose that cannot be compared, or a source date that is unknown. “Not established” is different from “does not exist.” Do not fill gaps using memory, a character name in a filename, a prompt, or a neighbouring file.

### 7. Link the result to future work

A useful analysis produces more than a paragraph summary. It should leave a navigable source record, a set of observations, separate interpretations, unresolved questions, proposed relationships, and any production applications. Link relevant records into the Library Image Atlas, Visual Evidence Ledger, source register, character/place/project records, and corpus graph as appropriate. Keep private or unrelated personal material outside the public creative corpus unless the user explicitly directs otherwise.

For every derivative or generated asset, record:
- parent source IDs and specific observation IDs;
- what was retained from the source;
- what was changed, exaggerated, normalized, omitted, or invented;
- continuity constraints and unresolved choices;
- derivative path, version, and review status.

## Quality and confidence

Use confidence for an individual claim, not as a single score for the whole file:

- **High:** clearly visible, audible, readable, or directly measured under stated conditions.
- **Medium:** reasonably supported but affected by crop, compression, ambiguity, or incomplete context.
- **Low:** plausible candidate that needs another view, source, or review.
- **Unrated:** not yet assessed.

Coverage and confidence are separate. A high-confidence detail from one frame does not make the entire video well analysed. A complete inventory does not mean that all content has been interpreted. A technically verified binary does not establish what it depicts.

## What “done” means

A file is content-inspected only when the source and access level are clear, its scope and coverage are recorded, the relevant content has been directly examined, meaningful details are stored with exact locators, interpretations cite observations and include plausible alternatives, contradictions and gaps remain visible, and the next useful connections are identified. Comparative analysis additionally requires both sources to meet that threshold for the comparison being made.

A batch is not done because every filename has a label. It is done when each file has an honest state, the important material has been examined deeply enough for the stated purpose, and the collection can be searched by evidence, motif, sequence, form, place, character, or production use without erasing source differences.

## Existing GEEHUB components

- [Visual Evidence Ledger](VISUAL_EVIDENCE_LEDGER.md) — append-only visual observations and continuity.
- [Library Image Atlas](LIBRARY_IMAGE_ATLAS.md) — source-level image inventory and bounded reference use.
- [Library Image Study](LIBRARY_IMAGE_STUDY.md) — collection-level synthesis; its claims must retain their stated sampling limits.
- [Chat ↔ World Asset Memory Bridge](CHAT_ASSET_MEMORY_BRIDGE.md) — conversation, asset, artifact, and source relationships.
- `engine/media-inspector.html` — local browser viewing, frame stepping, and sampling.
- `engine/video/source-review.html` — local video contact sheet and source report.
- `engine/video/source_inspector.py` — technical video report and timestamped frame extraction.
- `engine/video/analyze_source.py` — frame-change and coarse motion-interval analysis.
- `media/HULUMS_CAVE_SOURCE_ANNOTATION_TEMPLATE.json` — detailed shot, camera, pose, shape-change, wardrobe, and lighting annotations.

These tools have different capabilities. Their outputs should be normalized into the shared [file-analysis record](../engine/schemas/file-analysis.schema.json) rather than treated as interchangeable analyses. The accompanying [template](../engine/schemas/file-analysis.template.json) is a starting record, not a substitute for inspecting the source.
