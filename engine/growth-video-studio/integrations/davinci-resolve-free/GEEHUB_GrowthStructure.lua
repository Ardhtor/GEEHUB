-- GEEHUB Growth Structure
-- Run inside DaVinci Resolve: Workspace > Scripts, or paste into the Lua Console.
-- Adds named video lanes and six persistent stage markers to the active timeline.
-- This structures the edit; it does not generate or deform image pixels.

local function log(message)
    print("[GEEHUB STRUCTURE] " .. tostring(message))
end

local function safeCall(fn)
    local ok, result = pcall(fn)
    if not ok then
        log("ERROR: " .. tostring(result))
        return false, nil
    end
    return true, result
end

local resolve = Resolve
if not resolve then
    log("Resolve scripting object is unavailable.")
    return
end

local pm = resolve:GetProjectManager()
local project = pm and pm:GetCurrentProject()
if not project then
    log("Open a project first.")
    return
end

local timeline = project:GetCurrentTimeline()
if not timeline then
    log("Open GEEHUB_GROWTH_SEQUENCE first.")
    return
end

local startFrame = timeline:GetStartFrame()
local endFrame = timeline:GetEndFrame()
if not startFrame or not endFrame or endFrame <= startFrame then
    log("Timeline has no usable duration. Add the source clip first.")
    return
end

-- Keep existing tracks and clips intact. Add only missing named lanes.
local desiredTracks = {
    "V1_SOURCE",
    "V2_FRAME_EVIDENCE",
    "V3_GROWTH_PASSES",
    "V4_FINAL_COMPOSITE"
}

local existing = {}
local videoCount = timeline:GetTrackCount("video") or 0
for i = 1, videoCount do
    local name = timeline:GetTrackName("video", i)
    if name and name ~= "" then existing[name] = true end
end

for _, trackName in ipairs(desiredTracks) do
    if not existing[trackName] then
        local ok, added = safeCall(function()
            return timeline:AddTrack("video")
        end)
        if ok and added then
            local newIndex = timeline:GetTrackCount("video")
            local named = timeline:SetTrackName("video", newIndex, trackName)
            if named then
                log("Created video lane " .. trackName)
                existing[trackName] = true
            else
                log("Track created but could not name it: " .. trackName)
            end
        else
            log("Could not create video lane: " .. trackName)
        end
    else
        log("Lane already exists: " .. trackName)
    end
end

-- Stages are distributed across the actual source duration.
local stages = {
    { key = "BASELINE", name = "01 BASELINE", color = "Blue",
      note = "Record original proportions, identity, pose, camera and lighting." },
    { key = "DESIRE", name = "02 DESIRE", color = "Purple",
      note = "Define the intended growth direction and target silhouette." },
    { key = "GROWTH", name = "03 GROWTH", color = "Cyan",
      note = "Track progressive size and muscle-volume changes." },
    { key = "STRESS", name = "04 STRESS", color = "Orange",
      note = "Check anatomy, fabric tension, contact and environmental interaction." },
    { key = "MUTATION", name = "05 MUTATION", color = "Red",
      note = "Introduce the strongest controlled escalation while preserving continuity." },
    { key = "NEW_BASELINE", name = "06 NEW BASELINE", color = "Green",
      note = "Verify the final physique, identity, proportions and temporal consistency." }
}

local existingMarkers = timeline:GetMarkers() or {}
local markerKeys = {}
for _, marker in pairs(existingMarkers) do
    if marker and marker.customData then markerKeys[marker.customData] = true end
end

local duration = endFrame - startFrame
for i, stage in ipairs(stages) do
    local fraction = (i - 1) / (#stages - 1)
    local frame = math.floor(startFrame + duration * fraction)
    local markerKey = "GEEHUB_STAGE:" .. stage.key
    if not markerKeys[markerKey] then
        local ok, added = safeCall(function()
            return timeline:AddMarker(frame, stage.color, stage.name,
                stage.note, 1, markerKey)
        end)
        if ok and added then
            log("Added marker " .. stage.name .. " at frame " .. frame)
        else
            log("Could not add marker " .. stage.name)
        end
    else
        log("Marker already exists: " .. stage.name)
    end
end

log("Finished. Timeline: " .. timeline:GetName())
log("Video lanes: " .. tostring(timeline:GetTrackCount("video")))
log("Review the six markers across the source clip before creating growth frames.")
