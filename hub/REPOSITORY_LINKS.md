# Repository links in the constellation

The Atlas is now allowed to point at accessible GitHub repositories without requiring every idea to become a repository. This is a small but important distinction: the constellation can describe active concepts, experiments, and future splits while still exposing the places where code or source material already lives.

## Current linked repositories

- `Ardhtor/ModernTexts` — recorded as an active research/texts node.
- `Ardhtor/LINUX_S` — recorded as an active systems/tool node.

These links are public repository destinations, not copies of repository contents. The hub keeps only the relationship metadata needed for navigation.

## Why this belongs in `projects.json`

`hub/projects.json` is the machine-readable registry consumed by the constellation interface. An optional `repo` field lets the interface distinguish a dedicated repository from a hub-only placeholder. The existing `path` field remains available for local pages, such as the BodyLounger archive.

The interface uses this rule:

- if `repo` exists, show **OPEN REPOSITORY** and open it in a new tab;
- otherwise, use the local `path` when one exists;
- otherwise, keep the node visible as a concept whose repository/workspace has not split out yet.

This keeps the surface simple while making repository boundaries discoverable and explicit. It also avoids silently treating every project name as an existing codebase.

## Scope boundary

The registry does not claim that a linked repository is the canonical home of a concept, nor does it copy private or restricted material into GEEHUB. It records an observed relationship that can be revised when the constellation changes.
