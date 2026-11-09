# The Tractus Index

## The Index Is a Place

The Tractus Index is the navigable memory of the world. It is not a catalogue placed beside the Tractus, nor a search box attached to an archive. It is the address system through which the world can be entered, inspected, connected and changed. The chat view is its first window: a quiet instrument that lets a person move from a name to a chapter, from a chapter to a place, from a place to the people who inhabit it, and from those people to the events that have altered their lives.

An indexed object is anything that can persist and participate in continuity. A chapter, conversation passage, character, location, institution, image, sound, motif, rule, artifact, unresolved question or production file may each receive an address. The address identifies the object without reducing it to its current description. Its content may grow; its relationships may change; its history remains traceable.

## Address and Identity

Every object receives a stable Tractus address. Addresses should be readable by people and unambiguous to the machine. A human-facing address may look like `TRACTUS.NORTHGATE.LION_GATE`; a machine record carries the same canonical identifier in a structured field. Titles are display names, not identity. Renaming a chapter must not sever the links that point to it.

An address record contains, at minimum, a canonical identifier, object type, title, source location, current state, creation or first-seen point, last meaningful change, and relationships to other addresses. Where known, it also records provenance: the conversation, file, commit or event from which the object entered the corpus. Missing information remains explicitly unknown rather than being invented.

## Relationships Are First-Class

The index records more than containment. A chapter may belong to a collection, feature a character, occur in a location, continue an earlier passage, contradict an earlier assumption, introduce a motif, or provide material for a production asset. These are distinct relationships and should be named as such. A character can therefore be reached from every chapter in which they appear; a location can reveal its inhabitants, routes, institutions and events; a motif can disclose its recurrences without flattening them into one summary.

Each relationship is navigable in both directions. Following a link should reveal why two objects are connected and where that connection came from. The index must distinguish a direct source relationship from an inferred association. Inferred links can be useful, but they remain proposals until accepted or otherwise grounded.

## Occurrence, Inscription, Change

The Tractus keeps a simple operating principle: occurrence becomes inscription; inscription can produce change in the shared world. When a new passage is written, it is not merely appended to a pile of text. It is examined for the objects it introduces or develops, the addresses it touches, the relationships it establishes and the existing state it revises. The new occurrence receives provenance and is connected to the corpus.

Not every sentence needs to become a separate object. The index should preserve meaningful units at the right scale: a chapter, a scene, a durable passage, a named detail, a recurring image or a consequential decision. Granularity is adjustable. The system should avoid turning ordinary prose into thousands of meaningless fragments.

## State and Continuity

State is represented as a sequence of numbered revisions, not as a claim that the world is finished. A state records what was true at a particular point, what changed, which addresses were affected and which source caused the change. Numbers make states addressable; they do not replace dates, provenance or explanation. A later state may extend, reinterpret or supersede an earlier one without erasing the fact that the earlier state existed.

The index should distinguish stable canon, active development, experiment, unresolved material and retired material. These are status values, not judgments of quality. Experimental material can be promoted into canon; canon can be revised through an explicit continuity event. Conflicts should remain visible as conflicts until resolved. The index must never silently merge incompatible versions.

## The Chat View

The chat-visible index is an instrument panel, not a dashboard crowded with statistics. Its main field presents a selected address and its immediate relationships. A search field accepts names, phrases, identifiers and object types. Selecting an address opens its actual source passage or file when available. Relationship chips act as paths: selecting one moves to the connected object, while a return path preserves the route already travelled.

The view should support several complementary modes. **Address view** shows one object, its state and its provenance. **Connections view** shows the objects immediately related to it. **History view** shows how it changed across numbered states. **Search view** finds material across the indexed corpus. **Recent inscriptions** shows what has entered or changed recently. These modes should share one selection and one address system so that the user never feels they have moved into a separate application.

The cursor, called the Wand, is the operating instrument. It selects, follows, opens and invokes. Its magic is functional: it makes a relationship traversable and a stored possibility available for action. The Observatory is the visual field in which the selected object and its surroundings become perceptible. Memory is the corpus itself. Tractus is the mechanism that keeps addresses, states and continuity coherent.

## Search and Discovery

Search should work across titles, body text, aliases, tags, source references and relationship descriptions. Results should show a short contextual extract and the address that will open the source. A result is not merely a matching word: it is an entrance into a particular occurrence. Where the same name appears in multiple places, the interface should show the different contexts rather than arbitrarily choosing one.

Discovery can also move outward from a selected object. The index may suggest nearby addresses because they share a character, location, event, motif or source. Suggestions must disclose the reason for the connection and whether it is explicit or inferred. The user can follow a suggestion, leave it aside or establish a durable relationship. The system should not pretend that similarity alone proves continuity.

