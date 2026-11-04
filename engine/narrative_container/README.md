# GEEHUB Narrative Container

Offline-first correspondence ledger for independent GEEHUB narratives. Uses Python's standard library and SQLite; no third-party packages or network service are required.

## Run locally

From the repository root, with Python 3.11 or newer:

```sh
python -m engine.narrative_container --db ./data/narratives.sqlite init
python -m engine.narrative_container --db ./data/narratives.sqlite send --id DC-VEYR-001 --kind plan --sender "The Grammaton" --source dad-convent --recipient "The Keeper" --destination veyrthalis --payload "Timber-to-stone joint specification" --context "Adapt for damp stone and fog."
python -m engine.narrative_container --db ./data/narratives.sqlite inbox veyrthalis
python -m engine.narrative_container --db ./data/narratives.sqlite export ./data/exchange.json
```

Receiving narratives explicitly mark artifacts received, interpreted, accepted, or declined. Adaptation is represented by a new versioned artifact linked to its parent. Exported JSON bundles can be moved between machines and imported idempotently.

## Container

Build from the repository root:

```sh
docker build -f engine/narrative_container/Dockerfile -t geehub-narratives .
docker run --rm -v geehub-narratives:/data geehub-narratives init
```

The named volume persists the SQLite ledger. This is a command-runner container, not an always-on service. Run commands when needed. No credentials or network access are required.

## Boundaries

The ledger stores narrative artifacts and metadata; it does not execute character-authored code. Keep large media in Dropbox and store references here. Dropbox synchronization, automatic cross-machine delivery, and a visual interface are future integrations, not capabilities claimed by this first version.
