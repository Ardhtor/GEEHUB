# GEEHUB Music Sampling Engine

This module connects real audio files to the existing Innervation Engine and
MusicProgram pipeline. The procedural Tree Soundboard remains a sound generator;
this sampler analyses imported tracks and extracts reusable local clips.

## Run

Requires Python 3.10+ and ffmpeg on PATH. No Python packages are required.

    python -m engine.audio.audio_sampler "/path/to/track.mp3" --out "/path/to/pass" --vocal-stem "/path/to/vocal-stem.wav" --vocal-label male_moaning

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


## Vocal-frequency companion

The original sampler remains the full-mix rhythm and transient analyser. The companion `vocal_frequency_atlas.py` is for an isolated vocal recording or separated vocal stem. It exports voiced-region WAV excerpts and a `vocal_frequency_atlas.json` manifest with the same `id`, `asset_ref`, `duration_ms`, and `cues` contract required by `MusicProgram`.

Run:

    python -m engine.audio.vocal_frequency_atlas "/path/to/vocal-stem.wav" --out "/path/to/pass/vocals" --label male_moaning

Install NumPy for the vocal analyser:

    python -m pip install numpy

It measures F0 movement, harmonics, subharmonic ratio, periodicity/roughness, LPC formant candidates, spectral centroid/flatness, zero-crossing rate and RMS envelope. It does not classify speaker sex or identity. Use the curated label only as source metadata.
