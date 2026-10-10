#!/usr/bin/env python3
"""GEEHUB persistent world pulse.

This script is intentionally deterministic. The world advances through a causal
sequence, retains every prior state, and chooses routes from the existing relation
graph. It does not roll random actors, locations, or plot outcomes.
"""
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "engine" / "state.json"
LORE_PATH = ROOT / "lore" / "AUTONOMOUS_STREAM.md"
NOVEL_PATH = ROOT / "novel" / "WORLDS.md"
WORLD_PATH = ROOT / "world.json"
ARTIFACT_DIR = ROOT / "artifacts" / "world-events"
ARTIFACT_INDEX = ROOT / "artifacts" / "index.json"
OUTBOX = ROOT / "dropbox_outbox"

PHASES = ("ATMOSPHERE", "MEMORY", "ROUTE_OPEN", "CROSSING")
PHASE_ACTORS = ("LUKE", "TYLER", "KIRK", "JOSEPH")
PHASE_RULES = {
    "LUKE": "approach extends geography",
    "TYLER": "comparison can become differentiation",
    "KIRK": "arrival activates aftermath",
    "JOSEPH": "meaningful change becomes an outward-facing signal",
}
PHASE_DESIRES = ("attention", "recognition", "tension", "continuity")
LEGACY_WORLD_MAP = {
    "PYYRO ENERGY": "discovery",
    "POETRY SEEP": "deep-lore",
    "DEEP LORE": "deep-lore",
    "NOVEL ENGINE": "complex",
    "VEY RTHALIS": "veyrthalis",
    "THE COMPLEX": "complex",
}
PHYSICAL_REGIONS = {"growth", "beefythiq", "embodied-scale", "colossal-escalation", "luke-bwomph"}
MEMORY_REGIONS = {"bodylounger", "deep-lore", "discovery", "veyrthalis", "kingdom-land"}

AMBIENCE = {
    "discovery": (
        "Rain shifts across the northern road. A loose sign turns twice against its post, and water gathers in the wagon ruts while the amber tree line stays distant.",
        "The fog comes closer to the road and reveals a second track just inside the trees. No traveler is visible, but a set of prints appears where the mud was smooth before.",
    ),
    "veyrthalis": (
        "Fog threads between amber trunks and softens the stone base of the Digitorium. Blue windows brighten one after another above wet steps, and the Procession remains quiet on its bridge.",
        "A bell sounds once through the mist. Nobody appears at the tower door, but a higher window stays lit, outlining a route from the woods to the city.",
    ),
    "complex": (
        "The corridor smells faintly of cedar and warm electronics. A mug has left a pale ring on the sill, and sunlight reaches the wall where a doorway used to cast a narrower shadow.",
        "A passage has appeared beyond the turning. Its ordinary lamp lights the older hall too; the Complex extends the route without removing the first room.",
    ),
    "growth": (
        "Cool blue light moves along the wall and catches the shoulder line of a familiar silhouette. The bench and floor markings remain still while the body occupies more of the frame.",
        "Fabric settles across a broader back when the man rolls his shoulders. The former outline remains visible on the floor, and the new stance rests beyond it without erasing it.",
    ),
    "beefythiq": (
        "The floor answers a shift of weight with a low sound. A chair stays where it was while the distance between chair, doorway, and the man standing there acquires a different scale.",
        "The mirror keeps his familiar face above a wider chest. A doorway that fitted yesterday sits closer to the shoulder today; the room records the difference as a new baseline.",
    ),
    "bodylounger": (
        "Old monitor glass reflects saved images and dates. A browser page remains open beside another record, and the fan draws a dry line of dust past the keyboard.",
        "The date on an older record comes into focus. A related page opens in the archive without replacing the first; both views remain available as evidence.",
    ),
    "male-harem": (
        "Late light crosses high windows and the worn edges of gym benches. A shirt rests over a chair, and familiar footsteps turn a man's attention toward the doorway.",
        "Two men stand close while disagreeing about dinner; one reaches around the other for a mug. The shared room has learned their distances through repetition.",
    ),
    "facility": (
        "The ventilation hum settles into a lower register. Blue light crosses the observation glass and shows the technician's reflection over the broad figure behind it.",
        "A rail beside the doorway has been moved outward by one measured increment. The old measurement remains beside the new one; the man is the same, the clearance is not.",
    ),
    "muscle-myth": (
        "Amber light collects along the carved shoulder of a figure in the recessed arch. Resin-dark beams reflect a dull shine where generations of hands have passed.",
        "Footsteps cross the stone. A man near the arch shifts his chair to make room beside him, without bowing or announcing that anything has happened.",
    ),
    "embodied-scale": (
        "A hand slides along the doorframe as the man turns sideways to pass. His face is familiar, but the shoulder now comes close enough to the jamb to catch a line of reflected light.",
        "The chair scrapes when it is pulled from the wall. The movement needs a different reach and a wider turn; the room keeps these small negotiations alongside its measurements.",
    ),
    "colossal-escalation": (
        "The view retreats from doorway to building while the man's face remains recognizable. The first threshold stays visible at the bottom of the scene as a scale memory.",
        "Cloud moves behind the upper floors while he turns with the same unhurried gesture. The building measures the new state; the old room remains legible inside the view.",
    ),
    "kingdom-land": (
        "Water crosses pale stone and darkens the lichen. A ridge appears beyond the plateau as the weather thins, though low cloud still hides the far slope.",
        "The cloud lifts enough to reveal an older track cut along the ridge. Two drainage lines meet in a shallow basin; the land exposes a route already contained in its shape.",
    ),
    "deep-lore": (
        "Several scratches on the wall resolve into marks made at different times. Dust sits in the baseboard groove beside a small object someone left and did not retrieve.",
        "The old phrase appears again in a different hand. One word has changed, but the spacing remains familiar; the archive keeps both versions without correction.",
    ),
    "luke-bwomph": (
        "Luke stands in familiar bar-gym light, mirrors clouded at their edges and chalk pressed into the rubber floor. His shoulders fill more of the tank top, while his face remains his own.",
        "He rolls his arms loose, tests the turn between bench and rack, and gives the reflection the same small nod. The new baseline appears through movement, not replacement.",
    ),
}


