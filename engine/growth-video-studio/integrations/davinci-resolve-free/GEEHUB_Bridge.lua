-- GEEHUB BRIDGE INSPECTOR — DaVinci Resolve Free
-- Read-only consumer for geehub.media-bridge v1.
-- Run from Workspace > Scripts > Utility > GEEHUB_Bridge.
-- It audits local job JSON and output destinations. It does not import,
-- render, alter timelines, or write to source media.

local function nonEmpty(value)
    return type(value) == "string" and value:match("%S") ~= nil
end

local function positiveInteger(value)
    return type(value) == "number" and value > 0 and value % 1 == 0
end

local function sha256(value)
    return type(value) == "string" and #value == 64 and value:match("^[%da-fA-F]+$") ~= nil
end

local function mapDropboxUri(uri, dropboxRoot)
    local prefix = "dropbox://GEEHUB/"
    if not nonEmpty(uri) or uri:sub(1, #prefix) ~= prefix then
        return nil, "URI must use dropbox://GEEHUB/"
    end
    local relative = uri:sub(#prefix + 1)
    if relative == "" or relative:sub(1, 1) == "/" or relative:find("\\", 1, true) then
        return nil, "Unsafe Dropbox URI path"
    end
    for segment in relative:gmatch("[^/]+") do
        if segment == "." or segment == ".." then
            return nil, "Dropbox URI path traversal is not allowed"
        end
    end
    if relative:find("//", 1, true) then
        return nil, "Empty Dropbox URI path segment"
    end
    local root = tostring(dropboxRoot or ""):gsub("/+$", "")
    if root == "" then return nil, "Dropbox root is unavailable" end
    return root .. "/GEEHUB/" .. relative
end

local function validateManifest(manifest)
    local errors = {}
    local function add(message) errors[#errors + 1] = message end
    if type(manifest) ~= "table" then
        return { valid = false, errors = { "Manifest JSON root must be an object" } }
    end
    if manifest.schema ~= "geehub.media-bridge" then add("Unsupported bridge schema") end
    if manifest.schemaVersion ~= 1 then add("Unsupported bridge schema version") end
    if not nonEmpty(manifest.id) then add("Manifest id is missing") end
    if type(manifest.project) ~= "table" or not nonEmpty(manifest.project.id) or
       not nonEmpty(manifest.project.version) then add("Project reference is incomplete") end
    if type(manifest.revision) ~= "number" or manifest.revision < 0 or
       manifest.revision % 1 ~= 0 then
        add("Manifest revision is invalid")
    elseif manifest.revision == 0 then
        if type(manifest.parentRevision) == "number" then add("Initial revision has a numeric parent") end
    elseif manifest.parentRevision ~= manifest.revision - 1 then
        add("Parent revision is inconsistent")
    end
    if not nonEmpty(manifest.createdAt) or not nonEmpty(manifest.updatedAt) then
        add("Manifest timestamps are incomplete")
    end

    local source = manifest.source
    if type(source) ~= "table" or not nonEmpty(source.id) or
       not nonEmpty(source.name) or not nonEmpty(source.uri) or
       type(source.duration) ~= "number" or source.duration <= 0 or
       not positiveInteger(source.width) or not positiveInteger(source.height) then
        add("Immutable source reference is incomplete")
    elseif source.immutable ~= true then
        add("Source reference is not immutable")
    end

    local roles = {
        segmentation = true, landmarks = true, depth = true,
        deformation = true, composite = true, preview = true
    }
    local statuses = { queued = true, running = true, completed = true, failed = true }
    local arrays = { "frameSets", "renderJobs", "artifacts", "events" }
    for _, field in ipairs(arrays) do
        if type(manifest[field]) ~= "table" then add(field .. " must be an array") end
    end
    local frameSets = type(manifest.frameSets) == "table" and manifest.frameSets or {}
    local jobs = type(manifest.renderJobs) == "table" and manifest.renderJobs or {}
    local artifacts = type(manifest.artifacts) == "table" and manifest.artifacts or {}
    local events = type(manifest.events) == "table" and manifest.events or {}
    local frameIds, jobIds, artifactIds = {}, {}, {}
    local uris = {}

    local function reserve(uri, owner)
        if not nonEmpty(uri) then
            add(owner .. " URI is missing")
        elseif uris[uri] then
            add("URI collision between " .. uris[uri] .. " and " .. owner)
        else
            uris[uri] = owner
        end
    end
    if type(source) == "table" and nonEmpty(source.uri) then reserve(source.uri, "source") end

    for _, frame in ipairs(frameSets) do
        if type(frame) ~= "table" then
            add("Frame-set entry must be an object")
        else
            if not nonEmpty(frame.id) or frameIds[frame.id] then add("Missing or duplicate frame-set id") end
            if nonEmpty(frame.id) then frameIds[frame.id] = true end
            if not roles[frame.role] then add("Unknown frame-set role: " .. tostring(frame.role)) end
            if frame.sourceAssetId ~= source.id then add("Frame set has a foreign source reference") end
            if not positiveInteger(frame.frameCount) or type(frame.firstFrame) ~= "number" or
               frame.firstFrame < 0 or frame.firstFrame % 1 ~= 0 or
               type(frame.lastFrame) ~= "number" or
               frame.lastFrame - frame.firstFrame + 1 ~= frame.frameCount then
                add("Invalid frame range: " .. tostring(frame.id))
            end
            if not positiveInteger(frame.width) or not positiveInteger(frame.height) or
               type(frame.fps) ~= "number" or frame.fps <= 0 then
                add("Invalid frame-set format: " .. tostring(frame.id))
            end
            if frame.checksum ~= nil and type(frame.checksum) == "string" and not sha256(frame.checksum) then
                add("Invalid frame-set checksum: " .. tostring(frame.id))
            end
            if frame.immutable ~= true then add("Frame set is not immutable: " .. tostring(frame.id)) end
            reserve(frame.uri, "frame set " .. tostring(frame.id))
        end
    end

    local jobsById = {}
    for _, job in ipairs(jobs) do
        if type(job) ~= "table" then
            add("Render-job entry must be an object")
        else
            if not nonEmpty(job.id) or jobIds[job.id] then add("Missing or duplicate render-job id") end
            if nonEmpty(job.id) then jobIds[job.id] = true; jobsById[job.id] = job end
            if job.jobSchema ~= "geehub.growth-render-job" or job.jobSchemaVersion ~= 1 then
                add("Unsupported render-job schema: " .. tostring(job.id))
            end
            if job.sourceAssetId ~= source.id then add("Render job has a foreign source reference: " .. tostring(job.id)) end
            if not statuses[job.status] then add("Unknown render-job status: " .. tostring(job.id)) end
            if type(job.inputFrameSetIds) ~= "table" then
                add("Render job frame-set references are missing: " .. tostring(job.id))
            else
                local seen = {}
                for _, frameId in ipairs(job.inputFrameSetIds) do
                    if seen[frameId] or not frameIds[frameId] then
                        add("Render job references a missing or duplicate frame set: " .. tostring(job.id))
                        break
                    end
                    seen[frameId] = true
                end
            end
            if type(job.output) ~= "table" or not positiveInteger(job.output.width) or
               not positiveInteger(job.output.height) or type(job.output.fps) ~= "number" or
               job.output.fps <= 0 then
                add("Render job output format is incomplete: " .. tostring(job.id))
            end
            if job.status == "queued" then
                if nonEmpty(job.startedAt) or nonEmpty(job.completedAt) or
                   nonEmpty(job.artifactId) or nonEmpty(job.error) then
                    add("Queued job state is inconsistent: " .. tostring(job.id))
                end
            elseif job.status == "running" then
                if not nonEmpty(job.startedAt) or nonEmpty(job.completedAt) or
                   nonEmpty(job.artifactId) or nonEmpty(job.error) then
                    add("Running job state is inconsistent: " .. tostring(job.id))
                end
            elseif job.status == "failed" then
                if not nonEmpty(job.startedAt) or not nonEmpty(job.error) or
                   nonEmpty(job.completedAt) or nonEmpty(job.artifactId) then
                    add("Failed job state is inconsistent: " .. tostring(job.id))
                end
            elseif job.status == "completed" then
                if not nonEmpty(job.startedAt) or not nonEmpty(job.completedAt) or
                   not nonEmpty(job.artifactId) or nonEmpty(job.error) then
                    add("Completed job state is inconsistent: " .. tostring(job.id))
                end
            end
            reserve(job.jobUri, "job " .. tostring(job.id))
            reserve(job.outputUri, "output " .. tostring(job.id))
        end
    end

    for _, artifact in ipairs(artifacts) do
        if type(artifact) ~= "table" then
            add("Artifact entry must be an object")
        else
            if not nonEmpty(artifact.id) or artifactIds[artifact.id] then add("Missing or duplicate artifact id") end
            if nonEmpty(artifact.id) then artifactIds[artifact.id] = true end
            local job = jobsById[artifact.jobId]
            if not job or job.status ~= "completed" or job.artifactId ~= artifact.id then
                add("Artifact has no matching completed job: " .. tostring(artifact.id))
            end
            if artifact.sourceAssetId ~= source.id then add("Artifact has a foreign source reference") end
            if job and artifact.uri ~= job.outputUri then add("Artifact URI differs from reserved output") end
            if not nonEmpty(artifact.mediaType) or artifact.checksumAlgorithm ~= "sha256" or
               not sha256(artifact.checksum) then add("Artifact integrity metadata is incomplete") end
            if artifact.immutable ~= true then add("Artifact is not immutable") end
            reserve(artifact.uri, "artifact " .. tostring(artifact.id))
        end
    end
    for _, job in ipairs(jobs) do
        if type(job) == "table" and job.status == "completed" then
            local found = false
            for _, artifact in ipairs(artifacts) do
                if type(artifact) == "table" and artifact.id == job.artifactId then found = true end
            end
            if not found then add("Completed job artifact is missing: " .. tostring(job.id)) end
        end
    end

    if #events ~= (type(manifest.revision) == "number" and manifest.revision + 1 or -1) then
        add("Event history does not match manifest revision")
    end
    for index, event in ipairs(events) do
        if type(event) ~= "table" or event.revision ~= index - 1 or
           not nonEmpty(event.type) or not nonEmpty(event.at) then
            add("Invalid event history entry at index " .. tostring(index - 1))
        end
    end
    return { valid = #errors == 0, errors = errors, frameSetCount = #frameSets, renderJobCount = #jobs }
end

local function validatePortableJob(payload, manifest, job)
    local errors = {}
    local function add(message) errors[#errors + 1] = message end
    if type(payload) ~= "table" or payload.schema ~= "geehub.growth-render-job" or
       payload.schemaVersion ~= 1 or payload.status ~= "ready-for-renderer" then
        add("Portable render-job schema or status is invalid")
        return errors
    end
    local source = payload.source
    if type(source) ~= "table" or source.name ~= manifest.source.name or
       source.width ~= manifest.source.width or source.height ~= manifest.source.height or
       type(source.duration) ~= "number" or
       math.abs(source.duration - manifest.source.duration) > 0.000001 then
        add("Portable render-job source does not match the immutable bridge source")
    end
    local output = payload.output
    if type(output) ~= "table" or output.width ~= job.output.width or
       output.height ~= job.output.height or output.fps ~= job.output.fps then
        add("Portable render-job output does not match its manifest reservation")
    end
    if type(payload.growthStates) ~= "table" or #payload.growthStates < 2 then
        add("Portable render job needs at least two growth states")
    end
    if type(payload.landmarkFrames) ~= "table" or #payload.landmarkFrames < 2 then
        add("Portable render job needs at least two landmark frames")
    end
    local constraints = payload.constraints
    local required = { "protectFace", "preserveSourceMotion", "preserveGroundContact",
        "deformBodyAsConnectedMesh", "temporalStability" }
    if type(constraints) ~= "table" then
        add("Identity-preserving render constraints are missing")
    else
        for _, key in ipairs(required) do
            if constraints[key] ~= true then add("Required render constraint is not enabled: " .. key) end
        end
    end
    return errors
end

local function inspectManifest(manifest, dropboxRoot, readFile, fileExists, decode)
    local validation = validateManifest(manifest)
    local report = {
        schema = "geehub.resolve.bridge-audit.v1",
        generatedAt = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        manifest = {
            id = type(manifest) == "table" and manifest.id or nil,
            revision = type(manifest) == "table" and manifest.revision or nil,
            valid = validation.valid,
            errors = validation.errors
        },
        jobs = {},
        summary = { queued = 0, readyForResolve = 0, needsAttention = 0 }
    }
    if not validation.valid then
        report.summary.needsAttention = validation.renderJobCount
        return report
    end

    for _, job in ipairs(manifest.renderJobs) do
        local item = { id = job.id, renderer = job.renderer, state = job.status, status = "not-queued" }
        if job.status == "queued" then
            report.summary.queued = report.summary.queued + 1
            local jobPath, jobPathError = mapDropboxUri(job.jobUri, dropboxRoot)
            local outputPath, outputPathError = mapDropboxUri(job.outputUri, dropboxRoot)
            if not jobPath or not outputPath then
                item.status = "unsupported-exchange-uri"
                item.error = jobPathError or outputPathError
            elseif job.renderer ~= "resolve-free" then
                item.status = "renderer-not-resolve-free"
            else
                local raw = readFile(jobPath)
                if not raw then
                    item.status = "job-file-missing"
                else
                    local ok, payload = pcall(decode, raw)
                    if not ok then
                        item.status = "job-json-invalid"
                        item.error = tostring(payload)
                    else
                        local errors = validatePortableJob(payload, manifest, job)
                        if #errors > 0 then
                            item.status = "job-payload-invalid"
                            item.errors = errors
                        elseif fileExists(outputPath) then
                            item.status = "output-already-exists"
                        else
                            item.status = "ready-for-local-renderer"
                            report.summary.readyForResolve = report.summary.readyForResolve + 1
                        end
                    end
                end
            end
            if item.status ~= "ready-for-local-renderer" then
                report.summary.needsAttention = report.summary.needsAttention + 1
            end
        end
        report.jobs[#report.jobs + 1] = item
    end
    return report
end

local mode = ...
if mode == "__test" then
    return {
        mapDropboxUri = mapDropboxUri,
        validateManifest = validateManifest,
        validatePortableJob = validatePortableJob,
        inspectManifest = inspectManifest
    }
end

local function log(message)
    print("[GEEHUB BRIDGE] " .. tostring(message))
end

local function readFile(path)
    local file = io.open(path, "rb")
    if not file then return nil end
    local value = file:read("*a")
    file:close()
    return value
end

local function fileExists(path)
    local file = io.open(path, "rb")
    if not file then return false end
    file:close()
    return true
end

local function writeFile(path, value)
    local file = io.open(path, "wb")
    if not file then return false end
    file:write(value)
    file:close()
    return true
end

local function run()
    if not (Resolve or resolve) then
        log("Resolve scripting context unavailable. Run this from Resolve's Utility menu.")
        return
    end
    if not bmd or not bmd.json or type(bmd.json.decode) ~= "function" or
       type(bmd.json.encode) ~= "function" then
        log("Resolve JSON support unavailable; no files were changed.")
        return
    end

    local home = os.getenv("HOME") or ""
    local dropboxRoot = os.getenv("GEEHUB_DROPBOX_ROOT") or
        (home .. "/Library/CloudStorage/Dropbox")
    local manifestPath = os.getenv("GEEHUB_BRIDGE_MANIFEST") or
        (dropboxRoot .. "/GEEHUB/Bridge/incoming/manifest.json")
    local raw = readFile(manifestPath)
    if not raw then
        log("Manifest not found: " .. manifestPath)
        log("Place a version-1 manifest at Bridge/incoming/manifest.json, then rerun.")
        return
    end

    local ok, manifest = pcall(bmd.json.decode, raw)
    if not ok then
        log("Manifest JSON could not be decoded: " .. tostring(manifest))
        return
    end
    local report = inspectManifest(manifest, dropboxRoot, readFile, fileExists, bmd.json.decode)
    local outputPath = dropboxRoot .. "/GEEHUB/Bridge/outgoing/resolve-bridge-audit.json"
    report.outputPath = outputPath
    local encodedOk, encoded = pcall(bmd.json.encode, report)
    if not encodedOk then
        log("Audit JSON could not be encoded: " .. tostring(encoded))
        return
    end
    if not writeFile(outputPath, encoded) then
        outputPath = home .. "/Desktop/GEEHUB-resolve-bridge-audit.json"
        report.outputPath = outputPath
        encodedOk, encoded = pcall(bmd.json.encode, report)
        if not encodedOk or not writeFile(outputPath, encoded) then
            log("Could not write audit to Dropbox or Desktop. No source or timeline data was changed.")
            return
        end
    end

    log("Manifest revision: " .. tostring(report.manifest.revision))
    log("Queued jobs: " .. tostring(report.summary.queued))
    log("Ready for local renderer: " .. tostring(report.summary.readyForResolve))
    log("Needs attention: " .. tostring(report.summary.needsAttention))
    log("Read-only audit saved: " .. outputPath)
    log("No media was imported, rendered, overwritten, or removed.")
end

run()
