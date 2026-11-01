#!/usr/bin/env python3
"""GEEHUB local video production runner: Blender + FFmpeg, standard library only."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HERE = Path(__file__).resolve().parent
BLENDER_SCRIPT = HERE / "blender_scene.py"
OUTPUT_ROOT = Path.home() / "Movies" / "GEEHUB"
JOBS: dict[str, dict] = {}
LOCK = threading.Lock()


def locate_binary(env_name: str, candidates: list[str]) -> str | None:
    configured = os.environ.get(env_name)
    if configured and Path(configured).exists():
        return configured
    found = shutil.which("blender" if env_name == "GEEHUB_BLENDER" else "ffmpeg")
    if found:
        return found
    for candidate in candidates:
        if Path(candidate).exists():
            return candidate
    return None


def binaries() -> tuple[str | None, str | None]:
    blender = locate_binary("GEEHUB_BLENDER", [
        "/Applications/Blender.app/Contents/MacOS/Blender",
        "/opt/homebrew/bin/blender",
        "/usr/local/bin/blender",
    ])
    ffmpeg = locate_binary("GEEHUB_FFMPEG", [
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
    ])
    return blender, ffmpeg


def doctor() -> int:
    blender, ffmpeg = binaries()
    report = {
        "python": sys.version.split()[0],
        "blender": blender or "NOT FOUND",
        "ffmpeg": ffmpeg or "NOT FOUND",
        "ready": bool(blender and ffmpeg),
        "output": str(OUTPUT_ROOT),
    }
    print(json.dumps(report, indent=2))
    return 0 if report["ready"] else 2


def safe_slug(value: str) -> str:
    slug = "".join(c.lower() if c.isalnum() else "-" for c in value)
    return "-".join(part for part in slug.split("-") if part)[:48] or "gee-video"


def render_job(job_id: str, manifest: dict) -> None:
    blender, ffmpeg = binaries()
    if not blender or not ffmpeg:
        raise RuntimeError("Install Blender and FFmpeg, then run: python3 gee_engine.py doctor")
    duration = max(10, min(600, int(manifest.get("format", {}).get("duration_seconds", 45))))
    project = safe_slug(manifest.get("project", "GEEHUB Video"))
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = OUTPUT_ROOT / f"{project}-{stamp}-{job_id[:6]}"
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "production.json"
    silent_video = out_dir / "picture-only.mp4"
    final_video = out_dir / "GEEHUB-master.mp4"
    log_path = out_dir / "blender.log"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    with LOCK:
        JOBS[job_id].update(state="running", progress=3, message="Building the 3D scene", output_dir=str(out_dir))

    command = [
        blender, "--background", "--python", str(BLENDER_SCRIPT), "--",
        "--manifest", str(manifest_path), "--output", str(silent_video),
    ]
    with log_path.open("w", encoding="utf-8") as log:
        process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, text=True)
    if process.returncode != 0 or not silent_video.exists():
        tail = log_path.read_text(encoding="utf-8", errors="replace")[-5000:]
        raise RuntimeError("Blender render failed. See blender.log in the output folder.\n" + tail)

    with LOCK:
        JOBS[job_id].update(progress=82, message="Encoding and finishing the master")

    audio_file = manifest.get("audio_file")
    audio_path = None
    if audio_file:
        # Only read user-supplied score files from the explicit engine asset drop folder.
        relative = Path(str(audio_file))
        source = (HERE / relative).resolve()
        allowed_assets = (HERE / "assets").resolve()
        if source.is_relative_to(allowed_assets) and source.is_file():
            target_assets = out_dir / "assets"
            target_assets.mkdir(exist_ok=True)
            copied = target_assets / source.name
            shutil.copy2(source, copied)
            audio_path = copied

    tone = f"sine=frequency=38:sample_rate=48000:duration={duration}"
    if audio_path:
        ffmpeg_cmd = [
            ffmpeg, "-y", "-i", str(silent_video), "-i", str(audio_path),
            "-f", "lavfi", "-i", tone,
            "-filter_complex", f"[1:a]volume=0.72,apad=pad_dur={duration},atrim=duration={duration}[music];[2:a]volume=0.075[bed];[music][bed]amix=inputs=2:duration=longest,atrim=duration={duration}[a]",
            "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-t", str(duration), str(final_video),
        ]
    else:
        ffmpeg_cmd = [
            ffmpeg, "-y", "-i", str(silent_video), "-f", "lavfi", "-i", tone,
            "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
            "-shortest", str(final_video),
        ]
    result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
    if result.returncode != 0 or not final_video.exists():
        raise RuntimeError("FFmpeg delivery failed: " + result.stderr[-3000:])

    report = {
        "project": manifest.get("project", "GEEHUB Video"),
        "duration_seconds": duration,
        "frame_rate": 24,
        "video": str(final_video),
        "size_bytes": final_video.stat().st_size,
        "renderer": "Blender",
        "delivery": "FFmpeg",
        "soundtrack": "supplied soundtrack + low-frequency bed" if audio_path else "generated low-frequency bed",
        "created": datetime.now().isoformat(timespec="seconds"),
    }
    (out_dir / "render-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    with LOCK:
        JOBS[job_id].update(
            state="complete", progress=100, message="Master video rendered",
            output=str(final_video), report=report,
        )


def launch_job(manifest: dict) -> str:
    job_id = uuid.uuid4().hex
    with LOCK:
        JOBS[job_id] = {"state": "queued", "progress": 0, "message": "Queued for local render"}
    def work():
        try:
            render_job(job_id, manifest)
        except Exception as exc:
            with LOCK:
                JOBS[job_id].update(state="failed", message=str(exc), progress=0)
    threading.Thread(target=work, daemon=True).start()
    return job_id


class Handler(BaseHTTPRequestHandler):
    server_version = "GEEHUBEngine/0.1"

    def _json(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            blender, ffmpeg = binaries()
            self._json(200, {"ok": True, "ready": bool(blender and ffmpeg), "blender": bool(blender), "ffmpeg": bool(ffmpeg)})
            return
        if parsed.path == "/status":
            job_id = parse_qs(parsed.query).get("id", [""])[0]
            with LOCK:
                job = JOBS.get(job_id)
            if not job:
                self._json(404, {"error": "Unknown job"})
                return
            self._json(200, job)
            return
        if parsed.path == "/download":
            job_id = parse_qs(parsed.query).get("id", [""])[0]
            with LOCK:
                job = JOBS.get(job_id)
            path = Path(job.get("output", "")) if job and job.get("state") == "complete" else None
            if not path or not path.is_file():
                self._json(404, {"error": "Rendered video is not ready"})
                return
            data = path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Content-Disposition", 'attachment; filename="GEEHUB-master.mp4"')
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
            return
        self._json(404, {"error": "Not found"})

    def do_POST(self):
        if urlparse(self.path).path != "/render":
            self._json(404, {"error": "Not found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 1_000_000:
            self._json(413, {"error": "Production manifest must be under 1 MB"})
            return
        try:
            manifest = json.loads(self.rfile.read(length))
            if not isinstance(manifest, dict):
                raise ValueError("Manifest must be a JSON object")
            duration = int(manifest.get("format", {}).get("duration_seconds", 45))
            if not 10 <= duration <= 600:
                raise ValueError("Duration must be between 10 and 600 seconds")
        except Exception as exc:
            self._json(400, {"error": str(exc)})
            return
        job_id = launch_job(manifest)
        self._json(202, {"job_id": job_id, "state": "queued"})

    def log_message(self, fmt, *args):
        print("[GEEHUB]", fmt % args)


def serve() -> None:
    blender, ffmpeg = binaries()
    print("GEEHUB local engine")
    print("Blender:", blender or "NOT FOUND")
    print("FFmpeg:", ffmpeg or "NOT FOUND")
    print("Studio bridge: http://127.0.0.1:8765")
    print("Press Ctrl+C to stop.")
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GEEHUB local video engine")
    parser.add_argument("command", choices=["doctor", "serve"])
    args = parser.parse_args()
    sys.exit(doctor() if args.command == "doctor" else (serve() or 0))
