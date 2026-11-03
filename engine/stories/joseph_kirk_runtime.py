#!/usr/bin/env python3
"""Small deterministic runtime for the Joseph–Kirk Veyrthalis story.
Run: python3 joseph_kirk_runtime.py [--show] [--advance]
The prose remains in its Markdown source files; this runtime executes its
world model, choices, testimony rules, and unresolved-state safeguards.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "joseph_kirk_story.json"
SAVE = ROOT / "joseph_kirk_state.json"

def load():
    return json.loads(DATA.read_text(encoding="utf-8"))

def initial_state(story):
    return {
        "story_id": story["id"], "chapter_index": 0, "beat_index": 0,
        "location": "subterranean_labyrinth",
        "characters": {k: {"current_state": v["current_state"], "chosen": []}
                       for k, v in story["characters"].items()},
        "accounts": [], "events": [], "unresolved": story["unresolved"].copy()
    }

def current_beat(story, state):
    chapters = story["chapters"]
    ci = state["chapter_index"]
    if ci >= len(chapters): return None
    beats = chapters[ci]["beats"]
    bi = state["beat_index"]
    return beats[bi] if bi < len(beats) else None

def advance(story, state):
    beat = current_beat(story, state)
    if beat is None: return None
    event = {"chapter": story["chapters"][state["chapter_index"]]["id"],
             "beat": beat["id"], "event": beat["event"]}
    if beat.get("place"): state["location"] = beat["place"]
    if beat.get("choice"):
        choice = beat["choice"]
        actor = "joseph" if choice.startswith("joseph") else "kirk"
        state["characters"][actor]["chosen"].append(choice)
    state["events"].append(event)
    state["beat_index"] += 1
    return event

def record_account(state, character, observation, sequence=None):
    if character not in ("kirk", "joseph", "traveler_3", "traveler_4"):
        raise ValueError("Unknown story witness")
    state["accounts"].append({"witness": character, "observation": observation,
                              "sequence": sequence, "merged": False})

def compare_accounts(state):
    """Return accounts as separate records; never synthesize a shared memory."""
    return [dict(a) for a in state["accounts"]]

def validate(story, state):
    assert state["unresolved"]["second_heartbeat"]["owner"] is None
    assert state["unresolved"]["unresolved_transformation"]["traveler"] is None
    assert all(not a.get("merged", False) for a in state["accounts"])
    assert story["mechanics"]["separate_continuities"]["invariant"]
    assert story["mechanics"]["signal_provenance"]["invariant"]
    return True

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--show", action="store_true")
    p.add_argument("--advance", action="store_true")
    p.add_argument("--all", action="store_true", help="advance through all authored beats")
    args = p.parse_args()
    story = load()
    state = json.loads(SAVE.read_text()) if SAVE.exists() else initial_state(story)
    if args.all:
        while current_beat(story, state) is not None: advance(story, state)
    elif args.advance:
        advance(story, state)
    validate(story, state)
    SAVE.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")
    if args.show or args.advance or args.all:
        beat = current_beat(story, state)
        print(json.dumps({"location": state["location"], "events_recorded": len(state["events"]),
                          "next": beat, "unresolved": state["unresolved"]}, indent=2, ensure_ascii=False))

if __name__ == "__main__": main()
