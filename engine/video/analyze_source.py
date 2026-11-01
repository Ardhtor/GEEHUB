#!/usr/bin/env python3
"""Frame-level source-video analysis for GEEHUB. Requires ffmpeg + ffprobe; no Python packages."""
from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path


def executable(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"{name} was not found on PATH")
    return path


def probe(source: Path) -> dict:
    result = subprocess.run(
        [executable("ffprobe"), "-v", "error", "-show_streams", "-show_format",
         "-of", "json", str(source)],
        check=True, capture_output=True, text=True,
    )
    data = json.loads(result.stdout)
    video = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    if not video:
        raise RuntimeError("The source has no video stream")
    return {
        "width": int(video["width"]), "height": int(video["height"]),
        "fps": video.get("avg_frame_rate", "0/1"),
        "duration": float(data.get("format", {}).get("duration", 0) or video.get("duration", 0) or 0),
        "codec": video.get("codec_name", "unknown"),
    }


def luma(rgb: bytes, width: int, height: int) -> list[int]:
    # A compact 1/4-resolution luma plane keeps analysis inexpensive.
    out = []
    stride = width * 3
    for y in range(0, height, 2):
        row = y * stride
        for x in range(0, width, 2):
            i = row + x * 3
            out.append((77 * rgb[i] + 150 * rgb[i + 1] + 29 * rgb[i + 2]) >> 8)
    return out


def frame_stream(source: Path, width: int, fps: float):
    height = max(2, int(round(width * probe(source)["height"] / probe(source)["width"] / 2) * 2))
    frame_bytes = width * height * 3
    command = [executable("ffmpeg"), "-v", "error", "-i", str(source), "-vf",
               f"fps={fps},scale={width}:{height}:flags=area", "-f", "rawvideo",
               "-pix_fmt", "rgb24", "pipe:1"]
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    index = 0
    try:
        while True:
            raw = process.stdout.read(frame_bytes)
            if len(raw) != frame_bytes:
                break
            yield index, luma(raw, width, height), width // 2, height // 2
            index += 1
    finally:
        process.stdout.close()
        stderr = process.stderr.read().decode("utf-8", "replace")
        code = process.wait()
        if code:
            raise RuntimeError("ffmpeg decode failed: " + stderr[-2000:])


def analyze(source: Path, sample_fps: float, sample_width: int, cut_threshold: float) -> dict:
    meta = probe(source)
    scaled_height = max(2, int(round(sample_width * meta["height"] / meta["width"] / 2) * 2))
    previous = None
    samples = []
    differences = []
    cuts = []
    frame_count = 0
    grid_w, grid_h = sample_width // 2, scaled_height // 2

    for index, current, _, _ in frame_stream(source, sample_width, sample_fps):
        timestamp = index / sample_fps
        frame_count += 1
        if previous is None:
            samples.append({"frame": index, "time": round(timestamp, 3), "change": 0.0,
                            "active_pixels": 0.0, "motion_x": 0.0, "motion_y": 0.0,
                            "classification": "opening"})
            previous = current
            continue
        delta = [abs(a - b) for a, b in zip(current, previous)]
        mean_change = sum(delta) / max(1, len(delta))
        active = sum(1 for value in delta if value >= 18) / max(1, len(delta))
        # Weighted centroid of changed pixels is a coarse directional-motion cue.
        weights = [max(0, value - 10) for value in delta]
        total = sum(weights)
        if total:
            cx = sum((i % grid_w) * weights[i] for i in range(len(weights))) / total
            cy = sum((i // grid_w) * weights[i] for i in range(len(weights))) / total
            motion_x = round((cx / max(1, grid_w - 1) - 0.5) * 2, 4)
            motion_y = round((cy / max(1, grid_h - 1) - 0.5) * 2, 4)
        else:
            motion_x = motion_y = 0.0
        classification = "cut" if mean_change >= cut_threshold else (
            "active" if mean_change >= 12 else "slow" if mean_change >= 3 else "held"
        )
        record = {"frame": index, "time": round(timestamp, 3),
                  "change": round(mean_change, 3), "active_pixels": round(active, 4),
                  "motion_x": motion_x, "motion_y": motion_y,
                  "classification": classification}
        samples.append(record)
        differences.append(mean_change)
        if classification == "cut":
            cuts.append({"time": round(timestamp, 3), "change": round(mean_change, 3)})
        previous = current

    if not frame_count:
        raise RuntimeError("No frames could be decoded")
    intervals = []
    start = 0
    current_kind = samples[0]["classification"]
    for item in samples[1:]:
        kind = item["classification"]
        if kind != current_kind:
            intervals.append({"start": samples[start]["time"], "end": item["time"], "kind": current_kind})
            start = item["frame"]
            current_kind = kind
    intervals.append({"start": samples[start]["time"], "end": round(frame_count / sample_fps, 3), "kind": current_kind})
    return {
        "schema": "geehub.source-analysis.v1",
        "source": str(source),
        "media": meta,
        "analysis": {"sample_fps": sample_fps, "sample_width": sample_width,
                     "sample_height": scaled_height, "frames_sampled": frame_count,
                     "mean_frame_change": round(sum(differences) / max(1, len(differences)), 3),
                     "cut_count": len(cuts)},
        "cuts": cuts,
        "motion_intervals": intervals,
        "samples": samples,
        "limitations": [
            "Motion vectors are coarse image-change centroids, not tracked camera or body trajectories.",
            "Cut detection is threshold-based; fades and fast motion may be misclassified.",
            "This pass measures temporal structure and does not identify people or infer identity."
        ]
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--fps", type=float, default=2.0)
    parser.add_argument("--width", type=int, default=320)
    parser.add_argument("--cut-threshold", type=float, default=34.0)
    args = parser.parse_args()
    if not args.source.is_file():
        parser.error(f"source file does not exist: {args.source}")
    if not 0.25 <= args.fps <= 12 or not 64 <= args.width <= 1280:
        parser.error("fps must be 0.25–12 and width 64–1280")
    try:
        result = analyze(args.source, args.fps, args.width, args.cut_threshold)
    except Exception as exc:
        print(f"GEEHUB analysis failed: {exc}", file=sys.stderr)
        return 2
    rendered = json.dumps(result, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
        print(f"Analysis saved: {args.output}")
    else:
        print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
