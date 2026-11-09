#!/usr/bin/env python3
"""Two-phase spaced-retrieval continuity writer for The Tractus."""
from __future__ import annotations
import hashlib, json, os, re, subprocess, sys, urllib.error, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from engine.inscription import inscribe, inscribe_event, validate_event
from tractus_memory import advance_thread, append_jsonl, iso_utc, parent_revision, pick_next, read_jsonl, sha256_text, utc_now

ALLOWED_FILES = ("novel/BOOK_I_CONTINUATION_03.md", "lore/DEEP_LORE.md",
    "lore/INSTITUTE_OF_BECOMING.md", "lore/ECONOMY_OF_FAVOURS.md", "lore/GOD_PENIS_IDOL_CYCLE.md")
CONTEXT_SOURCES = (
    ("FICTION_ENGINE.md",8000),("docs/TRACTUS_CONTINUITY_CONTRACT.md",6000),
    ("novel/EDITORIAL_DIRECTIVE.md",6000),("novel/PUBLISHING_STANDARD.md",6000),
    ("novel/RELATIONSHIP_CANON.md",4000),("lore/ASSET_INDEX.md",4000),
    ("novel/BOOK_I_CONTINUATION_03.md",12000),("novel/WORLDS.md",6000),
    ("lore/AUTONOMOUS_STREAM.md",7000),("engine/activity.jsonl",12000),
    ("lore/ATTENTION_ENGINE.md",4000),("lore/DEEP_LORE.md",6000),
    ("lore/INSTITUTE_OF_BECOMING.md",7000),("lore/ECONOMY_OF_FAVOURS.md",6000),
    ("lore/GOD_PENIS_IDOL_CYCLE.md",6000),("engine/campus-life.json",5000),
    ("engine/tractus_narrative_queue.json",8000))
MAX_CHAPTER_CHARS = 55000
API_URL = "https://api.openai.com/v1/responses"
SCHEDULE_PATH = ROOT / "engine/retrieval_schedule.json"
RETRIEVAL_STATE_PATH = ROOT / "engine/retrieval_state.json"
REVISION_LOG = ROOT / "engine/revision_history.jsonl"
CANON_VERSIONS_LOG = ROOT / "engine/canon_versions.jsonl"

def fail(message):
    print("TRACTUS ENGINE: " + message, file=sys.stderr)
    raise SystemExit(1)

def git(*args, check=True):
    return subprocess.run(["git",*args],cwd=ROOT,text=True,capture_output=True,check=check)

def read_json(path):
    try: value=json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc: fail(f"Cannot read {path}: {exc}")
    if not isinstance(value,dict): fail(f"Expected JSON object: {path}")
    return value

def collect_context():
    parts=[]
    for rel,limit in CONTEXT_SOURCES:
        p=ROOT/rel
        if p.is_file(): parts.append("===== "+rel+" =====\n"+p.read_text(encoding="utf-8")[-limit:])
    parts.append("===== Recent narrative commits =====\n"+git("log","-6","--format=%h %s","--",*ALLOWED_FILES,check=False).stdout)
    return "\n\n".join(parts)

