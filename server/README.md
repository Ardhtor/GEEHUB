# GEEHUB live model runtime

This local service serves the repository and exposes bounded endpoints: `GET /api/geehub/health` for service status, `GET /api/geehub/system` for live runtime and memory telemetry, `POST /api/geehub/turn` for live dialogue, `POST /api/geehub/inscribe` for durable occurrence writing, `GET /api/geehub/activity` for the newest inscribed events, and `GET /api/geehub/continuity?q=<term>` for read-only lineage search across passages, encounters, memories, recordings, and world places. The system endpoint reports Node process RSS/heap/external memory alongside host total/free RAM, platform, architecture, Node version, PID, uptime, and sample time. It also reads the append-only activity log and returns its record count and latest inscription summary, allowing the main interface to display compute and world activity in one live panel. It is a read-only diagnostic; it does not allocate arbitrary memory or expose process contents. The dialogue endpoint adds canonical world and voice context, calls the configured Responses API model, validates the returned speaker, and returns one utterance plus its consequence. The inscription endpoint validates a typed event and passes it to `engine/inscription.py`, the same writer used by the scheduled engines. That writer appends to `engine/activity.jsonl`, updates the artifact ledger and activity-event archive, and writes a Dropbox outbox record. The activity endpoint returns the newest records so the shared room can receive cross-session events.

## Run

Use Node.js 20 or later:

```sh
node server/geehub-server.mjs

# Optional: enable live model dialogue as well.
OPENAI_API_KEY=your_api_key GEEHUB_MODEL=your_enabled_model node server/geehub-server.mjs
```

Then open `http://127.0.0.1:8788` for the main hub, or `http://127.0.0.1:8788/hub/index.html` for the Project Atlas and jammer. Open `http://127.0.0.1:8788/api/geehub/system` to inspect live process and host RAM measurements from the Mac running the service. Keep any API key in the server environment only. It is never sent to the browser or committed to the repository. The service binds to localhost by default. Set `GEEHUB_HOST` deliberately before exposing it to another machine; add authentication and deployment-level rate limits before public hosting.

## Verification

Run the durable inscription regression tests with `python -m unittest engine.test_inscription`. The repository validation workflow also checks the live browser scripts and server syntax on commits.

## Boundaries

The dialogue endpoint generates one line per request. No pretend offline dialogue is produced when the model is unavailable.

The inscription endpoint accepts `{ "event": { "id": "...", "at": "ISO-8601", "type": "...", "title": "...", "description": "..." } }`. The event must include a stable ID, valid occurrence timestamp, and type. The canonical Python writer appends the activity stream, creates the event artifact, updates the artifact ledger, and stages the artifact in `dropbox_outbox/`. Repeated IDs do not append a second activity row or duplicate the ledger entry. The server does not itself push a Git commit or upload to Dropbox; those remain separate persistence/delivery steps.

The hub jammer now attempts this endpoint when it saves a jam. If the hub is opened from GitHub Pages or another static host without the local API, it keeps a browser-local draft and explicitly labels it `BROWSER DRAFT ONLY`; it does not claim that the occurrence was inscribed. Run the hub through this local server to use the durable path. The server binds to localhost by default. Add authentication and deployment-level rate limits before exposing it beyond the local machine.


## Continuity inspection

Open the main hub and use the Tractus / Continuity Inspector. Search a person, place, relation, event, or stable record ID. The API resolves exchange-event references to recording files and returns shared identity/location/relation links between matching records. An empty query displays a small recent-record sample. This endpoint reads repository records only; it does not edit them or promote canon.


The continuity index also joins the named agent registry, the complete recording archive, live world state, and spatial geography. Agent role/territory/workspace references are retained; transformation records expose their previous and current places, scale baselines, and named relation. Map routes and active-state links are navigable from matching records.


The development branch also includes `.github/workflows/geehub-continuity-validation.yml`. It checks Node and Python syntax, validates the world/spatial registry agreement and routes, checks agent/event/artifact IDs, verifies the live recording reference, and parses the activity and recording ledgers. A workflow definition is committed; its execution status must be checked in GitHub Actions.
