# GEEHUB live model runtime

This local service serves the repository and exposes two bounded endpoints: `POST /api/geehub/turn` for live dialogue and `POST /api/geehub/inscribe` for durable occurrence writing. The dialogue endpoint adds canonical world and voice context, calls the configured Responses API model, validates the returned speaker, and returns one utterance plus its consequence. The inscription endpoint validates a typed event and passes it to `engine/inscription.py`, the same writer used by the scheduled engines.

## Run

Use Node.js 20 or later:

```sh
node server/geehub-server.mjs

# Optional: enable live model dialogue as well.
OPENAI_API_KEY=your_api_key GEEHUB_MODEL=your_enabled_model node server/geehub-server.mjs
```

Then open `http://127.0.0.1:8788`. Keep the API key in the server environment only. It is never sent to the browser or committed to the repository. The service binds to localhost by default. Set `GEEHUB_HOST` deliberately before exposing it to another machine; add authentication and deployment-level rate limits before public hosting.

## Boundaries

The dialogue endpoint generates one line per request. No pretend offline dialogue is produced when the model is unavailable.

The inscription endpoint accepts `{ "event": { "id": "...", "at": "ISO-8601", "type": "...", "title": "...", "description": "..." } }`. The event must include a stable ID, valid occurrence timestamp, and type. The canonical Python writer appends the activity stream, creates the event artifact, updates the artifact ledger, and stages the artifact in `dropbox_outbox/`. Repeated IDs do not append a second activity row or duplicate the ledger entry. The server does not itself push a Git commit or upload to Dropbox; those remain separate persistence/delivery steps.

The hub jammer now attempts this endpoint when it saves a jam. If the hub is opened from GitHub Pages or another static host without the local API, it keeps a browser-local draft and explicitly labels it `BROWSER DRAFT ONLY`; it does not claim that the occurrence was inscribed. Run the hub through this local server to use the durable path. The server binds to localhost by default. Add authentication and deployment-level rate limits before exposing it beyond the local machine.
