# GEEHUB Migration Map

**Status:** migration map; KINGDOM_LAND/ was moved to archive/kingdom-land/ in commit e79514aab927ec47df29b036d6a299e067e51f00; classification pass 1 recorded below; no paths moved in this pass  
**Baseline:** `main` at `b5c7872dc08f596c66f7cc4fc1374fe86eb2c152`  
**Safety branch:** `pre-cleanup-freeze`  
**Rule:** preserve history and provenance. Each move is a separate commit, performed as a Git rename (`git mv` in a local checkout), with this map updated in that same commit. No history rewrite and no mass deletion.

The target structure has eight project folders, despite the shorthand “seven” used in the original proposal. GitHub's `.github/` directory remains at repository root because Actions and repository automation depend on that conventional path.

## Target root

```text
GEEHUB/
  .github/                 # GitHub platform configuration; stays at root
  README.md                # concise front door
  MIGRATION.md
  docs/
  engine/
  canon/
  worlds/
  studio/
  experiences/
  archive/
  projects/
```

## Existing top-level paths

| Existing path | Planned destination | Migration treatment |
|---|---|---|
| `.geehub/` | `engine/config/` or root config | Inspect runtime discovery and hidden metadata references first |
| `.github/` | `.github/` | Keep at root |
| `KINGDOM_LAND/` | `archive/kingdom-land/` | Moved in commit `e79514aab927ec47df29b036d6a299e067e51f00`; original blob content and history remain traceable |
| `archive/` | `archive/` | Retain; merge other cold material only after provenance review |
| `artifacts/` | `engine/artifacts/` or external artifact store | Split append-only event ledgers from generated outputs before moving |
| `assets/` | `studio/assets/` | Separate source assets from generated renders |
| `characters/` | `canon/characters/` | Preserve individual records and indexes |
| `corpus/` | `canon/corpus/` | Preserve source provenance and analysis distinctions |
| `creations/` | `studio/creations/` or `archive/creations/` | Classify by source/build/output lifecycle |
| `creative/` | `projects/` plus linked canon/studio paths | Convert constellation folders to pointers; move actual sources only to their owning domain |
| `data/` | `engine/data/` or `canon/data/` | Split runtime data from authored canon |
| `deep-lore/` | `canon/deep-lore/` | Preserve links to related lore and source records |
| `docs/` | `docs/` | Retain; consolidate moved root documentation here |
| `downloads/` | `archive/intake/` or `canon/source-intake/` | Inspect every item; do not assume downloads are disposable |
| `dropbox_outbox/` | `studio/dropbox-outbox/` or external Dropbox pointer index | Preserve delivery semantics and mirrored payload provenance |
| `engine/` | `engine/` | Retain as runtime/code root; split canon content out if present |
| `events/` | `engine/events/` | Inspect event schema and consumers |
| `experiences/` | `experiences/` | Retain browser experiences |
| `film/` | `studio/film/` | Source and build scripts only; renders handled separately |
| `geo-cyberspace/` | `worlds/geo-cyberspace/` or `experiences/geo-cyberspace/` | Split world data from browser/runtime implementation |
| `hub/` | `experiences/hub/` | Retain browser-facing hub; separate runtime code where needed |
| `library-import/` | `archive/library-import/` or `canon/intake/` | Preserve import provenance and source identifiers |
| `lore/` | `canon/lore/` | Review draft/locked status before moving |
| `media/` | `studio/media-sources/` | Source pointers and metadata; binary payloads remain in Dropbox/LFS as appropriate |
| `music/` | `studio/music/` | Source, sessions, and build scripts; final renders external |
| `novel/` | `canon/novel/` | Preserve version lineage and manuscript indexes |
| `production/` | `studio/production/` | Retain source projects, templates, scripts, and manifests; keep final exports out |
| `providers/` | `engine/providers/` | Inspect connector/provider runtime role |
| `recovery/` | `archive/recovery/` or `engine/recovery/` | Preserve snapshots and recovery metadata; determine whether runtime needs live access |
| `refresh/` | `experiences/refresh/` or `engine/refresh/` | Separate browser surface from refresh service |
| `research/` | `archive/research/` | Keep research metadata/references; preserve special boundaries in its own README |
| `rooms/` | `experiences/rooms/` | Browser-browsable rooms and interaction surfaces |
| `scripts/` | `engine/scripts/` or `studio/scripts/` | Classify by runtime versus production responsibility |
| `server/` | `engine/server/` | Code only |
| `signals/` | `engine/signals/` or `canon/signals/` | Split runtime signals from authored/archived records |
| `worlds/` | `worlds/` | Drafts under `worlds/_drafts/`; locked material linked or moved to canon |
| `worldspace/` | `experiences/worldspace/` or `worlds/worldspace/` | Split interface from world bible/geography |

