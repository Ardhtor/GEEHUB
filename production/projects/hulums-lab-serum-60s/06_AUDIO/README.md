# 06_AUDIO — licensed stems and sound design

Keep music, ambience, effects, and dialogue as separate versioned stems. Record source, creator/provider, license or generation provenance, sample rate, channel count, duration, and SHA-256. Do not include unlicensed commercial music in a master.

## Original procedural soundscape

The project now defines a deterministic 60-second original score in `07_MANIFESTS/audio_plan.json`: laboratory room tone, sequoia-like wood-grain creaks, a low serum pulse, a sparse original 8-bit minor-pentatonic motif, and a restrained low-frequency climax. The optional external sample layer remains disabled; no copyrighted music or external samples are used by the default renderer.

The target master is stereo, 48 kHz, 24-bit PCM WAV at -16 LUFS integrated and -1 dBTP true peak. The renderer writes five separate stems, the master, ffprobe metadata, loudness measurements and SHA-256 records. The audio-only master still requires synchronization, final mux and playback review against the generated video.

For a Dropbox-synced project folder, set `GEEHUB_PROJECT_ROOT` to the project root and run:

```bash
python engine/audio/procedural_soundscape.py --plan-check
python engine/audio/procedural_soundscape.py
```

The renderer uses local `ffmpeg` and `ffprobe` only. It makes no network calls. Runtime WAVs and `audio_render.json` are stored in the Dropbox project workspace and excluded from Git history.
