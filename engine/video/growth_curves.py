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
    "pectorals": ((0, 0), (10, 0), (18, 0.22), (32, 0.53), (48, 0.86), (55, 1), (60, 1)),
    "deltoids": ((0, 0), (10, 0), (18, 0.18), (32, 0.48), (48, 0.8), (55, 0.96), (60, 0.96)),
    "traps": ((0, 0), (14, 0), (24, 0.12), (32, 0.34), (48, 0.76), (55, 0.94), (60, 0.94)),
    "biceps": ((0, 0), (16, 0), (24, 0.16), (32, 0.42), (48, 0.8), (55, 0.97), (60, 0.97)),
    "triceps": ((0, 0), (17, 0), (25, 0.15), (34, 0.4), (49, 0.78), (56, 0.95), (60, 0.95)),
    "forearms": ((0, 0), (18, 0), (27, 0.13), (36, 0.38), (50, 0.74), (57, 0.92), (60, 0.92)),
    "arms": ((0, 0), (16, 0), (24, 0.16), (32, 0.4), (48, 0.78), (55, 0.96), (60, 0.96)),
    "lats": ((0, 0), (22, 0), (32, 0.24), (48, 0.72), (55, 0.92), (60, 0.92)),
    "back": ((0, 0), (22, 0), (32, 0.2), (48, 0.68), (55, 0.9), (60, 0.9)),
    "torso": ((0, 0), (16, 0), (24, 0.12), (32, 0.3), (48, 0.7), (55, 0.9), (60, 0.9)),
    "abdominals": ((0, 0), (24, 0), (30, 0.1), (40, 0.3), (52, 0.62), (58, 0.82), (60, 0.82)),
    "glutes": ((0, 0), (25, 0), (33, 0.1), (43, 0.36), (54, 0.74), (59, 0.9), (60, 0.9)),
    "quadriceps": ((0, 0), (26, 0), (32, 0.16), (48, 0.64), (55, 0.88), (60, 0.88)),
    "hamstrings": ((0, 0), (27, 0), (35, 0.12), (49, 0.58), (56, 0.86), (60, 0.86)),
    "calves": ((0, 0), (28, 0), (36, 0.12), (48, 0.56), (55, 0.82), (60, 0.82)),
    "whole_body": ((0, 0), (38, 0), (48, 0.36), (55, 0.78), (60, 0.78)),
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
