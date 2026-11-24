# Narrative Continuity Audit

**Started:** 24 November 2026  
**Status:** active whole-book continuity sweep; first-pass corrections and Book II body-level line edits are complete, but the full corpus is not yet clean.  
**Working rule:** correct demonstrable contradictions; preserve separate books and local geographies; record unresolved questions rather than filling them with invented canon.

## The naming boundary

GEEHUB is the repository and production workshop. It is not the name of the fictional world, a city, an institution, or a realm. The men should use the names that belong to their own lives and places. Northgate, the Institute of Becoming, the Complex, the Grand Meridian, the Measure House, the Twin Grounds, and Veyrthalis are distinct local names with distinct scopes. None is automatically the umbrella name for everything.

No single in-world name for the wider connected setting has yet been verified as a name coined by the men in a scene. Do not fill that absence by selecting a brand, a repository term, or a place name. Let the inhabitants reach the need for a wider name and give it to their shared world in ordinary conversation. The scene in which Andrew names the Institute's first software project **the Living Ledger** is a useful model: the name emerges from a disagreement about what the thing should mean, then the others test and adopt it.

The term **Tractus** appears in repository continuity and lore records. Until a story scene establishes who uses it and what they mean by it, treat it as an editorial/continuity label rather than the confirmed name the men give their world.

## Corrections made in this pass

| Area | Error | Correction |
|---|---|---|
| Character identity | The reaction interface displayed the agent ID `joseph` as “Joey,” despite the character records explicitly distinguishing Joseph from Joey. | The display name is now Joseph. Joey remains the separate Grand Meridian character. |
| Story interaction | Book II scene actions were emitted as `UTTERANCE` events with `from: 'you'`. The reaction handler treats that event type as dialogue spoken by a named agent, so it discarded these events rather than responding to the visitor's action. | Scene actions and exhibition contributions now emit `ENCOUNTER` events, which the shared interaction and character-reaction systems accept. |
| Navigation | The chapter index listed Chapter XC — The Image I Could Not See twice. | Removed the duplicate entry. |
| Book II production handoff | The register and chronology map retained stale chapter counts, Dropbox revisions, and a Chapter VI handoff after the nine chapter line edits were complete. | Reconciled all nine narrative counts and source hashes against GitHub, verified all nine Dropbox Paper bodies against their current sources, and advanced the next operation to the whole-book continuity sweep. |
| Editorial language | The AI narrative specification described the fiction as “GEEHUB” as though the product name were the world. | Reworded the passage to refer to the fiction, not the repository brand. |
| In-world naming | The editorial directive did not explicitly distinguish the production-workshop name from the names used by inhabitants. | Added a naming boundary: no externally assigned umbrella name; let characters name things through use and conversation. |
| Book I diegetic branding and age framing | The environmental rewrite gave the future city a sign reading “GEEHUB,” repeated the word across its surfaces, used “the Hub” as an established in-world name, and included several child-coded characters. | Removed the imposed brand and unearned proper name. An unmarked sign remains; Luke and Joseph defer naming the place until they understand it. The rewrite's child-coded roles are now adult residents or travelers. |
| Narrative register | `novel/WORLDS.md` used “the Hub,” “the system,” “world-engine,” “FOMO engine,” and “world graph” inside passages presented as story prose. | Recast the identified passages in terms of rooms, roads, maps, gatherings, and actions. |

## Book II line-edit completion snapshot

All nine chapters of *The Kirk Expedition* have now received a first body-level line-edit pass. The current narrative census is 36,319 words, excluding continuity records. All nine Dropbox Paper mirrors have been read back and verified against their current GitHub Markdown sources. GitHub remains canonical; Dropbox Paper is the production and reading surface. The chapter-by-chapter expansion and line-edit work is not a declaration of manuscript completion: the next step is a whole-book continuity sweep, followed by a final copyedit and an earned ending. The authoritative counts, Paper revisions, and source fingerprints are maintained in `novel/BOOK_II_COMPLETION_REGISTER.md`.

## Manuscript-source correction

