import datetime
import json
import os
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, "artifacts", "index.json")

def emit_artifact(kind, title, content, source, lineage=None, canon="unclassified", dreamable=True, quietness="high"):
    artifact = {
        "id": "py-" + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M%S") + "-" + uuid.uuid4().hex[:6],
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source": source,
        "kind": kind,
        "title": title,
        "content": content,
        "lineage": lineage,
        "canon": canon,
        "dreamable": dreamable,
        "quietness": quietness,
    }
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    if os.path.exists(LEDGER):
        with open(LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
    else:
        ledger = {"version": 1, "description": "Durable artifact ledger for GEEHUB.", "artifacts": []}
    ledger["artifacts"].append(artifact)
    ledger["artifacts"] = ledger["artifacts"][-2000:]
    with open(LEDGER, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2)
        f.write("\n")
    return artifact