def read_json(path, fallback):
    if not path.exists():
        return fallback
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def utc_now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def get_region_map(world):
    return {region["id"]: region for region in world.get("regions", [])}


def initial_region(state, regions):
    current = state.get("active_region")
    if current in regions:
        return current
    old_events = state.get("events", [])
    if old_events:
        old_world = str(old_events[-1].get("world", "")).upper()
        legacy = LEGACY_WORLD_MAP.get(old_world)
        if legacy in regions:
            return legacy
    return "discovery" if "discovery" in regions else next(iter(regions), "")


def choose_source(region, state):
    requested = str(region.get("path", "")).removeprefix("./")
    if requested and requested != "#" and (ROOT / requested).is_file():
        return requested

    preference = {
        "discovery": ["world.json", "README.md", "novel/REWRITTEN_OPENING.md"],
        "veyrthalis": ["lore/veyrthalis/HYPERSPACE_EXPEDITION_2026-09-21.md", "lore/DEEP_LORE.md"],
        "complex": ["novel/REWRITTEN_OPENING.md", "world.json", "projects.json"],
        "growth": ["creative/luke-bwomph.json", "research/embodied-scale/README.md"],
        "beefythiq": ["creative/luke-bwomph.json", "lore/DEEP_LORE.md"],
        "bodylounger": ["records.json", "archive/male-harem/README.md"],
        "deep-lore": ["lore/DEEP_LORE.md", "novel/REWRITTEN_OPENING.md"],
        "luke-bwomph": ["creative/luke-bwomph.json", "research/embodied-scale/colossal-escalation.json"],
        "colossal-escalation": ["research/embodied-scale/colossal-escalation.json", "world.json"],
        "kingdom-land": ["geo-cyberspace/kingdom-land.json", "world.json"],
    }
    used = state.setdefault("source_counts", {})
    for candidate in preference.get(region.get("id"), []):
        if (ROOT / candidate).is_file():
            return candidate

    tokens = [token for token in (region.get("id", "") + " " + region.get("name", "")).lower().replace("/", " ").replace("-", " ").split() if len(token) > 3]
    candidates = []
    roots = ("corpus", "assets", "characters", "worlds", "experiments", "novel", "lore", "creative", "research", "geo-cyberspace", "archive")
    for name in roots:
        base = ROOT / name
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.name.startswith(".") or ".git" in path.parts:
                continue
            relative = str(path.relative_to(ROOT))
            searchable = relative.lower()
            score = sum(1 for token in tokens if token in searchable)
            if score:
                candidates.append((score, int(used.get(relative, 0)), relative))
    if candidates:
        candidates.sort(key=lambda row: (-row[0], row[1], row[2]))
        return candidates[0][2]
    return "world.json" if WORLD_PATH.is_file() else "README.md"


