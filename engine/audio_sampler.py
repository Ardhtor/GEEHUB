"""Audio sampler and analysis front-end for GEEHUB.

Requires ffmpeg on PATH. Uses only the Python standard library.
Decodes a source track, measures short-window energy/onset flux, estimates
tempo, exports reusable onset-centred WAV samples, and writes a manifest
accepted by narrative_container.music_program.MusicProgram.

This is signal extraction, not semantic understanding: generated cue labels
are hypotheses that the Sensation/Innervation layer can reinterpret.
"""
from __future__ import annotations

import argparse
import array
import json
import math
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path
from typing import Any


def run(command: list[str]) -> str:
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return result.stdout.strip()


def probe(path: Path) -> dict[str, Any]:
    raw = run([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:format_tags=title,artist", "-of", "json", str(path)
    ])
    data = json.loads(raw)
    return {
        "duration_ms": round(float(data.get("format", {}).get("duration", 0)) * 1000),
        "tags": data.get("format", {}).get("tags", {}),
    }


def decode_mono(path: Path, target_rate: int = 11025) -> tuple[array.array, int]:
    raw = subprocess.run([
        "ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar",
        str(target_rate), "-f", "s16le", "-"
    ], check=True, capture_output=True).stdout
    samples = array.array("h")
    samples.frombytes(raw)
    return samples, target_rate