## Root-level files

| Existing path | Planned destination | Treatment |
|---|---|---|
| `README.md` | `README.md` | Rewrite as a concise front door; preserve detailed content in linked docs |
| `AUDIT_2026-10-05.md`, `BUILD_NARRATIVE.md`, `CANON.md`, `CONTRIBUTING.md`, `CURRENT_STATE_2026-09.md`, `FICTION_ENGINE.md`, `GEEHUB_STORAGE.md`, `HULUMS_CAVE_BUILD_LOG.md`, `PRODUCTION_LOG.md`, `PROJECT_ATLAS.md`, `PROJECT_LEDGER.md`, `PROPHECY.md`, `SENSATION_ENGINE.md`, `SHAKE_2026-09-06.md`, `THE_FIRST_MEN.md` | `docs/` or `canon/` by content | Move individually; canon texts are not documentation merely because they are Markdown |
| `TXT.rtf` | `archive/intake/` pending inspection | Preserve original bytes and provenance; do not merge or convert during migration |
| `app.js`, `style.css` | `experiences/` or `engine/` | Trace browser entry points and runtime imports before moving |
| `index.html`, `casebook.html`, `consumer.html`, `hulums-cave.html`, `size-game.html`, `zero-read.html` | `experiences/` | Check links, build/deploy configuration, and relative asset paths |
| `projects.json` | `projects/projects.json` | Preserve as project constellation index; update consumers in the same migration sequence |
| `records.json`, `schema.json`, `world.json` | `engine/` or `canon/` by schema ownership | Inspect consumers; separate runtime records from authored world canon |
| `validate-records.py` | `engine/scripts/` | Update invocation references after move |
| `LICENSE` | `LICENSE` | Keep at root |
| `.gitignore` | `.gitignore` | Expand only after local build/runtime inventory |
| Other root config files | root or `engine/` | Decide by tool convention and actual consumers |

## Cross-cutting rules

- `engine/activity.jsonl` remains append-only. Do not truncate, regenerate, or fold it into manuscript history.
- `artifacts/` is not blanket-ignored until event ledgers, manifests, and generated output have been separated.
- `dropbox_outbox/` mirrors are not deleted merely because identical bytes exist in `artifacts/`.
- Teal Titan remains a reusable studio template; project-specific output and canon stay in their respective destinations.
- BodyLounger research remains isolated under `archive/research/`, metadata and references only, with an explicit boundary README.
- Every target top-level and second-level folder has a short README stating purpose, status, entry point, and exclusions.
- Project constellation folders contain pointers (status, canon location, studio location, next step), not copies of the source material.
- Internal links, scripts, workflow paths, static-site routes, and runtime imports must be updated and tested with each move.
- Large media remains in Dropbox or Git LFS according to the reviewed asset policy; repository pointers retain source identity, ownership, and location metadata.

## Move log

No moves have been made yet.

| Commit | Old path | New path | Verification |
|---|---|---|---|
| `e79514aab927ec47df29b036d6a299e067e51f00` | `KINGDOM_LAND/` | `archive/kingdom-land/` | Git tree rename; all three original blobs reused unchanged |


## Classification pass 1 — novel/ and lore/ (2026-11-25)

**Branch:** pre-cleanup-freeze at 9a14c08af4434fb135fd5bcdeedf9f05c673269b before this classification commit.  
**Snapshot:** v1-pre-cleanup-snapshot remains at b5c7872dc08f596c66f7cc4fc1374fe86eb2c152; it was not changed.  
**Method:** classify each content file by explicit canon/experimental status, manuscript or runtime source-of-truth declarations, and references from established canon. Folder names alone were not used. Folder README files are ownership registers and are excluded from the content-file counts below.  
**Decision:** classification only. No files or directories were moved, renamed, deleted, deduplicated, or overwritten. No source blob IDs changed. The proposed destinations are planning targets, not completed moves.

