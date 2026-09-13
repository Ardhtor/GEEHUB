# Constellation registry

`hub/projects.json` is the machine-readable registry for GEEHUB's visible project constellation. It is a navigation and provenance boundary, not a mirror of every accessible repository.

Each entry has a stable `id`, human-readable name, group, lifecycle status, summary, local or external `path`, and tags. Repository-backed entries may additionally provide `repo` in `owner/name` form. When present, `path` must be the corresponding public GitHub URL. This keeps cross-repository navigation explicit instead of inferred from names.

`hub/validate-projects.py` checks the local structure and the repo/path relationship without making network requests. It intentionally does not claim that links are live, that a repository is public beyond the registry's declared URL, or that an incubating idea has become project canon. URL reachability and repository contents remain separate observations.

The validator is suitable for CI because it is dependency-free and deterministic:

```sh
python3 hub/validate-projects.py hub/projects.json
```

The current registry explicitly links `Ardhtor/ModernTexts` and `Ardhtor/LINUX_S`; other constellation nodes remain local concepts or prototypes until a repository link is intentionally recorded.
