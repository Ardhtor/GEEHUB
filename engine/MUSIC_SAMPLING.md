# GEEHUB Music Sampling Layer

Status: implementation committed; local execution still requires an audio file and FFmpeg.

The sampling layer reconnects the existing `INNERVATION_ENGINE`, `SENSATION_ENGINE`, and `MusicProgram` contracts to actual sound files. It does not replace authored score work. A manually authored cue sheet remains valid; an analysed track can now generate one.

## What it does

1. Uses `ffprobe` to read duration and basic tags.
2. Uses `ffmpeg` to decode the source to mono PCM.
3. Measures 100 ms RMS energy windows and positive energy flux.
4. Detects transient/onset candidates with adaptive local peak picking.
5. Estimates a candidate tempo by energy-flux autocorrelation (60–180 BPM).
6. Exports up to 24 onset-centred mono WAV excerpts into `samples/`.
7. Writes `music_program.json` with `cues` accepted by `engine/narrative_container/music_program.py`, plus `signal_analysis.json` with the compact analysis summary.

## Run

```bash
python engine/audio_sampler.py "/path/to/track.wav" --out "/path/to/output" --track-id "track-001"
```

The output directory contains reusable audio excerpts and a timed music program. The program can be loaded by the existing `MusicProgram` and transmitted by `music_bridge.transmit_music_window` into the narrative correspondence ledger.

## Design rules

- Audio-derived events are signal observations, not authoritative interpretations.
- The Innervation Engine decides what a sound event does in the world: initiate movement, alter pace, reveal presence, change scale, recall a motif, or cross a threshold.
- The Sensation Engine reads the current subject/world baseline and decides how the event should be embodied.
- Authored score cues and sampled-track cues can coexist. Human-authored instructions take precedence when they conflict with generic auto-cues.
- Samples retain source timing and file lineage. Do not silently detach a sample from its source track.
- No audio is uploaded to Dropbox by this script. The generated directory can be placed in the production Dropbox tree when the source and output location are available.

## Current limits

This first implementation analyses amplitude dynamics and transient timing. It does not yet perform source separation, key/chord recognition, instrument classification, speech transcription, or semantic music understanding. Tempo is an estimate and can be ambiguous for rubato, half-time, double-time, or sparse material. The cue instructions are intentionally generic; scene-specific meaning comes from the Innervation/Sensation layer and the user's direction.