The three-book map originally linked `novel/BOOK_I.md` as if it were the consolidated manuscript for *The Road of Seven Wells*. On inspection it was an empty file. Its replacement is now an explicit source map. The candidate text is distributed across `REWRITTEN_OPENING.md`, `BOOK_I_FINAL_MOVEMENT.md`, `BOOK_I_CONTINUATION_02.md`, `BOOK_I_CONTINUATION_03.md`, and `BOOK_I_CONTINUITY_CHAPTERS.md`; the latter files contain overlapping chapter numbers and cannot be appended in sequence without comparison.

The environmental rewrite identifies itself as *The House of Open Screens*, while the three-book index calls the work *The Road of Seven Wells*. The source map preserves both titles and marks the decision open. No title has been silently chosen. The earlier 162,974-word Book I estimate is now marked as an unverified historical repository-level figure, not a count of a consolidated manuscript.

## Book I register correction

The previous `novel/BOOK_I_EXPANSION_REGISTER.json` claimed 72 completed chapters and 187,204 words in `novel/BOOK_I.md`, citing the empty-file blob. Those records were not supported by the file they named. The register has been rebuilt against `novel/REWRITTEN_OPENING.md`: 72 headings, approximately 38,150 words, with all chapters queued for review. The old 72 chapter records and completion claims remain in a `legacy_unverified_chapters` field rather than being deleted or treated as valid current status. The unusual heading `XLIX-I — The Men Who Stayed` is retained as authored and flagged for ordinal review. This current register describes the rewritten opening only; it does not settle Book I's title or consolidate the overlapping continuation files.

## Unresolved continuity questions

### First-person identity in “Three Years”

In `novel/WORLDS.md`, the passage **THREE YEARS** says that Joseph and “I” had been apart for three years, then describes Joseph reaching for the narrator's hand. The current AI-narrator contract permits first-person narration of received material and changed interpretation, but does not permit the AI voice to claim a human body or physical contact. The passage does not identify who “I” is. Joseph/Kirk continuity is established elsewhere, but that is not enough to silently assign this passage to Kirk or to the AI narrator. Establish the speaker from the originating scene or source before revising it.

### Chapter numbering and manuscript membership

The repository contains same-ordinal files in shared folders:

- `novel/CHAPTER_XXIII_SERUM_RULES.md` and `novel/CHAPTER_XXIII_THE_CHEST_IN_THE_WOODS.md`
- `novel/CHAPTER_XXXIII_THE_MAN_WHO_KNEW_HOW_TO_WAIT.md` and `novel/CHAPTER_XXXIII_THE_SECOND_CHAIR.md`
- `novel/chapters/CHAPTER_LXXIV_THE_FIRST_REPORT.md` and `novel/chapters/CHAPTER_LXXIV_THE_MORNING_HAS_ITS_OWN_ARCHITECTURE.md`
- `novel/chapters/CHAPTER_LXXV_THE_TABLE_AFTER_RAIN.md` and `novel/chapters/CHAPTER_LXXV_THE_WORKSHOP_OF_UNFINISHED_THINGS.md`

These may belong to different books or parallel continuities, because the repository carries three principal manuscripts and connected branches. Their headings alone do not establish a common sequence. Do not renumber them until each file has been mapped to its parent manuscript and the intended order has been checked against the continuation registers. The duplicate Chapter XC navigation link was an actual index error and has already been removed.

### Story text mixed with production traces

`novel/WORLDS.md` had 356 structured world-pulse records mixed into its story material: four malformed introductory pulses and 352 later records with Seth/Nick text, source-retention lines, and pressure/memory values. All 356 records are now preserved in `novel/WORLDS_ENVIRONMENT_PULSE_ARCHIVE.md`; the structured pulse blocks have been removed from the narrative file without deleting their contents or source paths. The remaining first-person speaker ambiguity in the “Three Years” passage is still unresolved.

### Cross-book relationships

The Joseph/Kirk direction, Andrew/Kirk's established history, Michael/Kirk's secret and gentle relationship, and the provisional Ian/Gabe/Kirk branch must remain distinct. The provisional triangle is not yet placed on the Book II chronology. Do not collapse these relationships into one rivalry or assume disclosure, exclusivity, or a shared timeline that the scenes have not established.

