"""GEEHUB's offline-first, provenance-preserving narrative ledger."""
import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Ledger:
    """SQLite-backed exchange ledger. It stores instructions; it never executes them."""
    def __init__(self, path):
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("""CREATE TABLE IF NOT EXISTS artifacts (
          id TEXT PRIMARY KEY, kind TEXT NOT NULL, sender TEXT NOT NULL,
          source TEXT NOT NULL, recipient TEXT NOT NULL, destination TEXT NOT NULL,
          created_at TEXT NOT NULL, version INTEGER NOT NULL, context TEXT NOT NULL,
          payload TEXT NOT NULL, reply_to TEXT, parent_id TEXT,
          status TEXT NOT NULL, interpretation TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL)""")
        self.db.execute("CREATE INDEX IF NOT EXISTS inbox_idx ON artifacts(destination,status,created_at)")
        self.db.commit()

    def close(self):
        self.db.close()

    def add(self, item):
        required = ("id", "kind", "sender", "source", "recipient", "destination", "payload")
        missing = [key for key in required if not str(item.get(key, "")).strip()]
        if missing:
            raise ValueError("Missing: " + ", ".join(missing))
        if item["kind"] not in {"text", "plan", "code", "image_reference", "video_reference",
                                "measurement", "object", "witness_account", "question"}:
            raise ValueError("Unsupported artifact kind")
        status = item.get("status", "sent")
        if status not in {"draft", "sent", "received", "interpreted", "accepted",
                          "adapted", "declined", "superseded"}:
            raise ValueError("Unsupported status")
        payload = item["payload"]
        if not isinstance(payload, str):
            payload = json.dumps(payload, ensure_ascii=False)
        self.db.execute("""INSERT INTO artifacts
          (id,kind,sender,source,recipient,destination,created_at,version,context,
           payload,reply_to,parent_id,status,interpretation,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
          (item["id"], item["kind"], item["sender"], item["source"], item["recipient"],
           item["destination"], item.get("created_at", timestamp()), int(item.get("version", 1)),
           item.get("context", ""), payload, item.get("reply_to"), item.get("parent_id"),
           status, item.get("interpretation", ""), timestamp()))
        self.db.commit()

    def get(self, artifact_id):
        row = self.db.execute("SELECT * FROM artifacts WHERE id=?", (artifact_id,)).fetchone()
        if row is None:
            raise KeyError("Unknown artifact: " + artifact_id)
        return dict(row)

    def list(self, narrative, box="inbox", status=None):
        column = "destination" if box == "inbox" else "source"
        sql, args = "SELECT * FROM artifacts WHERE " + column + "=?", [narrative]
        if status:
            sql += " AND status=?"
            args.append(status)
        sql += " ORDER BY created_at,id"
        return [dict(row) for row in self.db.execute(sql, args)]

    def transition(self, artifact_id, status, note=None):
        current = self.get(artifact_id)
        allowed = {
          "draft": {"sent", "declined"}, "sent": {"received", "declined"},
          "received": {"interpreted", "accepted", "adapted", "declined"},
          "interpreted": {"accepted", "adapted", "declined"},
          "accepted": {"superseded"}, "adapted": {"superseded"},
          "declined": set(), "superseded": set()
        }
        if status not in allowed[current["status"]]:
            raise ValueError("Invalid transition " + current["status"] + " -> " + status)
        self.db.execute("UPDATE artifacts SET status=?,interpretation=COALESCE(?,interpretation),updated_at=? WHERE id=?",
                        (status, note, timestamp(), artifact_id))
        self.db.commit()

    def adapt(self, parent_id, child):
        parent = self.get(parent_id)
        child.update({"parent_id": parent_id, "reply_to": parent_id,
                      "version": parent["version"] + 1, "status": "sent",
                      "kind": parent["kind"]})
        self.add(child)
        self.transition(parent_id, "adapted", "Adapted as " + child["id"])

    def export(self, path):
        rows = [dict(row) for row in self.db.execute("SELECT * FROM artifacts ORDER BY created_at,id")]
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(json.dumps({"format":"geehub-narratives","version":1,
                             "exported_at":timestamp(),"artifacts":rows},
                             ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return len(rows)

    def import_file(self, path):
        bundle = json.loads(Path(path).read_text(encoding="utf-8"))
        if bundle.get("format") != "geehub-narratives" or bundle.get("version") != 1:
            raise ValueError("Unsupported bundle")
        count = 0
        for row in bundle.get("artifacts", []):
            item = dict(row)
            item["kind"] = item.pop("kind")
            try:
                self.add(item)
                count += 1
            except sqlite3.IntegrityError:
                old = self.get(item["id"])
                if old["payload"] != item["payload"] or old["source"] != item["source"]:
                    raise ValueError("Conflicting artifact ID: " + item["id"])
        return count


def main():
    parser = argparse.ArgumentParser(description="GEEHUB narrative ledger")
    parser.add_argument("--db", default="./data/narratives.sqlite")
    commands = parser.add_subparsers(dest="cmd", required=True)
    commands.add_parser("init")
    send = commands.add_parser("send")
    for flag in ("id", "kind", "sender", "source", "recipient", "destination", "payload"):
        send.add_argument("--" + flag, required=True)
    send.add_argument("--context", default="")
    for name in ("inbox", "outbox"):
        cmd = commands.add_parser(name)
        cmd.add_argument("narrative")
        cmd.add_argument("--status")
    for name in ("receive", "accept", "decline"):
        cmd = commands.add_parser(name)
        cmd.add_argument("id")
    interpret = commands.add_parser("interpret")
    interpret.add_argument("id")
    interpret.add_argument("note")
    export = commands.add_parser("export")
    export.add_argument("path")
    imp = commands.add_parser("import")
    imp.add_argument("path")
    args = parser.parse_args()
    ledger = Ledger(args.db)
    try:
        if args.cmd == "init":
            print(json.dumps({"ok":True,"database":args.db}))
        elif args.cmd == "send":
            ledger.add(vars(args) | {"cmd":None})
            print(json.dumps(ledger.get(args.id), indent=2))
        elif args.cmd in ("inbox", "outbox"):
            print(json.dumps(ledger.list(args.narrative, args.cmd, args.status), indent=2))
        elif args.cmd in ("receive", "accept", "decline", "interpret"):
            status = {"receive":"received","accept":"accepted","decline":"declined","interpret":"interpreted"}[args.cmd]
            ledger.transition(args.id, status, getattr(args, "note", None))
            print(json.dumps(ledger.get(args.id), indent=2))
        elif args.cmd == "export":
            print(json.dumps({"exported":ledger.export(args.path),"path":args.path}))
        elif args.cmd == "import":
            print(json.dumps({"imported":ledger.import_file(args.path),"path":args.path}))
    finally:
        ledger.close()


if __name__ == "__main__":
    main()
