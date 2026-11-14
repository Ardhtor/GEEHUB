# GEEHUB Feasibility Workbench

**Snapshot:** 2026-11-14. Latest validated implementation commit: `480dcce99912330caf51e6432de6d06cba9509cb`.

This document is an execution decision record, not a declaration that the whole system is complete. A project is feasible when its next increment can be built with tools and source material that are actually available, has a bounded acceptance test, and can return its result to the repository. A written design, registry status, queued request, or successful deployment is not proof that every runtime behind it works.

## Current repository evidence

The latest push deployed the browser successfully, but data validation failed:

- [Deploy GEEHUB run 2004](https://github.com/Ardhtor/GEEHUB/actions/runs/43618773457) — success, 2026-11-14 17:01:25 UTC.
- [Validate GEEHUB data run 1103](https://github.com/Ardhtor/GEEHUB/actions/runs/43618773475) — failure, 2026-11-14 17:01:26 UTC.

The failing step was **Validate constellation registry**. Earlier steps in that run passed: browser-script syntax, followed-source and voice-reference checks, world broadcast/map coverage, Python compilation, canonical inscription tests, portable-jam regression, UI-registry regression, persistent-world regression, and Long Play regression. Browser repository-link validation was skipped because the earlier registry step failed. The run therefore does not establish a fully green repository.

The defect was in the validation contract, not in the intentional registry shape. The Hub has 98 records, including 11 entries with `path: null` to make an unregistered destination explicit. The browser also uses `path` as the preferred project-specific destination and `repo` as a separate repository fallback. The validators incorrectly required every path to be a string and, when `repo` existed, required the path to equal the repository root URL. That contradicted the Hub's own navigation behavior.

The repair is now verified on the latest commit:

- [Validate GEEHUB data run 1105](https://github.com/Ardhtor/GEEHUB/actions/runs/43619935601) — success, 2026-11-14 17:13:50 UTC. This run passed the registry validators, browser repository-link validation, and the newly added Institute event-adapter regression suite.
- [Deploy GEEHUB run 2006](https://github.com/Ardhtor/GEEHUB/actions/runs/43619935545) — success, 2026-11-14 17:13:42 UTC.

The previous failure was resolved by aligning the validators with the Hub's actual data model and normalizing the Memory Bridge display record. The successful run now establishes the registry and browser-link checks as green for this commit.

This repair makes the contract explicit: `path` may be a non-empty local or web destination, or `null` when no project destination exists; `repo`, when present, is an `owner/name` fallback selector. A local project path and a repository fallback may coexist. Regression tests cover all three states and reject blank paths or malformed repository selectors.

## Feasibility by workstream

| Workstream | Feasibility now | Evidence and boundary | Acceptance gate |
|---|---|---|---|
| Repository navigation and Hub atlas | **CI-verified** | The Hub reads one JSON registry; project cards resolve local paths, web paths, or a repository fallback. Missing destinations remain visible rather than becoming invented links. The latest validation run passed the registry and browser-link checks. | Keep the two registry formats coherent when records change; retain regression coverage for local, external, and null paths. |
| Canonical event persistence | **Implemented; CI-covered** | `engine/inscription.py`, the append-only activity stream, artifact index, and regression tests are present. The latest run passed the inscription suite. | Repeated IDs remain idempotent; interrupted writes do not corrupt earlier complete events; read-back matches the event. |
| Institute event adapter | **CI-verified** | `engine/institute_events.py` and `engine/test_institute_events.py` are compiled and executed in the latest successful validation run. The adapter regression suite passed alongside the canonical inscription suite. | Extend only after defining one projection's replay, idempotency, cursor, and read-back behavior. |
| Event projections and replay | **Feasible next engineering increment** | The execution-path specification identifies the canonical stream and the first projections: calendar, place activity, character timeline, training history, maintenance queue, and residential daybook. A replayable projector is still specified work, not an existing complete feature. | Rebuild a projection from a clean fixture; replay the same event twice; prove no duplicate output; read back the projection cursor. |
| Character/body and residential continuity | **Feasible after projection foundation** | Existing character records, campus state, growth specifications, and event writer provide inputs. A versioned body-state/projection layer is not yet complete. Visual inspection remains separate from metadata-derived estimates. | One event changes a versioned observation and its relevant clothing/equipment/place projections without overwriting the prior baseline. |
| Literary world continuation | **Available immediately** | Existing manuscripts and open threads can be continued directly in the repository without a rendering service. For the Golden Lion saga, the original artwork remains the controlling visual reference; the artwork binary is not verified in the repository, so exact visual comparison is blocked until the source is accessible. | Continue from the last chapter, preserve unresolved threads, update the manuscript and its local index, and do not claim visual fidelity beyond the source evidence. |
| Browser-native experiences and sound | **Prototype-feasible locally** | Existing HTML/CSS/JavaScript and Web Audio are viable without a new external service for browser-local prototypes. Browser-local persistence is not equivalent to cross-device or Dropbox persistence. | Open through a local static server; exercise the main controls; reload and confirm exactly what state persists and where. |
| Blender and offline media assembly | **Conditional on local installation and source assets** | The repository contains Blender scripts and production specifications. This environment has not verified the user's local Blender or FFmpeg installation, nor does a script prove a valid scene or render. | Detect tool versions; run a low-resolution sample; inspect the output and continuity; retain the source manifest and review result. |
| Generated video service | **Externally dependent** | The Imagine worker's documented path requires Node, FFmpeg, and an xAI API key. The page or a queued job alone is not a rendered video. | Verify credentials server-side, complete one short test render, inspect the actual MP4, and record generated/reviewed/accepted separately. |
| Dropbox production automation | **Prototype / connection-dependent** | The repository contains a Dropbox production-stream prototype and outbox records. A connected Dropbox action can transfer a particular artifact, but this does not prove the repository's automatic production pipeline is configured or that every source asset is synced. | Write one known artifact through the intended pipeline; fetch it back from the canonical Dropbox path; compare content and provenance. |
| Autonomous world engine | **Partly CI-tested** | The latest validation run passed the persistent world and Long Play regression suites. That verifies tested code paths, not indefinite autonomous operation, external model access, or every scheduled workflow. | A bounded scheduled run produces one traceable event, artifact, and state update; a second run does not duplicate it. |

## Build order

The low-friction sequence is:

1. **Restore a fully green validation run.** Fix the registry contract, run the complete constellation and browser-link checks, and confirm deployment and validation independently.
2. **Put existing executable code under CI.** The Institute event adapter is the next bounded vertical slice. Its tests must run, not merely exist in the repository.
3. **Build one replayable projection.** Start with a single projection from the canonical event stream, with a cursor, idempotency, rebuild, and read-back. Only expand to campus and body-state projections after that gate passes.
4. **Build the visible experience over verified state.** Connect one projection to one useful Hub surface. The interface should show the place, what changed, and the artifact that records why.
5. **Add Blender, FFmpeg, video APIs, and Dropbox automation only at the edge.** Detect each dependency, complete one end-to-end sample, and keep external jobs and source-media review visible.

## Definition of done

A work item is complete only when its input is identified, its change is implemented, its acceptance test passes, the output can be read back, provenance is preserved, and the relevant workbench or registry points to the next useful action. If any one of those is absent, label the item as specified, prototype, blocked, or unverified rather than complete.

**Immediate next gate:** implement one replayable projection against a temporary activity stream; prove clean rebuild, duplicate replay, cursor persistence, and read-back. Then connect that projection to one visible interface surface. Update this document from the test results, not from the specification alone.