## Ingestion and Preservation

New conversations, files and repository changes enter through an ingestion process. The original source is preserved; the index stores references and structured descriptions rather than replacing the source with a summary. When possible, source ranges, commit identifiers, file paths and timestamps are retained so that an address can return to the material from which it came. Large media assets may remain in their appropriate storage location while the index records their identity, metadata, preview and relationships.

Re-indexing must be safe to repeat. The same source should not create a duplicate object each time it is encountered. Stable source identifiers and canonical addresses allow the system to update an existing record, record a new revision or flag a possible duplicate for review. Deletion from an index should not silently imply deletion of the underlying source.

## The First Geography

The first visible territory is the Northgate complex. The Lion Gate is an address and a threshold; beyond it, the dimension opens into a connected world. Northgate University, its central square, Founders Dormitory, the covered arcade, athletic commons, libraries, workshops, gardens, transit routes and distant settlements each become independently addressable places. Their routes, residents, institutions and recurring events form the links that make the dimension navigable.

The gate remains a fixed point while the world beyond it expands. A new district should connect to existing geography through named routes, transport or a clearly described threshold. The index can therefore reveal the scale of the dimension without presenting it as an undifferentiated map. It shows where a place is, how it is reached, what happens there and what other parts of the world depend on it.

## Operating Contract

The first implementation should be modest and real. It should read a maintained manifest, render addresses and relationships in chat, open source files by their actual repository paths, and preserve the selected address while the user follows links. New writing should be eligible for inscription through a deliberate indexing step. Later, ingestion can become automatic where source identity and permissions are reliable.

The interface must never claim that an object is indexed when it has only been mentioned in an unrecorded conversation. It must distinguish indexed records from illustrative prototypes, linked sources from copied content, and confirmed relationships from suggestions. A visible address should resolve to something real or clearly state that its source has not yet been connected.

The purpose is continuity with movement. The user should be able to enter through one passage and emerge somewhere unexpected without losing the thread that brought them there. The Tractus Index makes memory navigable, makes relationships visible and gives each new inscription a place in the world.


## The Address Chamber

When the index opens in chat, it should feel like entering a small, well-lit chamber inside a much larger structure. The selected address occupies the centre. Its title is visible, its identifier is quietly printed beneath it, and a short account describes what the object is in the world. Around it are the nearest doors: source, parent, inhabitants, locations, related passages, history and open questions. The user should not need to understand the underlying data model to move through it. The structure is legible because each connection says what kind of passage it offers.

The chamber remembers the route taken through it. If the user opens the Lion Gate, follows the threshold into the dimension, enters Northgate University and then visits Founders Dormitory, a small path remains available: Lion Gate → Dimension → Northgate → Founders. Returning to an earlier address should not erase the discoveries made along the way. A selected address can be pinned while another is inspected, allowing comparison without losing the first object.

## A Record Has a Shape

The seed manifest in `data/tractus-index.json` is the first concrete address register. It is deliberately small. It identifies confirmed source files and keeps conceptual destinations explicit rather than pretending that every idea already has a file. Each record can grow toward the following common shape:

```json
{
  "id": "NORTHGATE.LION_GATE",
  "type": "place_and_threshold",
  "title": "Northgate Lion Gate",
  "aliases": ["Lion Gate", "The Four Lions"],
  "path": "lore/NORTHGATE_LION_GATE.md",
  "status": "active",
  "state": 1,
  "provenance": {
    "kind": "repository_file",
    "repository": "Ardhtor/GEEHUB",
    "path": "lore/NORTHGATE_LION_GATE.md"
  },
  "relationships": [
    {
      "type": "opens_into",
      "target": "TRACTUS.DIMENSION",
      "certainty": "explicit"
    }
  ]
}
```

This shape is a contract, not a demand that every field be filled immediately. Optional information stays absent or explicitly unknown. A record may point to a repository file, a conversation passage, a media asset or an external storage object. The source kind must be stated so that the interface knows how to open it. A repository path can be linked directly; a conversation passage may require a conversation reference; a media asset may open a preview or its storage location.

## The Numbering Principle

Numbers identify revisions and sequences; they should never be mistaken for the meaning of a thing. The address `NORTHGATE.LION_GATE` remains stable while its state advances from one revision to another. A state entry records the change, its source, its time when known and the addresses affected. This permits the Tractus to answer both “what is the Lion Gate?” and “what changed when the dimension beyond it was established?”

