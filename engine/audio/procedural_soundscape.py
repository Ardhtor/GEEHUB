"""Deterministic, original procedural soundscape renderer for GEEHUB.

Creates separate 48 kHz / 24-bit stereo stems and a loudness-managed WAV master.
No external samples, copyrighted music, network access, or paid generation are used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import random
import re
import shutil
import struct
import subprocess
import tempfile
import uuid
import wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

DEFAULT_PROJECT = Path(__file__).resolve().parents[2] / "production" / "projects" / "hulums-lab-serum-60s"
SAMPLE_RATE = 48000
CHANNELS = 2
SAMPLE_WIDTH = 3
MAX_DURATION_SECONDS = 600


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _write_json_atomic(path: Path, data: dict) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink() or path.parent.resolve() != path.parent.absolute():
        raise ValueError(f"Refusing to write through a symlink: {path}")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=path.parent,
            prefix=path.name + ".", suffix=".tmp", delete=False,
        ) as handle:
            temporary = Path(handle.name)
            json.dump(data, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def _global_envelope(t: float, duration: float) -> float:
    fade_in = min(1.0, max(0.0, t / 2.5))
    fade_out = min(1.0, max(0.0, (duration - t) / 3.5))
    return min(fade_in, fade_out)


def _pan(value: float, position: float) -> tuple[float, float]:
    position = max(-1.0, min(1.0, position))
    left = math.sqrt((1.0 - position) * 0.5)
    right = math.sqrt((1.0 + position) * 0.5)
    return value * left, value * right


def _room_tone(seed: int, duration: float) -> Callable[[float], tuple[float, float]]:
    rng = random.Random(seed)
    low_l = low_r = mid_l = mid_r = 0.0

    def sample(t: float) -> tuple[float, float]:
        nonlocal low_l, low_r, mid_l, mid_r
        noise_l, noise_r = rng.uniform(-1, 1), rng.uniform(-1, 1)
        low_l += 0.006 * (noise_l - low_l)
        low_r += 0.006 * (noise_r - low_r)
        mid_l += 0.11 * (noise_l - mid_l)
        mid_r += 0.11 * (noise_r - mid_r)
        modulation = 0.82 + 0.18 * math.sin(2 * math.pi * 0.075 * t)
        hum = 0.045 * math.sin(2 * math.pi * 60.0 * t) + 0.018 * math.sin(2 * math.pi * 120.0 * t)
        envelope = _global_envelope(t, duration)
        left = (hum + 0.022 * low_l + 0.006 * mid_l) * modulation * envelope
        right = (hum + 0.022 * low_r + 0.006 * mid_r) * modulation * envelope
        return left, right

    return sample


def _wood_grain(seed: int, duration: float) -> Callable[[float], tuple[float, float]]:
    rng = random.Random(seed)
    low = 0.0
    events = (6.8, 15.6, 25.4, 34.7, 43.2, 50.8, 56.1)
    resonances = (72.0, 91.0, 118.0, 147.0, 176.0, 104.0, 82.0)
    phases = tuple(rng.uniform(0, math.tau) for _ in events)

    def sample(t: float) -> tuple[float, float]:
        nonlocal low
        noise = rng.uniform(-1, 1)
        low += 0.018 * (noise - low)
        value = 0.012 * low
        pan = 0.0
        for index, center in enumerate(events):
            width = 0.28 if index not in (3, 5) else 0.42
            envelope = math.exp(-((t - center) / width) ** 2)
            frequency = resonances[index] * (1.0 + 0.018 * math.sin(2 * math.pi * 0.7 * t + phases[index]))
            creak = (
                0.105 * math.sin(math.tau * frequency * t + phases[index])
                + 0.035 * math.sin(math.tau * frequency * 2.01 * t + phases[index] * 0.7)
                + 0.018 * noise
            )
            value += envelope * creak
            pan += envelope * math.sin(index * 1.7) * 0.42
        left, right = _pan(value * _global_envelope(t, duration), max(-1.0, min(1.0, pan)))
        return left, right

    return sample


def _serum_pulse(seed: int, duration: float) -> Callable[[float], tuple[float, float]]:
    phases = (0.2, 1.1, 2.0)
    centers = (9.5, 17.0, 24.5, 32.0, 39.5, 45.0, 48.0, 51.0, 54.0)

    def sample(t: float) -> tuple[float, float]:
        envelope = 0.0
        for center in centers:
            envelope += math.exp(-((t - center) / 0.62) ** 2)
        sweep = max(0.0, min(1.0, (t - 8.0) / 42.0))
        bass = 0.11 * math.sin(math.tau * (39.0 + 5.0 * sweep) * t)
        harmonic = 0.042 * math.sin(math.tau * 78.0 * t + phases[0])
        shimmer = 0.018 * math.sin(math.tau * (330.0 + 110.0 * sweep) * t + phases[1])
        value = (bass + harmonic + shimmer) * min(1.0, envelope) * _global_envelope(t, duration)
        return _pan(value, 0.12 * math.sin(math.tau * 0.09 * t))

    return sample


def _bit_motif(seed: int, duration: float) -> Callable[[float], tuple[float, float]]:
    # Original C-minor-pentatonic 8-bit motif; no sampled or borrowed melody.
    notes = (130.81, 155.56, 196.00, 233.08, 261.63, 233.08, 196.00, 155.56,
             130.81, 196.00, 233.08, 261.63, 311.13, 261.63, 233.08, 196.00)
    step_seconds = 0.25

    def sample(t: float) -> tuple[float, float]:
        step = int(t / step_seconds)
        local_t = t - step * step_seconds
        frequency = notes[step % len(notes)]
        attack = min(1.0, local_t / 0.009)
        decay = math.exp(-local_t / 0.16)
        square = 1.0 if math.sin(math.tau * frequency * local_t) >= 0 else -1.0
        sub = math.sin(math.tau * frequency * 0.5 * local_t)
        phrase_gate = 0.62 if (step // len(notes)) % 2 else 1.0
        value = (0.052 * square + 0.014 * sub) * attack * decay * phrase_gate
        value *= _global_envelope(t, duration)
        return _pan(value, -0.38 if step % 2 == 0 else 0.38)

    return sample


def _climax(seed: int, duration: float) -> Callable[[float], tuple[float, float]]:
    rng = random.Random(seed)
    low_l = low_r = 0.0
    hit_centers = (47.2, 49.3, 51.4)

    def sample(t: float) -> tuple[float, float]:
        nonlocal low_l, low_r
        noise_l, noise_r = rng.uniform(-1, 1), rng.uniform(-1, 1)
        low_l += 0.045 * (noise_l - low_l)
        low_r += 0.045 * (noise_r - low_r)
        rise = max(0.0, min(1.0, (t - 39.0) / 9.0))
        sweep_phase = math.tau * (58.0 * t + 0.5 * (96.0 / 9.0) * max(0.0, t - 39.0) ** 2)
        value_l = value_r = 0.0
        value_l += 0.07 * rise * math.sin(sweep_phase)
        value_r += 0.07 * rise * math.sin(sweep_phase + 0.04)
        for index, center in enumerate(hit_centers):
            envelope = math.exp(-((t - center) / 0.34) ** 2)
            hit = 0.16 * math.sin(math.tau * 36.0 * (t - center)) * envelope
            metal = 0.045 * math.sin(math.tau * (270.0 + 35.0 * index) * (t - center)) * envelope
            value_l += hit + metal + 0.025 * low_l * envelope
            value_r += hit + metal + 0.025 * low_r * envelope
        fade = _global_envelope(t, duration)
        return value_l * fade, value_r * fade

    return sample


def _pcm24_bytes(value: float) -> bytes:
    clipped = max(-0.999999, min(0.999999, float(value)))
    integer = int(round(clipped * 8388607.0))
    if integer < 0:
        integer += 1 << 24
    return bytes((integer & 0xFF, (integer >> 8) & 0xFF, (integer >> 16) & 0xFF))


def write_pcm24_wav(
    path: Path,
    sample_fn: Callable[[float], tuple[float, float]],
    duration_seconds: float,
    sample_rate: int = SAMPLE_RATE,
    chunk_seconds: float = 1.0,
) -> dict:
    if duration_seconds <= 0 or duration_seconds > MAX_DURATION_SECONDS:
        raise ValueError("duration_seconds must be greater than zero and no more than 600")
    if sample_rate < 8000 or sample_rate > 192000:
        raise ValueError("sample_rate must be between 8000 and 192000 Hz")
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() or path.is_symlink():
        raise FileExistsError(f"Refusing to overwrite audio output: {path}")
    frame_count = int(round(duration_seconds * sample_rate))
    chunk_frames = max(1, int(round(chunk_seconds * sample_rate)))
    with wave.open(str(path), "wb") as output:
        output.setnchannels(CHANNELS)
        output.setsampwidth(SAMPLE_WIDTH)
        output.setframerate(sample_rate)
        for start in range(0, frame_count, chunk_frames):
            stop = min(frame_count, start + chunk_frames)
            buffer = bytearray()
            for frame in range(start, stop):
                left, right = sample_fn(frame / sample_rate)
                buffer.extend(_pcm24_bytes(left))
                buffer.extend(_pcm24_bytes(right))
            output.writeframesraw(buffer)
    return {
        "path": str(path),
        "frames": frame_count,
        "duration_seconds": frame_count / sample_rate,
        "sample_rate": sample_rate,
        "channels": CHANNELS,
        "bit_depth": 24,
        "size_bytes": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def _run(command: list[str]) -> subprocess.CompletedProcess:
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed ({result.returncode}): {result.stderr[-2500:]}")
    return result


def probe_audio(path: Path, ffprobe: str | None = None) -> dict:
    ffprobe = ffprobe or shutil.which("ffprobe")
    if not ffprobe:
        raise RuntimeError("ffprobe is required to verify the rendered audio master")
    result = _run([
        ffprobe, "-v", "error", "-show_entries",
        "format=duration:stream=codec_name,sample_rate,channels,bits_per_sample,bits_per_raw_sample",
        "-of", "json", str(path),
    ])
    data = json.loads(result.stdout)
    streams = [stream for stream in data.get("streams", []) if stream.get("codec_name")]
    if not streams:
        raise ValueError("ffprobe found no audio stream")
    stream = streams[0]
    return {
        "duration_seconds": float(data.get("format", {}).get("duration", 0)),
        "codec_name": stream.get("codec_name"),
        "sample_rate": int(stream.get("sample_rate", 0)),
        "channels": int(stream.get("channels", 0)),
        "bits_per_sample": int(stream.get("bits_per_raw_sample") or stream.get("bits_per_sample") or 0),
    }


def _parse_loudnorm_summary(stderr: str) -> dict:
    integrated = re.search(r"Output Integrated:\s*(-?[\d.]+)\s*LUFS", stderr)
    true_peak = re.search(r"Output True Peak:\s*(-?[\d.]+)\s*dBTP", stderr)
    lra = re.search(r"Output LRA:\s*([\d.]+)\s*LU", stderr)
    return {
        "integrated_lufs": float(integrated.group(1)) if integrated else None,
        "true_peak_dbtp": float(true_peak.group(1)) if true_peak else None,
        "lra_lu": float(lra.group(1)) if lra else None,
        "measurement_status": "measured" if integrated and true_peak else "measurement-unavailable",
    }


def render_soundscape(
    project: Path,
    plan_path: Path | None = None,
    duration_seconds: int | None = None,
    seed: int | None = None,
) -> dict:
    project = Path(project).expanduser().resolve(strict=True)
    plan_path = (plan_path or project / "07_MANIFESTS" / "audio_plan.json").resolve(strict=True)
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    plan_errors = validate_audio_plan(plan, project.name)
    if plan_errors:
        raise ValueError("; ".join(plan_errors))
    duration = int(duration_seconds if duration_seconds is not None else plan["duration_seconds"])
    if duration <= 0 or duration > MAX_DURATION_SECONDS:
        raise ValueError("duration must be between 1 and 600 seconds")
    sample_rate = int(plan.get("sample_rate_hz", SAMPLE_RATE))
    actual_seed = int(seed if seed is not None else plan.get("seed", 20261123))
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("ffmpeg and ffprobe are required for audio mixing and verification")
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    audio_root = project / "06_AUDIO"
    generated_root = audio_root / "GENERATED"
    if audio_root.is_symlink() or generated_root.is_symlink():
        raise ValueError("Audio output directories must not be symlinks")
    if not audio_root.resolve().is_relative_to(project) or not generated_root.resolve().is_relative_to(project):
        raise ValueError("Audio output directories must remain inside the project")
    output_dir = generated_root / run_id
    stem_dir = output_dir / "STEMS"
    stem_dir.mkdir(parents=True, exist_ok=False)

    factories = {
        "room_tone": lambda: _room_tone(actual_seed + 11, duration),
        "wood_grain": lambda: _wood_grain(actual_seed + 23, duration),
        "serum_pulse": lambda: _serum_pulse(actual_seed + 37, duration),
        "bit_motif": lambda: _bit_motif(actual_seed + 41, duration),
        "climax": lambda: _climax(actual_seed + 53, duration),
    }
    stem_records = []
    for stem in plan.get("stems", []):
        name = stem.get("name")
        if name not in factories or stem.get("source") != "procedural-original":
            raise ValueError(f"Unsupported or non-original audio stem in plan: {name}")
        stem_path = stem_dir / f"{name}.wav"
        record = write_pcm24_wav(stem_path, factories[name](), duration, sample_rate)
        record.update({"name": name, "gain_db": float(stem.get("gain_db", 0.0))})
        stem_records.append(record)
    if set(record["name"] for record in stem_records) != set(factories):
        raise ValueError("Audio plan must define all five original procedural stems exactly once")

    filter_parts = []
    mix_inputs = []
    for index, record in enumerate(stem_records):
        filter_parts.append(f"[{index}:a]volume={record['gain_db']}dB[a{index}]")
        mix_inputs.append(f"[a{index}]")
    mix_inputs_text = "".join(mix_inputs)
    filter_parts.append(
        f"{mix_inputs_text}amix=inputs={len(stem_records)}:normalize=0:dropout_transition=0,"
        f"loudnorm=I={plan['master']['integrated_lufs']}:TP={plan['master']['true_peak_dbtp']}:"
        f"LRA={plan['master']['loudness_range_lu']}:print_format=summary[aout]"
    )
    filter_graph = ";".join(filter_parts)
    master_path = output_dir / "serum-soundscape-master.wav"
    command = [ffmpeg, "-nostdin", "-hide_banner", "-loglevel", "info", "-y"]
    for record in stem_records:
        command.extend(["-i", record["path"]])
    command.extend([
        "-filter_complex", filter_graph,
        "-map", "[aout]",
        "-c:a", "pcm_s24le",
        "-ar", str(sample_rate),
        "-ac", str(CHANNELS),
        str(master_path),
    ])
    mixed = _run(command)
    media = probe_audio(master_path, ffprobe)
    loudness = _parse_loudnorm_summary(mixed.stderr)
    expected = {
        "duration_seconds": duration,
        "sample_rate": sample_rate,
        "channels": CHANNELS,
        "bits_per_sample": 24,
        "codec_name": "pcm_s24le",
    }
    for field, value in expected.items():
        if media.get(field) != value:
            raise ValueError(f"Rendered audio {field}={media.get(field)!r}, expected {value!r}")
    if abs(media["duration_seconds"] - duration) > 0.05:
        raise ValueError("Rendered audio duration does not match the project duration")

    manifest = {
        "schema": "geehub.audio-render/1",
        "project_id": project.name,
        "run_id": run_id,
        "status": "rendered",
        "renderer": "engine/audio/procedural_soundscape.py",
        "seed": actual_seed,
        "created_at": utc_now(),
        "duration_seconds": duration,
        "format": {
            "container": "wav",
            "codec": media["codec_name"],
            "sample_rate_hz": media["sample_rate"],
            "channels": media["channels"],
            "bit_depth": media["bits_per_sample"],
        },
        "loudness_target": plan["master"],
        "loudness_measurement": loudness,
        "master": {
            "path": str(master_path.relative_to(project)),
            "size_bytes": master_path.stat().st_size,
            "sha256": sha256_file(master_path),
            "media_metadata": media,
        },
        "stems": [
            {
                "name": record["name"],
                "path": str(Path(record["path"]).relative_to(project)),
                "size_bytes": record["size_bytes"],
                "sha256": record["sha256"],
                "gain_db": record["gain_db"],
            }
            for record in stem_records
        ],
        "rights": {
            "original_procedural_generation": True,
            "external_samples_used": False,
            "sample_layer_enabled": False,
            "note": "No external or copyrighted samples were used. The optional sample layer remains disabled until a user-supplied or licensed source is cleared."
        },
        "ffmpeg_command": command,
    }
    manifests = project / "07_MANIFESTS"
    _write_json_atomic(manifests / f"audio_render-{run_id}.json", manifest)
    _write_json_atomic(manifests / "audio_render.json", manifest)
    return manifest


def validate_audio_plan(plan: object, project_id: str) -> list[str]:
    if not isinstance(plan, dict):
        return ["audio plan must be a JSON object"]
    errors = []
    if plan.get("schema") != "geehub.audio-plan/1" or plan.get("project_id") != project_id:
        errors.append("audio plan schema/project_id is invalid")
    if plan.get("duration_seconds") != 60:
        errors.append("production audio plan must target 60 seconds")
    if plan.get("sample_rate_hz") != 48000 or plan.get("channels") != 2 or plan.get("bit_depth") != 24:
        errors.append("production audio master must be 48 kHz, stereo, 24-bit")
    names = [item.get("name") for item in plan.get("stems", []) if isinstance(item, dict)]
    if sorted(names) != ["bit_motif", "climax", "room_tone", "serum_pulse", "wood_grain"]:
        errors.append("audio plan must define the five original procedural stems")
    if any(item.get("source") != "procedural-original" for item in plan.get("stems", []) if isinstance(item, dict)):
        errors.append("all enabled default stems must be original procedural audio")
    sample = plan.get("optional_sample_layer", {})
    if not isinstance(sample, dict) or sample.get("enabled") is not False:
        errors.append("optional external sample layer must remain disabled until rights clearance")
    master = plan.get("master", {})
    if not isinstance(master, dict) or master.get("integrated_lufs") != -16.0 or master.get("true_peak_dbtp") != -1.0:
        errors.append("audio master target must be -16 LUFS integrated and -1 dBTP true peak")
    return errors


def default_project_path() -> Path:
    configured = os.environ.get("GEEHUB_PROJECT_ROOT")
    return Path(configured).expanduser() if configured else DEFAULT_PROJECT


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=default_project_path())
    parser.add_argument("--duration", type=int, default=None, help="Override duration for short tests; production default is 60 seconds")
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--plan-check", action="store_true", help="Validate the audio plan without generating audio")
    args = parser.parse_args(argv)
    try:
        plan_path = args.project / "07_MANIFESTS" / "audio_plan.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        errors = validate_audio_plan(plan, args.project.name)
        if errors:
            raise ValueError("; ".join(errors))
        if args.plan_check:
            print(json.dumps({"status": "valid", "project_id": args.project.name, "audio_plan": str(plan_path)}, indent=2))
            return 0
        result = render_soundscape(args.project, plan_path, args.duration, args.seed)
        print(json.dumps(result, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError, RuntimeError) as exc:
        parser.exit(2, f"ERROR: {exc}\n")


if __name__ == "__main__":
    raise SystemExit(main())
