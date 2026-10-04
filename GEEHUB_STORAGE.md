# GEEHUB Storage Layer

GEEHUB treats Dropbox as its external, persistent media layer.

## Root

`/GEEHUB`

## Live storage map

- `/GEEHUB/assets` — reusable visual components
- `/GEEHUB/characters` — character assets
- `/GEEHUB/worlds` — world/scene assets
- `/GEEHUB/maps` — geography and spatial assets
- `/GEEHUB/Creations` — generated finished creations
- `/GEEHUB/production` — active production material
- `/GEEHUB/artifacts` — persistent artifacts
- `/GEEHUB/experiments` — experimental branches
- `/GEEHUB/state` — runtime/state material
- `/GEEHUB/corpus` — source corpus
- `/GEEHUB/chapters` — narrative output
- `/GEEHUB/_engine` — engine/support material

## Asset rule

Visual generation is not a chat-only event. A generated image becomes a GEEHUB asset when it is stored in Dropbox and indexed by the hub.

Recommended record shape:

```json
{
  "id": "stable-asset-id",
  "kind": "image",
  "title": "human-readable name",
  "path": "/GEEHUB/assets/...",
  "created": "ISO-8601",
  "source": "generated|imported|derived",
  "tags": [],
  "world": null,
  "parent": null
}
```

The repository contains the executable/interface layer; Dropbox contains the growing visual corpus. This keeps large media outside git while allowing GEEHUB to treat it as world memory.

## Current Dropbox root

The connected Dropbox account already contains the GEEHUB root and the storage branches above.
