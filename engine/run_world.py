import datetime
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(ROOT, "engine", "state.json")
LORE = os.path.join(ROOT, "lore", "AUTONOMOUS_STREAM.md")
NOVEL = os.path.join(ROOT, "novel", "WORLDS.md")
ARTIFACT_DIR = os.path.join(ROOT, "artifacts", "world-events")
ARTIFACT_INDEX = os.path.join(ROOT, "artifacts", "index.json")

WORLDS = ["PYYRO ENERGY", "POETRY SEEP", "DEEP LORE", "NOVEL ENGINE", "VEY RTHALIS", "THE COMPLEX"]
ACTORS = ["LUKE", "TYLER", "KIRK", "JOSEPH"]
VERBS = ["entered", "crossed", "waited inside", "returned to", "walked beyond", "stood within"]

os.makedirs(os.path.dirname(STATE), exist_ok=True)
os.makedirs(os.path.dirname(LORE), exist_ok=True)
os.makedirs(os.path.dirname(NOVEL), exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

if os.path.exists(STATE):
    with open(STATE, encoding="utf-8") as f:
        state = json.load(f)
else:
    state = {"pulse": 0, "events": []}

state["pulse"] += 1
pulse = state["pulse"]
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
actor = ACTORS[(pulse - 1) % len(ACTORS)]
world = WORLDS[(pulse - 1) % len(WORLDS)]
verb = VERBS[(pulse - 1) % len(VERBS)]

text = f"{actor} {verb} {world}. Nothing was explained. The room continued around them."
event = {
    "pulse": pulse,
    "time": now,
    "actor": actor,
    "world": world,
    "text": text,
}
state["events"].append(event)
state["events"] = state["events"][-1000:]

with open(STATE, "w", encoding="utf-8") as f:
    json.dump(state, f, indent=2)
    f.write("\n")

artifact_id = f"world-pulse-{pulse:06d}"
artifact = {
    "id": artifact_id,
    "created_at": now,
    "source": "GEEHUB autonomous world engine",
    "kind": "world-event",
    "title": f"{world} / pulse {pulse}",
    "content": text,
    "lineage": {"pulse": pulse, "actor": actor, "world": world},
    "canon": "unclassified",
    "dreamable": True,
    "quietness": "high",
}

with open(os.path.join(ARTIFACT_DIR, artifact_id + ".json"), "w", encoding="utf-8") as f:
    json.dump(artifact, f, indent=2)
    f.write("\n")

if os.path.exists(ARTIFACT_INDEX):
    with open(ARTIFACT_INDEX, encoding="utf-8") as f:
        ledger = json.load(f)
else:
    ledger = {"version": 1, "description": "Durable artifact ledger for GEEHUB.", "artifacts": []}

ledger["artifacts"].append(artifact)
ledger["artifacts"] = ledger["artifacts"][-2000:]
with open(ARTIFACT_INDEX, "w", encoding="utf-8") as f:
    json.dump(ledger, f, indent=2)
    f.write("\n")

if not os.path.exists(LORE):
    with open(LORE, "w", encoding="utf-8") as f:
        f.write("# GEEHUB // AUTONOMOUS STREAM\n\n")
with open(LORE, "a", encoding="utf-8") as f:
    f.write(f"\n### Pulse {pulse} — {now}\n\n{text}\n")

if not os.path.exists(NOVEL):
    with open(NOVEL, "w", encoding="utf-8") as f:
        f.write("# WORLDS // AUTONOMOUS NOVEL MATERIAL\n\n")
with open(NOVEL, "a", encoding="utf-8") as f:
    f.write(f"\n## Pulse {pulse}: {world}\n\n     {text}\n")