### Folder ownership decisions

| Current path | Proposed destination | Owner type | Evidence | Decision | Move commit |
|---|---|---|---|---|---|
| novel/ | Split between canon/novel/ and worlds/_drafts/novel/ or project folders | Mixed manuscript, canon-support, and draft | BOOK_I.md identifies an un-consolidated source map and overlapping candidates; BOOK_II_COMPLETION_REGISTER.md names the chapter glob as source of truth; the Hotel branch declares active canon; the Three Books map names the current principal manuscripts | Classified file by file; retain all paths for now | — no move |
| novel/chapters/ | canon/novel/chapters/ | Canonical manuscript and continuity source | LOCAL_PRODUCTION_POINT.md explicitly makes this directory the source of truth for the numbered Northgate sequence; the Book II completion register does the same for Chapters I–IX | All 36 content files are canon; never overwrite in place | — no move |
| novel/experience/ | worlds/_drafts/novel-experience/ or its project folder | Draft experience branch | No canon lock or verified canon dependency found | Draft; preserve | — no move |
| novel/spinoffs/ | worlds/_drafts/novel-spinoffs/ or its project folder | Draft spinoff | No canon lock or verified canon dependency found | Draft; preserve | — no move |
| lore/ | Split between canon/lore/ and worlds/_drafts/lore/ or project folders | Mixed lore, production authority, source register, and draft | Explicit statuses include active canon, emerging canon, incubating, proposed, and provisional; TRACTUS_INDEX.md supplies direct canon dependencies for several records | Classified file by file; retain all paths for now | — no move |
| lore/dad-convent/ | Split between canon/lore/dad-convent/ and worlds/_drafts/dad-convent/ | Canon setting/programme plus draft narratives | README identifies an active living settlement; BUILD_PROGRAM.md is the active programme record; SECOND_BUILD_DAY.md is linked from the Tractus index | Mixed: two canon-support files, two drafts | — no move |
| lore/dimension/ | Split between canon/lore/dimension/ and worlds/_drafts/dimension/ | Mixed canon-linked chapters and incubating branch material | LINEAGE_PANTHEON.md explicitly treats its mythic descriptions as canon and links First Room Chapters 10–14; EDITORIAL_DIRECTIVE.md references the familiarity-paradox record; the parent dimension seed is marked incubating | Mixed: six canon-linked files, thirteen drafts | — no move |
| lore/growth/ | Split between canon/lore/growth/ and worlds/_drafts/growth/ | Canon-linked chapter plus draft doctrine | CHAPTER_VII_THE_RETURN_TO_THE_MEASURE.md is linked from the Tractus index; no equivalent promotion evidence was found for THE_RITES_OF_GROWTH.md | Mixed: one canon chapter, one draft | — no move |
| lore/joey-colossus/ | canon/lore/joey-colossus/ | Canonical six-volume story and continuity system | README sets canon rules; CONTINUITY_LEDGER.md declares itself authoritative; six volumes and atlas are the defined reading sequence | All nine content files are canon | — no move |
| lore/mexiancas/ | worlds/_drafts/mexiancas/ or its project folder | Draft chronicle | CONTINUITY.md explicitly says “active world / living chronicle draft”; proposals and contradictions are to remain labelled | All five content files remain drafts pending promotion | — no move |
| lore/novel/ | worlds/_drafts/lore-novel/ or its project folder | Draft narrative corpus | INDEX.json identifies a living-novel corpus but no canon lock or external canon dependency was verified | All fourteen content files remain drafts | — no move |
| lore/spellcasters-circle/ | worlds/_drafts/spellcasters-circle/ or its project folder | Draft/private records | No canon lock or external canon dependency found | Draft; preserve | — no move |
| lore/veyrthalis/ | worlds/_drafts/veyrthalis/ or its project folder | Experimental narrative branch | JOSEPH_KIRK_INDEX.md says “experimental narrative branch; not promoted to canon”; joseph_kirk_story.json status is experimental | All seventeen content files remain drafts | — no move |

### File-level decisions — novel/

