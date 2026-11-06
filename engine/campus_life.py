#!/usr/bin/env python3
"""Autonomous campus life: one persistent, scheduled event per world pulse."""
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "engine" / "campus-life.json"
LOG = ROOT / "worlds" / "northgate-university" / "CAMPUS_LIFE.md"
EVENTS = [
    ("northgate-university", "THE QUAD BETWEEN LECTURES", "A group of students leaves the engineering lecture hall together. One carries a model under his arm; another is still explaining why the bridge supports need to be moved. They settle beneath the plane trees and the discussion becomes less formal, turning into plans for the afternoon.", ["Dan Roman", "Marek Ionescu", "Elliot Ward"], "study"),
    ("founders-dormitory", "SUPPER IN THE COMMON KITCHEN", "The kitchen fills gradually. Someone has put rice on, another is chopping vegetables, and a third is trying to rescue a pan from yesterday. The conversation moves between coursework, a new record, and who has borrowed the good screwdriver. Nobody eats alone unless he wants to.", ["Dan Roman", "Marek Ionescu", "Elliot Ward", "Noah Bell"], "dormitory"),
    ("athletic-commons", "THE EVENING TRAINING GROUP", "The training group gathers beneath the high timber roof. They move through warm-ups, careful sets and recovery work, trading observations about technique. Afterward they linger by the pool windows, making plans to walk back to the dormitory together.", ["Dan Roman", "Noah Bell", "Adrian Varga"], "training"),
    ("northgate-library", "THE LATE READING ROOM", "The oak reading hall settles into its evening rhythm. A student edits a short film in the lower media suite while two others compare notes at a green-shaded lamp. Someone finds a reference that had eluded the group all week and quietly sends the page number around.", ["Marek Ionescu", "Elliot Ward", "Noah Bell"], "research"),
    ("northgate-university", "THE MUSIC SOCIETY REHEARSAL", "A rehearsal room door is left ajar. A small group works through a piece, stops, laughs at a missed entrance, and starts again. People passing along the gallery pause to listen before continuing across the quad.", ["Adrian Varga", "Elliot Ward", "Dan Roman"], "music"),
    ("founders-dormitory", "THE COURTYARD AFTER RAIN", "Rain has cleared from the brick quadrangle. Residents bring chairs outside and let the last light reach them. A conversation about summer plans grows into a list of places to visit, with the greenhouse door propped open behind them.", ["Marek Ionescu", "Noah Bell", "Adrian Varga"], "social"),
    ("athletic-commons", "OPEN GYM AND RECOVERY", "The Commons holds an open session for anyone who wants to train. Experienced students help newcomers set up safely, and the recovery wing stays busy with stretching and quiet conversation. The strongest presence in the room is not a contest; it is the ease of people who know one another.", ["Dan Roman", "Adrian Varga", "Noah Bell"], "training"),
    ("northgate-library", "THE FILM ARCHIVE CLUB", "The media room screens a short sequence from the university archive. The group pauses on a camera move, rewinds it, and talks about light, scale and continuity. One student makes a note to try the same movement in the campus workshop.", ["Elliot Ward", "Marek Ionescu", "Adrian Varga"], "film"),
    ("northgate-university", "THE CLUBS AND SOCIETIES FAIR", "Tables appear beneath the arcade: architecture, music, rowing, film, natural history, computing and the old debating society. New students drift between them while returning members explain what they actually do, rather than reciting polished pitches.", ["Dan Roman", "Elliot Ward", "Noah Bell"], "community"),
    ("founders-dormitory", "A ROOM FULL OF PROJECTS", "The common room becomes a temporary studio. A half-built model occupies the long table, a laptop plays back a rough edit, and someone is sketching a set of stairs on the back of an envelope. Each person contributes a different skill; by midnight the project has a direction.", ["Dan Roman", "Marek Ionescu", "Adrian Varga", "Elliot Ward"], "making"),
    ("northgate-university", "THE NORTHGATE MATCH", "Students gather along the edge of the playing field for a friendly match. The teams are mixed by whoever arrived, the rules are agreed on the spot, and the best moment is a pass that nobody expected. Afterwards, both sides head toward the dining hall together.", ["Noah Bell", "Adrian Varga", "Dan Roman"], "sport"),
    ("northgate-library", "THE ARCHIVE IS OPEN", "A student brings an old campus photograph into the archive room. The group identifies the building in the background and discovers that the covered passage once connected to a workshop that has since become the media suite. The university gains another small piece of its own memory.", ["Marek Ionescu", "Elliot Ward", "Dan Roman"], "archive")
]

def read():
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {"cycle": 0, "events": [], "attendance": {}}

def main():
    state = read()
    cycle = int(state.get("cycle", 0)) + 1
    pulse_path = ROOT / "engine" / "state.json"
    pulse = json.loads(pulse_path.read_text(encoding="utf-8")).get("pulse", cycle)
    slot = (cycle - 1) % len(EVENTS)
    region, title, prose, people, kind = EVENTS[slot]
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    event = {
        "id": f"northgate-campus-{cycle:05d}",
        "cycle": cycle,
        "world_pulse": pulse,
        "at": now,
        "region": region,
        "title": title,
        "kind": kind,
        "participants": people,
        "description": prose,
        "status": "OCCURRED"
    }
    state["cycle"] = cycle
    state["last_event"] = event
    state.setdefault("events", []).insert(0, event)
    state["events"] = state["events"][:240]
    attendance = state.setdefault("attendance", {})
    for person in people:
        attendance[person] = int(attendance.get(person, 0)) + 1
    state["daily_rhythm"] = "A living residential campus: lectures, meals, training, study, music, clubs, sport and shared projects."
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as handle:
        handle.write(f"\\n## {title} — cycle {cycle:05d}\\n\\n{prose}\\n\\nParticipants: {', '.join(people)}. Location: {region}. Recorded: {now}.\\n")
    print(f"CAMPUS LIFE PASS | cycle={cycle} | pulse={pulse} | {title} | participants={len(people)}")

if __name__ == "__main__":
    main()
