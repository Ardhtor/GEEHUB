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

from inscription import inscribe_event
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

ROOT = Path(__file__).resolve().parents[1]
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
REVISION_LOG = ROOT / "engine/canon_versions.jsonl"
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


def bootstrap_retrieval(api_key: str, model: str, dry_run: bool) -> None:
    """Seed the first recall card without producing a narrative/canon update."""
    context = collect_context()
    instructions = """
You are preparing the first retrieval snapshot for The Tractus. This is a
one-time bootstrap, not a narrative-writing pass. Read the supplied canon and
return a compact snapshot of exactly three consequential live threads. For
each include thread_id, open_threads (three concrete items), character_states
(who is where and in what state), unresolved (what must remain unresolved),
expected_next_consequence, and source_paths. Include only facts supported by
the supplied source. Do not write prose chapters or invent facts.

Return JSON with exactly: retrieval_snapshot (array of three objects),
source_commit (string), bootstrap_note (string).
"""
    result = call_model(api_key, model, instructions, context)
    snapshot = result.get("retrieval_snapshot")
    if not isinstance(snapshot, list) or len(snapshot) != 3:
        fail("Bootstrap must return exactly three source-grounded retrieval threads.")
    for item in snapshot:
        if not isinstance(item, dict) or not item.get("thread_id") or not item.get("open_threads"):
            fail("Bootstrap retrieval snapshot contains an incomplete thread.")
    state = read_json(RETRIEVAL_STATE_PATH)
    state.update({
        "bootstrap_required": False,
        "last_snapshot_at": iso_utc(),
        "last_snapshot_source_commit": git("rev-parse", "HEAD").stdout.strip(),
        "retrieval_snapshot": snapshot,
        "last_retrieval_id": None,
        "bootstrap_note": result.get("bootstrap_note", "Initial canon-derived snapshot; no narrative written."),
    })
    if dry_run:
        print("TRACTUS ENGINE DRY RUN: bootstrap snapshot validated; no files or canon changed.")
        return
    RETRIEVAL_STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    commit_changes("Tractus: seed initial retrieval snapshot")
    print("TRACTUS ENGINE: initial retrieval snapshot seeded; no narrative canon was changed.")


def blind_retrieve(api_key: str, model: str, schedule: dict, state: dict) -> dict | None:
    """Recall only from the previous snapshot and due schedule, before canon is read."""
    due = pick_next(schedule, limit=1)
    if not due:
        print("TRACTUS ENGINE: no retrieval thread is due; no model call or canon write.")
        return None
    due_ids = {item["thread_id"] for item in due}
    instructions = """
You are in Phase A, blind retrieval. You MUST NOT inspect, request, infer from,
or reconstruct the current canon. The only memory available is the supplied
prior retrieval snapshot. Select one due thread and actively recall it.
Return exactly: retrieval_id, thread_id, recalled_threads (three concrete
threads), characters_and_locations (array), unresolved (array), prediction
(string), confidence (number 0..1). Preserve uncertainty. Do not invent
missing facts. The snapshot is a memory aid, not permission to add new canon.
"""
    user_text = json.dumps({
        "due_threads": due,
        "prior_retrieval_snapshot": state.get("retrieval_snapshot", []),
        "instruction": "Recall now. No canon or queue excerpts are available in this phase."
    }, ensure_ascii=False)
    result = call_model(api_key, model, instructions, user_text)
    if result.get("thread_id") not in due_ids:
        fail("Blind retrieval selected a thread that is not due.")
    if len(result.get("recalled_threads", [])) != 3:
        fail("Blind retrieval must name exactly three open threads.")
    for field in ("retrieval_id", "prediction"):
        if not isinstance(result.get(field), str) or len(result[field].strip()) < 8:
            fail(f"Blind retrieval is missing {field}.")
    try:
        confidence = float(result.get("confidence"))
    except (TypeError, ValueError):
        fail("Blind retrieval confidence must be numeric.")
    if not 0 <= confidence <= 1:
        fail("Blind retrieval confidence must be between 0 and 1.")
    result["confidence"] = confidence
    return result