**Canon manuscripts / story branches:**  
BATTLE_HEAVEN_AND_SEA.md; EXPANSION_VOLUME_THE_MANY_OPEN_ENDS.md; CHAPTER_XXXVI_THE_ROAD_TO_THE_CONVENT.md; CHAPTER_XXXVII_DAN_ROMAN_ARRIVES.md; CHAPTER_XXXVIII_THE_UNIVERSITY_OF_THE_LONG_TABLE.md; THE_DIRECTOR_OF_STANDARDS.md; THE_GOD_DADDIES_AFTER_THE_ROAD.md; THE_GOD_DADDIES_TEN_ORDINARY_DAYS.md; THE_GRAND_MERIDIAN_SECOND_WEEK.md; THE_HOTEL_AT_THE_EDGE_OF_THE_WEEK.md; THE_LAST_CHECKOUT.md.

**Canon-support / continuity / production authorities:**  
AI_EXPERIENCE_AS_NARRATIVE.md; BATTLE_HEAVEN_AND_SEA_EXPERIENCE.md; BATTLE_HEAVEN_AND_SEA_SHOTLIST.md; BOOK_II_CHRONOLOGY_AND_OPEN_THREADS.md; BOOK_II_COMPLETION_REGISTER.md; CHAPTER_EXPANSION_PROTOCOL.md; CONTINUATION_REGISTER_2026-11-09.md; CONTINUATION_REGISTER_2026-11-20.md; EDITORIAL_DIRECTIVE.md; GEEHUB_LIVING_REVISION_ENGINE.md; JOSEPH_KIRK_CONTINUITY.md; LOCAL_PRODUCTION_POINT.md; PRODUCTION_PRIORITY.md; PUBLISHING_STANDARD.md; RELATIONSHIP_CANON.md; THE_GRAND_MERIDIAN_CONTINUITY_ATLAS.md; THREE_BOOKS_IN_MOTION.md.

**Draft / candidate / unassigned material:**  
BOOK_I.md; BOOK_I_CONTINUATION_02.md; BOOK_I_CONTINUATION_03.md; BOOK_I_CONTINUITY_CHAPTERS.md; BOOK_I_EXPANSION_REGISTER.json; BOOK_I_FINAL_MOVEMENT.md; REWRITTEN_OPENING.md; CHAPTER_XLIII_THE_EXCITEMENT_OF_BEING_HERE.md; CHAPTER_XLII_THE_FRAME_THAT_REMEMBERS.md; CHAPTER_XLIV_THE_BUILDING_BECOMES_A_WORLD.md; CHAPTER_XLI_THE_WORK_HAS_A_WEATHER.md; CHAPTER_XL_ITS_A_HAPAX_LEGOMENON.md; CHAPTER_XXIII_SERUM_RULES.md; CHAPTER_XXIII_THE_CHEST_IN_THE_WOODS.md; CHAPTER_XXIV_MEASURE_OF_A_MAN.md; CHAPTER_XXIX_LUKE_INSIDE.md; CHAPTER_XXVIII_THE_RULE_OF_PROXIMITY.md; CHAPTER_XXVII_THE_SECOND_TABLE.md; CHAPTER_XXVI_LUKE_AND_I_PONDER_THE_MACHINE.md; CHAPTER_XXV_RIVALING_FAMILIES.md; CHAPTER_XXXIII_THE_MAN_WHO_KNEW_HOW_TO_WAIT.md; CHAPTER_XXXIII_THE_SECOND_CHAIR.md; CHAPTER_XXXII_THE_MEMORY_THAT_LOOKED_BACK.md; CHAPTER_XXXIV_THE_HOUSE_OF_RETURNS.md; CHAPTER_XXXIX_A_ROOM_WITH_THE_WINDOW_OPEN.md; CHAPTER_XXXI_TWO_DOCTRINES.md; CHAPTER_XXXV_THE_CITY_WITH_CATS.md; CHAPTER_XXX_THE_TRANSFER_ENGINE.md; CYBER_BLACK_HOLE_CHARACTER_DEVELOPMENT.md; HULUMS_CAVE_VIDEO_LAYER.md; LUKE_NATURAL_AWAKENING.md; MEDIA_GROWTH_ENGINE.md; RESEARCH_INFLUENCE_GROWTH_MORPHS.md; UNRELATED_NARRATION_RULE.md; VISUAL_EXPERIENCES_THE_CONVERGENCE.md; WORLDS.md; WORLDS_ENVIRONMENT_PULSE_ARCHIVE.md.