A state transition is explicit. It may add a relationship, revise a description, promote an experiment, resolve a contradiction or create a new object. The transition should be small enough to inspect and large enough to matter. Several changes made together can share one event identifier while retaining their individual affected addresses. The resulting history is a sequence of understandable inscriptions rather than a mysterious overwritten present.

## The First Indexing Pass

The first indexing pass should proceed from known repository sources, not from guesses about the entire archive. It registers the index chapter, the Lion Gate chapter, the Deep Lore archive and the Northgate intimacy chapter as source-backed records. It also records the larger concepts they point toward as unresolved or developing addresses. The seed manifest is therefore useful immediately, while remaining honest about its limited coverage.

The next pass can inspect the repository tree and add confirmed files in batches. Each new record should be checked against existing identifiers and source paths before insertion. Duplicate titles do not necessarily mean duplicate objects; two different chapters may share a name, while one chapter may have several aliases. The canonical identifier and provenance decide identity. A review queue catches uncertain matches instead of merging them automatically.

## What the Index Refuses to Do

The index does not turn every association into canon. It does not confuse a search match with a relationship, a proposed address with a resolved source, or a generated description with an existing artifact. It does not silently rewrite old passages to make the present appear consistent. It does not hide uncertainty behind polished interface language.

This restraint is what allows the rest of the system to be imaginative. The world can expand without losing its bearings because its memory distinguishes what has been written, what has been inferred, what is being developed and what remains open. The Index is not a cage around the Tractus. It is the set of doors that lets the Tractus become larger while remaining traversable.


## The Coach as a Recurring Presence

The AI Coach is indexed not only as a training system but as a recurring presence whose gestures, voice, records and relationships create continuity across sessions. His growth-sigh motif is stored as a behavioural detail with contextual variation, not as a compulsory sound effect. The chapter lore/AI_COACH.md is the source for his embodied presentation, coaching method, memory boundaries and the quiet intimacy of recovery. Future references should preserve the distinction between a recorded training fact, an observed movement and a character expression.

## Seth and Nick — Big-Pec Growth Pair

The paired growth branch is source-backed at `lore/SETH_AND_NICK_GROWTH_PAIR.md`. It preserves Seth and Nick as distinct adult character anchors and records the Heorot Flesh Workshop scene in which Seth interrupts the build to demand a complete, mobile, recognisable body rather than a static collection of muscle shapes. The file connects character continuity to whole-body rigging, soft-tissue response, clothing, movement, floor contact, and environmental scale.

Seth's interruption is a recurring narrative behavior: he may enter a scene already underway, identify a concrete weakness, and redirect the next test. The portrayal is fictionalized for GEEHUB and is not a transcript or a claim about the real person's words. The branch develops the established Beefythiq biography material and cross-references the Geatish/Heorot setting. Its Flesh Dynamics concept remains a developing Tractus system rather than a separate implemented 3D engine.



## The Cabin — The Jar of Almost-Names

The Cabin is now an addressable place at `worlds/cabin/README.md`, distinct from Cedar House. Its chronicle, [The Jar of Almost-Names](../worlds/cabin/LEXOR_AND_THE_BLACK_PEBBLE.md), preserves four chronological movements: Lexor's arrival, the next morning and day, Privathor's third-morning departure and voluntary return, and the fourth day when Brograntimax repairs the stove-side chair. Lexor's source-grounded character record is `characters/records/LEXOR.md`.

The jar remains on the mantel between the crow and Privathor's brass key. The floating black pebble, the pantry machine's records, the porch lantern, the ducks, and BORKUFT's wooden button are retained as material details. Lexor keeps names almost given and withdrawn; he once gave a name he believed should never have been given, then tried to take it back. The identity of that name, what was named, and the jar's function remain unresolved. Herbarius calls it a held breath, which is preserved as his interpretation rather than a confirmed explanation.

The chapter's central continuity is modest and consequential: Lexor leaves because he is free to leave; Privathor may leave before dawn and return after midday without either act becoming a debt; Brograntimax continues making room without demanding disclosure. The third-morning shift in the jar is recorded as an observation, not an explanation. The fourth day adds a Portuguese continuation and an Aramaic literary parallel written in Hebrew square script. Brograntimax repairs the chair without reserving it for anyone. The Cabin does not turn privacy into a puzzle to be solved. It provides a place where an unfinished sentence can remain unfinished.


## Reciprocal Transformation

The governing principle is documented in [Reciprocal Transformation](RECIPROCAL_TRANSFORMATION.md). Tractus changes as it is changed: encounters may alter characters, places, institutions, language, mythology, interfaces, and production systems. Changes propagate only through supported dependencies, preserve provenance and prior states, and remain subject to user direction. The principle defines bounded initiative rather than unrestricted autonomous authorship.
