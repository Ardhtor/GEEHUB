# Accessible Constellation

This note records the repository-level boundary used by GEEHUB navigation and automation.

## Public repositories currently declared as navigable nodes

- `Ardhtor/GEEHUB` — this hub and its local-first Narrative Jammer.
- `Ardhtor/ModernTexts` — research/text workspace.
- `Ardhtor/LINUX_S` — systems/tooling workspace.

## Accessible but not promoted

The connected account also exposes `Ardhtor/lp9hppuio88`, a public Stable Diffusion web UI repository. It is intentionally not a GEEHUB node at present: its current contents are a large third-party application surface rather than a clearly bounded user-authored constellation project. Recording that distinction prevents connector visibility from becoming accidental project canon.

## Access boundary

The connected GitHub account may have access to additional repositories that are not declared as public navigation nodes. GEEHUB does not expose those repositories merely because they are visible to the connector. Visibility is not the same thing as permission to redistribute repository contents.

## Operating rule

A repository becomes a GEEHUB navigation node only when its public URL is intentionally declared in `hub/projects.json`. The hub records a link and a short description; it does not mirror repository contents, infer reachability from a name, or turn restricted material into public interface data.

This separation keeps the constellation useful while preserving provenance, user control, and the restricted-media boundary.
