# Innervation Engine

Status: active design rule
Established: 2026-10-28
Parent systems: Sensation Engine, Individual Moment, shared parallel history

## Purpose

The soundtrack is not a therapeutic narrator and not a passive playlist. It is an active signal system wired into the world's events. Sound changes state, marks transitions, triggers returns, drives timing, and gives actions a physical signature.

## Runtime loop

**SIGNAL → BODY/SPACE RESPONSE → ACTION → SONIC RESIDUE → NEXT SIGNAL**

Every sound event must do at least one job: initiate movement, alter pace, reveal a presence, change spatial scale, connect two historical moments, signal a threshold, or leave a reusable motif. If it does none of these, cut it.

## Functional layers

- **Drive:** pulse, tempo, percussion, bass, and repetition establish force and movement.
- **Material:** timbre and resonance make a place feel metallic, wooden, wet, vast, enclosed, electric, or alive.
- **Presence:** footsteps, breath, voices, machine activity, and distance locate bodies in the world.
- **Recall:** motifs return with a changed arrangement when a place, person, or event reconnects to prior history.
- **Transition:** silence, impact, tonal shift, or rhythmic break moves the experience into its next state.
- **Forecast:** a sound arrives before an event and changes the listener's expectation; the event must then pay off, mutate, or deliberately withhold that expectation.

## Action rules

1. Start from the current scene or task, not an abstract mood profile.
2. Choose a concrete sonic action: start, stop, pulse, distort, approach, recede, repeat, interrupt, or transform.
3. Bind the action to a visible or narrative change. The sound and the world must move together.
4. Carry forward only motifs with a clear source or established association. Do not turn every memory into a sentimental callback.
5. Let the current encounter alter the motif. Continuity means variation with history, not identical replay.
6. End each cycle with a changed state: a new route, revealed presence, altered pace, opened threshold, changed relationship, or established motif.
7. Do not describe a soundtrack instead of producing or specifying a playable sequence. When playback/rendering is unavailable, output a concrete cue sheet with timing, layers, transitions, and intended event.

## Soundtrack of My Life

Treat this as a live, editable score for the user's parallel history. Organize material by recurring sonic motifs, places, people, events, and transitions—not by presumed emotional diagnosis. The score accumulates through actual encounters and chosen references. Each cue records its trigger, sound behavior, resulting action, and what remains available for later reuse.

## Output contract

A useful innervation pass produces:
- current scene/action;
- exact cue or sound behavior;
- timing or trigger;
- the world-state change it causes;
- the residue or motif carried forward.

**Operating principle: sound is not commentary on the action. Sound is one of the mechanisms that makes the action happen.**


## Audio sampling adapter

The operational sampling adapter is `engine/audio_sampler.py`, documented in `engine/MUSIC_SAMPLING.md`. It reads real audio through FFmpeg, extracts onset-centred WAV excerpts, estimates tempo from energy-flux autocorrelation, and emits a `music_program.json` compatible with the existing narrative music program.

Sampling does not replace interpretation. The sampler reports where the signal changes; Innervation assigns those changes a job in the scene. The Sensation Engine then embodies that job against the current continuity state. Authored score instructions remain available and override generic automatic cues where necessary.

The complete path is now:

`audio file → decode / analyse → reusable samples + timed cues → MusicProgram → Innervation/Sensation interpretation → narrative ledger → scene/video actions`

This is a code path and file contract, not yet a running service. A local audio file and FFmpeg are still required to produce a real sample set. Dropbox persistence remains a separate production step.


## Vocal frequency input

Nonverbal vocalisation is a first-class sound source alongside rhythm, score and environmental audio. The Vocal Frequency Atlas (`engine/audio/vocal_frequency_atlas.py`) analyses real recordings frame by frame and exports a time-aligned atlas plus reusable excerpts.

The scene system reads the acoustic signal as continuous control data:
- F0 and pitch glide → modulation, transition timing and motion contour.
- Periodicity and harmonic balance → resonance/roughness character.
- Spectral flatness and zero-crossing rate → breath/noise texture proxies.
- RMS envelope → intensity, hold and release.
- LPC formant candidates → timbral identity cues, treated as approximate measurements.

These features do not identify sex, age, identity or intent. A label such as `male_moaning` is curator-supplied. Do not infer it from pitch. Mixed tracks should be analysed from a separated vocal stem when possible.

The atlas emits `cues` in the existing MusicProgram schema. The existing music bridge now preserves each `acoustic_profile` in the ledger payload, so vocal resonance, rhythmic events and authored score cues share one timeline and provenance model.

**Embodiment rule:** acoustic energy controls the envelope and timing of a deformation or movement; it does not dictate anatomy. Existing subject proportions and continuity remain authoritative.



## Tempo, phase, and action coupling

A cue is a timed control signal, not a mood label. Every actionable cue specifies BPM (30–300 when periodic), phase, duration, target response (step, breath, turn, pause, reach, or hold), synchronization mode, trigger, action, before/after state, next cue allowed, and concrete sonic residue. The machine-readable v2 contract is `engine/schemas/innervation-cue-v2.schema.json`, and cue records append to `engine/innervation_cues.jsonl`; runtime checks are enforced by `engine/tractus_science.py`. The unversioned schema remains a compatibility contract.

Use steady isochronous pulses when a scene needs a stable movement reference. Use a phase offset, missing beat, rhythmic break, or silence when a threshold should interrupt expectation. The target is a concrete action, not a generic emotion. A cue is rejected if it changes neither action nor available state. A valid residue might be a changed walking cadence, a route becoming available, a route closing, a pause being held, or a different cue becoming eligible.

BPM is a design parameter for composition and interaction. It is not evidence that a particular listener's neural systems were measured or that a precise biological response is guaranteed. The practical rhythmic range is broad; individual synchronization varies.

The experience loop is `PERCEIVE → CHOOSE → ACT → STATE CHANGE → NEW PERCEPTION`. Sound participates in that loop: a cue changes timing or action, and the changed action alters what the interface or scene presents next. If playback is unavailable, produce a timed cue sheet and mark it as specified, not played.