def verify_and_write(
    api_key: str, model: str, retrieval: dict, schedule: dict, state: dict, dry_run: bool
) -> None:
    """Open canon only after blind retrieval has completed."""
    context = collect_context()
    instructions = """
You are in Phase B: verify blind retrieval against the supplied current canon.
The blind retrieval object was produced in a separate prior model call without
access to canon. Compare it honestly with the source excerpts. Record accurate,
missing, and contradicted details. Then decide whether there is a meaningful
prediction error that warrants a new narrative canon passage.

If no concrete mismatch or consequential surprise exists, return skip=true.
Do not manufacture surprise to justify writing. A no-surprise result records
retrieval only and must not alter narrative canon.

If writing is justified, return one substantial new chapter to one approved
destination. Preserve chronology, relationships, source provenance, unresolved
threads and established style. Environmental detail must be specific and tied
to a character's immediate intention, fear, or desire; use one or two concrete
details rather than mechanically decorating every paragraph break. Every
important scene must alter a state, relationship, route, object, or open thread.

Return JSON with: skip (boolean), reason (string), retrieval_score (0..1),
verified_retrieval_snapshot (array of exactly three objects), surprise (object
with expected, observed, prediction_error, update_reason), and, only when not
skipping, path, title, chapter. Do not include a surprise object with empty
prediction_error. No prediction error means skip=true.
"""
    user_text = (
        "Blind retrieval performed before this source corpus was opened:\n"
        + json.dumps(retrieval, ensure_ascii=False)
        + "\n\nCurrent canon and provenance excerpts (opened only after retrieval):\n"
        + context
        + "\n\nVerify the recall. Write only if a specific prediction error warrants a canon update."
    )
    result = call_model(api_key, model, instructions, user_text)
    try:
        score = float(result.get("retrieval_score"))
    except (TypeError, ValueError):
        fail("Verification must return a numeric retrieval_score.")
    if not 0 <= score <= 1:
        fail("retrieval_score must be between 0 and 1.")
    if score < 0.5:
        result["skip"] = True
        result["reason"] = "Recall score below 0.5; record an observation and repair the thread before canon changes."
    snapshot = result.get("verified_retrieval_snapshot")
    if not isinstance(snapshot, list) or len(snapshot) != 3:
        fail("Verification must return exactly three updated retrieval snapshot objects.")
    now = utc_now()
    thread = next(item for item in schedule["threads"] if item["thread_id"] == retrieval["thread_id"])
    updated_thread = advance_thread(thread, now, score)
    updated_schedule = dict(schedule)
    updated_schedule["threads"] = [
        updated_thread if item["thread_id"] == retrieval["thread_id"] else item
        for item in schedule["threads"]
    ]
    updated_state = dict(state)
    updated_state.update({
        "last_snapshot_at": iso_utc(now),
        "last_snapshot_source_commit": git("rev-parse", "HEAD").stdout.strip(),
        "retrieval_snapshot": snapshot,
        "last_retrieval_id": retrieval["retrieval_id"],
        "bootstrap_required": False,
    })

    if result.get("skip") is True:
        if dry_run:
            print("TRACTUS ENGINE DRY RUN: blind retrieval verified; no surprise; no canon write.")
            return
        event_id = "tractus-retrieval-" + hashlib.sha256(retrieval["retrieval_id"].encode()).hexdigest()[:16]
        inscribe_event({
            "id": event_id, "at": iso_utc(now), "type": "RETRIEVAL_ONLY",
            "title": "Tractus retrieval without canon update",
            "description": result.get("reason", "Recall verified; no meaningful prediction error."),
            "thread_id": retrieval["thread_id"], "retrieval_id": retrieval["retrieval_id"],
            "retrieval_score": score, "action": "No canon update; spaced retrieval schedule advanced."
        }, source="scripts/tractus_engine.py")
        SCHEDULE_PATH.write_text(json.dumps(updated_schedule, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        RETRIEVAL_STATE_PATH.write_text(json.dumps(updated_state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        commit_changes("Tractus: record spaced retrieval without canon change")
        print("TRACTUS ENGINE: retrieval recorded; no prediction error, so canon was left unchanged.")
        return

    relative = result.get("path")
    title = result.get("title")
    chapter = result.get("chapter")
    if relative not in ALLOWED_FILES:
        fail("Model selected a destination outside the approved lore allowlist.")
    if not isinstance(title, str) or not 5 <= len(title.strip()) <= 100:
        fail("Chapter title failed validation.")
    if not isinstance(chapter, str):
        fail("Chapter body is missing.")
    chapter = chapter.strip()
    word_count = len(chapter.split())
    if len(chapter) > MAX_CHAPTER_CHARS:
        fail("Chapter body exceeds the 55,000 character safety limit.")
    if relative == "novel/BOOK_I_CONTINUATION_03.md":
        if not 4_000 <= word_count <= 7_000:
            fail("Novel chapter must contain 4,000–7,000 words under the publishing standard.")
    elif not 900 <= word_count <= 1_500:
        fail("Lore addition must contain 900–1,500 words.")
    if chapter.startswith("#"):
        fail("Chapter body must not supply its own top-level title.")
    if (chr(96) * 3) in chapter or "<script" in chapter.casefold() or "<iframe" in chapter.casefold():
        fail("Chapter body contains a disallowed embedded-code construct.")

    surprise = result.get("surprise")
    if not isinstance(surprise, dict):
        fail("Canon update requires a structured surprise object.")
    required_surprise = ("expected", "observed", "prediction_error", "update_reason")
    if any(not isinstance(surprise.get(key), str) or len(surprise[key].strip()) < 12 for key in required_surprise):
        fail("Surprise object requires concrete expected, observed, prediction_error, and update_reason fields.")
    if surprise["prediction_error"].strip().casefold() in {"none", "n/a", "no surprise", "unknown"}:
        fail("No prediction error: canon update rejected.")

    target = ROOT / relative
    existing = target.read_text(encoding="utf-8")
    title = title.strip()
    if relative == "novel/BOOK_I_CONTINUATION_03.md":
        chapter_numbers = re.findall(r"^## Chapter ([IVXLCDM]+)\b", existing, flags=re.MULTILINE)
        next_number = max((roman_to_int(value) for value in chapter_numbers), default=0) + 1
        title = re.sub(r"^Chapter\s+[IVXLCDM]+\s*[:.\-]?\s*", "", title, flags=re.IGNORECASE)
        title = f"Chapter {int_to_roman(next_number)}: {title}"
    heading = f"## {title}"
    if heading.casefold() in existing.casefold():
        print("TRACTUS ENGINE: this chapter title already exists; skipping.")
        return

    updated = existing.rstrip() + "\n\n---\n\n" + heading + "\n\n" + chapter + "\n"
    if dry_run:
        print(
            f"TRACTUS ENGINE DRY RUN: validated {title!r} for {relative}; "
            "prediction error recorded in memory; no files changed."
        )
        return

    target.write_text(updated, encoding="utf-8")
    result_sha = sha256_text(updated)
    prior_sha = sha256_text(existing)
    revision_id = "tractus-revision-" + hashlib.sha256(
        (relative + retrieval["retrieval_id"] + result_sha).encode("utf-8")
    ).hexdigest()[:20]
    event_id = "tractus-event-" + hashlib.sha256(revision_id.encode("utf-8")).hexdigest()[:16]
    revision_records = read_jsonl(REVISION_LOG)
    event = {
        "id": event_id, "at": iso_utc(now), "type": "CANON_REVISION",
        "title": title, "description": surprise["update_reason"],
        "canon_path": relative, "revision_id": revision_id,
        "retrieval_id": retrieval["retrieval_id"], "action": "Append a versioned canon passage."
    }
    inscribe_event(event, source="scripts/tractus_engine.py")
    append_jsonl(REVISION_LOG, {
        "revision_id": revision_id,
        "parent_revision_id": parent_revision(revision_records, relative),
        "canon_path": relative,
        "prior_sha256": prior_sha,
        "result_sha256": result_sha,
        "retrieval_id": retrieval["retrieval_id"],
        "prediction": surprise["expected"],
        "observation": surprise["observed"],
        "prediction_error": surprise["prediction_error"],
        "update_reason": surprise["update_reason"],
        "source_event_id": event_id,
        "created_at": iso_utc(now),
        "status": "CANON_REVISION",
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
        bootstrap_retrieval(api_key, model, dry_run)
        return

    retrieval = blind_retrieve(api_key, model, schedule, state)
    if retrieval is None:
        return
    verify_and_write(api_key, model, retrieval, schedule, state, dry_run)


if __name__ == "__main__":
    main()
