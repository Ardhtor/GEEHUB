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

# Discover actual material instead of cycling through an empty vocabulary.
roots = ["corpus", "assets", "characters", "worlds", "experiments"]
candidates = []
for root in roots:
    base = ROOT / root
    if base.exists():
        for path in base.rglob("*"):
            if path.is_file() and not path.name.startswith("."):
                candidates.append(str(path.relative_to(ROOT)))

source = candidates[(pulse - 1) % len(candidates)] if candidates else "engine/UNFINISHED.md"
action = f"{actor} opened {source} and carried its unfinished edge into {world}."

questions = [\n    "What is unfinished here?",\n    "What is missing from this place?",\n    "What does this encounter change?",\n    "What should exist because this happened?",\n]\nquestion = questions[(pulse - 1) % len(questions)]\n\nevent = {"pulse": pulse, "time": now, "actor": actor, "world": world, "source": source, "question": question, "action": action}
state["pulse"] = pulse
state.setdefault("events", []).append(event)
state["events"] = state["events"][-1000:]
STATE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")

artifact_id = f"world-production-{pulse:06d}"
artifact = {\n    "id": artifact_id,\n    "created_at": now,\n    "source": "GEEHUB autonomous world engine",\n    "kind": "world-production",\n    "title": f"{world} / {source}",\n    "question": question,\n    "content": action,\n    "production_note": f"The world encountered {source}, asked \\"{question}\\", and left a changed state behind.",\n    "lineage": {"pulse": pulse, "actor": actor, "world": world, "source": source},\n    "canon": "unclassified",\n    "dreamable": True,\n    "next_action": "encounter this artifact again"\n}

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
    f.write(f"\n### Production {pulse} — {now}\n\n{action}\n")

if not NOVEL.exists():
    NOVEL.write_text("# WORLDS // AUTONOMOUS NOVEL MATERIAL\n\n", encoding="utf-8")
with NOVEL.open("a", encoding="utf-8") as f:
    f.write(f"\n## {world} / production {pulse}\n\n     {action}\n")

# The outbox is the exact package the Dropbox bridge consumes.
package = OUTBOX / f"{artifact_id}.json"
package.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")