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

### Andrew and Kirk — established affectionate bond; exact status still open

Book II, Chapter IV — *The Promises That Keep* explicitly establishes that Andrew and Kirk share an affectionate bond older than the expedition. Their familiarity, chemistry, ordinary affection, and reciprocal promises are now stated in the chapter's continuity note; this should not be described as a newly formed attachment or as mere one-sided pursuit. Chapter VI continues the attention-pressure thread, while Chapter IX leaves a later conversation scheduled but unresolved. The precise status of the earlier bond—friendship, romance, former partnership, or another mutually understood arrangement—is still not named. Preserve the established affection without inventing exclusivity, a breakup, or a new disclosure. Future chapters should let the men clarify what the bond means to them where that distinction matters, while keeping Joseph and Kirk's chosen relationship continuity separate and intact.

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

### Book II relationship knowledge and privacy

The current Book II chapters distinguish the public Evermeasure exhibition from private relationships. Chapter VII explicitly records that the other residents do not know about Michael Brock and Kirk; Chapter VIII keeps their conversation on a private channel and outside the public record. Chapter IX does not turn Michael's absence into a vacancy or reveal the relationship. Preserve this knowledge boundary in later scenes: no resident may act on a secret they have not been told.

The nine current Book II chapters contain no GEEHUB/Geehub setting label, no “the Hub” world-name, and no child/children references in the main chapter text. Their local geography remains the Kirk expedition's own atlas. This is a checked property of those nine chapter files, not a claim about every Book II supporting document.

### The Hub is a machine/presence, not the wider world

The XXXII–XXXIV sequence supports “the Hub” as a particular in-world archive or machine presence: it prints instructions, stores and retrieves records, displays images, and has a terminal typeface. In Bill's account, the line “since before the Hub had a name” confirms that the machine has a name before that account is told. This is not evidence that the men named the entire country “the Hub.” The original naming scene for the machine is still not located; preserve the machine-name as a local designation and do not promote it to a world-name.

The second-chair sequence also gives a useful naming precedent. In `CHAPTER_XXXIII_THE_SECOND_CHAIR.md`, a voice from another community says, “We have several names. The one we use among ourselves is not yet ready to travel.” Its building is called the House of Returns, but the community's own collective name remains withheld by choice. Preserve that boundary. The inhabitants can own a name without being obliged to disclose it to visitors or narrators.

