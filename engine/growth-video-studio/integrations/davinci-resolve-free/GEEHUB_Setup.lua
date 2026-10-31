-- GEEHUB / DaVinci Resolve Free bridge
-- Run this in Workspace > Console, with Lua selected.
-- Uses the currently open project and never deletes or replaces existing work.

local function log(message)
    print("[GEEHUB] " .. tostring(message))
end

if resolve == nil then
    log("Resolve scripting context is missing.")
    return
end

local pm = resolve:GetProjectManager()
if pm == nil then
    log("Project Manager unavailable.")
    return
end

local project = pm:GetCurrentProject()
if project == nil then
    log("No project is open. Open your GEEHUB timeline/project first, then run again.")
    return
end

log("Using current project: " .. tostring(project:GetName()))

local mediaPool = project:GetMediaPool()
if mediaPool == nil then
    log("Media Pool unavailable.")
    return
end

local root = mediaPool:GetRootFolder()
if root == nil then
    log("Could not retrieve Media Pool root.")
    return
end

local function getName(folder)
    local ok, name = pcall(function() return folder:GetName() end)
    if ok then return name end
    return nil
end

local function findChild(parent, wanted)
    local children = parent:GetSubFolderList() or {}
    for _, child in ipairs(children) do
        if getName(child) == wanted then return child end
    end
    return nil
end

local names = {
    "01_SOURCE",
    "02_FRAMES",
    "03_GROWTH_PASSES",
    "04_COMPOSITES",
    "05_EXPORTS"
}

local made, existed, failed = 0, 0, 0
for _, name in ipairs(names) do
    local folder = findChild(root, name)
    if folder then
        existed = existed + 1
        log("Already exists: " .. name)
    else
        -- Resolve API method is AddSubFolder(parentFolder, folderName).
        local ok, result = pcall(function()
            return mediaPool:AddSubFolder(root, name)
        end)
        if ok and result ~= nil then
            made = made + 1
            log("Created: " .. name)
        else
            failed = failed + 1
            log("FAILED: " .. name .. " | " .. tostring(result))
        end
    end
end

mediaPool:SetCurrentFolder(root)

local verified = 0
for _, name in ipairs(names) do
    if findChild(root, name) then verified = verified + 1 end
end

log("BIN CHECK: " .. tostring(verified) .. "/5 verified.")
log("Created: " .. tostring(made) .. " | Already existed: " .. tostring(existed) .. " | Failed: " .. tostring(failed))
log("Project and timeline were left intact. Select the Media Pool root to see the bins.")