def call_model(key,model,instructions,user_text):
    payload={"model":model,"instructions":instructions,"input":user_text,"max_output_tokens":13000,
             "text":{"format":{"type":"json_object"}}}
    req=urllib.request.Request(API_URL,data=json.dumps(payload).encode(),
        headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"},method="POST")
    try:
        with urllib.request.urlopen(req,timeout=180) as response: data=json.loads(response.read().decode())
    except urllib.error.HTTPError as exc: fail(f"Model API HTTP {exc.code}: {exc.read().decode(errors='replace')[:1000]}")
    except (urllib.error.URLError,TimeoutError) as exc: fail("Model API unavailable: "+str(exc))
    output=data.get("output_text")
    if not output:
        output="\n".join(part["text"] for item in data.get("output",[]) for part in item.get("content",[])
                         if part.get("type")=="output_text" and part.get("text"))
    try: result=json.loads(output)
    except Exception: fail("Model did not return valid JSON.")
    if not isinstance(result,dict): fail("Model response must be a JSON object.")
    return result

def commit_changes(message):
    git("config","user.name","github-actions[bot]")
    git("config","user.email","41898282+github-actions[bot]@users.noreply.github.com")
    git("add","-A"); git("commit","-m",message)
    print("TRACTUS ENGINE: committed "+git("rev-parse","--short","HEAD").stdout.strip())

def ensure_baselines():
    """Capture approved files as experiments until an operator reviews them."""
    versions=read_jsonl(CANON_VERSIONS_LOG); latest={}
    for item in versions: latest[item.get("entity")]=item
    commit=git("rev-parse","HEAD").stdout.strip()
    for rel in ALLOWED_FILES:
        path=ROOT/rel
        if not path.is_file(): fail("Missing canon destination: "+rel)
        digest=sha256_text(path.read_text(encoding="utf-8"))
        old=latest.get(rel)
        if old:
            if old.get("content_sha256")!=digest: fail("Untracked canon change; reconcile baseline: "+rel)
            continue
        event_id="tractus-baseline-"+hashlib.sha256((rel+digest+commit).encode()).hexdigest()[:16]
        inscribe_event({"id":event_id,"at":iso_utc(),"type":"observation",
            "title":"Tractus experimental canon baseline",
            "description":"Existing repository text captured as an experimental baseline. It is not canon until reviewed and explicitly promoted.",
            "canon_path":rel,"content_sha256":digest,
            "action":"Preserve the current file state for human review; no narrative text changed."},
            source="scripts/tractus_engine.py")
        vid="experiment-"+hashlib.sha256((rel+digest+commit).encode()).hexdigest()[:20]
        record={"canon_version_id":vid,"entity":rel,"prior_version_id":None,
            "created_by_event_id":event_id,"created_at":iso_utc(),
            "claim":"Existing approved destination captured as an experimental baseline.",
            "what_remains":"The prior text remains unchanged at the recorded source commit.",
            "content_sha256":digest,"source_commit":commit,"baseline":True,"status":"experiment"}
        append_jsonl(CANON_VERSIONS_LOG,record)
        latest[rel]=record

def roman_to_int(value):
    vals={"I":1,"V":5,"X":10,"L":50,"C":100,"D":500,"M":1000}; total=prev=0
    for ch in reversed(value.upper()):
        n=vals.get(ch,0); total += -n if n<prev else n; prev=max(prev,n)
    return total

def int_to_roman(number):
    pairs=((1000,"M"),(900,"CM"),(500,"D"),(400,"CD"),(100,"C"),(90,"XC"),(50,"L"),(40,"XL"),(10,"X"),(9,"IX"),(5,"V"),(4,"IV"),(1,"I"))
    out=[]
    for n,s in pairs:
        count,number=divmod(number,n); out.append(s*count)
    return "".join(out)

def bootstrap(key,model,schedule,dry):
    ids=[x["thread_id"] for x in schedule.get("threads",[])]
    prompt="""One-time bootstrap only; do not write a chapter. Read canon and return exactly one
retrieval_snapshot object for each supplied scheduled thread ID. Each object has thread_id,
open_threads (three concrete items), character_states, unresolved, expected_next_consequence,
and source_paths. Only source-supported facts. Return JSON: retrieval_snapshot, bootstrap_note.
IDs must exactly match the supplied scheduled IDs."""
    result=call_model(key,model,prompt,"Scheduled thread IDs: "+json.dumps(ids)+"\n\n"+collect_context())
    snap=result.get("retrieval_snapshot")
    if not isinstance(snap,list) or len(snap)!=len(ids) or {x.get("thread_id") for x in snap if isinstance(x,dict)}!=set(ids):
        fail("Bootstrap snapshot does not match scheduled thread IDs.")
    state=read_json(RETRIEVAL_STATE_PATH)
    state.update({"bootstrap_required":False,"last_snapshot_at":iso_utc(),
        "last_snapshot_source_commit":git("rev-parse","HEAD").stdout.strip(),"retrieval_snapshot":snap,
        "last_retrieval_id":None,"bootstrap_note":result.get("bootstrap_note","Initial canon snapshot.")})
    if dry:
        print("DRY RUN: bootstrap validated; no writes."); return
    ensure_baselines()
    RETRIEVAL_STATE_PATH.write_text(json.dumps(state,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    commit_changes("Tractus: seed retrieval snapshot and canon baselines")

def blind_retrieve(key,model,schedule,state):
    due=pick_next(schedule,limit=1)
    if not due:
        print("TRACTUS ENGINE: no retrieval thread is due."); return None
    due_ids={x["thread_id"] for x in due}
    snapshot_ids={x.get("thread_id") for x in state.get("retrieval_snapshot",[])}
    if not due_ids.issubset(snapshot_ids): fail("Due thread missing from prior retrieval snapshot.")
    prompt="""Blind retrieval phase. Do not inspect or infer from current canon. Use only the prior
retrieval snapshot. Return retrieval_id, thread_id, recalled_threads (exactly three),
characters_and_locations, unresolved, last_change, prediction, confidence (0..1). Preserve uncertainty."""
    result=call_model(key,model,prompt,json.dumps({"due_threads":due,"prior_retrieval_snapshot":state.get("retrieval_snapshot",[])}))
    if result.get("thread_id") not in due_ids: fail("Blind retrieval selected a non-due thread.")
    if not isinstance(result.get("recalled_threads"),list) or len(result["recalled_threads"])!=3:
        fail("Blind retrieval must recall exactly three threads.")
    if not isinstance(result.get("retrieval_id"),str) or not isinstance(result.get("prediction"),str) or not isinstance(result.get("last_change"),str):
        fail("Blind retrieval missing ID, last_change, or prediction.")
    try: confidence=float(result.get("confidence"))
    except (TypeError,ValueError): fail("Blind retrieval confidence must be numeric.")
    if not 0<=confidence<=1: fail("Blind retrieval confidence out of range.")
    result["confidence"]=confidence
    return result

def verify_and_write(key,model,retrieval,schedule,state,dry):
    prompt="""Verify blind retrieval against the supplied canon. Return skip, reason, retrieval_score
(0..1), verified_retrieval_snapshot (exactly three objects), and surprise with expected,
observed, prediction_error, prediction_error_type, severity, update_reason, what_remains,
evidence_event_ids, source_paths. Also return recall_review with accurate, missed, contradicted
arrays. Score below 0.5 cannot update canon. If there is no
specific prediction error, skip=true. Never manufacture surprise. If writing, also return
path, title, chapter. Tie environmental details to character intention and concrete action."""
    result=call_model(key,model,prompt,"Blind retrieval, completed before canon inspection:\n"+
        json.dumps(retrieval,ensure_ascii=False)+"\n\nCurrent canon and provenance:\n"+collect_context())
    try: score=float(result.get("retrieval_score"))
    except (TypeError,ValueError): fail("Verification missing retrieval_score.")
    if not 0<=score<=1: fail("retrieval_score out of range.")
    if score<0.5:
        result["skip"]=True
        result["reason"]="Recall score below 0.5; record observation and repair thread before canon changes."
    snap=result.get("verified_retrieval_snapshot")
    if not isinstance(snap,list) or len(snap)!=3: fail("Verification must return three updated retrieval snapshots.")
    review=result.get("recall_review")
    if not isinstance(review,dict) or any(not isinstance(review.get(k),list) for k in ("accurate","missed","contradicted")):
        fail("Verification must return recall_review with accurate, missed, and contradicted arrays.")
    now=utc_now()
    thread=next(x for x in schedule["threads"] if x["thread_id"]==retrieval["thread_id"])
    updated_thread=advance_thread(thread,now,score,tuple(schedule.get("intervals_days",[1,3,7,14,30])))
    updated_thread["last_retrieval"]={
        "recalled_without_looking":retrieval["recalled_threads"],
        "missed":review["missed"],"accurate":review["accurate"],
        "contradicted":review["contradicted"],"last_change":retrieval["last_change"],
        "score":round(score,3),
    }
    updated_schedule=dict(schedule)
    updated_schedule["threads"]=[updated_thread if x["thread_id"]==retrieval["thread_id"] else x for x in schedule["threads"]]
    updated_state=dict(state)
    updated_state.update({"last_snapshot_at":iso_utc(now),"last_snapshot_source_commit":git("rev-parse","HEAD").stdout.strip(),
        "retrieval_snapshot":snap,"last_retrieval_id":retrieval["retrieval_id"],"bootstrap_required":False})
    if result.get("skip") is True:
        if dry: print("DRY RUN: retrieval only; no canon update."); return
        event_id="tractus-retrieval-"+hashlib.sha256((retrieval["retrieval_id"]+iso_utc(now)).encode()).hexdigest()[:16]
        inscribe_event({"id":event_id,"at":iso_utc(now),"type":"RETRIEVAL_ONLY",
            "title":"Tractus retrieval without canon update","description":result.get("reason","No meaningful prediction error."),
            "thread_id":retrieval["thread_id"],"retrieval_id":retrieval["retrieval_id"],"retrieval_score":score,
            "action":"No canon update; spaced retrieval schedule advanced."},source="scripts/tractus_engine.py")
        SCHEDULE_PATH.write_text(json.dumps(updated_schedule,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        RETRIEVAL_STATE_PATH.write_text(json.dumps(updated_state,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        commit_changes("Tractus: record spaced retrieval without canon change"); return

    path,title,chapter=result.get("path"),result.get("title"),result.get("chapter")
    if path not in ALLOWED_FILES: fail("Writer selected a path outside the allowlist.")
    if not isinstance(title,str) or not 5<=len(title.strip())<=100 or not isinstance(chapter,str):
        fail("Chapter title or body invalid.")
    chapter=chapter.strip(); words=len(chapter.split())
    if len(chapter)>MAX_CHAPTER_CHARS: fail("Chapter exceeds safety limit.")
    if path=="novel/BOOK_I_CONTINUATION_03.md":
        if not 4000<=words<=7000: fail("Novel chapter must contain 4,000–7,000 words.")
    elif not 900<=words<=1500: fail("Lore addition must contain 900–1,500 words.")
    if chapter.startswith("#") or (chr(96)*3) in chapter or "<script" in chapter.casefold() or "<iframe" in chapter.casefold():
        fail("Chapter contains a disallowed heading or embedded-code construct.")
    surprise=result.get("surprise")
    required=("expected","observed","prediction_error","prediction_error_type","severity","update_reason","what_remains")
    if not isinstance(surprise,dict) or any(not isinstance(surprise.get(k),str) or len(surprise[k].strip())<12 for k in required):
        fail("Canon update requires complete, concrete surprise fields.")
    if surprise["prediction_error"].strip().casefold() in {"none","n/a","no surprise","unknown"}:
        fail("No prediction error: canon update rejected.")
    if not isinstance(surprise.get("evidence_event_ids"),list): fail("evidence_event_ids must be a list.")
    sources=surprise.get("source_paths")
    if not isinstance(sources,list) or not sources: fail("Canon update requires source paths.")
    for source in sources:
        if not isinstance(source,str) or not source or ".." in Path(source).parts or not (ROOT/source).is_file():
            fail("Unverified provenance path: "+str(source))

    versions=read_jsonl(CANON_VERSIONS_LOG)
    latest_for_path=next((x for x in reversed(versions) if x.get("entity")==path),None)
    if latest_for_path and latest_for_path.get("content_sha256")!=sha256_text((ROOT/path).read_text(encoding="utf-8")):
        fail("Canon changed outside version ledger; refusing update.")
    if not latest_for_path or latest_for_path.get("status")!="canon":
        if dry:
            print("DRY RUN: prediction error found, but no reviewed canon baseline exists; no write.")
            return
        hold_id="tractus-hold-"+hashlib.sha256((retrieval["retrieval_id"]+iso_utc(now)).encode()).hexdigest()[:16]
        inscribe_event({"id":hold_id,"at":iso_utc(now),"type":"OBSERVATION",
            "title":"Tractus update held for canon review",
            "description":"A prediction error was found, but the destination remains an experiment or has no reviewed canon version.",
            "thread_id":retrieval["thread_id"],"retrieval_id":retrieval["retrieval_id"],
            "action":"Await explicit operator promotion before changing canon."},source="scripts/tractus_engine.py")
        SCHEDULE_PATH.write_text(json.dumps(updated_schedule,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        RETRIEVAL_STATE_PATH.write_text(json.dumps(updated_state,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        commit_changes("Tractus: hold proposed update pending canon review")
        return
    prior=latest_for_path
    existing=(ROOT/path).read_text(encoding="utf-8")
    prior_sha=sha256_text(existing)
    title=title.strip()
    if path=="novel/BOOK_I_CONTINUATION_03.md":
        nums=re.findall(r"^## Chapter ([IVXLCDM]+)\\b",existing,flags=re.MULTILINE)
        title=re.sub(r"^Chapter\\s+[IVXLCDM]+\\s*[:.\\-]?\\s*","",title,flags=re.IGNORECASE)
        title=f"Chapter {int_to_roman(max((roman_to_int(x) for x in nums),default=0)+1)}: {title}"
    heading="## "+title
    if heading.casefold() in existing.casefold(): print("TRACTUS ENGINE: duplicate title; skip."); return
    updated=existing.rstrip()+"\n\n---\n\n"+heading+"\n\n"+chapter+"\n"
    if dry: print("DRY RUN: validated "+title+"; no writes."); return
    result_sha=sha256_text(updated)
    revision_id="tractus-revision-"+hashlib.sha256((path+retrieval["retrieval_id"]+result_sha).encode()).hexdigest()[:20]
    event_id="tractus-event-"+hashlib.sha256(revision_id.encode()).hexdigest()[:16]
    version_id="canon-"+hashlib.sha256((path+retrieval["retrieval_id"]+result_sha).encode()).hexdigest()[:20]
    event={"event_id":event_id,"timestamp":iso_utc(now),"type":"canon_update","prior_version_id":prior["canon_version_id"],
        "prediction":{"expected":surprise["expected"]},
        "observation":{"happened":surprise["observed"],"evidence_event_ids":surprise["evidence_event_ids"]},
        "prediction_error":{"present":True,"type":surprise["prediction_error_type"],"severity":surprise["severity"]},
        "change":{"what_changed":surprise["update_reason"],"what_remains":surprise["what_remains"],"canon_version_id":version_id},
        "provenance":{"author":"tractus_writer","model":model,"human_reviewed":False,"source_paths":sources},
        "title":title,"description":surprise["update_reason"],"canon_path":path,"revision_id":revision_id,
        "retrieval_id":retrieval["retrieval_id"],"action":"Append a versioned canon passage."}
    errors=validate_event(event)
    if errors: fail("Canon event failed validation: "+"; ".join(errors))
    target.write_text(updated,encoding="utf-8")
    inscribed=inscribe(event,source="scripts/tractus_engine.py")
    if inscribed.get("type")!="canon_update": fail("Canon event downgraded; update aborted.")
    history=read_jsonl(REVISION_LOG)
    append_jsonl(REVISION_LOG,{"revision_id":revision_id,"parent_revision_id":parent_revision(history,path),
        "canon_path":path,"prior_version_id":prior["canon_version_id"],"prior_sha256":prior_sha,"result_sha256":result_sha,
        "retrieval_id":retrieval["retrieval_id"],"prediction":surprise["expected"],"observation":surprise["observed"],
        "prediction_error":surprise["prediction_error"],"prediction_error_type":surprise["prediction_error_type"],
        "severity":surprise["severity"],"what_remains":surprise["what_remains"],"evidence_event_ids":surprise["evidence_event_ids"],
        "source_paths":sources,"update_reason":surprise["update_reason"],"source_event_id":event_id,
        "created_at":iso_utc(now),"status":"CANON_REVISION"})
    for version in versions:
        if version.get("canon_version_id")==prior["canon_version_id"]:
            version["status"]="superseded"
            version["superseded_by"]=version_id
    versions.append({"canon_version_id":version_id,"entity":path,"prior_version_id":prior["canon_version_id"],
        "created_by_event_id":event_id,"created_at":iso_utc(now),"claim":surprise["update_reason"],
        "what_remains":surprise["what_remains"],"content_sha256":result_sha,"prior_sha256":prior_sha,
        "baseline":False,"status":"canon","superseded_by":None})
    CANON_VERSIONS_LOG.write_text("".join(json.dumps(x,ensure_ascii=False,separators=(",",":"))+"\\n" for x in versions),encoding="utf-8")
    updated_thread["last_canon_version_id"]=version_id
    updated_thread["last_revision_id"]=revision_id
    updated_thread["last_written_at"]=iso_utc(now)
    updated_schedule["threads"]=[updated_thread if x["thread_id"]==retrieval["thread_id"] else x for x in updated_schedule["threads"]]
    SCHEDULE_PATH.write_text(json.dumps(updated_schedule,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    RETRIEVAL_STATE_PATH.write_text(json.dumps(updated_state,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    commit_changes("Tractus: "+title)

def main():
    dry=os.getenv("TRACTUS_DRY_RUN","false").lower()=="true"
    enabled=os.getenv("TRACTUS_AUTONOMY_ENABLED","false").lower()=="true"
    if not enabled and not dry:
        print("TRACTUS ENGINE: autonomous commits are disabled."); return
    key=os.getenv("OPENAI_API_KEY","").strip(); model=os.getenv("TRACTUS_MODEL","").strip()
    if not key: fail("OPENAI_API_KEY is not configured.")
    if not model: fail("TRACTUS_MODEL is not configured.")
    if git("status","--porcelain").stdout.strip(): fail("Working tree is not clean.")
    schedule=read_json(SCHEDULE_PATH); state=read_json(RETRIEVAL_STATE_PATH)
    if state.get("bootstrap_required") is True:
        bootstrap(key,model,schedule,dry); return
    retrieval=blind_retrieve(key,model,schedule,state)
    if retrieval is not None: verify_and_write(key,model,retrieval,schedule,state,dry)

if __name__ == "__main__":
    main()
