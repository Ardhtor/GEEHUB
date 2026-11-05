"""Vocal Frequency Atlas for measured nonverbal vocalisation features.

Requires FFmpeg and NumPy. Labels are curator-supplied; pitch does not identify
sex, age, identity, or vocal intent. Mixed music should be separated first.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
from pathlib import Path
from typing import Any

import numpy as np


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024*1024), b""):
            digest.update(block)
    return digest.hexdigest()


def decode(path: Path, rate: int = 16000) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(rate),
         "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)


def rms(frame: np.ndarray) -> float:
    return float(np.sqrt(np.mean(frame * frame) + 1e-15))


def pitch_autocorrelation(
    frame: np.ndarray, rate: int, floor_hz: float = 55.0, ceiling_hz: float = 500.0
) -> tuple[float | None, float]:
    frame = (frame - np.mean(frame)) * np.hanning(len(frame))
    corr = np.correlate(frame, frame, mode="full")[len(frame)-1:]
    lo = max(1, int(rate / ceiling_hz))
    hi = min(len(corr)-1, int(rate / floor_hz))
    if hi <= lo or corr[0] < 1e-10:
        return None, 0.0
    lag = lo + int(np.argmax(corr[lo:hi+1]))
    periodicity = float(corr[lag] / max(corr[0], 1e-12))
    if periodicity < 0.22:
        return None, periodicity
    offset = 0.0
    if 1 <= lag < len(corr)-1:
        a, b, c = corr[lag-1], corr[lag], corr[lag+1]
        denom = a - 2*b + c
        if abs(denom) > 1e-12:
            offset = 0.5 * (a-c) / denom
    return rate / (lag + offset), periodicity


def lpc_formants(frame: np.ndarray, rate: int, order: int = 16) -> list[float]:
    """Approximate LPC resonances; these are candidates, not phonetic labels."""
    x = frame - np.mean(frame)
    if len(x) <= order + 2 or rms(x) < 1e-5:
        return []
    x = np.append(x[0], x[1:] - 0.97*x[:-1]) * np.hamming(len(x))
    ac = np.array([np.dot(x[:len(x)-k], x[k:]) for k in range(order+1)])
    if ac[0] <= 1e-12:
        return []
    coeff = np.zeros(order+1)
    coeff[0] = 1.0
    error = ac[0]
    for i in range(1, order+1):
        reflection = -(ac[i] + np.dot(coeff[1:i], ac[i-1:0:-1])) / max(error, 1e-12)
        previous = coeff.copy()
        coeff[i] = reflection
        for j in range(1, i):
            coeff[j] = previous[j] + reflection*previous[i-j]
        error *= max(1e-6, 1.0-reflection*reflection)
    candidates = []
    for root in np.roots(coeff):
        if np.imag(root) <= 0:
            continue
        frequency = math.atan2(float(np.imag(root)), float(np.real(root))) * rate/(2*math.pi)
        bandwidth = -0.5*rate/(2*math.pi)*math.log(max(abs(root), 1e-8))
        if 90 <= frequency <= 5000 and bandwidth < 700:
            candidates.append(round(frequency))
    return sorted(set(candidates))[:5]


def frame_features(frame: np.ndarray, rate: int) -> dict[str, Any]:
    level = rms(frame)
    f0, periodicity = pitch_autocorrelation(frame, rate)
    spectrum = np.abs(np.fft.rfft(frame*np.hanning(len(frame)))) + 1e-12
    freqs = np.fft.rfftfreq(len(frame), 1/rate)
    centroid = float(np.sum(freqs*spectrum)/np.sum(spectrum))
    flatness = float(np.exp(np.mean(np.log(spectrum)))/np.mean(spectrum))
    zcr = float(np.mean(np.signbit(frame[1:]) != np.signbit(frame[:-1])))
    harmonics = []
    subharmonic_ratio = None
    h1_h2_db = None
    if f0:
        for n in range(1, 9):
            target = f0*n
            if target >= rate/2:
                break
            band = np.abs(freqs-target) <= max(15, target*0.025)
            harmonics.append(float(np.max(spectrum[band])) if np.any(band) else 0.0)
        if len(harmonics) >= 2 and min(harmonics[:2]) > 0:
            h1_h2_db = round(20*math.log10(harmonics[0]/harmonics[1]), 2)
        sub_band = np.abs(freqs-f0/2) <= max(12, f0*0.02)
        f0_band = np.abs(freqs-f0) <= max(12, f0*0.02)
        sub_energy = float(np.max(spectrum[sub_band])) if np.any(sub_band) else 0.0
        f0_energy = float(np.max(spectrum[f0_band])) if np.any(f0_band) else 0.0
        subharmonic_ratio = round(sub_energy/max(f0_energy, 1e-12), 4)
    return {
        "rms": round(level, 6),
        "f0_hz": round(float(f0), 2) if f0 else None,
        "periodicity": round(periodicity, 4),
        "roughness_proxy": round(1.0-periodicity, 4),
        "harmonic_peaks": [round(v, 6) for v in harmonics],
        "h1_h2_db": h1_h2_db,
        "subharmonic_ratio": subharmonic_ratio,
        "spectral_centroid_hz": round(centroid, 1),
        "spectral_flatness": round(flatness, 4),
        "zero_crossing_rate": round(zcr, 4),
        "formant_candidates_hz": lpc_formants(frame, rate) if f0 else [],
        "voiced": f0 is not None,
    }


def analyse(samples: np.ndarray, rate: int = 16000,
            frame_ms: int = 40, hop_ms: int = 20) -> list[dict[str, Any]]:
    frame_n = max(128, rate*frame_ms//1000)
    hop_n = max(1, rate*hop_ms//1000)
    rows = []
    for start in range(0, max(1, len(samples)-frame_n+1), hop_n):
        frame = samples[start:start+frame_n]
        if len(frame) < frame_n:
            break
        row = frame_features(frame, rate)
        row["at_ms"] = round(start*1000/rate)
        rows.append(row)
    return rows


def voiced_regions(rows: list[dict[str, Any]], min_ms: int = 180) -> list[dict[str, int]]:
    active = [r for r in rows if r["voiced"] and r["periodicity"] >= 0.25]
    if not active:
        return []
    regions = []
    start = previous = active[0]["at_ms"]
    for row in active[1:]:
        at = row["at_ms"]
        if at-previous > 60:
            if previous-start+20 >= min_ms:
                regions.append({"start_ms": start, "end_ms": previous+40})
            start = at
        previous = at
    if previous-start+20 >= min_ms:
        regions.append({"start_ms": start, "end_ms": previous+40})
    return regions


def gesture_segments(rows: list[dict[str, Any]], gap_ms: int = 60) -> list[dict[str, Any]]:
    """Describe measured voiced gestures without assigning emotional or speaker meaning."""
    active = [row for row in rows if row["voiced"] and row["periodicity"] >= 0.25]
    if not active:
        return []
    groups: list[list[dict[str, Any]]] = []
    current = [active[0]]
    for row in active[1:]:
        if row["at_ms"] - current[-1]["at_ms"] > gap_ms:
            groups.append(current)
            current = [row]
        else:
            current.append(row)
    groups.append(current)

    segments = []
    for index, group in enumerate(groups, 1):
        pitches = np.asarray([r["f0_hz"] for r in group], dtype=float)
        levels = np.asarray([r["rms"] for r in group], dtype=float)
        roughness = float(np.median([r["roughness_proxy"] for r in group]))
        pitch_span = float((np.max(pitches) - np.min(pitches)) / max(np.median(pitches), 1.0))
        level_cv = float(np.std(levels) / max(np.mean(levels), 1e-9))
        if pitch_span >= 0.18:
            gesture = "pitch_glide"
        elif level_cv >= 0.35:
            gesture = "pulsed_resonance"
        elif roughness >= 0.55:
            gesture = "irregular_resonance"
        else:
            gesture = "sustained_resonance"
        segments.append({
            "id": f"gesture-{index:03d}",
            "start_ms": group[0]["at_ms"],
            "end_ms": group[-1]["at_ms"] + 40,
            "duration_ms": group[-1]["at_ms"] - group[0]["at_ms"] + 40,
            "gesture": gesture,
            "frame_count": len(group),
            "median_f0_hz": round(float(np.median(pitches)), 2),
            "f0_span_ratio": round(pitch_span, 4),
            "amplitude_variation": round(level_cv, 4),
            "median_roughness_proxy": round(roughness, 4),
            "classification": "acoustic_heuristic",
        })
    return segments


def export_regions(source: Path, out: Path,
                   regions: list[dict[str, int]]) -> list[dict[str, Any]]:
    folder = out/"vocal_samples"
    folder.mkdir(parents=True, exist_ok=True)
    exported = []
    for i, region in enumerate(regions, 1):
        start, end = max(0, region["start_ms"]-100), region["end_ms"]+180
        target = folder/f"vocal_{i:03d}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-ss", f"{start/1000:.3f}",
             "-i", str(source), "-t", f"{(end-start)/1000:.3f}", "-vn",
             "-ac", "1", "-ar", "22050", "-c:a", "pcm_s16le", str(target)],
            check=True, capture_output=True,
        )
        exported.append({
            "id": f"vocal-{i:03d}", "file": str(target.relative_to(out)),
            "start_ms": start, "end_ms": end, "duration_ms": end-start,
            "source_region_start_ms": region["start_ms"],
            "source_region_end_ms": region["end_ms"],
        })
    return exported


def make_control_events(rows: list[dict[str, Any]],
                       segments: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    events = []
    previous_f0 = None
    # Keep a full-resolution feature curve in the atlas, but emit control cues
    # at 100 ms so the correspondence ledger is not flooded with 50 events/sec.
    for frame_index, row in enumerate(rows):
        if frame_index % 5 != 0 or not row["voiced"]:
            continue
        f0 = row["f0_hz"]
        glide = 0.0 if previous_f0 is None else (f0-previous_f0)/max(previous_f0, 1)
        previous_f0 = f0
        profile = {
            "f0_hz": f0, "periodicity": row["periodicity"],
            "roughness_proxy": row["roughness_proxy"],
            "harmonic_peaks": row["harmonic_peaks"],
            "h1_h2_db": row["h1_h2_db"],
            "subharmonic_ratio": row["subharmonic_ratio"],
            "spectral_centroid_hz": row["spectral_centroid_hz"],
            "spectral_flatness": row["spectral_flatness"],
            "formant_candidates_hz": row["formant_candidates_hz"],
            "pitch_glide_ratio": round(glide, 4),
            "breath_noise_proxy": row["spectral_flatness"],
            "amplitude": row["rms"],
        }
        events.append({
            "at_ms": row["at_ms"], "kind": "vocal_resonance",
            "intensity": min(1.0, row["rms"]*8),
            "section": "vocal-frequency",
            "target": "embodiment",
            "instruction": "Use the measured vocal envelope as a continuous deformation and motion-control signal; preserve the subject's established proportions.",
            "acoustic_profile": profile,
            "gesture": next((segment["gesture"] for segment in (segments or [])
                             if segment["start_ms"] <= row["at_ms"] < segment["end_ms"]), None),
        })
    return events


def build_atlas(source: str, output: str, label: str = "vocalisation",
                track_id: str | None = None) -> dict[str, Any]:
    source_path = Path(source).expanduser().resolve()
    out = Path(output).expanduser().resolve()
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg must be installed and available on PATH")
    out.mkdir(parents=True, exist_ok=True)
    rate = 16000
    samples = decode(source_path, rate)
    rows = analyse(samples, rate)
    regions = voiced_regions(rows)
    exported = export_regions(source_path, out, regions)
    source_hash = sha256_file(source_path)
    for item in exported:
        item["source_file"] = source_path.name
        item["source_sha256"] = source_hash
    voiced = [r for r in rows if r["f0_hz"] is not None]
    f0s = [r["f0_hz"] for r in voiced]
    gestures = gesture_segments(rows)
    cues = make_control_events(rows, gestures)
    atlas = {
        "schema": "geehub.vocal-frequency-atlas.v1",
        "id": track_id or source_path.stem.lower().replace(" ", "-"),
        "source": str(source_path), "asset_ref": str(source_path),
        "source_sha256": source_hash,
        "curated_label": label, "label_origin": "user_or_curator_supplied",
        "duration_ms": round(len(samples)*1000/rate),
        "analysis": {
            "frame_ms": 40, "hop_ms": 20, "sample_rate_hz": rate,
            "voiced_frame_count": len(voiced),
            "f0_median_hz": round(float(np.median(f0s)), 2) if f0s else None,
            "f0_min_hz": round(float(np.min(f0s)), 2) if f0s else None,
            "f0_max_hz": round(float(np.max(f0s)), 2) if f0s else None,
            "regions_detected": len(regions),
        },
        "samples": exported, "frames": rows,
        "gesture_segments": gestures,
        "control_events": cues, "cues": cues,
        "provenance": "FFmpeg mono decode; autocorrelation F0; harmonic/subharmonic measures; LPC formant candidates; spectral noise proxies",
        "limitations": [
            "F0 does not identify sex, age, identity, or vocal intent.",
            "Formant candidates are approximate LPC resonances, not validated phonetic formants.",
            "Breath/noise is a spectral proxy and may include instruments or recording noise.",
            "Gesture labels are threshold-based acoustic descriptions, not emotion or intent labels.",
            "Mixed music should be separated into a vocal stem before interpreting results as vocal features.",
        ],
    }
    (out/"vocal_frequency_atlas.json").write_text(
        json.dumps(atlas, indent=2, ensure_ascii=False)+"\n", encoding="utf-8"
    )
    return atlas


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a GEEHUB Vocal Frequency Atlas")
    parser.add_argument("audio")
    parser.add_argument("--out", default="vocal-atlas")
    parser.add_argument("--label", default="vocalisation",
                        help="Curator label, e.g. male_moaning; never inferred from pitch")
    parser.add_argument("--track-id", default=None)
    args = parser.parse_args()
    atlas = build_atlas(args.audio, args.out, args.label, args.track_id)
    print(json.dumps({
        "id": atlas["id"], "label": atlas["curated_label"],
        "voiced_frames": atlas["analysis"]["voiced_frame_count"],
        "regions": atlas["analysis"]["regions_detected"],
        "samples": len(atlas["samples"]),
        "atlas": str(Path(args.out)/"vocal_frequency_atlas.json"),
    }, indent=2))


if __name__ == "__main__":
    main()
