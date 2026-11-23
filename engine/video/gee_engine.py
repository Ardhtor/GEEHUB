#!/usr/bin/env python3
"""GEEHUB local video production runner: Blender + FFmpeg, standard library only."""
from __future__ import annotations

import argparse
import ipaddress
import json
import math
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
STUDIO_ROOT = (REPO_ROOT / "hub").resolve()
BLENDER_SCRIPT = HERE / "blender_scene.py"
OUTPUT_ROOT = Path.home() / "Movies" / "GEEHUB"
JOBS: dict[str, dict] = {}
LOCK = threading.Lock()
MAX_ACTIVE_JOBS = 1
MAX_JOB_HISTORY = 50
ALLOWED_DEFAULT_ORIGINS = {"http://127.0.0.1:8765", "http://localhost:8765"}


def allowed_origins() -> set[str]:
    """Exact browser origins permitted to control this loopback-only engine."""
    configured = os.environ.get("GEEHUB_ALLOWED_ORIGINS")
    if configured is None:
        return set(ALLOWED_DEFAULT_ORIGINS)
    return {origin.strip() for origin in configured.split(",") if origin.strip()}


def origin_is_allowed(origin: str | None) -> bool:
    # Non-browser local clients (CLI/tests) have no Origin header.
    return origin is None or origin in allowed_origins()


def host_is_loopback(host: str | None) -> bool:
    """Reject DNS-rebinding Host headers; only the local listener is valid."""
    if not host:
        return False
    value = host.strip().lower()
    if value == "localhost:8765":
        return True
    if value.startswith("[") and value.endswith("]:8765"):
        value = value[1:-6]
    elif value.endswith(":8765"):
        value = value[:-6]
    else:
        return False
    try:
        return ipaddress.ip_address(value).is_loopback
    except ValueError:
        return False