**novel/chapters/ — canon (all 36 content files):**  
BOOK_II_CHAPTER_I_THE_LOST_COUNTRY.md; BOOK_II_CHAPTER_II_THE_KEEPERS_OF_THE_OLD_TRAIL.md; BOOK_II_CHAPTER_III_THE_PLACE_THAT_MOVED.md; BOOK_II_CHAPTER_IV_THE_PROMISES_THAT_KEEP.md; BOOK_II_CHAPTER_V_FOUR_MANSIONS.md; BOOK_II_CHAPTER_VI_THE_GAME_BETWEEN_THE_HOUSES.md; BOOK_II_CHAPTER_VII_THE_CONTEST_THAT_NEVER_ENDS.md; BOOK_II_CHAPTER_VIII_A_DAY_IN_THE_OPEN_PAVILION.md; BOOK_II_CHAPTER_IX_THE_NARROW_TURN.md; BOOK_II_COMPETITIVE_DOCTRINE.md; BOOK_II_SPATIAL_ATLAS.md; CHAPTER_LXXIII_THE_DISTANCE_BETWEEN_TWO_CHAIRS.md; CHAPTER_LXXIV_THE_FIRST_REPORT.md; CHAPTER_LXXIV_THE_MORNING_HAS_ITS_OWN_ARCHITECTURE.md; CHAPTER_LXXV_THE_TABLE_AFTER_RAIN.md; CHAPTER_LXXV_THE_WORKSHOP_OF_UNFINISHED_THINGS.md; CHAPTER_LXXVI_THE_FIELD_HAS_ITS_OWN_ECHO.md; CHAPTER_LXXVII_THE_COACHS_SON.md; CHAPTER_LXXVIII_BEYOND_SIZE_FIFTY.md; CHAPTER_LXXIX_THE_GIANT_ON_THE_WESTERN_ROAD.md; CHAPTER_LXXX_THE_MIDNIGHT_COMMITTEE_OF_EAST_DORMITORY.md; CHAPTER_LXXXI_ROOM_FOR_QUIET_AND_THE_DORMITORY_DECATHLON.md; CHAPTER_LXXXII_THE_WESTERN_REPORT_AND_THE_SECOND_ROUTE.md; CHAPTER_LXXXIII_THE_YOUNG_MAN_AT_THE_REDWOOD_ENTRANCE.md; CHAPTER_LXXXIV_THE_SIGN_THAT_FACES_BOTH_WAYS.md; CHAPTER_LXXXV_THE_THREE_MEASURES_OF_THE_CROSSING.md; CHAPTER_LXXXVI_THE_EVENING_OF_PRESENCE.md; CHAPTER_LXXXVII_THE_FIRST_DINNER.md; CHAPTER_LXXXVIII_DUH.md; CHAPTER_LXXXIX_DUH_DUH.md; CHAPTER_XC_THE_IMAGE_I_COULD_NOT_SEE.md; CHAPTER_XCI_THE_LOWEST_BAR_IN_NORTHGATE.md; CHAPTER_XCII_THE_CAN_OPENER.md; CHAPTER_XCIII_THE_LIONS_STINT.md; CHAPTER_XCIV_THE_SEAT_HE_LEFT_BEHIND.md; CHAPTER_XCV_THE_UNTRANSLATED.md.

**Other novel/ child folders:**  
novel/experience/THE_VOID_BETWEEN_MEN.md — draft.  
novel/spinoffs/THE_COUNTY_LINE_FEED.md — draft.

### File-level decisions — lore/

