-- GEEHUB / DaVinci Resolve Free bridge
-- Run from Workspace > Scripts > Utility inside DaVinci Resolve.
-- Safe to run more than once: existing bins are reused, not deleted.

local function report(message)
    print("[GEEHUB] " .. tostring(message))
end

local function call(label, fn)
    local ok, result = pcall(fn)
    if not ok then
        report(label .. " failed: " .. tostring(result))
        return nil
    end
    return result
end

if resolve == nil then
    report("No Resolve scripting context. Run this from Workspace > Scripts.")
    return
end

local manager = call("GetProjectManager", function()
    return resolve:GetProjectManager()
end)
if not manager then
    report("Cannot access the Project Manager.")
    return
end

local projectName = "GEEHUB Growth Studio"
local project = call("GetCurrentProject", function()
    return manager:GetCurrentProject()
end)

if not project or project:GetName() ~= projectName then
    project = call("CreateProject", function()
        return manager:CreateProject(projectName)
    end)
end

if not project then
    report("Could not create or open the GEEHUB project. Check whether a project with that name already exists.")
    return
end

report("Project: " .. project:GetName())

local pool = call("GetMediaPool", function()
    return project:GetMediaPool()
end)
if not pool then
    report("Media Pool API is unavailable.")
    return
end

local root = call("GetRootFolder", function()
    return pool:GetRootFolder()
end)
if not root then
    report("Could not retrieve the Media Pool root folder.")
    return
end

local selected = call("SetCurrentFolder(root)", function()
    return pool:SetCurrentFolder(root)
end)
if selected == false then
    report("Resolve refused to select the Media Pool root folder.")
    return
end

local names = {
    "01_SOURCE",
    "02_FRAMES",
    "03_GROWTH_PASSES",
    "04_COMPOSITES",
    "05_EXPORTS"
}

local function findFolder(parent, name)
    local children = call("GetSubFolderList", function()
        return parent:GetSubFolderList()
    end) or {}
    for _, folder in ipairs(children) do
        local folderName = call("GetName", function()
            return folder:GetName()
        end)
        if folderName == name then return folder end
    end
    return nil
end

local created, reused, failed = 0, 0, 0
for _, name in ipairs(names) do
    local folder = findFolder(root, name)
    if folder then
        reused = reused + 1
        report("Already exists: " .. name)
    else
        call("Select root before " .. name, function()
            return pool:SetCurrentFolder(root)
        end)
        folder = call("CreateFolder " .. name, function()
            return pool:CreateFolder(name)
        end)
        if folder then
            created = created + 1
            report("Created: " .. name)
        else
            -- Verify whether Resolve created it despite returning no handle.
            folder = findFolder(root, name)
            if folder then
                reused = reused + 1
                report("Created and verified: " .. name)
            else
                failed = failed + 1
                report("Could not create: " .. name)
            end
        end
    end
end

local timelineName = "GEEHUB_GROWTH_SEQUENCE"
local currentTimeline = call("GetCurrentTimeline", function()
    return project:GetCurrentTimeline()
end)
if not currentTimeline or currentTimeline:GetName() ~= timelineName then
    local timeline = call("CreateEmptyTimeline", function()
        return pool:CreateEmptyTimeline(timelineName)
    end)
    if timeline then
        report("Created timeline: " .. timelineName)
    else
        report("Timeline not created; it may already exist. Existing project timeline was left untouched.")
    end
else
    report("Using existing timeline: " .. timelineName)
end

call("Restore root folder selection", function()
    return pool:SetCurrentFolder(root)
end)

local verified = 0
for _, name in ipairs(names) do
    if findFolder(root, name) then verified = verified + 1 end
end

report("BIN CHECK: " .. tostring(verified) .. "/5 verified in the Media Pool root.")
report("New bins: " .. tostring(created) .. "; existing bins: " .. tostring(reused) .. "; failures: " .. tostring(failed))
report("If bins are still not visible, open the Edit page and enable View > Show Media Pool.")
report("This bridge organizes Resolve; GEEHUB's automatic body-growth renderer is still under development.")
