"""Music-driven narrative control for GEEHUB.

Music is treated as a temporal instruction stream, not decorative soundtrack.
This module maps a listened-to/analysed track cue sheet into deterministic
narrative events. It does not pretend to analyse audio or play tracks itself.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class MusicCue:
    at_ms: int
    kind: str
    intensity: float
    instruction: str
    target: str = "narrative"
    section: str = ""
    acoustic_profile: dict[str, Any] | None = None

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "MusicCue":
        at_ms = int(raw["at_ms"])
        intensity = float(raw.get("intensity", 0.5))
        if at_ms < 0:
            raise ValueError("Cue time cannot be negative")
        if not 0.0 <= intensity <= 1.0:
            raise ValueError("Cue intensity must be between 0 and 1")
        instruction = str(raw.get("instruction", "")).strip()
        if not instruction:
            raise ValueError("Every cue needs an instruction")
        return cls(at_ms, str(raw.get("kind", "phrase")), intensity,
                   instruction, str(raw.get("target", "narrative")),
                   str(raw.get("section", "")), raw.get("acoustic_profile"))


class MusicProgram:
    """A track's cue sheet becomes the timing and modulation layer for a story."""

    def __init__(self, track: dict[str, Any]):
        if not str(track.get("id", "")).strip():
            raise ValueError("Track needs a stable id")
        if not str(track.get("asset_ref", "")).strip():
            raise ValueError("Track needs an asset reference, e.g. a Dropbox path")
        self.track = dict(track)
        self.cues = sorted(
            (MusicCue.from_dict(item) for item in track.get("cues", [])),
            key=lambda cue: cue.at_ms,
        )
        if not self.cues:
            raise ValueError("A music program needs at least one cue")
        duration = track.get("duration_ms")
        if duration is not None and any(c.at_ms > int(duration) for c in self.cues):
            raise ValueError("Cue falls beyond track duration")

    def events_until(self, position_ms: int, after_ms: int = -1) -> list[dict[str, Any]]:
        """Return cues in (after_ms, position_ms], suitable for a playback adapter."""
        if position_ms < after_ms:
            raise ValueError("Playback position cannot move backwards")
        return [
            {
                "event_id": f'{self.track["id"]}:{cue.at_ms}:{index}',
                "source": "music",
                "track_id": self.track["id"],
                "at_ms": cue.at_ms,
                "kind": cue.kind,
                "intensity": cue.intensity,
                "section": cue.section,
                "target": cue.target,
                "instruction": cue.instruction,
                "acoustic_profile": cue.acoustic_profile,
            }
            for index, cue in enumerate(self.cues)
            if after_ms < cue.at_ms <= position_ms
        ]

    def state_at(self, position_ms: int) -> dict[str, Any]:
        """Describe the active musical state at a playback position."""
        active = [cue for cue in self.cues if cue.at_ms <= position_ms]
        if not active:
            return {"track_id": self.track["id"], "position_ms": position_ms,
                    "active": False, "intensity": 0.0, "section": "intro"}
        cue = active[-1]
        return {
            "track_id": self.track["id"],
            "position_ms": position_ms,
            "active": True,
            "intensity": cue.intensity,
            "section": cue.section,
            "mode": cue.kind,
            "instruction": cue.instruction,
            "target": cue.target,
        }


def load_program(raw: dict[str, Any]) -> MusicProgram:
    """Construct a program from a JSON-compatible track manifest."""
    return MusicProgram(raw)
