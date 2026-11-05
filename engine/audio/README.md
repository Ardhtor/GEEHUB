# GEEHUB Tree Soundboard

Open `tree_soundboard.html` in a modern browser and press any sound pad. The page
synthesizes audio locally with the Web Audio API; it uses no prerecorded samples,
external libraries, or network requests.

## Sound palette

- Canopy wind: filtered noise with a slow spectral sweep.
- Leaf rustle: short, overlapping filtered-noise bursts.
- Branch creak: low descending oscillator plus friction noise.
- Trunk knocks: short resonant, pitched wood-like impacts.
- Root groan: layered low-frequency descending tones.
- Night grove: an evolving loop combining canopy, foliage, creaks, and occasional knocks.

The wind, leaf-density, and wood-resonance controls shape the sound. The 8-bit
texture switch adds a stepped waveshaper for deliberately lo-fi playback.

This is the first procedural soundboard prototype. It is suitable for browser playback
and can later be mounted as a native GEEHUB audio panel. It is not yet an exported
WAV/MP3/MP4 asset or a persistent project mixer.


## Music sampling

The local track analyser and sample extractor now live in `audio_sampler.py`.
It decodes a supplied audio file with ffmpeg, measures energy and spectral
changes, emits a MusicProgram-compatible cue manifest, and extracts provenance-
tagged WAV clips into a local output folder. See `MUSIC_SAMPLING_ENGINE.md`
for the full workflow. This is separate from the procedural soundboard above:
one synthesizes sound; the other listens to imported music and samples it.


## Vocal Frequency Atlas

Nonverbal vocalisation is now a separate analysis source, not a speech-recognition category or a fixed low-pitch effect. See `vocal_frequency_atlas.py` and `VOCAL_FREQUENCY_ATLAS.md`.

Use the music sampler on the full track for rhythm, energy and reusable transient samples. Use the Vocal Frequency Atlas on an isolated vocal stem for F0, harmonic/subharmonic structure, periodicity, roughness, LPC formant candidates, breath/noise proxies and amplitude envelope. Both emit timed cues for the same MusicProgram and narrative bridge.

The `male_moaning` label is supplied by the curator. The analyser does not infer sex, age, identity or intent from pitch. Full-resolution acoustic frames are retained in the atlas; control events are reduced to 100 ms intervals for the ledger.
