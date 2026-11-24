# Dropbox Corpus Map

**Snapshot:** 24 November 2026  
**Purpose:** record the verified relationship between the active Dropbox production workspace and the GitHub GEEHUB repository. This is a point-in-time inventory, not a claim of automatic synchronisation or a complete content audit.

## Source roles

GitHub repository `Ardhtor/GEEHUB` is the current source for application code, schemas, project registries, world and spatial state, manuscript Markdown, continuity records, and the browser-facing Atlas. Its README, Project Atlas, Universal Growth Engine, and project registries provide the navigational and governance layer.

The active Dropbox workspace is `/GEEHUB`. It holds production material, media, Paper documents, and working folders. The two stores are related but are not an always-on mirror. Each item retains its exact source path and revision.

## Verified Dropbox structure

The immediate children of `/GEEHUB` include `AI`, `chapters`, `worlds`, `production`, `DREAM_MATERIAL`, `state`, `_engine`, `Creations`, `maps`, `assets`, `characters`, `experiments`, `corpus`, and `Space Cowboy`.

Selected direct-child checks on 24 November found:

- `/GEEHUB/AI` contains the GEEHUB AI Build 0.1 specification, Presence Charter, Cross-Book Chapter Influence Protocol, Production Priority Paper, Live Wand Session 001, Book II Chapter VIII Paper companion, and Ian Kistner/Gabe/Kirk relationship branch.
- `/GEEHUB/production` contains `assets`, `scenes`, `recipes`, `projects`, and `references`, plus the Visual Taste & Comic Production System Paper document.
- `/GEEHUB/maps`, `/GEEHUB/corpus`, and `/GEEHUB/state` were empty in the direct-child checks. Their GitHub counterparts are active; do not mistake these Dropbox folders for populated mirrors.
- `/GEEHUB/DREAM_MATERIAL` exists and was recently modified, but its contents were not inspected in this pass.

## Verified manuscript alignment

The Dropbox Paper document **GEEHUB Production Priority — Book II, then Book III** is synchronized to `novel/PRODUCTION_PRIORITY.md` at Paper revision 8. It reflects the nine-chapter sequence, the corrected 27,871-word baseline, first expansion passes for Chapters I and II, and the next revision cursor at Chapter III.

The Dropbox Paper companion for **Book II — Chapter VIII: A Day in the Open Pavilion** was compared with the GitHub manuscript. The body matches; the GitHub Markdown heading is not duplicated in the Paper body. A Dropbox Paper companion for Chapter IX, a Chapter I Paper mirror, a separate Book II Completion Register Paper, and a chronology-map Paper were not located in the searches performed. The GitHub Markdown files remain the current sources for those records.

The **GEEHUB AI — Build 0.1** Paper document is a foundation specification, not a deployed or trained AI model. Its target runtime files and provider configuration remain implementation work. Any implementation must connect to the existing event-inscription, activity, artifact, continuity, and state systems; it must not introduce a second event log, canon store, artifact ledger, or project registry.

## Snapshots and recovery

`/GEEHUB_COPY` is a separately retained snapshot whose root listing was last modified on 5 November 2026. `/GEEHUB_RECOVERY_2026-11-15` is a separately named recovery snapshot dated 15 November 2026. They have not been merged into `/GEEHUB` or deleted. Treat both as rollback sources until their contents have been compared at file level.

## Consolidation rules

1. Keep `/GEEHUB` as the active Dropbox workspace.
2. Keep GitHub as the source for current code, registries, runtime state, manuscripts, and continuity Markdown.
3. Preserve original media and its Dropbox path; attach derivatives and generated outputs as linked records rather than overwriting sources.
4. Synchronize a Paper mirror only after comparing it with the current GitHub source and recording the revision.
5. Do not copy folders wholesale from older snapshots. Compare file IDs, hashes where available, modification dates, and provenance first.
6. Do not claim Dropbox sync or the GEEHUB AI runtime is automated until a real, verified service performs those operations.
7. Recheck this inventory before moving, renaming, merging, or deleting Dropbox material.

This map records the state actually inspected. Unlisted descendants, unreviewed media, and unexamined recovery contents remain unclassified rather than presumed absent.
