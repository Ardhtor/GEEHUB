# Repository Constellation

This document records the external repositories that currently inform GEEHUB's architecture, not as dependencies to copy wholesale, but as prior experiments from the same workspace. The purpose is to make the hub's design lineage inspectable.

## ModernTexts

Repository: `Ardhtor/ModernTexts`

The most useful inheritance is methodological. Its writing treats practice as repeated action, analysis as study of practice, and meta-analysis as analysis turned back onto analysis itself. That suggests a simple rule for GEEHUB: when a workflow is used repeatedly, study the workflow and consider turning what was learned into structure.

The repository also demonstrates that conceptual material benefits from being preserved as text rather than compressed into implementation details. GEEHUB therefore keeps substantial reasoning in build narratives, project notes, and decision records.

Its recent history also matters. A real-time perception scenario was added and then a private scenario was explicitly removed from the public repository. That is a useful example of experimentation followed by boundary-setting: not every interesting artifact belongs in the public layer. GEEHUB inherits that distinction by keeping sensitive or private material out of public-facing repository artifacts while preserving the architectural lesson.

## Blender / 3D codebase

Repository: `Ardhtor/PgkKKGLu966`

The repository describes Blender as a complete 3D creation pipeline spanning modeling, rigging, animation, simulation, rendering, compositing, motion tracking, and video editing. Its README also intentionally stays concise and points outward to deeper documentation.

The GEEHUB inheritance is twofold. First, the Blender node should be treated as a production surface capable of holding a whole pipeline rather than a single modeling trick. Second, the public entry point should remain readable even when the underlying system is deep. Detailed material belongs in the appropriate workspace rather than in the hub's front page.

Because the repository is Blender itself, it also reinforces the decision to keep GEEHUB's Blender connection conceptual until the actual connector is exposed. The hub can describe, index, and link the 3D production surface without pretending to control an unavailable application endpoint.

## Stable Diffusion web UI

Repository: `Ardhtor/lp9hppuio88`

This repository is especially useful as interaction precedent. Its documented features include direct creative controls, visible generation parameters, variations, history, prompt editing, live previews, saved styles, batch operations, and mechanisms for recovering prior generation state.

The relevant lesson for GEEHUB is not to reproduce its interface. It is to make creative state visible and easy to revisit. A jammer result should show its ingredients and constraint. A variation should be cheap to request. A useful result should be saveable. A later session should be able to inspect the record rather than reconstructing the idea from memory.

The repository's history is similarly concrete. Individual commits often name the actual defect being corrected, such as model-name handling or memory behavior. That supports GEEHUB's preference for commit messages that identify both the change and the pressure behind it.

## What these repositories collectively imply

The three repositories describe complementary instincts.

`ModernTexts` says: practice can be studied and turned into a better practice.

The Blender codebase says: a deep system still needs a clean front door.

The Stable Diffusion interface says: creative work is more useful when state, variation, and recoverability remain visible.

GEEHUB combines those instincts into one rule:

**make the doorway simple, make the experiment concrete, make the reasoning durable, and make the result recoverable.**

This is why the hub is becoming both an atlas and a small creative instrument. The atlas preserves relationships. The jammer creates collisions. The projects provide places for those collisions to become actual work.

## Source discipline

These repositories are source material for architectural reasoning only. GEEHUB should not copy large bodies of code, private material, or sensitive artifacts merely because they are available through the same GitHub profile. Borrowed ideas should be documented as influences, and implementation should be original or appropriately licensed.
