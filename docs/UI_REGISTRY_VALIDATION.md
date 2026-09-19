# UI registry validation

GEEHUB intentionally keeps two views of the constellation:

- `hub/projects.json` is the machine-readable registry used for provenance and future tooling.
- `hub/index.html` is the dependency-free browser doorway, with a small embedded project list so it still works as a static file.

That duplication is useful at the surface but creates a drift risk. A repository can be declared as an explicit constellation node in the registry and still disappear from the browser doorway if only one file is updated.

`hub/validate-ui-registry.py` checks the narrow contract that matters for cross-repository navigation:

1. every registry entry with a `repo` field has a matching `https://github.com/owner/name` path;
2. every declared public repository URL is present in the embedded browser data;
3. the check remains dependency-free and does not fetch or mirror repository contents.

This is intentionally not a general HTML parser or browser test. It is a provenance guard for the duplicated navigation metadata. Browser-level behavior still requires a real browser run.

Local check:

```sh
python hub/validate-ui-registry.py hub/projects.json hub/index.html
```