Two files currently share the ordinal XXXIII: `CHAPTER_XXXIII_THE_MAN_WHO_KNEW_HOW_TO_WAIT.md` (Bill's first-person account) and `CHAPTER_XXXIII_THE_SECOND_CHAIR.md` (Luke and the other men encounter the warm second chair and a new community). Chapters XXXII and XXXIV appear to connect to the second-chair sequence, but no source register assigns Bill's account to a distinct parent manuscript or alternate branch. Do not renumber or merge either file until their manuscript membership is established.

### Numbered production essay

`CHAPTER_XLI_THE_WORK_HAS_A_WEATHER.md` reads as a production essay rather than a diegetic scene: it directly addresses a “you,” refers to “the user,” and explains production practice. Its number and location under `novel/` make it appear to be part of a numbered narrative sequence, but its manuscript membership is unverified. Keep it unmapped until a parent book and intended form are established; do not silently rewrite it as dialogue or move it into a different book.

## Further setting-name corrections — 24 November 2026

### The Unplanned Convergence

`lore/CYBER_BLACK_HOLE_NOVEL.md` formerly placed the sign **GEEHUB CENTRAL** above the city's main building, referred to the map as the “Geehub map,” and had the Archivist say “Geehub needs both.” This gave the production brand a literal in-world city and setting name before the men had named anything. The sign is now blank. Andrew proposes naming the place; Joseph says they should live in it first; Luke agrees to leave the sign unmarked; Chase records **CITY NAME — TO BE CHOSEN BY ITS INHABITANTS**. Later occurrences now use local descriptions such as “the central hall” and “the central observatory.” The story's remaining “Hub” phrase belongs to a slogan on an interface image, not to the city name.

### The Tractus proposal

`lore/DEEP_LORE.md` contained a late section declaring **The Tractus** to be the name of the whole world and directing all future narration to use it. No scene in that document showed the men choosing that name. This contradicted the naming boundary and the earlier definition of Tractus as a continuity model. The declaration is now marked as an unadopted editorial proposal. Tractus remains the continuity architecture and navigable record model; it is not established as the inhabitants' name for the wider setting. The wider world-name remains open until the men name it in a scene.

The Seth and Nick branch gives the Tractus architecture a lived-world expression, as described in the repository-residents record. That branch-specific expression is not evidence that all connected settings, including Northgate, Veyrthalis, the Grand Meridian, the Scale Commons, the Seven Great Houses, or the Twin Grounds, share one in-world name.

### Connected atlases and local settings

The Confluence and the Great Tribal Territories are currently atlas/continuity labels. They help describe relationships between locally distinct places, but no scene has established either as a name the men use for the whole world. The Expansion Atlas, Volume III, is now titled **Expansion Atlas — Volume III: The People**, without the repository brand. Its setting description remains the Confluence and its connected districts as an editorial scope label.

The following setting/name corrections have also been made:

- `lore/GOLDEN_LION.md`: removed “Geehub” as a name for the wider landscape and the Lion's local geography. The Lion now speaks of living there, the lands beyond the Redwood Quarter, and his woodland estate and connected neighborhoods.
- `lore/EXPANSION_ATLAS_2026-11-10.md`: removed GEEHUB as the name of the connective geography; the Confluence remains an atlas description of inhabited exchange between distinct settings.
- `lore/ECONOMY_OF_FAVOURS.md`: changed the fictional economy's scope from “the economy of GEEHUB” to the shared economy of connected territories.
- `lore/GOD_PENIS_IDOL_CYCLE.md`: removed GEEHUB as the mythic setting name; the cycle now refers to the connected setting and its own mythic tradition.
- `lore/TRIBAL_TERRITORIES.md`: the territories are no longer called GEEHUB's territories; the production interface is distinguished from the inhabitants' world.
- `lore/IAN_GABE_KIRK_TRIANGLE.md`: the relationship branch no longer has “GEEHUB shared social world” as its setting. The exact local setting and wider in-world name remain open.
- `lore/HYPERSEXUAL_SUPERIORITY.md` and `lore/LOW_BAR_ORDINARY_MEN.md`: removed the repository brand from statements that described fictional society.
- `lore/veyrthalis/GEEHUB_NOVEL_CONTINUATION_2026-09-24.md`: removed GEEHUB from the title and changed the screen's “GEEHUB constellation” to “constellation map.” The remaining Hub references concern an archive/record presence and do not assign a setting-wide name.
- `lore/BEEFYTHIQ_BIOGRAPHIES.md`: replaced Hub-as-world language with “shared world,” “setting,” or “story” as appropriate.
- `lore/BEOWULF_AND_THE_GEATISH_COMPANY.md`: an observer group at the river expedition is now adult residents rather than children.
- `lore/EXPANSION_ATLAS_2026-11-10_VOLUME_III_THE_PEOPLE.md`: removed the repository name from the title.

These edits do not merge settings or establish a new umbrella name. Northgate, the Institute, Veyrthalis, the Grand Meridian, the Scale Commons, the Seven Great Houses, the Redwood Quarter, the Dad Convent, the Mexiancas, and the Twin Grounds retain their own local geography and continuity.

## Veyrthalis naming, duplication, and age corrections

The Veyrthalis branch supplies an important in-world standard for naming. In [Chapter VII — The Name We Withheld](../lore/veyrthalis/CHAPTER_VII_THE_NAME_WE_WITHHELD.md), the men encounter a person whose name has been deliberately covered in the record. In [Chapter VIII — The Name Not Restored](../lore/veyrthalis/CHAPTER_VIII_THE_NAME_NOT_RESTORED.md), he declines restoration and says he may answer when addressed, or may answer with nothing. Luke and the others do not force a name into the gap. This is the right model for the wider setting too: a name belongs to the people who use it, and withholding a name may itself be meaningful. Do not confuse this person's withheld identity with the still-unresolved name of the wider world; Veyrthalis remains its own established local setting.

Three exact duplicate passages were found and corrected:

- `CHAPTER_V_THE_GLASS_AND_THE_GUEST.md`: the section **The interval before the descent**, including both narrative paragraphs, appeared twice consecutively. One exact copy was removed.
- `CHAPTER_VI_THE_BASEMENT_IN_THE_WOODS.md`: **The room's second temperature**, including both paragraphs, appeared twice consecutively. One exact copy was removed.
- `CHAPTER_VII_THE_NAME_WE_WITHHELD.md`: **The name in the living air**, including both paragraphs, appeared twice consecutively. One exact copy was removed.

The headings and remaining scene text were preserved. These were copy duplications, not intentional refrains.

One background figure in `LOW_LEDGER_THE_FIRST_BELL.md` was described as “a child at the fountain.” It is now an adult resident. The technical phrase “child folder” in the Veyrthalis README is ordinary file-navigation language, not a character reference, and was left untouched. `KIRK_MENTAL_SPACE_THE_MARKED.md` now identifies the roster as fictional figures in the Veyrthalis narrative continuity rather than “GEEHUB figures.” Its character permissions and relationship limits remain intact.

The other Veyrthalis files inspected in this pass showed no repeated section headings, no GEEHUB/Geehub setting names, and no child-coded cast references in their story text. The editorial style guide and Joseph/Kirk index retain GEEHUB only in explicit production-history or style-guide contexts. The three repeated-section corrections and adult-cast change are now committed; this check covers the 17 Markdown files in `lore/veyrthalis/`, not every branch of the repository.

## Northgate sequence: age, naming, and title corrections

`CHAPTER_LXXXIII_THE_BOY_AT_THE_REDWOOD_ENTRANCE.md` depicted a minor separated from his father. The scene is now about an adult visitor, titled **The Young Man at the Redwood Entrance**. He is reunited with his father through the same careful staff response; the chapter's focus on safe wayfinding, respectful assistance, privacy, and institutional responsibility is preserved. The file was renamed to `CHAPTER_LXXXIII_THE_YOUNG_MAN_AT_THE_REDWOOD_ENTRANCE.md`, and the chapter index was updated.

`CHAPTER_LXXVII_THE_COACHS_SON.md` does not require an age correction: Travis is explicitly a young adult man in the present scene. References to his father teaching him to ride a bicycle or attending a school performance are retrospective family memories, not additional present-day child characters.

The titles **DUH!** (`CHAPTER_LXXXVIII_DUH.md`) and **DUH DUH!** (`CHAPTER_LXXXIX_DUH_DUH.md`) are intentional, character-originated titles, not placeholder text. Gabe's spontaneous “Duh!” becomes a shared joke with Dorian; the second title is then pinned to the print-room board as the name of their next working session. Preserve the wording and its origin. Do not replace these titles with generic labels.

## Arthur, Cyber Black Hole, and remaining production-language boundaries

### Arthur and the Fingerlands

`lore/ARTHUR_AND_FINGERLANDS.md` formerly made Arthur both a fictional hero and “the GEEHUB metascript,” then embedded direct instructions for repository editing in his character record. This mixed in-world knowledge with the external production workflow. The production method has been preserved in [Arthur as an External Growth Metaphor](ARTHUR_EXTERNAL_GROWTH_METHOD.md). Arthur's source record now describes him as the first hero of the Fingerlands and states that the separate production method is not part of his life or awareness inside the story. The Fingerlands retains its own geography.

### The Cyber Black Hole

`lore/CYBER_BLACK_HOLE_OF_GEEHUB.md` formerly treated Geehub as the wider world and described the Cyber Black Hole as a force at its centre. The story now says the friends call the gathering force at the centre of their shared world **the Cyber Black Hole**. The phenomenon has a name from its inhabitants; the surrounding world does not receive an external name. The central relation is described as a web of friends, places, and remembered events, not as “the Tractus” inside the story. The remaining `GEEHUB.CYBER_BLACK_HOLE` is explicitly marked as an external repository identifier.

### Other production-language boundaries

- `lore/AI_COACH.md`: removed GEEHUB from the coach's in-world training environment description.
- `lore/BEGINNING_OF_THE_DIMENSION.md`: changed “independent GEEHUB boards” to “independent story-world boards.”
- `lore/CHAT_MEMORY_NOVEL.md`: the production archive now preserves the story as history rather than personifying GEEHUB as its reader. Its GEEHUB title remains a file/production label, not an in-world setting-name.
- `novel/CONTINUATION_REGISTER_2026-11-20.md`: replaced the stale Northgate Chapter LXXXIII link and “boy's father” description with the renamed adult visitor chapter.
- `novel/CHAPTER_XXXII_THE_MEMORY_THAT_LOOKED_BACK.md`: an archived item previously described as “a child's drawing” is now “a small, careful drawing.” The line records the object, not a living character, and no unsupported maker is assigned.

## Audit method for subsequent passes

1. Identify the manuscript and local continuity before editing a scene.
2. Compare the passage with its chapter neighbors, character record, relationship record, place atlas, and current continuation register.
3. Check names, ages/adult framing, relationship knowledge, chronology, objects, routes, geography, point of view, and what each character could know at that moment.
4. Separate diegetic language from editorial notes, production metadata, and engine vocabulary.
5. Correct only what the evidence supports. Preserve earlier states and record unresolved conflicts.
6. Re-read the changed passage in sequence and verify its indexes and cross-references.

This audit is a living correction register. A clean file is not proof that the entire manuscript or every connected story has passed review.
