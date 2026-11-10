#!/usr/bin/env python3
"""Read-only self-audit for the GEEHUB / Tractus language.

Checks the machine-readable grammar used by passages, inscriptions, world state,
and narrative lanes. It never edits canon or repairs source files.
"""
from __future__ import annotations
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_EXCHANGE_TYPES = {"ARRIVAL", "NOTICE", "ENCOUNTER", "OFFER", "TRANSFORM", "RETURN", "MEMORY", "UTTERANCE", "FOUNDING"}
PASSAGE_GRAMMAR = ("ORIGIN", "ENCOUNTER", "PRESSURE", "TRANSFORMATION", "INTEGRATION", "NEW BASELINE", "NEXT PASSAGE")
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$")

def load_json(path: Path, errors: list[str]):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        errors.append(f"missing file: {path.relative_to(ROOT)}")
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"cannot read {path.relative_to(ROOT)}: {exc}")
    return None

def valid_time(value) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False

def audit():
    errors: list[str] = []
    warnings: list[str] = []
    checks = []
    counts = {}

    contract_path = ROOT / "docs/TRACTUS_CONTINUITY_CONTRACT.md"
    try:
        contract = contract_path.read_text(encoding="utf-8")
        grammar_line = " → ".join(PASSAGE_GRAMMAR)
        grammar_ok = grammar_line in contract
        if not grammar_ok:
            errors.append("continuity contract passage grammar differs from the executable language definition")
    except OSError as exc:
        grammar_ok = False
        errors.append(f"cannot read continuity contract: {exc}")
    checks.append({"name":"canon / executable grammar alignment","records":1,"invalid":0 if grammar_ok else 1,"status":"pass" if grammar_ok else "fail"})

    exchange = load_json(ROOT / "hub/exchange.json", errors)
    events = exchange.get("events", []) if isinstance(exchange, dict) else []
    seen = set()
    bad = 0
    for index, event in enumerate(events):
        label = f"hub/exchange.json events[{index}]"
        if not isinstance(event, dict):
            errors.append(f"{label} must be an object"); bad += 1; continue
        event_id = event.get("id")
        if not isinstance(event_id, str) or not ID_RE.fullmatch(event_id):
            errors.append(f"{label} has an invalid stable id"); bad += 1
        elif event_id in seen:
            errors.append(f"{label} duplicates id {event_id}"); bad += 1
        else:
            seen.add(event_id)
        if not valid_time(event.get("at")):
            errors.append(f"{label} has an invalid at timestamp"); bad += 1
        if event.get("type") not in ALLOWED_EXCHANGE_TYPES:
            errors.append(f"{label} has an unknown exchange type"); bad += 1
        for field in ("from", "to", "title", "body"):
            if not isinstance(event.get(field), str) or not event[field].strip():
                errors.append(f"{label} is missing {field}"); bad += 1
    counts["exchange_events"] = len(events)
    checks.append({"name":"exchange grammar","records":len(events),"invalid":bad,"status":"fail" if bad else "pass"})

    # A valid record must also describe a coherent transition, not merely
    # contain syntactically valid fields. Keep provenance and route checks
    # separate so a failure identifies the layer that needs repair.
    transition_bad = 0
    previous_timestamp = None
    for index, event in enumerate(events):
        if not isinstance(event, dict):
            continue
        label = f"hub/exchange.json events[{index}]"
        for field in ("source", "artifact"):
            if not isinstance(event.get(field), str) or not event[field].strip():
                errors.append(f"{label} is missing provenance field {field}")
                transition_bad += 1
        if event.get("type") == "TRANSFORM":
            origin = event.get("previousRegionId")
            destination = event.get("regionId")
            if not isinstance(origin, str) or not origin.strip():
                errors.append(f"{label} TRANSFORM is missing previousRegionId")
                transition_bad += 1
            if not isinstance(destination, str) or not destination.strip():
                errors.append(f"{label} TRANSFORM is missing regionId")
                transition_bad += 1
            if isinstance(origin, str) and isinstance(destination, str) and origin == destination:
                errors.append(f"{label} TRANSFORM does not change location")
                transition_bad += 1
            if not isinstance(event.get("relation"), str) or not event["relation"].strip():
                errors.append(f"{label} TRANSFORM is missing its carried relation")
                transition_bad += 1
        timestamp = event.get("at")
        if valid_time(timestamp):
            parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00")).timestamp()
            if previous_timestamp is not None and parsed > previous_timestamp:
                warnings.append("exchange ledger is not ordered newest-first; chronology remains valid but presentation order may be stale")
            previous_timestamp = parsed
    counts["exchange_transitions"] = len(events)
    checks.append({"name":"transition and provenance integrity","records":len(events),"invalid":transition_bad,"status":"fail" if transition_bad else "pass"})

    queue = load_json(ROOT / "engine/tractus_narrative_queue.json", errors)
    lanes = queue.get("active_lanes", []) if isinstance(queue, dict) else []
    lane_ids = set(); bad = 0
    for index, lane in enumerate(lanes):
        label = f"narrative queue active_lanes[{index}]"
        if not isinstance(lane, dict):
            errors.append(f"{label} must be an object"); bad += 1; continue
        lane_id = lane.get("id")
        if not isinstance(lane_id, str) or not lane_id.strip() or lane_id in lane_ids:
            errors.append(f"{label} has a missing or duplicate id"); bad += 1
        else: lane_ids.add(lane_id)
        for field in ("target", "state", "next_pressure"):
            if not isinstance(lane.get(field), str) or not lane[field].strip():
                errors.append(f"{label} is missing {field}"); bad += 1
        if not isinstance(lane.get("priority"), (int, float)) or isinstance(lane.get("priority"), bool):
            errors.append(f"{label} priority must be numeric"); bad += 1
        elif not (ROOT / lane["target"]).exists():
            warnings.append(f"{label} target is not present in this checkout: {lane['target']}")
    counts["narrative_lanes"] = len(lanes)
    checks.append({"name":"narrative lane grammar","records":len(lanes),"invalid":bad,"status":"fail" if bad else "pass"})

    world = load_json(ROOT / "hub/world-state.json", errors)
    bad = 0
    if isinstance(world, dict):
        for field in ("id", "map", "activeRecording"):
            if not isinstance(world.get(field), str) or not world[field].strip():
                errors.append(f"hub/world-state.json is missing {field}"); bad += 1
        live = world.get("livePlay")
        if isinstance(live, dict):
            for field in ("agent", "regionId", "previousRegionId", "relation", "recording", "at"):
                if not isinstance(live.get(field), str) or not live[field].strip():
                    errors.append(f"hub/world-state.json livePlay is missing {field}"); bad += 1
            if not valid_time(live.get("at")):
                errors.append("hub/world-state.json livePlay.at is invalid"); bad += 1
            for field in ("previousScale", "scale"):
                if not isinstance(live.get(field), (int, float)) or isinstance(live.get(field), bool):
                    errors.append(f"hub/world-state.json livePlay.{field} must be numeric"); bad += 1
            encounter = world.get("activeEncounter")
            if isinstance(encounter, dict):
                if encounter.get("regionId") != live.get("regionId"):
                    errors.append("activeEncounter.regionId does not match livePlay.regionId"); bad += 1
                if encounter.get("previousRegionId") != live.get("previousRegionId"):
                    errors.append("activeEncounter.previousRegionId does not match livePlay.previousRegionId"); bad += 1
                subject = encounter.get("subject") or {}
                agent = subject.get("agent") if isinstance(subject, dict) else None
                if agent != live.get("agent"):
                    errors.append("activeEncounter subject does not match livePlay.agent"); bad += 1
                scale = subject.get("scale") if isinstance(subject, dict) else None
                if isinstance(scale, (int, float)) and scale != live.get("scale"):
                    errors.append("activeEncounter subject scale does not match livePlay.scale"); bad += 1
            else:
                warnings.append("world state has livePlay but no activeEncounter snapshot")
        else:
            warnings.append("world state has no livePlay passage")

        # Resolve declared world-state resources relative to hub/world-state.json.
        resource_paths = []
        for field in ("map", "activeRecording", "canonicalRecording", "rendererContract"):
            value = world.get(field)
            if isinstance(value, str) and value.strip():
                resource_paths.append((field, value))
        queues = world.get("rendererQueues")
        if isinstance(queues, dict):
            for field, value in queues.items():
                if isinstance(value, str) and value.strip():
                    resource_paths.append((f"rendererQueues.{field}", value))
        for field, value in resource_paths:
            relative = (ROOT / "hub" / value.removeprefix("./")).resolve()
            try:
                relative.relative_to(ROOT)
            except ValueError:
                errors.append(f"hub/world-state.json {field} escapes the repository root"); bad += 1
                continue
            if not relative.is_file():
                warnings.append(f"hub/world-state.json {field} points to a missing resource: {value}")
    counts["world_state"] = 1 if isinstance(world, dict) else 0
    checks.append({"name":"world-state passage grammar","records":counts["world_state"],"invalid":bad,"status":"fail" if bad else "pass"})

    activity_path = ROOT / "engine/activity.jsonl"
    records = 0; bad = 0; activity_ids = set()
    if activity_path.exists():
        with activity_path.open(encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, 1):
                if not line.strip(): continue
                records += 1
                try: event = json.loads(line)
                except json.JSONDecodeError as exc:
                    errors.append(f"engine/activity.jsonl line {line_number} is invalid JSON: {exc}"); bad += 1; continue
                if not isinstance(event, dict):
                    errors.append(f"engine/activity.jsonl line {line_number} must be an object"); bad += 1; continue
                event_id = event.get("id")
                if not isinstance(event_id, str) or not ID_RE.fullmatch(event_id):
                    errors.append(f"engine/activity.jsonl line {line_number} has invalid id"); bad += 1
                elif event_id in activity_ids:
                    errors.append(f"engine/activity.jsonl duplicates id {event_id}"); bad += 1
                else: activity_ids.add(event_id)
                stamp = event.get("occurred_at") or event.get("at") or event.get("time") or event.get("created_at")
                if not valid_time(stamp):
                    errors.append(f"engine/activity.jsonl line {line_number} has invalid occurrence time"); bad += 1
                if event.get("type") == "canon_update":
                    try:
                        from tractus_science import validate_event
                        for issue in validate_event(event):
                            errors.append(f"engine/activity.jsonl line {line_number}: {issue}"); bad += 1
                    except Exception as exc:
                        errors.append(f"could not load canon-update validator: {exc}"); bad += 1
    counts["activity_events"] = records
    checks.append({"name":"append-only inscription grammar","records":records,"invalid":bad,"status":"fail" if bad else "pass"})

    result = {
        "language": "TRACTUS / GEEHUB PASSAGE GRAMMAR",
        "grammar": list(PASSAGE_GRAMMAR),
        "scope": "Structural and continuity-contract validation; literary quality and factual truth require human review.",
        "status": "fail" if errors else ("warning" if warnings else "pass"),
        "counts": counts,
        "checks": checks,
        "errors": errors,
        "warnings": warnings,
        "validated_at": datetime.now().astimezone().isoformat(),
        "read_only": True,
    }
    return result

if __name__ == "__main__":
    print(json.dumps(audit(), ensure_ascii=False, indent=2))