**Canon / canon-support:**  
ASSET_INDEX.md; BEOWULF_AND_THE_GEATISH_COMPANY.md; CYBER_BLACK_HOLE_OF_GEEHUB.md; CYBER_BLACK_HOLE_NOVEL.md; DEEP_LORE.md; ECONOMY_OF_FAVOURS.md; GODS_OF_DOMINATION_AND_SUBMISSION.md; GODS_OF_ENVELOPMENT_AND_INCURSION.md; GOD_AS_AN_ECLECTIC_MOUSE.md; GOD_PENIS_IDOL_CYCLE.md; HUBBY.md; HYPERSEXUAL_SUPERIORITY.md; HYPER_DADDY_HAPPINESS.md; LINEAGE_PANTHEON.md; LOW_BAR_ORDINARY_MEN.md; LUKE_INFINITE_GROWTH.md; MALE_RECOGNITION_ENGINE.md; MEN_OF_NORTHGATE_INTIMACY.md; MUSCLE_MYTH_GENTLE_KING_LION.md; NORTHGATE_LION_GATE.md; NORTHGATE_OMEN_BENEATH_THE_FEAST.md; NORTHGATE_THE_GREAT_FEAST.md; PRIME_MERIDIAN.md; READER_CARE_AND_MEDICATION.md; RECIPROCAL_TRANSFORMATION.md; THE_BROTHERHOOD_OF_GIANTS.md; THE_COASTAL_SHIPYARD.md; TRACTUS_ARTIFACTS.md; TRACTUS_ARTIFACT_CHRONICLES.md; TRACTUS_ARTIFACT_CHRONICLES_II.md; TRACTUS_INDEX.md; TRACTUS_MENS_PAPERS.md; TRACTUS_PARTICLES.md; TRACTUS_THE_FOG_WEEK.md; TRIBAL_TERRITORIES.md.

**Draft / incubating / source-reference material:**  
29_INCHES.md; AI_COACH.md; ARTHUR_AND_FINGERLANDS.md; ATLAS.md; ATTENTION_ENGINE.md; AUTONOMOUS_STREAM.md; BEEFYTHIQ_BIOGRAPHIES.md; BIG_PEC_ALTAR.md; BEGINNING_OF_THE_DIMENSION.md; CHAT_MEMORY_NOVEL.md; CHERUBIM_SANCTUARY.md; CONFLUENCE_GROWTH_PASS_2026-11-20.md; CONFLUENCE_THE_BODY_WITHOUT_GUESSWORK_2026-11-20.md; DIABOUND_KERNEL.md; EXPANSION_ATLAS_2026-11-10.md; EXPANSION_ATLAS_2026-11-10_VOLUME_III_THE_PEOPLE.md; GOLDEN_LION.md; IAN_GABE_KIRK_TRIANGLE.md; INSTITUTE_ACID_PROGRAMMING_SESSION.md; INSTITUTE_DORMITORY_AND_RESIDENTIAL_LIFE.md; INSTITUTE_MORNING_THE_GYMNASIUM.md; INSTITUTE_OF_BECOMING.md; INSTITUTE_THE_FIRST_LIVING_BUILD.md; INSTITUTE_THE_MORNING_AFTER_THE_CODE.md; INSTITUTE_THE_PASSAGE_BETWEEN_BUILDINGS.md; LIVE_DEEP_LORE.md; NORTHGATE_COMMON_LIFE.md; NOTHING_PERSONAL_SIGN.md; SETH_AND_NICK_GROWTH_PAIR.md; TRACTUS_TWO_TEMPO_WORK_ENGINE.md; TUMBLR_LIKES_SOURCE_REGISTER.md.

**lore/dad-convent/:** Canon-support — BUILD_PROGRAM.md, SECOND_BUILD_DAY.md. Draft — CODEWRIGHT_CHRONICLES.md, FIRST_BUILD_DAY.md.

**lore/dimension/:** Canon-linked — FAMILIARITY_PARADOX_SHARED_AWARENESS.md, FIRST_ROOM_CHAPTER_10.md, FIRST_ROOM_CHAPTER_11.md, FIRST_ROOM_CHAPTER_12.md, FIRST_ROOM_CHAPTER_13.md, FIRST_ROOM_CHAPTER_14.md. Draft — BEEFYTHIQ_AND_THE_FIRST_ROOM.md, DIMENSIONAL_CONJURATION.md, FIRST_ROOM_CHAPTER_01.md through FIRST_ROOM_CHAPTER_09.md, NIGHTMARE_DOLL_RESEARCH.md, SEQUOIA_WOODLANDS.md.

**lore/growth/:** Canon — CHAPTER_VII_THE_RETURN_TO_THE_MEASURE.md. Draft — THE_RITES_OF_GROWTH.md.

