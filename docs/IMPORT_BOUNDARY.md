# Import boundary

The Narrative Jammer treats `geehub-jams.json` as a portable handoff format, not as an authority over the local browser state.

An import should therefore be conservative:

1. Parse the file as JSON.
2. Require an array at the top level.
3. Keep only records with a non-empty `title`, `brief`, `createdAt`, and non-empty string `from` identifiers.
4. De-duplicate against the current browser store using `title + createdAt`.
5. Prepend new records and retain the existing cap of 40.
6. Report what was accepted and what was rejected.

This boundary protects the two properties the hub needs most:

- **Persistence:** local work is not silently replaced by a handoff file.
- **Provenance:** a saved artifact still says what it is, when it was made, and which nodes produced it.

The validator at `hub/validate-jams.py` is the non-browser companion for the same contract. Keeping the rules documented in both the UI build note and this file makes the format inspectable without requiring a package manager or a running service.

The next likely increment is to expose the validator's result in a small command-line report or CI check. That should happen only when it adds a real guardrail; the front door should remain a single static page.