def analyse(samples: array.array, rate: int, window_ms: int = 100) -> dict[str, Any]:
    width = max(1, rate * window_ms // 1000)
    rms: list[float] = []
    for start in range(0, len(samples), width):
        chunk = samples[start:start + width]
        if not chunk:
            continue
        energy = sum(float(x) * x for x in chunk) / len(chunk)
        rms.append(math.sqrt(energy) / 32768.0)

    flux = [0.0]
    for i in range(1, len(rms)):
        flux.append(max(0.0, rms[i] - rms[i - 1]))

    # Adaptive local peak picking. Keep a minimum separation to avoid
    # exporting multiple samples from one transient.
    onsets: list[int] = []
    min_gap = max(2, 180 // window_ms)
    for i in range(1, len(flux) - 1):
        lo = max(0, i - 12)
        local = flux[lo:i]
        baseline = sum(local) / max(1, len(local))
        threshold = max(0.012, baseline * 2.4)
        if flux[i] >= threshold and flux[i] >= flux[i - 1] and flux[i] > flux[i + 1]:
            if not onsets or i - onsets[-1] >= min_gap:
                onsets.append(i)

    # Tempo estimate from autocorrelation of the positive energy flux.
    # Search 60-180 BPM; output is deliberately labelled an estimate.
    best_lag, best_score = 0, 0.0
    min_lag = max(1, round(60000 / 180 / window_ms))
    max_lag = max(min_lag + 1, round(60000 / 60 / window_ms))
    centered = [v - (sum(flux) / max(1, len(flux))) for v in flux]
    for lag in range(min_lag, min(max_lag + 1, len(centered) // 2)):
        score = sum(centered[i] * centered[i - lag] for i in range(lag, len(centered)))
        if score > best_score:
            best_lag, best_score = lag, score
    bpm = round(60000 / (best_lag * window_ms), 1) if best_lag else None

    return {
        "window_ms": window_ms,
        "rms": rms,
        "flux": flux,
        "onset_ms": [i * window_ms for i in onsets],
        "estimated_bpm": bpm,
        "mean_rms": round(sum(rms) / max(1, len(rms)), 5),
        "peak_rms": round(max(rms, default=0.0), 5),
    }


def export_samples(source: Path, out: Path, onset_ms: list[int],
                   duration_ms: int, limit: int = 24) -> list[dict[str, Any]]:
    sample_dir = out / "samples"
    sample_dir.mkdir(parents=True, exist_ok=True)
    # Spread selections across the full track if there are more than limit.
    if len(onset_ms) > limit:
        indices = [round(i * (len(onset_ms) - 1) / (limit - 1)) for i in range(limit)]
        onset_ms = [onset_ms[i] for i in indices]
    exported = []
    for number, at_ms in enumerate(onset_ms, 1):
        start_ms = max(0, at_ms - 120)
        length_ms = min(2400, max(700, duration_ms - start_ms))
        target = sample_dir / f"sample_{number:03d}.wav"
        subprocess.run([
            "ffmpeg", "-y", "-v", "error", "-ss", f"{start_ms / 1000:.3f}",
            "-i", str(source), "-t", f"{length_ms / 1000:.3f}",
            "-vn", "-ac", "1", "-ar", "22050", "-c:a", "pcm_s16le", str(target)
        ], check=True, capture_output=True)
        exported.append({
            "id": f"sample-{number:03d}",
            "file": str(target.relative_to(out)),
            "trigger_ms": at_ms,
            "start_ms": start_ms,
            "duration_ms": length_ms,
            "kind": "onset_sample",
        })
    return exported


def build_cues(analysis: dict[str, Any], duration_ms: int) -> list[dict[str, Any]]:
    rms = analysis["rms"]
    width = analysis["window_ms"]
    cues: list[dict[str, Any]] = [{
        "at_ms": 0, "kind": "intro", "intensity": 0.15,
        "section": "opening", "target": "scene",
        "instruction": "Establish the current space; let its existing sound remain audible."
    }]
    if not rms:
        return cues

    # Divide the track into broad energy phases; keep onsets as individual
    # executable events. This preserves both long-form shape and transient detail.
    block = max(1, 10000 // width)
    for start in range(block, len(rms), block):
        segment = rms[start:start + block]
        level = sum(segment) / max(1, len(segment))
        intensity = max(0.0, min(1.0, level / max(analysis["peak_rms"], 0.001)))
        cues.append({
            "at_ms": start * width, "kind": "energy_phase",
            "intensity": round(intensity, 3), "section": f"phase-{start // block:02d}",
            "target": "embodiment",
            "instruction": "Modulate movement, spatial scale, and material response to the track's sustained energy."
        })

    for index, at_ms in enumerate(analysis["onset_ms"]):
        if at_ms > duration_ms:
            continue
        window = min(len(rms) - 1, at_ms // width)
        local_level = rms[window]
        intensity = max(0.0, min(1.0, local_level / max(analysis["peak_rms"], 0.001)))
        cues.append({
            "at_ms": at_ms, "kind": "transient",
            "intensity": round(intensity, 3), "section": "rhythmic-events",
            "target": "action",
            "instruction": "Bind this musical attack to a visible action, contact, cut, reveal, or state change; do not add an event without a visual consequence."
        })

    cues.sort(key=lambda cue: cue["at_ms"])
    # MusicProgram requires strictly useful instructions, but permits equal
    # timestamps. De-duplicate exact timestamp/kind pairs for stable IDs.
    unique: dict[tuple[int, str], dict[str, Any]] = {}
    for cue in cues:
        unique[(cue["at_ms"], cue["kind"])] = cue
    return sorted(unique.values(), key=lambda cue: cue["at_ms"])


def sample_track(source: str, output: str, track_id: str | None = None) -> dict[str, Any]:
    source_path = Path(source).expanduser().resolve()
    out = Path(output).expanduser().resolve()
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("ffmpeg and ffprobe must be installed and available on PATH")
    out.mkdir(parents=True, exist_ok=True)
    metadata = probe(source_path)
    samples, rate = decode_mono(source_path)
    analysis = analyse(samples, rate)
    track_id = track_id or source_path.stem.lower().replace(" ", "-")
    extracted = export_samples(source_path, out, analysis["onset_ms"],
                               metadata["duration_ms"])
    manifest = {
        "id": track_id,
        "asset_ref": str(source_path),
        "duration_ms": metadata["duration_ms"],
        "source_name": source_path.name,
        "tags": metadata["tags"],
        "analysis": {
            "estimated_bpm": analysis["estimated_bpm"],
            "mean_rms": analysis["mean_rms"],
            "peak_rms": analysis["peak_rms"],
            "onset_count": len(analysis["onset_ms"]),
            "window_ms": analysis["window_ms"],
        },
        "samples": extracted,
        "cues": build_cues(analysis, metadata["duration_ms"]),
        "provenance": "ffmpeg decode; 100ms RMS/positive-energy-flux analysis; onset-centred excerpts",
    }
    (out / "music_program.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (out / "signal_analysis.json").write_text(
        json.dumps({k: v for k, v in analysis.items() if k not in ("rms", "flux")},
                   indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract GEEHUB music samples and narrative cues")
    parser.add_argument("audio", help="Source audio file")
    parser.add_argument("--out", default="music-analysis", help="Output directory")
    parser.add_argument("--track-id", default=None, help="Stable GEEHUB track identifier")
    args = parser.parse_args()
    result = sample_track(args.audio, args.out, args.track_id)
    print(json.dumps({
        "track_id": result["id"],
        "duration_ms": result["duration_ms"],
        "estimated_bpm": result["analysis"]["estimated_bpm"],
        "onsets": result["analysis"]["onset_count"],
        "samples_exported": len(result["samples"]),
        "cues_written": len(result["cues"]),
        "manifest": str(Path(args.out) / "music_program.json"),
    }, indent=2))


if __name__ == "__main__":
    main()