def route_candidates(current_id, world, state):
    found = []
    for order, edge in enumerate(world.get("pleasureBits", [])):
        target = edge.get("to") if edge.get("from") == current_id else edge.get("from") if edge.get("to") == current_id else None
        if not target or target == current_id:
            continue
        if not any(item["id"] == target for item in found):
            found.append({"id": target, "edge": edge, "order": order})
    visits = state.setdefault("visits", {})
    last_visits = state.setdefault("last_visits", {})
    pressure = float(state.get("pressure", 0.18))
    memory = float(state.get("memory", 0.5))

    def route_bias(target):
        score = 0
        if pressure >= 0.62 and target in PHYSICAL_REGIONS:
            score -= 2
        if memory >= 0.68 and target in MEMORY_REGIONS:
            score -= 1.25
        return score

    found.sort(key=lambda item: (
        int(visits.get(item["id"], 0)),
        route_bias(item["id"]),
        float(last_visits.get(item["id"], 0)),
        item["order"],
    ))
    region_ids = {item["id"] for item in world.get("regions", [])}
    return [item for item in found if item["id"] in region_ids]


def main():
    for path in (STATE_PATH.parent, LORE_PATH.parent, NOVEL_PATH.parent, ARTIFACT_DIR, OUTBOX, ARTIFACT_INDEX.parent):
        path.mkdir(parents=True, exist_ok=True)

    world = read_json(WORLD_PATH, {"regions": [], "pleasureBits": []})
    regions = get_region_map(world)
    if not regions:
        raise RuntimeError("world.json contains no regions; autonomous pulse cannot choose a place")

    state = read_json(STATE_PATH, {"pulse": 0, "events": []})
    state.setdefault("events", [])
    state.setdefault("visits", {})
    state.setdefault("last_visits", {})
    state.setdefault("pressure", 0.18)
    state.setdefault("memory", 0.5)
    state.setdefault("source_counts", {})
    state.setdefault("next_region", None)

    pulse = int(state.get("pulse", 0)) + 1
    now = utc_now()
    phase_index = int(state.get("phase", 0)) % len(PHASES)
    phase = PHASES[phase_index]
    actor = PHASE_ACTORS[phase_index]
    desire_state = PHASE_DESIRES[phase_index]
    actor_rule = PHASE_RULES[actor]
    current_id = initial_region(state, regions)
    initial_region_id = current_id
    current = regions[current_id]
    state["visits"].setdefault(current_id, 1)
    state["last_visits"].setdefault(current_id, 0)
    previous_event = state["events"][-1] if state["events"] else None
    next_region = None
    relation = None
    source = choose_source(current, state)
    source_counts = state["source_counts"]

    if phase == "ATMOSPHERE":
        detail = AMBIENCE.get(current_id, (current.get("description", "The place remains visible."), current.get("description", "The place remains visible.")))[0]
        action = (
            "SETH: " + detail + "\n\n"
            "NICK: Nothing needs to happen for this place to keep existing. The weather, surfaces, distance, and quiet sounds are part of the record too."
        )
        state["pressure"] = min(1.0, float(state["pressure"]) + 0.02)
        state["phase"] = 1
    elif phase == "MEMORY":
        cues = AMBIENCE.get(current_id, (current.get("description", "The place remains visible."), current.get("description", "The place remains visible.")))
        previous_source = previous_event.get("source", source) if previous_event else source
        action = (
            "NICK: A detail returns in " + current["name"] + ": " + cues[1] + "\n\n"
            "SETH: The earlier state is not removed. The new observation is kept beside the previous record, whose source was " + str(previous_source) + "."
        )
        state["memory"] = min(1.0, float(state["memory"]) + 0.06)
        state["pressure"] = min(1.0, float(state["pressure"]) + 0.04)
        state["phase"] = 2
    elif phase == "ROUTE_OPEN":
        candidates = route_candidates(current_id, world, state)
        if candidates:
            chosen = candidates[0]
            next_region = chosen["id"]
            relation = chosen["edge"]
            target = regions[next_region]
            action = (
                "SETH: A line becomes visible between " + current["name"] + " and " + target["name"] + ". "
                'The archive names the relation "' + relation.get("title", "A RELATION IN THE WORLD") + '".\n\n'
                "NICK: " + relation.get("text", "The current place has begun to point toward another place.")
                + " The current place remains visible; the route is open, but nobody has crossed it yet."
            )
            state["next_region"] = next_region
            state["next_relation"] = relation
            state["pressure"] = min(1.0, float(state["pressure"]) + 0.12)
        else:
            action = (
                "SETH: No connected destination is currently available from " + current["name"] + ".\n\n"
                "NICK: The world leaves the route unresolved instead of manufacturing a connection."
            )
            state["next_region"] = None
            state["next_relation"] = None
        state["phase"] = 3 if next_region else 0
    else:  # CROSSING
        target_id = state.get("next_region")
        relation = state.get("next_relation")
        target = regions.get(target_id or "")
        if target is None:
            candidates = route_candidates(current_id, world, state)
            if candidates:
                target_id = candidates[0]["id"]
                relation = candidates[0]["edge"]
                target = regions[target_id]
        if target is None:
            action = "NICK: The route did not remain available. The current room is kept as it was; the world waits for a relation it can actually follow."
            state["next_region"] = None
            state["next_relation"] = None
            state["phase"] = 0
        else:
            relation_title = relation.get("title", "THE OPEN ROUTE") if relation else "THE OPEN ROUTE"
            action = (
                "NICK: The world crosses the route from " + current["name"] + " into " + target["name"] + ". "
                "The earlier place remains in the history; this is a crossing, not a replacement.\n\n"
                "SETH: " + target.get("description", "The next place appears with the previous one still legible behind it.")
                + " Relation carried forward: " + relation_title + "."
            )
            state["active_region"] = target_id
            state["visits"][target_id] = int(state["visits"].get(target_id, 0)) + 1
            state["last_visits"][target_id] = pulse
            state["pressure"] = max(0.12, float(state["pressure"]) - 0.12)
            state["memory"] = min(1.0, float(state["memory"]) + 0.025)
            state["next_region"] = None
            state["next_relation"] = None
            state["phase"] = 0
            current_id = target_id
            current = target
            if relation is None:
                candidates = route_candidates(current_id, world, state)
                relation = candidates[0]["edge"] if candidates else None

    source_counts[source] = int(source_counts.get(source, 0)) + 1
    event = {
        "pulse": pulse,
        "time": now,
        "actor": actor,
        "world": current["name"],
        "region_id": current_id,
        "previous_region_id": initial_region_id,
        "phase": phase,
        "source": source,
        "desire_state": desire_state,
        "action": action,
        "narrative_rule": actor_rule,
        "relation": relation.get("title") if relation else None,
        "next_region": state.get("next_region"),
        "pressure": round(float(state["pressure"]), 3),
        "memory": round(float(state["memory"]), 3),
    }
    state["pulse"] = pulse
    state["active_region"] = current_id
    state["current_phase"] = phase
    state["current_desire_state"] = desire_state
    state["current_question"] = {
        "ATMOSPHERE": "What does this place do while nobody intervenes?",
        "MEMORY": "Which detail remains from the prior state?",
        "ROUTE_OPEN": "Which existing relation now becomes traversable?",
        "CROSSING": "What can change without erasing where it came from?",
    }[phase]
    state["current_narrative_rule"] = actor_rule
    state["events"].append(event)
    state["events"] = state["events"][-1000:]
    write_json(STATE_PATH, state)

    artifact_id = f"world-production-{pulse:06d}"
    artifact = {
        "id": artifact_id,
        "created_at": now,
        "source": "GEEHUB autonomous world engine",
        "kind": "world-production",
        "title": f"{phase} / {current['name']} / {source}",
        "content": action,
        "production_note": f"The world resolved its {phase.lower()} rule and retained the earlier state.",
        "lineage": {
            "pulse": pulse,
            "actor": actor,
            "world": current["name"],
            "region_id": current_id,
            "source": source,
            "phase": phase,
            "relation": relation.get("title") if relation else None,
        },
        "canon": "unclassified",
        "dreamable": True,
        "next_action": "continue the retained world state",
    }
    write_json(ARTIFACT_DIR / f"{artifact_id}.json", artifact)

    ledger = read_json(ARTIFACT_INDEX, {"version": 2, "description": "Durable GEEHUB production ledger.", "artifacts": []})
    ledger.setdefault("artifacts", []).append(artifact)
    ledger["artifacts"] = ledger["artifacts"][-2000:]
    write_json(ARTIFACT_INDEX, ledger)

    with LORE_PATH.open("a", encoding="utf-8") as handle:
        handle.write(
            f"\n### Pulse {pulse} — {phase} / {current['name']} / {now}\n\n"
            f"{action}\n\n"
            f"Rule: {actor_rule}\n"
        )
    with NOVEL_PATH.open("a", encoding="utf-8") as handle:
        handle.write(
            f"\n## {current['name']} / pulse {pulse} / {phase}\n\n"
            f"{action}\n\n"
            f"Source retained: {source}. Pressure {state['pressure']:.2f}; memory {state['memory']:.2f}.\n"
        )
    write_json(OUTBOX / f"{artifact_id}.json", artifact)


if __name__ == "__main__":
    main()
