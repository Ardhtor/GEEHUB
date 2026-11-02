local chunk, loadError = loadfile("GEEHUB_Bridge.lua")
assert(chunk, loadError)
local bridge = chunk("__test")

local function fixture()
    return {
        schema = "geehub.media-bridge", schemaVersion = 1, id = "bridge-test",
        project = { id = "project-test", version = "v000" }, revision = 0,
        createdAt = "2026-11-02T00:00:00Z", updatedAt = "2026-11-02T00:00:00Z",
        source = { id = "source-test", name = "source.mp4",
            uri = "dropbox://GEEHUB/Assets/source.mp4", duration = 2,
            width = 720, height = 1280, immutable = true },
        frameSets = {},
        renderJobs = {{
            id = "render-test",
            jobUri = "dropbox://GEEHUB/Bridge/incoming/render-test.json",
            jobSchema = "geehub.growth-render-job", jobSchemaVersion = 1,
            sourceAssetId = "source-test", inputFrameSetIds = {},
            outputUri = "dropbox://GEEHUB/Exports/render-test.mp4",
            output = { width = 720, height = 1280, fps = 24, format = "mp4" },
            renderer = "resolve-free", status = "queued",
            createdAt = "2026-11-02T00:00:00Z"
        }},
        artifacts = {},
        events = {{ revision = 0, type = "manifest-created", at = "2026-11-02T00:00:00Z" }}
    }
end

local function portableJob()
    return {
        schema = "geehub.growth-render-job", schemaVersion = 1,
        status = "ready-for-renderer",
        source = { name = "source.mp4", duration = 2, width = 720, height = 1280 },
        output = { width = 720, height = 1280, fps = 24, format = "mp4" },
        growthStates = {{ id = "base" }, { id = "grown" }},
        landmarkFrames = {{ timeSeconds = 0 }, { timeSeconds = 0.1 }},
        constraints = { protectFace = true, preserveSourceMotion = true,
            preserveGroundContact = true, deformBodyAsConnectedMesh = true,
            temporalStability = true }
    }
end

local function test(name, fn)
    local ok, err = pcall(fn)
    if not ok then io.stderr:write("FAIL " .. name .. ": " .. tostring(err) .. "\n"); os.exit(1) end
    print("PASS " .. name)
end

test("validates a version-one bridge manifest", function()
    local result = bridge.validateManifest(fixture())
    assert(result.valid, table.concat(result.errors, "; "))
end)

test("rejects URI collisions", function()
    local manifest = fixture()
    manifest.renderJobs[1].outputUri = manifest.source.uri
    local result = bridge.validateManifest(manifest)
    assert(not result.valid)
    assert(table.concat(result.errors, "; "):find("URI collision", 1, true))
end)

test("maps Dropbox URIs and blocks traversal", function()
    local path = bridge.mapDropboxUri("dropbox://GEEHUB/Bridge/incoming/job.json", "/tmp/Dropbox")
    assert(path == "/tmp/Dropbox/GEEHUB/Bridge/incoming/job.json")
    assert(bridge.mapDropboxUri("dropbox://GEEHUB/../../source.mp4", "/tmp/Dropbox") == nil)
end)

test("marks a matching queued job ready without rendering it", function()
    local manifest = fixture()
    local jobPath = "/tmp/Dropbox/GEEHUB/Bridge/incoming/render-test.json"
    local report = bridge.inspectManifest(manifest, "/tmp/Dropbox",
        function(path) if path == jobPath then return "job-json" end end,
        function() return false end,
        function(raw) assert(raw == "job-json"); return portableJob() end)
    assert(report.summary.readyForResolve == 1)
    assert(report.jobs[1].status == "ready-for-local-renderer")
end)

test("refuses to reserve an output file that already exists", function()
    local report = bridge.inspectManifest(fixture(), "/tmp/Dropbox",
        function() return "job-json" end,
        function(path) return path:find("render-test.mp4", 1, true) ~= nil end,
        function() return portableJob() end)
    assert(report.jobs[1].status == "output-already-exists")
    assert(report.summary.readyForResolve == 0)
end)

test("rejects a portable job whose source identity differs", function()
    local payload = portableJob()
    payload.source.name = "different-source.mp4"
    local report = bridge.inspectManifest(fixture(), "/tmp/Dropbox",
        function() return "job-json" end, function() return false end,
        function() return payload end)
    assert(report.jobs[1].status == "job-payload-invalid")
end)

test("rejects missing temporal identity constraints", function()
    local payload = portableJob()
    payload.constraints.protectFace = false
    local errors = bridge.validatePortableJob(payload, fixture(), fixture().renderJobs[1])
    assert(#errors > 0)
end)

test("reports a missing source without throwing", function()
    local manifest = fixture()
    manifest.source = nil
    local result = bridge.validateManifest(manifest)
    assert(not result.valid)
end)

test("accepts an artifact at its completed job output URI", function()
    local manifest = fixture()
    local job = manifest.renderJobs[1]
    job.status = "completed"
    job.startedAt = "2026-11-02T00:00:01Z"
    job.completedAt = "2026-11-02T00:00:02Z"
    job.artifactId = "artifact-test"
    manifest.revision = 3
    manifest.parentRevision = 2
    manifest.updatedAt = "2026-11-02T00:00:02Z"
    manifest.events = {
        { revision = 0, type = "manifest-created", at = "2026-11-02T00:00:00Z" },
        { revision = 1, type = "render-job-queued", at = "2026-11-02T00:00:00Z" },
        { revision = 2, type = "render-job-started", at = "2026-11-02T00:00:01Z" },
        { revision = 3, type = "render-artifact-recorded", at = "2026-11-02T00:00:02Z" }
    }
    manifest.artifacts = {{
        id = "artifact-test", jobId = job.id, sourceAssetId = manifest.source.id,
        uri = job.outputUri, mediaType = "video/mp4",
        checksumAlgorithm = "sha256", checksum = string.rep("a", 64),
        immutable = true
    }}
    local result = bridge.validateManifest(manifest)
    assert(result.valid, table.concat(result.errors, "; "))
end)

print("GEEHUB Bridge Lua tests complete.")
