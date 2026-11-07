# The Hewn Threshold

The browser entrance to GEEHUB's Interlocutive Domain. This dependency-free static application reads `engine/interlocutive-field.json` and presents registered presences, observations, contact boundaries, and affordances.

## Run locally

From the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/experiences/hewn-threshold/.

Do not open the HTML file directly: browsers block registry fetches from a `file://` origin. There is no build step, package installation, database, or remote runtime dependency.

## Local inscriptions

New inscriptions are stored in this browser's localStorage. Use **Export JSON** to download them. The export is a reviewable ledger fragment; it does not write to GitHub or modify `hub/exchange.json`. Review provenance before merging records into the canonical exchange ledger.

The app distinguishes observed/verified, connected-tool, permission-required, not-implemented, and imagined capability states. Registered affordances are not guarantees that every action is currently available. Historical contact observations are not silently refreshed by opening this page.
