#!/usr/bin/env python3
"""GEEHUB source-footage inspection pass.

Uses ffprobe/ffmpeg only. Produces a machine-readable source report and evenly
spaced reference frames for human/model inspection. It does not alter the source.
"""
from __future__ import annotations
import argparse, json, shutil, subprocess
from pathlib import Path
from datetime import datetime, timezone

def run(args):
    p = subprocess.run(args, check=True, capture_output=True, text=True)
    return p.stdout

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    ap.add_argument("--out", type=Path, default=Path("GEEHUB_SOURCE_INSPECTION"))
    ap.add_argument("--frames", type=int, default=12)
    ns = ap.parse_args()
    src = ns.source.expanduser().resolve()
    out = ns.out.expanduser().resolve()
    if not src.is_file():
        raise SystemExit(f"Source file not found: {src}")
    if not shutil.which("ffprobe") or not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg and ffprobe are required. Install FFmpeg and retry.")
    out.mkdir(parents=True, exist_ok=True)
    raw = run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
               "-of", "json", str(src)])
    probe = json.loads(raw)
    video = next((s for s in probe.get("streams", []) if s.get("codec_type") == "video"), None)
    audio = [s for s in probe.get("streams", []) if s.get("codec_type") == "audio"]
    if not video:
        raise SystemExit("No video stream found.")
    duration = float(probe.get("format", {}).get("duration") or video.get("duration") or 0)
    count = max(1, ns.frames)
    frame_dir = out / "reference_frames"
    frame_dir.mkdir(exist_ok=True)
    stamps = [duration * i / max(1, count - 1) for i in range(count)] if duration else [0]
    extracted = []
    for i, sec in enumerate(stamps):
        target = frame_dir / f"frame_{i+1:03d}_{sec:09.3f}s.jpg"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss",
                        f"{sec:.4f}", "-i", str(src), "-frames:v", "1",
                        "-q:v", "2", "-y", str(target)], check=True)
        extracted.append({"index": i+1, "timestamp_seconds": round(sec, 4),
                          "file": str(target.relative_to(out))})
    report = {
        "project": "GEEHUB / source inspection",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "source": {"path": str(src), "filename": src.name,
                   "bytes": src.stat().st_size},
        "video": {
            "codec": video.get("codec_name"),
            "width": video.get("width"), "height": video.get("height"),
            "frame_rate": video.get("avg_frame_rate") or video.get("r_frame_rate"),
            "duration_seconds": duration,
            "frame_count": video.get("nb_frames"),
            "pixel_format": video.get("pix_fmt")
        },
        "audio": [{"codec": s.get("codec_name"), "sample_rate": s.get("sample_rate"),
                   "channels": s.get("channels"), "duration": s.get("duration")}
                  for s in audio],
        "reference_frames": extracted,
        "inspection_status": "technical_metadata_and_reference_frames_generated",
        "visual_analysis_status": "pending_review",
        "identity_and_pose_measurements": "pending_review",
        "warning": "Do not infer character measurements or animation timing from metadata alone."
    }
    (out / "source_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"report": str(out / "source_report.json"),
                      "frames": len(extracted), "duration_seconds": duration}, indent=2))

if __name__ == "__main__":
    main()
