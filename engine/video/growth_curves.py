"""Deterministic, renderer-independent growth curves for GEEHUB.

A growth profile is a set of time/value knots per anatomical region. Values are
normalised to [0, 1], interpolated with cubic smoothstep, and sampled at the
project frame rate. No stage label is interpreted as a numerical growth amount.
"""
from __future__ import annotations

from bisect import bisect_right
from typing import Iterable, Mapping, Sequence

# Each region has its own onset, acceleration and plateau. These are production
# controls, not claims extracted from a reference video.
DEFAULT_PROFILE = {
    "pectorals": ((0, 0), (10, 0), (18, .22), (32, .53), (48, .86), (55, 1), (60, 1)),
    "deltoids": ((0, 0), (10, 0), (18, .18), (32, .48), (48, .80), (55, .96), (60, .96)),
    "traps": ((0, 0), (14, 0), (24, .12), (32, .34), (48, .76), (55, .94), (60, .94)),
    "arms": ((0, 0), (16, 0), (24, .16), (32, .40), (48, .78), (55, .96), (60, .96)),
    "lats": ((0, 0), (22, 0), (32, .24), (48, .72), (55, .92), (60, .92)),
    "back": ((0, 0), (22, 0), (32, .20), (48, .68), (55, .90), (60, .90)),
    "torso": ((0, 0), (16, 0), (24, .12), (32, .30), (48, .70), (55, .90), (60, .90)),
    "quadriceps": ((0, 0), (26, 0), (32, .16), (48, .64), (55, .88), (60, .88)),
    "calves": ((0, 0), (28, 0), (36, .12), (48, .56), (55, .82), (60, .82)),
    "whole_body": ((0, 0), (38, 0), (48, .36), (55, .78), (60, .78)),
}


def smoothstep(value: float) -> float:
    """Cubic ease with zero velocity at both ends."""
    x = max(0.0, min(1.0, float(value)))
    return x * x * (3.0 - 2.0 * x)


def validate_profile(profile: Mapping[str, Sequence[Sequence[float]]]) -> list[str]:
    errors = []
    for region, knots in profile.items():
        if len(knots) < 2:
            errors.append(f"{region}: at least two knots are required")
            continue
        previous_time = float("-inf")
        previous_value = float("-inf")
        for index, knot in enumerate(knots):
            if len(knot) != 2:
                errors.append(f"{region}[{index}]: knot must be [seconds, value]")
                continue
            time, value = map(float, knot)
            if time <= previous_time:
                errors.append(f"{region}[{index}]: knot times must increase")
            if not 0.0 <= value <= 1.0:
                errors.append(f"{region}[{index}]: value must be in [0, 1]")
            if value < previous_value:
                errors.append(f"{region}[{index}]: growth profile cannot reverse")
            previous_time, previous_value = time, value
    return errors


def evaluate_curve(knots: Sequence[Sequence[float]], seconds: float) -> float:
    """Evaluate a monotonic profile at any time, holding endpoint values."""
    if not knots:
        return 0.0
    t = float(seconds)
    if t <= float(knots[0][0]):
        return float(knots[0][1])
    if t >= float(knots[-1][0]):
        return float(knots[-1][1])
    times = [float(knot[0]) for knot in knots]
    right = bisect_right(times, t)
    t0, v0 = map(float, knots[right - 1])
    t1, v1 = map(float, knots[right])
    return v0 + (v1 - v0) * smoothstep((t - t0) / (t1 - t0))


def evaluate_profile(profile: Mapping[str, Sequence[Sequence[float]]],
                      seconds: float) -> dict[str, float]:
    return {region: evaluate_curve(knots, seconds)
            for region, knots in profile.items()}


def sample_profile(profile: Mapping[str, Sequence[Sequence[float]]],
                   duration_seconds: float, fps: int) -> Iterable[tuple[int, dict[str, float]]]:
    """Yield every rendered frame, using Blender's 1-based frame convention."""
    if fps <= 0 or duration_seconds <= 0:
        raise ValueError("duration_seconds and fps must be positive")
    frame_count = round(duration_seconds * fps)
    for frame in range(1, frame_count + 1):
        seconds = (frame - 1) / fps
        yield frame, evaluate_profile(profile, seconds)
