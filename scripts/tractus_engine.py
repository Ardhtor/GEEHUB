#!/usr/bin/env python3
"""Two-phase, spaced-retrieval continuity writer for The Tractus.

Phase A recalls from the prior retrieval snapshot without opening canon.
Phase B verifies that recall against the source corpus and writes only when
there is a specific, consequential prediction error.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.inscription import inscribe, inscribe_event
from tractus_memory import (
    advance_thread,
    append_jsonl,
    due_threads,
    pick_next,
    iso_utc,
    parent_revision,
    read_jsonl,
    sha256_text,
    utc_now,
)

ALLOWED_FILES = (
    "novel/BOOK_I_CONTINUATION_03.md",
    "lore/DEEP_LORE.md",
    "lore/INSTITUTE_OF_BECOMING.md",
    "lore/ECONOMY_OF_FAVOURS.md",
    "lore/GOD_PENIS_IDOL_CYCLE.md",
)
CONTEXT_SOURCES = (
    ("FICTION_ENGINE.md", 8_000),
    ("docs/TRACTUS_CONTINUITY_CONTRACT.md", 6_000),
    ("novel/EDITORIAL_DIRECTIVE.md", 6_000),
    ("novel/PUBLISHING_STANDARD.md", 6_000),
    ("novel/RELATIONSHIP_CANON.md", 4_000),
    ("lore/ASSET_INDEX.md", 4_000),
    ("novel/BOOK_I_CONTINUATION_03.md", 12_000),
    ("novel/WORLDS.md", 6_000),
    ("lore/AUTONOMOUS_STREAM.md", 7_000),
    ("engine/activity.jsonl", 12_000),
    ("lore/ATTENTION_ENGINE.md", 4_000),
    ("lore/DEEP_LORE.md", 6_000),
    ("lore/INSTITUTE_OF_BECOMING.md", 7_000),
    ("lore/ECONOMY_OF_FAVOURS.md", 6_000),
    ("lore/GOD_PENIS_IDOL_CYCLE.md", 6_000),
    ("engine/campus-life.json", 5_000),
    ("engine/tractus_narrative_queue.json", 8_000),
)
MAX_CHAPTER_CHARS = 55_000
API_URL = "https://api.openai.com/v1/responses"
SCHEDULE_PATH = ROOT / "engine/retrieval_schedule.json"
RETRIEVAL_STATE_PATH = ROOT / "engine/retrieval_state.json"
REVISION_LOG = ROOT / "engine/revision_history.jsonl"
CANON_VERSIONS_LOG = ROOT / "engine/canon_versions.jsonl"
ACTIVITY_LOG = ROOT / "engine/activity.jsonl"


def fail(message: str, code: int = 1) -> None:
    print(f"TRACTUS ENGINE: {message}", file=sys.stderr)
    raise SystemExit(code)


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args], cwd=ROOT, text=True, capture_output=True, check=check
    )


def read_json(path: Path) -> dict:
    if not path.is_file():
        fail(f"Required state file is missing: {path.relative_to(ROOT)}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON in {path.relative_to(ROOT)}: {exc}")
    if not isinstance(value, dict):
        fail(f"Expected a JSON object in {path.relative_to(ROOT)}")
    return value


def collect_context() -> str:
    sections = []
    for relative, limit in CONTEXT_SOURCES:
        path = ROOT / relative
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8")
        sections.append(f"===== {relative} (ending excerpt) =====\n" + content[-limit:])
    if not sections:
        fail("No continuity sources were found; refusing to invent a corpus.")
    recent = git("log", "-6", "--format=%h %s", "--", *ALLOWED_FILES, check=False).stdout.strip()
    sections.append(
        "===== Recent changes to approved narrative destinations =====\n"
        + (recent or "No previous narrative-engine commits are recorded.")
    )
    return "\n\n".join(sections)


def call_model(api_key: str, model: str, instructions: str, user_text: str) -> dict:
    payload = {
        "model": model,
        "instructions": instructions,
        "input": user_text,
        "max_output_tokens": 13000,
        "text": {"format": {"type": "json_object"}},
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:1200]
        fail(f"Model API returned HTTP {exc.code}: {detail}")
    except (urllib.error.URLError, TimeoutError) as exc:
        fail(f"Could not reach the model API: {exc}")
    except json.JSONDecodeError:
        fail("The model API returned invalid JSON.")

    output_text = data.get("output_text")
    if not output_text:
        chunks = []
        for item in data.get("output", []):
            for part in item.get("content", []):
                if part.get("type") == "output_text" and part.get("text"):
                    chunks.append(part["text"])
        output_text = "\n".join(chunks)
    if not output_text:
        fail("The model response contained no output text.")
    try:
        result = json.loads(output_text)
    except json.JSONDecodeError:
        fail("The model did not return the required JSON object.")
    if not isinstance(result, dict):
        fail("The model response was not a JSON object.")
    return result


def ensure_canon_baselines() -> None:
    """Capture existing approved canon files as immutable starting versions."""
    versions = read_jsonl(CANON_VERSIONS_LOG)
    latest_by_path = {}
    append_jsonl(CANON_VERSIONS_LOG, {
        "canon_version_id": canon_version_id,
        "entity": relative,
        "prior_version_id": prior_version_id,
        "created_by_event_id": event_id,
        "created_at": iso_utc(now),
        "claim": surprise["update_reason"],
        "what_remains": surprise["what_remains"],
        "content_sha256": result_sha,
        "prior_sha256": prior_sha,
        "baseline": False,
        "status": "canon",
    })
    updated_thread["last_revision_id"] = revision_id
    updated_thread["last_written_at"] = iso_utc(now)
    updated_schedule["threads"] = [
        updated_thread if item["thread_id"] == retrieval["thread_id"] else item
        for item in updated_schedule["threads"]
    ]
    SCHEDULE_PATH.write_text(json.dumps(updated_schedule, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    RETRIEVAL_STATE_PATH.write_text(json.dumps(updated_state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    commit_changes(f"Tractus: {title}")


def commit_changes(message: str) -> None:
    git("config", "user.name", "github-actions[bot]")
    git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    git("add", "-A")
    git("commit", "-m", message)
    short_sha = git("rev-parse", "--short", "HEAD").stdout.strip()
    print(f"TRACTUS ENGINE: committed state as {short_sha}")


def roman_to_int(value: str) -> int:
    values = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    previous = 0
    for char in reversed(value.upper()):
        number = values.get(char, 0)
        total += -number if number < previous else number
        previous = max(previous, number)
    return total


def int_to_roman(number: int) -> str:
    pairs = (
        (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
        (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
        (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
    )
    result = []
    for value, numeral in pairs:
        count, number = divmod(number, value)
        result.append(numeral * count)
    return "".join(result)


def main() -> None:
    dry_run = os.getenv("TRACTUS_DRY_RUN", "false").lower() == "true"
    enabled = os.getenv("TRACTUS_AUTONOMY_ENABLED", "false").lower() == "true"
    if not enabled and not dry_run:
        print("TRACTUS ENGINE: autonomous commits are disabled.")
        return
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("TRACTUS_MODEL", "").strip()
    if not api_key:
        fail("OPENAI_API_KEY is not configured in repository Actions secrets.")
    if not model:
        fail("TRACTUS_MODEL is not configured in repository Actions variables.")
    if git("status", "--porcelain").stdout.strip():
        fail("Working tree is not clean; refusing to mix unrelated changes.")

    schedule = read_json(SCHEDULE_PATH)
    state = read_json(RETRIEVAL_STATE_PATH)
    if state.get("bootstrap_required") is True:
        bootstrap_retrieval(api_key, model, schedule, dry_run)
        return

    retrieval = blind_retrieve(api_key, model, schedule, state)
    if retrieval is None:
        return
    verify_and_write(api_key, model, retrieval, schedule, state, dry_run)


if __name__ == "__main__":
    main()
