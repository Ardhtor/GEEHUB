#!/usr/bin/env python3
"""Isolated regression test for graph-driven Long Play.

The runner writes into a temporary copy of its small set of state files. This test
verifies graph travel, cumulative scale beyond the former ceiling, and synchronization
with the canonical browser world state without touching production files.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "engine" / "long-play-runner.js"


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="geehub-long-play-test-") as folder:
        root = Path(folder)
        (root / "engine").mkdir()
        shutil.copy2(RUNNER, root / "engine" / "long-play-runner.js")
        for directory in ("hub", "hub/recordings", "hub/recordings", "engine"):
            (root / directory).mkdir(parents=True, exist_ok=True)

        world = {
            "regions": [
                {"id": "beefythiq", "name": "BEEFYTHIQ", "x": 25, "y": 45},
                {"id": "growth", "name": "GROWTH CANVAS", "x": 57, "y": 31},
                {"id": "complex", "name": "THE COMPLEX", "x": 75, "y": 58},
                {"id": "discovery", "name": "DISCOVERY", "x": 12, "y": 78},
            ],
            "pleasureBits": [
                {
                    "from": "beefythiq",
                    "to": "complex",
                    "title": "MASS BECOMES WEATHER",
                    "text": "Accumulation changes the room's scale.",
                },
                {
                    "from": "beefythiq",
                    "to": "growth",
                    "title": "THE SCALE HAS HISTORY",
                    "text": "The old baseline remains visible beneath the new one.",
                },
                {
                    "from": "complex",
                    "to": "discovery",
                    "title": "THE WORLD LEAVES A TRACE",
                    "text": "Every crossing adds another retained trace.",
                },
            ],
        }
        write_json(root / "world.json", world)
        write_json(
            root / "hub" / "long-play-state.json",
            {
                "id": "geehub-long-play-state",
                "cycle": 27,
                "currentAgent": "tyler",
                "currentRegion": "beefythiq",
                "scale": 4.18,
                "lastRun": "2026-10-11T02:00:00Z",
                "regionVisits": {"beefythiq": 5, "growth": 0, "complex": 1, "discovery": 5},
                "lastRegionAt": {"beefythiq": "2026-10-11T02:00:00Z"},
                "history": [
                    {"cycle": 27, "agent": "tyler", "region": "beefythiq", "scale": 4.18, "at": "2026-10-11T02:00:00Z"}
                ],
            },
        )
        write_json(root / "hub" / "render-jobs.json", {"jobs": []})
        write_json(root / "hub" / "image-jobs.json", {"jobs": []})
        write_json(root / "hub" / "exchange.json", {"events": []})
        write_json(root / "hub" / "agent-reaction-history.json", {"events": []})
        write_json(
            root / "hub" / "world-state.json",
            {
                "activeRecording": "./recordings/LUKE_BASELINE.json",
                "activeEncounter": {
                    "regionId": "beefythiq",
                    "regionName": "BEEFYTHIQ",
                    "subject": {"agent": "luke", "scale": 3.0},
                    "continuity": ["face", "identity", "previous baselines"],
                },
                "rendererQueues": {"image": "./image-jobs.json", "space3d": "./render-jobs.json"},
            },
        )
        write_json(
            root / "engine" / "state.json",
            {
                "pulse": 12,
                "active_region": "beefythiq",
                "phase": 0,
                "scale": 4.12,
                "pressure": 0.6,
                "memory": 0.7,
                "events": [
                    {
                        "pulse": 12,
                        "time": "2026-10-11T01:00:00Z",
                        "region_id": "beefythiq",
                        "world": "BEEFYTHIQ",
                        "phase": "ATMOSPHERE",
                        "action": "The floor remembers.",
                    }
                ],
                "visits": {"beefythiq": 4, "growth": 0, "complex": 1, "discovery": 5},
                "last_visits": {},
                "long_play": {
                    "cycle": 26,
                    "region_id": "beefythiq",
                    "region_name": "BEEFYTHIQ",
                    "scale": 4.1,
                    "at": "2026-10-11T00:30:00Z",
                },
                "external_events": [],
            },
        )

        result = subprocess.run(
            ["node", str(root / "engine" / "long-play-runner.js")],
            cwd=root,
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0, (
            f"Long Play runner failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )

        state = json.loads((root / "hub" / "long-play-state.json").read_text(encoding="utf-8"))
        engine = json.loads((root / "engine" / "state.json").read_text(encoding="utf-8"))
        current = json.loads((root / "hub" / "world-state.json").read_text(encoding="utf-8"))
        recording = json.loads((root / "hub" / "recordings" / "scheduled-recording-00028.json").read_text(encoding="utf-8"))
        images = json.loads((root / "hub" / "image-jobs.json").read_text(encoding="utf-8"))
        reactions = json.loads((root / "hub" / "agent-reaction-history.json").read_text(encoding="utf-8"))
        exchange = json.loads((root / "hub" / "exchange.json").read_text(encoding="utf-8"))

        assert state["cycle"] == 28, "cycle did not advance"
        assert state["scale"] == 4.26, f"scale did not exceed the former 4.2× ceiling: {state['scale']}"
        assert state["previousRegion"] == "beefythiq", "previous location was not preserved"
        assert state["currentRegion"] == "growth", "runner did not choose the least-visited connected region"
        assert state["relation"] == "THE SCALE HAS HISTORY", "actual world relation was not carried into the crossing"
        assert state["routeMode"] == "WORLD GRAPH / CONNECTED ROUTE", "connected route was mislabeled"

        assert recording["lineage"]["previousRegionId"] == "beefythiq"
        assert recording["lineage"]["regionId"] == "growth"
        assert recording["subject"]["scale"] == 4.26
        assert current["canonicalRecording"] == "./recordings/LUKE_BASELINE.json", "old canonical recording was discarded"
        assert current["activeRecording"] == "./recordings/scheduled-recording-00028.json"
        assert current["activeEncounter"]["regionId"] == "growth"
        assert current["activeEncounter"]["subject"]["scale"] == 4.26
        assert engine["active_region"] == "growth", "browser world state was not synchronized"
        assert engine["long_play"]["region_id"] == "growth"
        assert engine["external_events"][0]["relation"] == "THE SCALE HAS HISTORY"
        assert len(images["jobs"]) == 1 and images["jobs"][0]["lineage"]["to"] == "growth"
        assert len(reactions["events"]) == 5, "all five independent agent reactions were not recorded"
        assert exchange["events"][0]["relation"] == "THE SCALE HAS HISTORY"

    print("Long Play checks passed: graph routing, cumulative scale, identity continuity, shared state, and reactions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
