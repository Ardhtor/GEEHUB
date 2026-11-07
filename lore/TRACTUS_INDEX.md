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
