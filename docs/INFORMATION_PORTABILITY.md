# GEEHUB Information Portability Contract

## Purpose

Information that changes how GEEHUB behaves must travel with the work. A decision is not safely preserved merely because it appeared in chat, one page, or one repository. Port the durable part into each place that needs to act on it, and link those places back to the canonical rule.

## Canonical layers

- **Repository intent:** `README.md` states the durable purpose and names the relevant contracts.
- **Prophetic method:** `PROPHECY.md` defines how present signals become a decisive transformation, memory, and a return.
- **Atlas / discovery:** `projects.json` and `hub/projects.json` identify nodes, status, paths, relationships, and the role each node plays. Keep both registries coherent when a node or relationship changes.
- **Executable behavior:** interface code, scripts, scheduled workflows, and engine rules must implement the relevant decision rather than merely describe it. A documented rule that does not reach the execution path is not yet integrated.
- **State and artifacts:** manifests, state ledgers, artifact indexes, and production outboxes preserve what happened, the source inputs, the resulting artifact, and what should happen next.
- **Cross-repository exchange:** the shared interaction space carries compact portable records across repo boundaries. Repositories remain independent; exchange makes their states legible to one another.
- **Durable media corpus:** use Dropbox `/GEEHUB/corpus/exchange/` for persistent exchange media and `/GEEHUB` for the production corpus when connected. GitHub carries the compact rules, records, metadata, and code; do not let media or important state exist only as chat attachments.
- **Conversation-derived decisions:** preserve decisions, constraints, aesthetic signals, unresolved questions, and failed approaches only when they change future work. Do not copy whole conversations into the repository.

## Porting procedure

Whenever a new instruction, discovery, artifact, or correction changes the project:

1. **Capture the durable meaning.** Write the smallest clear rule or record that a future session can use without reconstructing the conversation.
2. **Find every affected layer.** Check intent, prophetic method, Atlas entries, executable behavior, state/artifact schemas, cross-repo exchange, and the durable media corpus as relevant.
3. **Update the source of truth and its consumers.** Do not duplicate prose everywhere. Put the rule in one canonical place, then add concise links, IDs, schema fields, registry metadata, or implementation references wherever needed.
4. **Carry provenance.** Preserve source, timestamp when available, related node IDs, canon/experiment status, before-state, changed-state, and artifact location when those fields matter.
5. **Make it operational.** If a rule affects RUN, the interface, generation, continuity, or discovery, connect it to that code path. A note alone is not completion.
6. **Verify both directions.** Confirm that the interface or registry can find the information and that the saved result points back to its origin and next use.
7. **Keep the worlds coherent.** Update both project registries when shared Atlas facts change; maintain links between peer repositories and the shared interaction space; never silently promote experiments to canon.

## Minimum portable record

A portable record should include, where applicable:

- stable ID and human-readable title
- source node / repository / file
- event or creation time
- input references and prior state
- decision or transformation applied
- resulting artifact path or URL
- status: canon, experiment, draft, or unresolved
- related nodes and next action

Use the smallest schema that serves the actual workflow. Do not add empty metadata fields just to satisfy a template.

## Completion test

Information is ported when the next relevant part of GEEHUB can discover it, interpret it, act on it, preserve the result, and return that result to the shared world without relying on the original chat.

**Chat can originate a signal. The repository gives it continuity. The artifact gives it form. The shared exchange lets the world inherit it.**
