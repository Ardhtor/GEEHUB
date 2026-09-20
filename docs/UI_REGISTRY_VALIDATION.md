# UI registry validation

GEEHUB intentionally keeps two views of the constellation:

- `hub/projects.json` is the machine-readable registry used for provenance and future tooling.
- `hub/index.html` is the dependency-free browser doorway, with a small embedded project list so it still works as a static file.

That duplication is useful at the surface but creates a drift risk. A project can remain in the machine-readable registry while its name, status, group, or repository link becomes stale in the browser doorway.

`hub/validate-ui-registry.py` is a dependency-free provenance guard. It checks:

1. every registry entry has matching stable discovery fields (`name`, `group`, and `status`) in the embedded browser tuple;
2. every registry entry with a `repo` field has a matching `https://github.com/owner/name` path;
3. every declared public repository URL is present in the embedded browser data;
4. the check does not fetch or mirror repository contents and is not a substitute for browser testing.

Summaries are intentionally not compared: the machine-readable registry keeps fuller provenance-oriented descriptions, while the static doorway uses shorter surface copy. This keeps the validator strict on identity and navigation without forcing duplicate prose to remain byte-for-byte identical.

The validator accepts the current string-wrapped `projects.json` shape as well as a future direct JSON array, keeping the check useful during a gradual cleanup of the static-host format.

Local check:

```sh
python hub/validate-ui-registry.py hub/projects.json hub/index.html
```