def studio_file_for_path(request_path: str) -> Path | None:
    """Resolve a safe static asset inside the standalone Studio directory."""
    relative = "gee-studio.html" if request_path in {"", "/", "/studio"} else unquote(request_path).lstrip("/")
    candidate = (STUDIO_ROOT / relative).resolve()
    if not candidate.is_relative_to(STUDIO_ROOT) or not candidate.is_file():
        return None
    if candidate.suffix.lower() not in {".html", ".css", ".js", ".json", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff2"}:
        return None
    return candidate


def valid_render_manifest(manifest: object) -> tuple[bool, str | None]:
    if not isinstance(manifest, dict):
        return False, "Production manifest must be a JSON object"
    fmt = manifest.get("format")
    if not isinstance(fmt, dict):
        return False, "Production manifest format must be an object"
    duration = fmt.get("duration_seconds", 45)
    if isinstance(duration, bool) or not isinstance(duration, (int, float)):
        return False, "Duration must be a finite number"
    if isinstance(duration, float) and not math.isfinite(duration):
        return False, "Duration must be a finite number"
    if not 10 <= duration <= 600:
        return False, "Duration must be between 10 and 600 seconds"
    project = manifest.get("project", "GEEHUB Video")
    if not isinstance(project, str) or not project.strip():
        return False, "Project name must be a non-empty string"
    audio_file = manifest.get("audio_file")
    if audio_file is not None and not isinstance(audio_file, str):
        return False, "audio_file must be a relative path string"
    return True, None


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


def process_timeout(env_name: str, default: int) -> int:
    try:
        configured = int(os.environ.get(env_name, default))
    except (TypeError, ValueError):
        return default
    return min(max(configured, 10), 7200)


def tool_version(binary: str | None, args: list[str]) -> str | None:
    if not binary:
        return None
    try:
        result = subprocess.run([binary, *args], capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.TimeoutExpired):
        return None
    output = (result.stdout or result.stderr).strip()
    return output.splitlines()[0] if output else None


def blender_capabilities(blender: str | None) -> dict:
    if not blender:
        return {"version": None, "opentimelineio": False, "gaussian_splat_import": False}
    version_text = tool_version(blender, ["--version"]) or ""
    match = re.search(r"Blender\s+(\d+)\.(\d+)(?:\.(\d+))?", version_text)
    version = tuple(int(part or 0) for part in match.groups()) if match else None
    otio_available = False
    ply_import_available = False
    if version and version >= (5, 3, 0):
        probe = (
            "import bpy; "
            "print('GEEHUB_PLY_IMPORT:' + str(hasattr(bpy.ops.wm, 'ply_import'))); "
            "import opentimelineio; "
            "print('GEEHUB_OTIO_OK:' + bpy.app.version_string)"
        )
        try:
            result = subprocess.run(
                [blender, "--background", "--python-expr", probe],
                capture_output=True, text=True, timeout=45,
            )
            probe_output = result.stdout + result.stderr
            otio_available = result.returncode == 0 and "GEEHUB_OTIO_OK:" in probe_output
            ply_import_available = result.returncode == 0 and "GEEHUB_PLY_IMPORT:True" in probe_output
        except (OSError, subprocess.TimeoutExpired):
            otio_available = False
            ply_import_available = False
    return {
        "version": version_text or None,
        "opentimelineio": otio_available,
        "gaussian_splat_import": ply_import_available,
    }


def doctor() -> int:
    blender, ffmpeg = binaries()
    capabilities = blender_capabilities(blender)
    ffprobe = shutil.which("ffprobe")
    report = {
        "python": sys.version.split()[0],
        "blender": blender or "NOT FOUND",
        "blender_version": capabilities["version"],
        "ffmpeg": ffmpeg or "NOT FOUND",
        "ffmpeg_version": tool_version(ffmpeg, ["-version"]) if ffmpeg else None,
        "ffprobe": ffprobe or "NOT FOUND",
        "capabilities": {
            "opentimelineio_in_blender": capabilities["opentimelineio"],
            "native_gaussian_splat_baseline": capabilities["gaussian_splat_import"],
        },
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
    blender_timeout = process_timeout("GEEHUB_BLENDER_TIMEOUT", 1800)
    with log_path.open("w", encoding="utf-8") as log:
        try:
            process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, text=True, timeout=blender_timeout)
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(f"Blender render exceeded its {blender_timeout}-second timeout. See blender.log in the output folder.") from exc
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
            "-movflags", "+faststart", "-t", str(duration), str(final_video),
        ]
    else:
        ffmpeg_cmd = [
            ffmpeg, "-y", "-i", str(silent_video), "-f", "lavfi", "-i", tone,
            "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", "-shortest", str(final_video),
        ]
    ffmpeg_timeout = process_timeout("GEEHUB_FFMPEG_TIMEOUT", 600)
    try:
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=ffmpeg_timeout)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"FFmpeg delivery exceeded its {ffmpeg_timeout}-second timeout.") from exc
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
        active = sum(job.get("state") in {"queued", "running"} for job in JOBS.values())
        if active >= MAX_ACTIVE_JOBS:
            raise RuntimeError("A render is already queued or running. Wait for it to finish before starting another.")
        while len(JOBS) >= MAX_JOB_HISTORY:
            stale = next((key for key, job in JOBS.items() if job.get("state") not in {"queued", "running"}), None)
            if stale is None:
                raise RuntimeError("Render history is full; wait for an active job to finish.")
            del JOBS[stale]
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

    def _set_cors(self) -> None:
        origin = self.headers.get("Origin")
        if origin is not None:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def _request_is_local(self) -> bool:
        return host_is_loopback(self.headers.get("Host")) and origin_is_allowed(self.headers.get("Origin"))

    def _reject_nonlocal(self) -> bool:
        if self._request_is_local():
            return False
        self._json(403, {"error": "The GEEHUB engine accepts requests only from an approved local Studio origin."})
        return True

    def _json(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if origin_is_allowed(self.headers.get("Origin")):
            self._set_cors()
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if self._reject_nonlocal():
            return
        self.send_response(204)
        self._set_cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Vary", "Access-Control-Request-Headers")
        self.end_headers()

    def _serve_studio_file(self, request_path: str) -> bool:
        path = studio_file_for_path(request_path)
        if path is None:
            return False
        body = path.read_bytes()
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)
        return True

    def do_GET(self):
        if self._reject_nonlocal():
            return
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            blender, ffmpeg = binaries()
            capabilities = blender_capabilities(blender)
            self._json(200, {
                "ok": True, "ready": bool(blender and ffmpeg),
                "blender": bool(blender), "blender_version": capabilities["version"],
                "ffmpeg": bool(ffmpeg), "ffprobe": bool(shutil.which("ffprobe")),
                "capabilities": {
                    "opentimelineio_in_blender": capabilities["opentimelineio"],
                    "native_gaussian_splat_baseline": capabilities["gaussian_splat_import"],
                },
            })
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
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(path.stat().st_size))
            self.send_header("Content-Disposition", 'attachment; filename="GEEHUB-master.mp4"')
            self.send_header("Cache-Control", "no-store")
            self._set_cors()
            self.end_headers()
            with path.open("rb") as video:
                while True:
                    chunk = video.read(1024 * 1024)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
            return
        if self._serve_studio_file(parsed.path):
            return
        self._json(404, {"error": "Not found"})

    def do_POST(self):
        if self._reject_nonlocal():
            return
        if urlparse(self.path).path != "/render":
            self._json(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._json(400, {"error": "Content-Length must be an integer"})
            return
        if length <= 0 or length > 1_000_000:
            self._json(413, {"error": "Production manifest must be between 1 byte and 1 MB"})
            return
        try:
            raw = self.rfile.read(length)
            if len(raw) != length:
                raise ValueError("Request body ended before Content-Length bytes were received")
            manifest = json.loads(raw)
            valid, error = valid_render_manifest(manifest)
            if not valid:
                raise ValueError(error or "Invalid production manifest")
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
            self._json(400, {"error": str(exc)})
            return
        try:
            job_id = launch_job(manifest)
        except RuntimeError as exc:
            self._json(429, {"error": str(exc)})
            return
        self._json(202, {"job_id": job_id, "state": "queued"})

    def log_message(self, fmt, *args):
        print("[GEEHUB]", fmt % args)


def serve() -> None:
    blender, ffmpeg = binaries()
    print("GEEHUB local engine")
    print("Blender:", blender or "NOT FOUND")
    print("FFmpeg:", ffmpeg or "NOT FOUND")
    print("Capabilities:", json.dumps(blender_capabilities(blender), sort_keys=True))
    print("Studio: http://127.0.0.1:8765/")
    print("Local API: http://127.0.0.1:8765/health")
    print("Press Ctrl+C to stop.")
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()


def export_otio(timeline: Path, output: Path, media: Path | None = None) -> int:
    blender, _ = binaries()
    if not blender:
        print("BLENDER NOT FOUND. Install Blender 5.3+ or set GEEHUB_BLENDER.", file=sys.stderr)
        return 2
    if not timeline.expanduser().is_file():
        print(f"TIMELINE NOT FOUND: {timeline}", file=sys.stderr)
        return 2
    command = [
        blender, "--background", "--python", str(HERE / "otio_export.py"), "--",
        "--timeline", str(timeline.expanduser().resolve()),
        "--output", str(output.expanduser().resolve()),
    ]
    if media:
        command.extend(["--media", str(media.expanduser().resolve())])
    return subprocess.run(command, check=False).returncode


def import_gaussian_splat(source: Path, output: Path, name: str) -> int:
    blender, _ = binaries()
    if not blender:
        print("BLENDER NOT FOUND. Install Blender 5.3+ or set GEEHUB_BLENDER.", file=sys.stderr)
        return 2
    if source.suffix.lower() != ".ply" or not source.expanduser().is_file():
        print("SOURCE ERROR: provide an existing Gaussian-splat .ply file.", file=sys.stderr)
        return 2
    command = [
        blender, "--background", "--python", str(HERE / "import_gaussian_splat.py"), "--",
        "--source", str(source.expanduser().resolve()),
        "--output", str(output.expanduser().resolve()),
        "--name", name,
    ]
    return subprocess.run(command, check=False).returncode


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GEEHUB local video engine")
    parser.add_argument("command", choices=["doctor", "serve", "export-otio", "import-splat"])
    parser.add_argument("--timeline", type=Path, help="GEEHUB timeline.json for OTIO export")
    parser.add_argument("--output", type=Path, help="Output .otio path")
    parser.add_argument("--media", type=Path, help="Optional source media for OTIO export")
    parser.add_argument("--source", type=Path, help="Gaussian-splat PLY source for import-splat")
    parser.add_argument("--name", default="GEEHUB / Gaussian Splat Capture", help="Imported capture collection name")
    args = parser.parse_args()
    if args.command == "doctor":
        code = doctor()
    elif args.command == "serve":
        code = serve() or 0
    elif args.command == "export-otio":
        if not args.timeline or not args.output:
            parser.error("export-otio requires --timeline and --output")
        code = export_otio(args.timeline, args.output, args.media)
    else:
        if not args.source or not args.output:
            parser.error("import-splat requires --source and --output")
        code = import_gaussian_splat(args.source, args.output, args.name)
    sys.exit(code)
