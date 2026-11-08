# GEEHUB live model runtime

This adds the missing live generation path as a separately runnable local service. It serves the repository and exposes `POST /api/geehub/turn`. The browser-side `engine/live-interlocutor.js` sends the current scene, recent exchange, and participants; the server adds canonical world and voice context from the repository, calls the configured Responses API model, validates the returned speaker, and sends one utterance plus its consequence back. The browser applies that utterance to the scene before the next turn is requested.

## Run

Use Node.js 20 or later:

```sh
OPENAI_API_KEY=your_api_key GEEHUB_MODEL=your_enabled_model node server/geehub-server.mjs
```

Then open `http://127.0.0.1:8788`. Keep the API key in the server environment only. It is never sent to the browser or committed to the repository. The service binds to localhost by default. Set `GEEHUB_HOST` deliberately before exposing it to another machine; add authentication and deployment-level rate limits before public hosting.

## Boundaries

The endpoint generates one line per request. The next line is a new request with the changed scene and accumulated dialogue. No pretend offline dialogue is produced when the model is unavailable. The endpoint cannot run shell commands, edit repository files, or invoke production tools. The existing GitHub Actions Tractus writer remains a separate slow manuscript process; this service is the interactive path.

The current profile and world files are read as context on each request. Durable memory writing, visual/audio perception, and production execution remain separate integrations and are not claimed as completed here.
