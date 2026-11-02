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
