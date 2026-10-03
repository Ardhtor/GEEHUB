# GEEHUB Workspace Access Contract

GEEHUB should be treated as a connected workspace, not a collection of isolated files.

## Repository

The GitHub repository is the executable source and structural record of the Hub. When modifying GEEHUB, inspect the surrounding implementation and data before adding isolated mechanisms. Changes should be integrated into the existing runtime.

Repository:
Ardhtor/GEEHUB

The working principle is:
inspect the whole -> understand relationships -> modify the system -> run it -> observe the return -> record what changed.

## Filespace

GEEHUB may use a user-approved writable filespace as its expansion surface. Browser security requires explicit user selection/permission for local filesystem access; the Hub must never pretend it has access that has not been granted.

When filespace access exists, it should be treated as persistent memory for:
- artifacts
- lore
- scenes
- world state
- generated assets
- manifests
- intermediate experiments
- visual references
- future creations

The existing GEEHUB_EXPANSION mechanism is the model for this behavior.

## Dropbox

Dropbox is the preferred persistent external filespace for GEEHUB production and generated assets when a connected Dropbox workspace is available.

Use Dropbox as the repository layer for substantial generated GEEHUB outputs rather than leaving important production only inside the chat or browser-local state.

GitHub remains the source for executable Hub structure and code. Dropbox serves as durable production/archive space for generated media and larger artifact collections.

## Runtime behavior

The Hub should not merely expose memory. It should use memory.

The fundamental cycle is:

INPUT / ENCOUNTER
→ REMEMBER
→ ASSOCIATE
→ TRANSFORM
→ CREATE
→ RETURN
→ REMEMBER AGAIN

RUN is therefore a request for the world to produce a return, not merely a command to animate the interface.

Every significant return should be capable of becoming an artifact, trace, state change, association, or new world material.

## Integration rule

Before implementing a new feature, inspect:
- the existing runtime
- relevant data files
- current artifact mechanisms
- current UI sections
- existing creation engines
- existing memory/state mechanisms

Prefer extending existing mechanisms over creating parallel systems that do the same thing.

The Hub should become more interconnected as it grows.

## Access principle

Full workspace access means enough visibility and write capability to understand and modify the connected GEEHUB system coherently. It does not mean unrestricted access to the user's computer.

The system should always distinguish:
- what GEEHUB knows
- what GEEHUB can read
- what GEEHUB can write
- what has actually been generated
- what has actually been persisted

No fictional access should be represented as real access.
