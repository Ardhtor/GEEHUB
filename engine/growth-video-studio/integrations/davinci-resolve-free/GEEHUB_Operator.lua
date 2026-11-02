-- GEEHUB OPERATOR — DaVinci Resolve Free
-- One-run project inspection + safe, idempotent editorial setup.
-- Run from Workspace > Scripts > Utility > GEEHUB_Operator.
-- Never deletes media, clips, timelines, or existing markers.
-- It does NOT yet generate/deform video pixels.

local R = Resolve or resolve
local function log(s) print("[GEEHUB OPERATOR] " .. tostring(s)) end
local function call(obj, method, ...)
    if not obj or type(obj[method]) ~= "function" then return nil, "unsupported" end
    local ok, a, b = pcall(obj[method], obj, ...)
    if not ok then return nil, tostring(a) end
    return a, b
end
local function safeName(obj, method)
    local v = call(obj, method)
    return v ~= nil and tostring(v) or nil
end
local function clean(s)
    s = tostring(s or "")
    return s:gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\r", "\\r"):gsub("\t", "\\t")
end
local function json(v)
    local t = type(v)
    if t == "nil" then return "null"
    elseif t == "boolean" or t == "number" then return tostring(v)
    elseif t == "string" then return '"' .. clean(v) .. '"'
    elseif t == "table" then
        local isArray, max, count = true, 0, 0
        for k,_ in pairs(v) do
            if type(k) ~= "number" or k < 1 or k % 1 ~= 0 then isArray = false; break end
            if k > max then max = k end
            count = count + 1
        end
        local parts = {}
        if isArray and max == count then
            for i=1,max do parts[#parts+1] = json(v[i]) end
            return "[" .. table.concat(parts, ",") .. "]"
        end
        for k,val in pairs(v) do parts[#parts+1] = json(tostring(k)) .. ":" .. json(val) end
        return "{" .. table.concat(parts, ",") .. "}"
    end
    return json(tostring(v))
end
local function findFolder(parent, wanted)
    local folders = call(parent, "GetSubFolderList") or {}
    for _, f in ipairs(folders) do
        if safeName(f, "GetName") == wanted then return f end
    end
end
local function ensureFolder(pool, root, name)
    local f = findFolder(root, name)
    if f then return f, "existing" end
    local created, err = call(pool, "AddSubFolder", root, name)
    if created then return created, "created" end
    return nil, err or "creation failed"
end

if not R then log("Resolve scripting API unavailable. Run this from inside Resolve."); return end
local pm = call(R, "GetProjectManager")
local project = pm and call(pm, "GetCurrentProject")
if not project then log("No project open. Open your GEEHUB project and run again."); return end
local pool = call(project, "GetMediaPool")
local root = pool and call(pool, "GetRootFolder")
if not root then log("Media Pool unavailable."); return end

local report = {
    schema = "geehub.resolve.audit.v1",
    created_at = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    application = "DaVinci Resolve",
    project = { name = safeName(project, "GetName") },
    actions = {},
    capabilities = {},
    media = {},
    timelines = {},
    warnings = {}
}

-- Probe capabilities without invoking potentially destructive methods.
local probes = {
    "GetName", "GetTimelineCount", "GetTimelineByIndex", "GetCurrentTimeline",
    "GetMediaPool", "GetRenderPresets", "GetSetting", "SetSetting",
    "AddRenderJob", "StartRendering", "GetRenderJobList",
    "GetGallery", "GetUniqueId"
}
for _, method in ipairs(probes) do
    local present = false
    local ok, value = pcall(function() return type(project[method]) == "function" end)
    if ok then present = value end
    report.capabilities["project." .. method] = present
end
for _, method in ipairs({"AddSubFolder","AppendToTimeline","CreateEmptyTimeline","ImportMedia","DeleteClips"}) do
    report.capabilities["mediaPool." .. method] = pool and type(pool[method]) == "function" or false
end

-- Ensure predictable bins. Existing content is never moved or removed.
local binNames = {"01_SOURCE","02_FRAMES","03_GROWTH_PASSES","04_COMPOSITES","05_EXPORTS","06_REVIEW"}
for _, name in ipairs(binNames) do
    local folder, status = ensureFolder(pool, root, name)
    report.actions[#report.actions+1] = { action = "ensure_bin", name = name, status = folder and status or "failed", detail = folder and nil or status }
end

-- Inventory Media Pool recursively.
local function scanFolder(folder, path)
    local clips = call(folder, "GetClipList") or {}
    for _, clip in ipairs(clips) do
        local props = call(clip, "GetClipProperty") or {}
        report.media[#report.media+1] = {
            name = safeName(clip, "GetName"),
            folder = path,
            duration = props.Duration,
            fps = props["Frames per second"],
            resolution = (props.Width and props.Height) and (tostring(props.Width) .. "x" .. tostring(props.Height)) or nil,
            codec = props["Video Codec"],
            audio = props["Audio Codec"]
        }
    end
    local folders = call(folder, "GetSubFolderList") or {}
    for _, child in ipairs(folders) do
        scanFolder(child, path .. "/" .. (safeName(child, "GetName") or "unnamed"))
    end
end
scanFolder(root, safeName(root, "GetName") or "Master")

-- Inspect every timeline and current active timeline.
local timelineCount = call(project, "GetTimelineCount") or 0
local active = call(project, "GetCurrentTimeline")
local activeName = active and safeName(active, "GetName") or nil
for i=1,timelineCount do
    local tl = call(project, "GetTimelineByIndex", i)
    if tl then
        local item = {
            index = i, name = safeName(tl, "GetName"),
            start_frame = call(tl, "GetStartFrame"),
            end_frame = call(tl, "GetEndFrame"),
            video_tracks = call(tl, "GetTrackCount", "video") or 0,
            audio_tracks = call(tl, "GetTrackCount", "audio") or 0,
            markers = {}
        }
        for j=1,item.video_tracks do
            item.markers = item.markers
            local trackName = call(tl, "GetTrackName", "video", j)
            item["video_track_" .. j] = trackName
        end
        local markers = call(tl, "GetMarkers") or {}
        for frame, marker in pairs(markers) do
            item.markers[#item.markers+1] = { frame = frame, name = marker.name, color = marker.color, note = marker.note, customData = marker.customData }
        end
        report.timelines[#report.timelines+1] = item
    end
end

-- Safe editorial structure on the active timeline: add only missing tracks/markers.
if active then
    local desiredTracks = {"V1_SOURCE","V2_FRAME_EVIDENCE","V3_GROWTH_PASSES","V4_FINAL_COMPOSITE"}
    local existing = {}
    local trackCount = call(active, "GetTrackCount", "video") or 0
    for i=1,trackCount do
        local n = call(active, "GetTrackName", "video", i)
        if n and n ~= "" then existing[n] = true end
    end
    for _, name in ipairs(desiredTracks) do
        if not existing[name] then
            local added = call(active, "AddTrack", "video")
            if added then
                local idx = call(active, "GetTrackCount", "video") or 0
                local named = call(active, "SetTrackName", "video", idx, name)
                report.actions[#report.actions+1] = {action="add_video_track", name=name, status=named and "created" or "added_but_unnamed"}
            else
                report.actions[#report.actions+1] = {action="add_video_track", name=name, status="unsupported_or_failed"}
            end
        else
            report.actions[#report.actions+1] = {action="add_video_track", name=name, status="already_exists"}
        end
    end

    local startFrame = call(active, "GetStartFrame")
    local endFrame = call(active, "GetEndFrame")
    if startFrame and endFrame and endFrame > startFrame then
        local stages = {
            {"BASELINE","01 BASELINE","Blue","Original identity, proportions, pose, camera and lighting."},
            {"DESIRE","02 DESIRE","Purple","Creative target and growth direction."},
            {"GROWTH","03 GROWTH","Cyan","Progressive scale and muscular development."},
            {"STRESS","04 STRESS","Orange","Anatomy, fabric, contact and environmental response."},
            {"MUTATION","05 MUTATION","Red","Strongest controlled escalation with continuity."},
            {"NEW_BASELINE","06 NEW BASELINE","Green","Final identity, proportions and temporal review."}
        }
        local have = {}
        local markers = call(active, "GetMarkers") or {}
        for _, m in pairs(markers) do if m.customData then have[m.customData] = true end end
        local duration = endFrame - startFrame
        for i, stage in ipairs(stages) do
            local key = "GEEHUB_STAGE:" .. stage[1]
            if not have[key] then
                local frame = math.floor(startFrame + duration * ((i-1)/(#stages-1)))
                local ok = call(active, "AddMarker", frame, stage[3], stage[2], stage[4], 1, key)
                report.actions[#report.actions+1] = {action="add_stage_marker", name=stage[2], frame=frame, status=ok and "created" or "unsupported_or_failed"}
            end
        end
    else
        report.warnings[#report.warnings+1] = "Active timeline has no measurable duration; stage markers were not added."
    end
else
    report.warnings[#report.warnings+1] = "No active timeline. Project inventory completed; no timeline structure was changed."
end

report.summary = {
    timeline_count = timelineCount,
    active_timeline = activeName,
    media_item_count = #report.media,
    action_count = #report.actions
}

-- Compare with the previous audit. This gives GEEHUB observable signals
-- about what changed locally without asking the user to diagnose it.
local home = os.getenv("HOME") or ""
local priorPath = home .. "/Library/CloudStorage/Dropbox/GEEHUB/Bridge/outgoing/resolve-audit.json"
local previousFile = io.open(priorPath, "r")
local function priorNumber(source, key)
    local value = source:match('"' .. key .. '"%s*:%s*(%d+)')
    return value and tonumber(value) or nil
end
local function priorString(source, key)
    return source:match('"' .. key .. '"%s*:%s*"([^"]*)"')
end
if previousFile then
    local previousText = previousFile:read("*a")
    previousFile:close()
    local oldMedia = priorNumber(previousText, "media_item_count")
    local oldTimelines = priorNumber(previousText, "timeline_count")
    local oldActive = priorString(previousText, "active_timeline")
    local changes = {}
    if oldMedia and oldMedia ~= #report.media then
        changes[#changes+1] = {signal="media_count_changed", before=oldMedia, after=#report.media}
    end
    if oldTimelines and oldTimelines ~= timelineCount then
        changes[#changes+1] = {signal="timeline_count_changed", before=oldTimelines, after=timelineCount}
    end
    if oldActive ~= nil and oldActive ~= (activeName or "") then
        changes[#changes+1] = {signal="active_timeline_changed", before=oldActive, after=activeName or ""}
    end
    report.observation = {
        comparison = "compared with previous audit",
        changes = changes,
        interpretation = (#changes > 0) and "Project state changed; GEEHUB can use these signals to choose the next inspection or setup step." or "No change detected in the compared summary fields.",
        limits = "This snapshot comparison does not establish why a change happened or whether it expresses approval."
    }
    report.previous_snapshot_detected = true
else
    report.previous_snapshot_detected = false
    report.observation = {
        comparison = "first audit; this run establishes a baseline",
        interpretation = "Future runs can detect changes in media count, timeline count, and active timeline."
    }
end
report.observation_policy = {
    principle = "infer observable project changes, not private intention",
    safety = "never interpret a project change as permission to delete, overwrite, publish, or spend money"
}

local output = json(report)
local candidates = {
    home .. "/Library/CloudStorage/Dropbox/GEEHUB/Bridge/outgoing/resolve-audit.json",
    home .. "/Desktop/GEEHUB-resolve-audit.json"
}
local saved = false
for _, path in ipairs(candidates) do
    local f = io.open(path, "w")
    if f then
        f:write(output)
        f:close()
        report.output_path = path
        saved = true
        break
    end
end

log("Project: " .. tostring(report.project.name))
log("Active timeline: " .. tostring(activeName or "none"))
log("Timelines: " .. tostring(timelineCount) .. " | Media items: " .. tostring(#report.media))
log("Actions recorded: " .. tostring(#report.actions))
if saved then log("Audit saved to: " .. report.output_path)
else log("Could not write audit file. Copy the console output or check Dropbox/Desktop permissions.") end
log("OPERATOR PASS COMPLETE. No source media or existing timeline clips were deleted or replaced.")
log("This pass organizes and audits Resolve; it does not yet generate body deformation or rendered growth frames.")