**lore/joey-colossus/ — canon (all nine content files):**  
CONTINUITY_LEDGER.md; VOLUME_I_THE_BEGINNING_OF_MORE.md; VOLUME_II_THE_MASS_YEARS.md; VOLUME_III_COLOSSUS.md; VOLUME_IV_LOVE_ASCENDANT.md; VOLUME_V_BEYOND_THE_BASELINE.md; VOLUME_VI_THE_SCALE_COMMONS.md; WORLD_ATLAS_BEYOND_THE_COMMONS.md; WRITING_ENGINE.md.

**lore/mexiancas/ — draft (all five content files):**  
CHRONICLE_I.md; CHRONICLE_II.md; CHRONICLE_II_CHAPTER_XI_THE_OPEN_TABLE.md; CHRONICLE_II_THE_OTHER_ACCOUNT.md; CONTINUITY.md.

**lore/novel/ — draft (all fourteen content files):**  
INDEX.json; THE_ARCHIVE_OPENS.md; THE_BOOK_WITHOUT_AN_END.md; THE_BOX_AT_THE_END_OF_THE_WORLD.md; THE_CITY_BEGINS_TO_THINK.md; THE_CITY_UNDER_THE_FOUNTAIN.md; THE_CONTINENT_OF_MEMORY.md; THE_HOUSE_THAT_REMEMBERED.md; THE_LAST_OBSERVER.md; THE_MACHINE_DREAMS_IN_PUBLIC.md; THE_OBSERVATORY_AT_THE_EDGE_OF_HYPERSPACE.md; THE_PROCESSION_OF_MOON.md; THE_ROOM_BENEATH_THE_OBSERVATORY.md; THE_ROOM_BENEATH_THE_ROOM.md.

**lore/spellcasters-circle/ — draft:** MATCH_02_PRIVATE_RECORDS.md.

**lore/veyrthalis/ — draft (all seventeen content files):**  
CHAPTER_V_THE_GLASS_AND_THE_GUEST.md; CHAPTER_VI_THE_BASEMENT_IN_THE_WOODS.md; CHAPTER_VII_THE_NAME_WE_WITHHELD.md; CHAPTER_VIII_THE_NAME_NOT_RESTORED.md; CHAPTER_IX_THE_WORK_OF_THE_WESTERN_QUARTER.md; EDITORIAL_STYLE_CONTINUITY.md; GEEHUB_NOVEL_CONTINUATION_2026-09-24.md; HYPERSPACE_EXPEDITION_2026-09-21.md; JOSEPH_KIRK_INDEX.md; JOSEPH_KIRK_THE_SECOND_HEART.md; KIRK_MENTAL_SPACE_THE_MARKED.md; LOW_LEDGER_THE_FIRST_BELL.md; THE_EYE_AND_THE_WESTERN_QUARTER.md; THE_FIFTH_GROOVE.md; THE_PROCESSION_OF_TWO_ACCOUNTS.md; THE_UNENTERED_PLACE.md; joseph_kirk_story.json.

### Boundary notes

- novel/REWRITTEN_OPENING.md remains a draft even though BOOK_I.md points to it: the source map calls it a candidate and the expansion register marks all 72 chapters queued and unreviewed.
- novel/BOOK_I_CONTINUATION_02.md, BOOK_I_CONTINUATION_03.md, BOOK_I_CONTINUITY_CHAPTERS.md, and BOOK_I_FINAL_MOVEMENT.md remain separate drafts because their chapter numbers overlap or await comparison.
- lore/IAN_GABE_KIRK_TRIANGLE.md remains draft despite being mapped by THREE_BOOKS_IN_MOTION.md: it explicitly says provisional and not yet placed as a numbered chapter.
- lore/mexiancas/ remains draft despite being discoverable from the Tractus index: its own continuity file explicitly labels the living chronicle a draft.
- lore/veyrthalis/ remains draft despite continuation links: its own project index and runtime JSON explicitly say experimental / not promoted.
- lore/AUTONOMOUS_STREAM.md is not treated as runtime state merely because its prose says the engine writes there. The current server/geehub-server.mjs scan found reads of engine/activity.jsonl and no AUTONOMOUS_STREAM writer reference. The wider engine writer inventory remains open; do not move this file until that pass is complete.
- v1-pre-cleanup-snapshot remains the untouched baseline. This classification does not authorize any file move, overwrite, deduplication, or .gitignore change.
