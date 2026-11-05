# Vocal Frequency Atlas

The target is male moaning frequencies as a broad acoustic family of nonverbal vocalisation. This is not a voice-actor library and not a single low-frequency preset. It is a measured atlas of pitch movement, resonance, harmonic structure, breath/noise, roughness, intensity and duration across actual recordings.

## Data path

`recording or isolated vocal stem → FFmpeg decode → 40 ms frames / 20 ms hop → acoustic feature analysis → voiced-region excerpts → Vocal Frequency Atlas → Innervation events → Sensation/animation controls`

Run:

```bash
python -m pip install numpy
python -m engine.audio.vocal_frequency_atlas "/path/to/vocal-stem.wav" --out "/path/to/atlas" --label male_moaning
```

The label is supplied by the curator. Pitch alone cannot establish sex, age, identity or intent. For mixed music, use a vocal stem or isolated recording; otherwise instrument harmonics can be mistaken for vocal features.

## Measurements

- F0: autocorrelation-based fundamental frequency and its movement over time.
- Periodicity: strength of periodic structure, useful for voiced/rough transitions.
- Harmonics: amplitudes at successive multiples of F0; H1-H2 is retained as a rough spectral-shape measure.
- Formant candidates: approximate LPC resonances, retained as candidates rather than definitive phonetic formants.
- Noise texture: spectral flatness and zero-crossing rate as proxies for breath/noise and roughness.
- Envelope: RMS amplitude per frame.
- Temporal shape: pitch glide, sustained regions, interruptions and releases.

## Animation contract

Acoustic measurements are control signals, not literal body instructions. The downstream scene system maps them to continuous parameters: deformation envelope, motion amplitude, hold duration, secondary movement, camera response and transition timing. The system must preserve established body proportions and avoid adding a visual event without a corresponding signal event.

## Integration

The output writes `vocal_frequency_atlas.json` and WAV excerpts under `vocal_samples/`. Each control event uses the same timed-cue vocabulary as `MusicProgram`; the narrative bridge can therefore carry it without creating a parallel timeline system. Music sampling, authored scores and vocal features coexist. A track can drive the scene through rhythm while its vocal stem independently drives resonance and deformation.
