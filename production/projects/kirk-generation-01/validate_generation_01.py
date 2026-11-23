#!/usr/bin/env python3
"""Validate the GEEHUB Kirk Generation 01 production baseline."""
from __future__ import annotations
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent
DATA = ROOT / "generation-01.json"
REQUIRED = ("identity", "face", "physique", "personality", "competence", "movement_signature", "presentation", "growth_trajectory")
def validate(data: dict) -> list[str]:
    errors: list[str] = []
    members = data.get("members")
    if data.get("schema") != "geehub.population-generation/1": errors.append("schema identifier is invalid")
    if data.get("generation") != 1: errors.append("generation must equal 1")
    if data.get("cohort_size") != 20: errors.append("cohort_size must equal 20")
    if not isinstance(members, list) or len(members) != 20: return errors + ["members must contain exactly 20 entries"]
    ids = [m.get("id") for m in members]
    if len(set(ids)) != 20: errors.append("member IDs must be unique")
    names = [m.get("name") for m in members]
    if len(set(names)) != 20: errors.append("member names must be unique")
    known = set(ids)
    for member in members:
        prefix = member.get("id", "<missing>")
        if member.get("generation") != 1: errors.append(f"{prefix}: generation must equal 1")
        age = member.get("age_years")
        if not isinstance(age, int) or age < 18: errors.append(f"{prefix}: character must be an adult (18+)")
        for key in REQUIRED:
            if not isinstance(member.get(key), str) or not member[key].strip(): errors.append(f"{prefix}: missing {key}")
        relationships = member.get("relationships")
        if not isinstance(relationships, list) or len(relationships) < 2: errors.append(f"{prefix}: at least two relationships are required")
        else:
            for relation in relationships:
                if relation.get("character_id") not in known: errors.append(f"{prefix}: unresolved relationship {relation.get('character_id')}")
                if relation.get("character_id") == prefix: errors.append(f"{prefix}: self-relationship is not allowed")
                if not relation.get("dynamic"): errors.append(f"{prefix}: relationship dynamic is missing")
        production = member.get("production", {})
        for key in ("silhouette_anchors", "signature_poses", "modular_asset_components"):
            if not isinstance(production.get(key), list) or len(production[key]) < 3: errors.append(f"{prefix}: production.{key} requires at least three entries")
        if production.get("turnaround_views") != ["front", "left_profile", "back"]: errors.append(f"{prefix}: required turnaround views are missing")
        if production.get("reference_sheet") != f"REF-{prefix.upper()}": errors.append(f"{prefix}: reference sheet ID mismatch")
    return errors
def main() -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    errors = validate(data)
    if errors:
        print("GENERATION 01 VALIDATION FAILED")
        print("\n".join(f"- {e}" for e in errors))
        return 1
    print("GENERATION 01 VALIDATION PASSED — 20 unique adult characters; relationship and production references resolve.")
    return 0
if __name__ == "__main__":
    raise SystemExit(main())
