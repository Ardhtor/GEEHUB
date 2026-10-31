-- GEEHUB / DaVinci Resolve Free bridge
-- Run from Workspace > Scripts > Utility inside DaVinci Resolve.
-- This script runs in Resolve's own Lua environment; it does not require Studio's
-- external scripting permission.

local function report(message)
    print("[GEEHUB] " .. tostring(message))
end

local function safe_call(label, fn)
    local ok, result = pcall(fn)
    if not ok then
        report(label .. " failed: " .. tostring(result))
        return nil
    end
    return result
end

if resolve == nil then
    report("Resolve scripting context is missing. Run this from Workspace > Scripts.")
    return
end

local manager = safe_call("GetProjectManager", function()
    return resolve:GetProjectManager()
end)

if manager == nil then
    report("Could not access the project manager.")
    return
end

local project_name = "GEEHUB Growth Studio"
local project = safe_call("CreateProject", function()
    return manager:CreateProject(project_name)
end)

if project == nil then
    -- Never overwrite or reset an existing project. If it already exists,
    -- use the currently open project only when its name matches exactly.
    local current = safe_call("GetCurrentProject", function()
        return manager:GetCurrentProject()
    end)
    if current ~= nil and current:GetName() == project_name then
        project = current
        report("Using the existing GEEHUB Growth Studio project.")
    else
        report("Could not create the project. A project with that name may already exist; open it and run again.")
        return
    end
else
    report("Created project: " .. project_name)
end

local pool = safe_call("GetMediaPool", function()
    return project:GetMediaPool()
end)

if pool == nil then
    report("Project opened, but the media pool was unavailable.")
    return
end

local folders = { "01_SOURCE", "02_FRAMES", "03_GROWTH_PASSES", "04_COMPOSITES", "05_EXPORTS" }
local root = safe_call("GetRootFolder", function()
    return pool:GetRootFolder()
end)

if root == nil then
    report("Project opened, but the root media-pool folder was unavailable.")
    return
end

local created = 0
for _, name in ipairs(folders) do
    local folder = safe_call("CreateFolder " .. name, function()
        return pool:CreateFolder(name)
    end)
    if folder ~= nil then created = created + 1 end
end

local timeline_name = "GEEHUB_GROWTH_SEQUENCE"
local timeline = safe_call("CreateEmptyTimeline", function()
    return pool:CreateEmptyTimeline(timeline_name)
end)

if timeline ~= nil then
    report("Created timeline: " .. timeline_name)
else
    report("Timeline was not created (it may already exist).")
end

report("Setup complete. Created " .. tostring(created) .. " media bins.")
report("Import the source clip into 01_SOURCE, then build the edit on GEEHUB_GROWTH_SEQUENCE.")
report("GEEHUB does not render body growth yet; this bridge prepares Resolve for editorial, compositing, and export.")