### Andrew and Kirk — the nature of their earlier bond

Book II, Chapter IV — *The Promises That Keep* gives Andrew and Kirk a pre-expedition history marked by easy familiarity, mutual affection, shared private promises, and language of chemistry. The later relationship records describe Andrew's attention to Kirk as a separate unresolved pressure and do not define the earlier bond as romantic, former partnership, friendship, or something else. This may be deliberate complexity, but its status is not explicit. Preserve both records; do not invent a breakup, affair, or exclusivity agreement. Before a later chapter relies on the relationship's past, establish what the two men understood that bond to be and how it coexists with Joseph and Kirk's eventual direction.

## Additional first-pass corrections and open items

### Alternate Book I sources

The following staged/alternate sources were checked without merging or renumbering their contents:

- `BOOK_I_CONTINUATION_02.md` and `BOOK_I_CONTINUATION_03.md`: removed the repository brand from their file headings; their text did not contain child-coded cast references or an imposed `GEEHUB` place name.
- `BOOK_I_FINAL_MOVEMENT.md`: removed the repository brand from the heading and changed the arcade's child crowd to adult residents.
- `BOOK_I_CONTINUITY_CHAPTERS.md`: removed the repository brand from the heading; converted child-coded travelers and the faceless child into adult travelers/residents; changed the closing “Hub did not restart” line to “The place did not begin again.” The file remains an overlapping supplement, not an accepted insertion into the canonical sequence.

These edits do not make the alternate sources canonical. Their repeated chapter numbers still require comparison with the rewritten opening and one another.

### Other manuscript corrections

- `CHAPTER_XLIII_THE_EXCITEMENT_OF_BEING_HERE.md`: changed “male excitement in GEEHUB” to “male excitement among the men who lived there.” The paragraph now locates the feeling in the shared life of the western residence rather than the repository brand.
- `EXPANSION_VOLUME_THE_MANY_OPEN_ENDS.md`: removed GEEHUB from the volume heading and replaced the afterword's “GEEHUB's present” with “the men's present.”
- `MUSCLE_MYTH_GENTLE_KING_LION.md`: changed “primary GEEHUB name” to “primary story name”; changed children measuring their height to former residents' marks; described the procession's apprentices as adult; and changed the mountain guide's “childhood” familiarity to having known the route for many years.
- `THE_GOD_DADDIES_AFTER_THE_ROAD.md`: removed the repository brand from the post-book cycle heading.

### In-world “Hub” naming still needs provenance

Several unassigned numbered chapters, especially `CHAPTER_XXXII_THE_MEMORY_THAT_LOOKED_BACK.md` and `CHAPTER_XXXIII_THE_MAN_WHO_KNEW_HOW_TO_WAIT.md`, use “the Hub” as an in-world machine or presence. Chapter XXXIII says the machine had a name before Bill's account, but the originating naming scene is not currently linked in the source map. Do not assume this is the final name of the wider world. Establish whether “the Hub” is a name the men themselves gave to a particular machine, room, or service, or whether it is an editorial shorthand. The setting-wide name remains unestablished.

### Numbered production essay

`CHAPTER_XLI_THE_WORK_HAS_A_WEATHER.md` reads as a production essay rather than a diegetic scene: it directly addresses a “you,” refers to “the user,” and explains production practice. Its number and location under `novel/` make it appear to be part of a numbered narrative sequence, but its manuscript membership is unverified. Keep it unmapped until a parent book and intended form are established; do not silently rewrite it as dialogue or move it into a different book.

## Audit method for subsequent passes

1. Identify the manuscript and local continuity before editing a scene.
2. Compare the passage with its chapter neighbors, character record, relationship record, place atlas, and current continuation register.
3. Check names, ages/adult framing, relationship knowledge, chronology, objects, routes, geography, point of view, and what each character could know at that moment.
4. Separate diegetic language from editorial notes, production metadata, and engine vocabulary.
5. Correct only what the evidence supports. Preserve earlier states and record unresolved conflicts.
6. Re-read the changed passage in sequence and verify its indexes and cross-references.

This audit is a living correction register. A clean file is not proof that the entire manuscript or every connected story has passed review.
