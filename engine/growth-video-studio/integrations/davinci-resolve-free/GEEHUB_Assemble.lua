-- GEEHUB / Resolve Free: assemble imported source footage.
-- Run from Workspace > Scripts > Utility after importing the source clip
-- into the 01_SOURCE Media Pool bin.
-- This script does not overwrite or delete timelines.

local function log(message)
    print("[GEEHUB] " .. tostring(message))
end

if resolve == nil then
    log("Resolve scripting context unavailable.")
    return
end

local pm = resolve:GetProjectManager()
local project = pm and pm:GetCurrentProject()
if not project then
    log("No open project.")
    return
end

local pool = project:GetMediaPool()
local root = pool and pool:GetRootFolder()
if not root then
    log("Media Pool root unavailable.")
    return
end

local function folderNamed(parent, wanted)
    local folders = parent:GetSubFolderList() or {}
    for _, folder in ipairs(folders) do
        if folder:GetName() == wanted then return folder end
    end
    return nil
end

local sourceFolder = folderNamed(root, "01_SOURCE")
if not sourceFolder then
    log("01_SOURCE bin not found. Run GEEHUB_Setup.lua first.")
    return
end

local clips = sourceFolder:GetClipList() or {}
if #clips == 0 then
    log("01_SOURCE is empty. Import your source video into the Media Pool, then move it into 01_SOURCE and run again.")
    return
end

local timelineName = "GEEHUB_GROWTH_SEQUENCE"
local timeline = nil
local count = project:GetTimelineCount() or 0
for i = 1, count do
    local candidate = project:GetTimelineByIndex(i)
    if candidate and candidate:GetName() == timelineName then
        timeline = candidate
        break
    end
end

if timeline then
    log("Timeline already exists. Leaving it untouched to avoid duplicate edits.")
    log("Source clips found in 01_SOURCE: " .. tostring(#clips))
    log("Create a new empty timeline if you want a fresh assembly.")
    return
end

timeline = pool:CreateEmptyTimeline(timelineName)
if not timeline then
    log("Could not create the assembly timeline.")
    return
end

local items = {}
for _, clip in ipairs(clips) do
    table.insert(items, { mediaPoolItem = clip })
end

local appended = pool:AppendToTimeline(items)
if not appended or #appended == 0 then
    log("Timeline created, but Resolve did not append the source clips.")
    log("The clips remain safely stored in 01_SOURCE.")
    return
end

project:SetCurrentTimeline(timeline)
log("ASSEMBLY COMPLETE: appended " .. tostring(#appended) .. " clip(s).")
log("Timeline: " .. timelineName)
log("Original media remains in 01_SOURCE. No source files were modified.")
