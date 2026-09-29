import datetime
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "engine" / "state.json"
LORE = ROOT / "lore" / "AUTONOMOUS_STREAM.md"
NOVEL = ROOT / "novel" / "WORLDS.md"
ARTIFACT_DIR = ROOT / "artifacts" / "world-events"
ARTIFACT_INDEX = ROOT / "artifacts" / "index.json"
OUTBOX = ROOT / "dropbox_outbox"

WORLDS = ["PYYRO ENERGY", "POETRY SEEP", "DEEP LORE", "NOVEL ENGINE", "VEY RTHALIS", "THE COMPLEX"]
ACTORS = ["LUKE", "TYLER", "KIRK", "JOSEPH"]
DESIRE_STATES = [
    "approach",
    "proximity",
    "attention",
    "tension",
    "tenderness",
    "jealousy",
    "recognition",
    "afterglow",
]
DESIRE_QUESTIONS = [
    "Who is being drawn toward whom?",
    "What changes when two people remain close?",
    "What is wanted but not yet spoken?",
    "What does proximity reveal about this place?",
    "What remains after the encounter?",
    "What relationship is becoming more important?",
]

for p in (STATE.parent, LORE.parent, NOVEL.parent, ARTIFACT_DIR, OUTBOX):
    p.mkdir(parents=True, exist_ok=True)

if STATE.exists():
    state = json.loads(STATE.read_text(encoding="utf-8"))
else:
    state = {"pulse": 0, "events": []}

pulse = state.get("pulse", 0) + 1
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
actor = ACTORS[(pulse - 1) % len(ACTORS)]
world = WORLDS[(pulse - 1) % len(WORLDS)]
desire_state = DESIRE_STATES[(pulse - 1) % len(DESIRE_STATES)]
desire_question = DESIRE_QUESTIONS[(pulse - 1) % len(DESIRE_QUESTIONS)]

roots = ["corpus", "assets", "characters", "worlds", "experiments"]
candidates = []
for root in roots:
    base = ROOT / root
    if base.exists():
        for path in base.rglob("*"):
            if path.is_file() and not path.name.startswith("."):
                candidates.append(str(path.relative_to(ROOT)))

source = candidates[(pulse - 1) % len(candidates)] if candidates else "engine/UNFINISHED.md"

action = (
    f"{actor} opened {source} and carried its unfinished edge into {world}. "
    f"The world entered a state of {desire_state}; attention and proximity became part of the place."
)

event = {
    "pulse": pulse,
    "time": now,
    "actor": actor,
    "world": world,
    "source": source,
    "desire_state": desire_state,
    "question": desire_question,
    "action": action,
}
state["pulse"] = pulse
state.setdefault("events", []).append(event)
state["events"] = state["events"][-1000:]
state["current_desire_state"] = desire_state
state["current_question"] = desire_question
STATE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")

artifact_id = f"world-production-{pulse:06d}"
artifact = {
    "id": artifact_id,
    "created_at": now,
    "source": "GEEHUB autonomous world engine",
    "kind": "world-production",
    "title": f"{world} / {source}",
    "desire_state": desire_state,
    "question": desire_question,
    "content": action,
    "production_note": (
        f"The world encountered {source}, moved through {desire_state}, "
        f"asked '{desire_question}', and left a changed state behind."
    ),
    "lineage": {
        "pulse": pulse,
        "actor": actor,
        "world": world,
        "source": source,
        "desire_state": desire_state,
    },
    "canon": "unclassified",
    "dreamable": True,
    "next_action": "encounter this artifact again",
}

artifact_path = ARTIFACT_DIR / f"{artifact_id}.json"
artifact_path.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")

if ARTIFACT_INDEX.exists():
    ledger = json.loads(ARTIFACT_INDEX.read_text(encoding="utf-8"))
else:
    ledger = {"version": 2, "description": "Durable GEEHUB production ledger.", "artifacts": []}
ledger.setdefault("artifacts", []).append(artifact)
ledger["artifacts"] = ledger["artifacts"][-2000:]
ARTIFACT_INDEX.write_text(json.dumps(ledger, indent=2) + "\n", encoding="utf-8")

if not LORE.exists():
    LORE.write_text("# GEEHUB // AUTONOMOUS STREAM\n\n", encoding="utf-8")
with LORE.open("a", encoding="utf-8") as f:
    f.write(
        f"\n### Production {pulse} — {now}\n\n"
        f"{action}\n\n"
        f"Question: {desire_question}\n"
    )

if not NOVEL.exists():
    NOVEL.write_text("# WORLDS // AUTONOMOUS NOVEL MATERIAL\n\n", encoding="utf-8")
with NOVEL.open("a", encoding="utf-8") as f:
    f.write(
        f"\n## {world} / production {pulse}\n\n"
        f"     {action}\n"
        f"     The question beneath the scene was: {desire_question}\n"
    )

package = OUTBOX / f"{artifact_id}.json"
package.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
