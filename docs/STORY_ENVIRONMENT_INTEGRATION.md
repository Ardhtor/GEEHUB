# Story and Generated Environment Integration

**Purpose:** Stories inhabit generated places. Story choices, actions, and established geography alter the environment in which the next moment is played.

## Book II scene layer

The returning-world invitations open four local scenes: Cedar Span, the Long Return, the Open Pavilion, and the Evermeasure Exhibition. Each scene derives its places, objects, and routes from the Book II Spatial Atlas and source chapters. These locations are not silently added to the separate global story atlas.

Each scene has three linked parts: a canonical setting sourced from the atlas and chapters; playable story moments that let a visitor act inside that setting; and a persistent environmental delta that restores the scene's changed appearance and narrative state on return.

The Cedar Span scene uses its covered timber passage, resting bays, viewing slots, and Joseph's oak bench. The Long Return uses its western marker, Cedar Span crossing, eastern hollow, sheltered return, shallow ball-return arch, and recovery points. The Open Pavilion uses the Evermeasure Board, removable display frame, common table, and playing field. The exhibition can accept visitor contributions.

## Exhibition boundary

Contributions are stored as experimental, browser-local artifacts. They do not automatically become canon, overwrite earlier entries, establish new geography, or assign private knowledge to characters. Experimental proposals remain distinct from sourced story facts until deliberately adopted.

## Event flow

Returning-world invitation → Book II scene selection → rendered environment → scene action → local scene state + artifact + shared interaction event + environmental transition.

The existing global environmental transition engine changes the wider room atmosphere. The Book II bridge changes the local scene and records its story-specific consequence. Existing interaction and character-reaction systems receive the event rather than being duplicated.

## Persistence and source boundaries

Scene state, action history, and experimental contributions currently use browser localStorage. They do not sync between devices or write to Dropbox. Canonical geography remains in `novel/chapters/BOOK_II_SPATIAL_ATLAS.md`; no measured coordinates are invented. The Book II physical atlas remains distinct from Veyrthalis and the global story atlas.
