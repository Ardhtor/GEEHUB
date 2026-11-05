# GEEHUB Music Sampling Engine

This module connects real audio files to the existing Innervation Engine and
MusicProgram pipeline. The procedural Tree Soundboard remains a sound generator;
this sampler analyses imported tracks and extracts reusable local clips.

## Run

Requires Python 3.10+ and ffmpeg on PATH. No Python packages are required.

    python -m engine.audio.audio_sampler "/path/to/track.mp3" --out "/path/to/pass"

Outputs:
- track_manifest.json: track identity, hash, duration, tempo estimate, measured
  cues, and sample references. Its cues are compatible with
  engine.narrative_container.music_program.load_program.
- analysis_frames.json: frame-level RMS, zero-crossing rate, spectral centroid,
  and positive spectral flux.
- samples/*.wav: short mono PCM clips selected around prominent spectral-change
  peaks, with source hash and exact source interval.

RMS estimates energy; spectral flux marks abrupt changes; spectral centroid
estimates brightness/density; zero-crossing rate is a coarse noisiness measure.
Tempo is estimated from onset-envelope autocorrelation and is not guaranteed.

The generated instructions are generic signals, not invented scene meanings.
Each receiving narrative interprets the signal in its own context.

Samples are extracted only from the local source file supplied by the operator.
Keep them in the private production workspace unless distribution rights are
established. This tool does not upload or publish audio.

The Innervation contract remains:
SIGNAL -> BODY/SPACE RESPONSE -> ACTION -> SONIC RESIDUE -> NEXT SIGNAL.

The existing MusicProgram and music_bridge.py remain downstream event and
correspondence layers. This sampler generates their manifest input.
