# DaVinci Resolve Free integration

GEEHUB uses Resolve Free as its local editorial, compositing, and finishing station. The integration is deliberately in-process: a Lua script is launched from Resolve's own Scripts menu, rather than trying to connect from an external Python process. This avoids relying on Studio-only external scripting access.

## Install on macOS

1. Quit DaVinci Resolve.
2. Create this folder if it does not exist:

   `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/`

3. Copy `GEEHUB_Setup.lua` into that folder.
4. Reopen Resolve.
5. Open **Workspace > Scripts > Utility > GEEHUB_Setup**.

The script creates a project named **GEEHUB Growth Studio**, a starter timeline, and media bins for source footage, frames, growth passes, composites, and exports. It does not overwrite an existing project. If the project already exists, open it before running the script again.

## First use

Import the source video into `01_SOURCE`. Use the timeline `GEEHUB_GROWTH_SEQUENCE` for editing. Keep generated frame sequences and passes in their named bins, then composite and finish in Resolve.

## What this integration currently does

- Creates a dedicated Resolve project and starter media-pool structure.
- Creates an empty editorial timeline.
- Establishes a predictable handoff location for GEEHUB source footage, image sequences, composites, and exports.
- Runs inside Resolve's own Lua scripting context, so it does not require Studio's external scripting connection.

## Current limits

This is the first integration step, not a live remote-control connection. GEEHUB cannot yet send generated growth frames automatically, control the open Resolve session from chat, or start a render on the user's Mac. Those require a local bridge/transport and a working GEEHUB frame renderer. The current GEEHUB renderer is still under development.

Resolve's free-edition scripting behavior varies by version. Recent community testing reports Lua scripts launched in-app through Workspace > Scripts working on Free, while external scripting and some Python routes are Studio-gated. If the script does not appear, check the installed Resolve version and confirm the folder path. Do not enable network scripting or loosen security settings for this integration.

## References

- [DaVinci Resolve scripting API overview](https://wheheohu.github.io/bmd_doc/ResolveAPI/intro)
- [Free-edition Lua testing notes (Resolve 21.1.1)](https://tech.hatada.jp/en/posts/resolve-free-what-ai-can-still-do-en)
