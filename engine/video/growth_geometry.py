"""Renderer-independent, bilateral pectoral deformation fields.

Coordinates follow GEEHUB's unified character convention: metres, Z-up,
subject facing -Y. The fields are deliberately local so chest development
does not scale the face, abdomen, or entire torso.
"""
from __future__ import annotations

import math


def gaussian(point, centre, radius):
    """Smooth ellipsoidal influence in local mesh coordinates."""
    q = sum(((point[i] - centre[i]) / radius[i]) ** 2 for i in range(3))
    return math.exp(-2.4 * q)


def pectoral_offset(point, region):
    """Return (dx, dy, dz) for one pectoral shape-key layer.

    The two sides are mirrored. Positive growth projects toward the camera
    (-Y), adds a restrained outward sweep, and gives the upper chest a
    separately controllable clavicular fullness. No source vertex is moved
    outside the influence field.
    """
    if region not in {"projection", "upper", "outer"}:
        raise ValueError(f"Unknown pectoral deformation region: {region}")
    x, y, z = map(float, point)
    dx = dy = dz = 0.0
    for side in (-1.0, 1.0):
        if region == "projection":
            centre, radius = (side * 0.36, -0.29, 2.27), (0.43, 0.42, 0.32)
            weight = gaussian((x, y, z), centre, radius)
            dx += side * 0.045 * weight
            dy -= 0.205 * weight
        elif region == "upper":
            centre, radius = (side * 0.34, -0.27, 2.43), (0.40, 0.38, 0.24)
            weight = gaussian((x, y, z), centre, radius)
            dx += side * 0.018 * weight
            dy -= 0.070 * weight
            dz += 0.028 * weight
        else:
            centre, radius = (side * 0.58, -0.22, 2.25), (0.30, 0.40, 0.34)
            weight = gaussian((x, y, z), centre, radius)
            dx += side * 0.075 * weight
            dy -= 0.052 * weight
    return dx, dy, dz
