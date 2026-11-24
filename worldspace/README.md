# worldspace — directory index

This is the local navigation page for `worldspace/`. The lists below link to immediate files and child folders; use a child folder's own README to continue deeper.

**Up:** [parent directory](../README.md) · [repository root](../README.md) · [full directory map](../docs/REPOSITORY_NAVIGATION.md)

## Enter the Atlas

Run a local server from the repository root with `python3 -m http.server 8000`, then open `http://127.0.0.1:8000/worldspace/maps.html`. The Atlas reads `world.json` and `hub/spatial-world.json` for the world-scale territory graph and routes, and `geo-cyberspace/detailed-maps.json` for the KINGDOM, VEYRT (displayed as Veyrthalis), and COMPLEX local scales. The current world location is read from `hub/world-state.json`. Layers only claim to display features present in those source records; empty layers are identified as un-authored rather than filled with invented geography.

The root console's story map remains the narrative-position view. The detailed Atlas is the geographic navigation view; they are complementary surfaces over the same repository world, not competing maps.

## Files

### HTML (2)

- [`index.html`](./index.html)
- [`maps.html`](./maps.html)
