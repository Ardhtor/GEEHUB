# UI registry testing

GEEHUB keeps a small browser-facing project registry in `hub/index.html` alongside the canonical machine-readable records in `hub/projects.json`. The validator checks the shared discovery fields and explicit repository URLs; this regression test protects the validator itself from silently accepting drift.

Local commands:

```sh
python hub/test-validate-ui-registry.py
python hub/validate-ui-registry.py hub/projects.json hub/index.html
```

The regression cases cover:

- a valid embedded project tuple and repository link;
- a missing embedded tuple;
- a registry repository path that disagrees with the declared repository.

This is data-contract testing, not browser testing. It does not claim that the page rendered correctly or that links were clicked in a browser.
