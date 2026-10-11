#!/usr/bin/env python3
"""Regression test for the persistent causal world engine.

Runs the real engine against an isolated temporary world so the test never
mutates the repository's live state, novel, artifact ledger, or Dropbox outbox.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENGINE_SOURCE = ROOT / "engine" / "run_world.py"


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="geehub-world-test-") as folder:
        root = Path(folder)
        (root / "engine").mkdir()
        shutil.copy2(ENGINE_SOURCE, root / "engine" / "run_world.py")
        (root / "novel").mkdir()
        (root / "novel" / "REWRITTEN_OPENING.md").write_text("The Complex keeps its first room.\n", encoding="utf-8")
        (root / "README.md").write_text("A root record for source rotation.\n", encoding="utf-8")
        (root / "projects.json").write_text("[]\n", encoding="utf-8")
        (root / "lore").mkdir()
        (root / "lore" / "DEEP_LORE.md").write_text("A retained old phrase.\n", encoding="utf-8")

        world = {
            "regions": [
                {"id": "complex", "name": "THE COMPLEX", "description": "A cedar corridor and an old doorway."},
                {"id": "beefythiq", "name": "BEEFYTHIQ", "description": "The room adjusts around a familiar body."},
            ],
            "pleasureBits": [
                {
                    "from": "complex",
                    "to": "beefythiq",
                    "title": "MASS BECOMES WEATHER",
                    "text": "Accumulation changes the scale of a room until architecture responds.",
                }
            ],
        }
        write_json(root / "world.json", world)
        write_json(
            root / "engine" / "state.json",
            {
                "pulse": 0,
                "events": [],
                "active_region": "complex",
                "phase": 0,
                "pressure": 0.18,
                "memory": 0.5,
                "visits": {"complex": 1, "beefythiq": 0},
                "last_visits": {},
                "source_counts": {},
                "next_region": None,
            },
        )

        pulses = []
        for expected in range(1, 5):
            result = subprocess.run(
                [sys.executable, str(root / "engine" / "run_world.py")],
                cwd=root,
                capture_output=True,
                text=True,
                check=False,
            )
            assert result.returncode == 0, (
                f"world pulse {expected} failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
            )
            state = json.loads((root / "engine" / "state.json").read_text(encoding="utf-8"))
            pulses.append(state["events"][-1])

        state = json.loads((root / "engine" / "state.json").read_text(encoding="utf-8"))
        phases = [event["phase"] for event in pulses]
        assert state["pulse"] == 4, f"expected four pulses, got {state['pulse']}"
        assert phases == ["ATMOSPHERE", "MEMORY", "ROUTE_OPEN", "CROSSING"], phases
        assert pulses[2]["next_region"] == "beefythiq", "route opening did not retain its destination"
        assert pulses[3]["region_id"] == "beefythiq", "crossing did not enter the related region"
        assert pulses[3]["previous_region_id"] == "complex", "crossing lost the source location"
        assert pulses[3]["relation"] == "MASS BECOMES WEATHER", "crossing lost its relation lineage"
        assert state["active_region"] == "beefythiq", "active location did not persist"
        assert len({pulses[i]["source"] for i in range(3)}) == 3, "source material did not rotate"
        assert len(list((root / "artifacts" / "world-events").glob("*.json"))) == 4
        assert len(list((root / "dropbox_outbox").glob("*.json"))) == 4
        assert "Pulse 4" in (root / "lore" / "AUTONOMOUS_STREAM.md").read_text(encoding="utf-8")
        assert "pulse 4 / CROSSING" in (root / "novel" / "WORLDS.md").read_text(encoding="utf-8")

    print("persistent world engine checks passed: phases, routing, continuity, source rotation, artifacts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
