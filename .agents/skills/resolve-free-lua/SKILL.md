---
name: resolve-free-lua
description: Build, configure, validate, and install GEEHUB Lua scripts for DaVinci Resolve Free.
---

# Resolve Free Lua workflow

Use this skill for any change to the Resolve Free integration.

1. Read `AGENTS.md` and the integration README.
2. Inspect existing scripts before editing. Preserve working API calls.
3. Use the active project and active timeline; never silently create or switch projects.
4. Make setup scripts idempotent. Preserve existing clips and tracks.
5. Keep source, evidence, growth passes, composites, and exports separate.
6. Do not claim that Lua scripts perform pixel deformation unless they actually invoke an implemented renderer or effect.
7. Validate syntax with `luac -p` when available. Then provide the user the exact Resolve in-app execution step for runtime validation.
8. Keep compatibility with Resolve Free and prefer in-app Lua execution over external control.

Known verified API detail: Media Pool folders are created with `MediaPool:AddSubFolder(parentFolder, folderName)`. `CreateFolder` is not a valid method in the user's tested environment.
