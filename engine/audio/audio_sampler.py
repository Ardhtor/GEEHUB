"""GEEHUB local audio analysis and reusable sample extraction; requires ffmpeg."""
from __future__ import annotations
import argparse, array, hashlib, json, math, shutil, subprocess, wave
from pathlib import Path
from typing import Any

RATE, FRAME, HOP = 22050, 2048, 512

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def decode_audio(path: Path, ffmpeg: str = "ffmpeg") -> array.array:
    if not shutil.which(ffmpeg):
        raise RuntimeError("ffmpeg is required and must be on PATH")
    cmd = [ffmpeg, "-v", "error", "-i", str(path), "-vn", "-ac", "1",
           "-ar", str(RATE), "-f", "f32le", "-acodec", "pcm_f32le", "pipe:1"]
    result = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    data = array.array("f")
    data.frombytes(result.stdout)
    if not data:
        raise ValueError("No audio samples were decoded")
    return data

def _magnitudes(values: list[float]) -> list[float]:
    n = len(values); real = values[:]; imag = [0.0] * n; j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit; bit >>= 1
        j ^= bit
        if i < j:
            real[i], real[j] = real[j], real[i]
    length = 2
    while length <= n:
        angle = -2 * math.pi / length
        wr0, wi0 = math.cos(angle), math.sin(angle)
        for start in range(0, n, length):
            wr, wi = 1.0, 0.0; half = length // 2
            for k in range(start, start + half):
                ar, ai = real[k], imag[k]
                br = real[k + half] * wr - imag[k + half] * wi
                bi = real[k + half] * wi + imag[k + half] * wr
                real[k], imag[k] = ar + br, ai + bi
                real[k + half], imag[k + half] = ar - br, ai - bi
                wr, wi = wr * wr0 - wi * wi0, wr * wi0 + wi * wr0
        length *= 2
    return [math.hypot(real[i], imag[i]) for i in range(n // 2 + 1)]

def analyse_frames(samples: Any) -> list[dict[str, float]]:
    result = []; previous = None
    window = [0.5 - 0.5 * math.cos(2 * math.pi * i / (FRAME - 1)) for i in range(FRAME)]
    for start in range(0, max(1, len(samples) - FRAME + 1), HOP):
        chunk = [float(x) for x in samples[start:start + FRAME]]
        if len(chunk) < FRAME: chunk.extend([0.0] * (FRAME - len(chunk)))
        rms = math.sqrt(sum(x*x for x in chunk) / FRAME)
        crossings = sum((a < 0 <= b) or (b < 0 <= a) for a, b in zip(chunk, chunk[1:]))
        spec = _magnitudes([chunk[i] * window[i] for i in range(FRAME)])
        total = sum(spec)
        centroid = sum(i * RATE / FRAME * v for i, v in enumerate(spec)) / total if total else 0.0
        flux = sum(max(0.0, a-b) for a,b in zip(spec, previous)) / (total + 1e-12) if previous else 0.0
        result.append({"at_ms": start * 1000.0 / RATE, "rms": rms,
                       "zero_crossing_rate": crossings / (FRAME-1),
                       "spectral_centroid_hz": centroid, "spectral_flux": flux})
        previous = spec
    return result

def estimate_tempo(frames: list[dict[str, float]]) -> float | None:
    if len(frames) < 12: return None
    onset = [f["spectral_flux"] for f in frames]; mean = sum(onset)/len(onset)
    onset = [max(0.0, x-mean) for x in onset]; hop = HOP/RATE
    lo, hi = max(1, round(60/180/hop)), min(len(onset)-1, round(60/60/hop))
    best_lag, best = 0, 0.0
    for lag in range(lo, hi+1):
        score = sum(onset[i]*onset[i-lag] for i in range(lag, len(onset)))
        if score > best: best_lag, best = lag, score
    return round(60/(best_lag*hop), 1) if best_lag and best > 0 else None

def _normalise(values: list[float]) -> list[float]:
    ordered = sorted(values); scale = ordered[min(len(ordered)-1, int(len(ordered)*.95))] if ordered else 0
    return [min(1.0, x/scale) if scale > 1e-12 else 0.0 for x in values]

def build_cues(frames: list[dict[str, float]], duration_ms: int) -> list[dict[str, Any]]:
    if not frames: return []
    energy = _normalise([f["rms"] for f in frames])
    flux = _normalise([f["spectral_flux"] for f in frames])
    cues=[]; last=None; stride=max(1, round(1500*RATE/1000/HOP))
    for i in range(0, len(frames), stride):
        f=frames[i]; level=energy[i]; novelty=flux[i]
        if novelty>.78 and level>.48: kind, instruction="impact","Mark a sharp change in action or physical state."
        elif level>.72: kind, instruction="drive","Increase movement cadence and physical force."
        elif level<.18: kind, instruction="space","Open space; reduce motion and expose environmental detail."
        elif novelty>.48: kind, instruction="transition","Introduce a new element or alter the scene's direction."
        else: kind, instruction="pulse","Maintain the current action with measured rhythmic continuity."
        if kind == last and i: continue
        cues.append({"at_ms":max(0,min(duration_ms,round(f["at_ms"]))),"kind":kind,
          "intensity":round(level,3),"section":"audio-analysis","target":"narrative",
          "instruction":instruction,"features":{k:round(f[k],6 if k!="spectral_centroid_hz" else 1)
          for k in ("rms","spectral_flux","spectral_centroid_hz","zero_crossing_rate")}})
        last=kind
    return cues

def extract_samples(source: Path, samples: Any, frames: list[dict[str,float]], output: Path,
                    count: int=12, seconds: float=1.6) -> list[dict[str,Any]]:
    output.mkdir(parents=True,exist_ok=True)
    if count <= 0: return []
    ranked=sorted(frames,key=lambda f:f["spectral_flux"],reverse=True)
    duration=len(samples)/RATE; chosen=[]
    for f in ranked:
        start=max(0.0,min(max(0.0,duration-seconds),f["at_ms"]/1000-seconds*.25))
        if all(abs(start-old)>=seconds*.8 for old in chosen): chosen.append(start)
        if len(chosen)>=count: break
    digest=sha256_file(source); manifest=[]
    for n,start in enumerate(sorted(chosen),1):
        left=int(start*RATE); right=min(len(samples),left+int(seconds*RATE))
        pcm=array.array("h",(int(max(-1.0,min(1.0,x))*32767) for x in samples[left:right]))
        name=f"sample_{n:02d}_{int(start*1000):08d}ms.wav"
        with wave.open(str(output/name),"wb") as out:
            out.setnchannels(1); out.setsampwidth(2); out.setframerate(RATE); out.writeframes(pcm.tobytes())
        manifest.append({"id":f"sample-{n:02d}","file":name,"source_file":source.name,
          "source_sha256":digest,"start_ms":round(start*1000),"end_ms":round(right*1000/RATE),
          "selection":"spectral-flux peak with temporal spacing"})
    return manifest

def analyse_file(source: str|Path, output_dir: str|Path, sample_count: int=12,
                 vocal_stem: str|Path|None=None, vocal_label: str="vocalisation") -> dict[str,Any]:
    source=Path(source).expanduser().resolve(); output=Path(output_dir).expanduser().resolve()
    if not source.is_file(): raise FileNotFoundError(source)
    samples=decode_audio(source); frames=analyse_frames(samples)
    duration=round(len(samples)*1000/RATE); digest=sha256_file(source)
    manifest={"id":f"audio-{digest[:16]}","asset_ref":str(source),"source_name":source.name,
      "source_sha256":digest,"duration_ms":duration,"sample_rate":RATE,
      "analysis":{"method":"ffmpeg mono decode; RMS, ZCR, spectral centroid and positive spectral flux",
        "frame_size":FRAME,"hop_size":HOP,"estimated_bpm":estimate_tempo(frames),"frame_count":len(frames)},
      "cues":build_cues(frames,duration),
      "samples":extract_samples(source,samples,frames,output/"samples",max(0,sample_count))}
    output.mkdir(parents=True,exist_ok=True)
    (output/"track_manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    (output/"analysis_frames.json").write_text(json.dumps(frames,indent=2),encoding="utf-8")
    return manifest

def main() -> None:
    p=argparse.ArgumentParser(description="Analyse a track and extract reusable GEEHUB samples")
    p.add_argument("audio_file"); p.add_argument("--out",default="geehub_audio_pass")
    p.add_argument("--sample-count",type=int,default=12); a=p.parse_args()
    m=analyse_file(a.audio_file,a.out,a.sample_count)
    print(json.dumps({"track_id":m["id"],"duration_ms":m["duration_ms"],
      "estimated_bpm":m["analysis"]["estimated_bpm"],"cue_count":len(m["cues"]),
      "sample_count":len(m["samples"]),"output":str(Path(a.out).resolve())},indent=2))

if __name__ == "__main__": main()
