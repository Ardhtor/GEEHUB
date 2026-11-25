# engine/video/tests — test suite

Run all tests with:

```bash
python3 -m unittest discover -s engine/video/tests -v
```

Tests cover renderer-independent regional growth curves, the Luke Library profile and timeline, the executable Luke project manifests, and timeline/provenance validation.

## Test files

- [test_growth_curves.py](./test_growth_curves.py)
- [test_render_project.py](./test_render_project.py)
- [test_validate_timeline.py](./test_validate_timeline.py)
