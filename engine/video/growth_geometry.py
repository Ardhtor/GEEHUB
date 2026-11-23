"""Renderer-independent, bilateral pectoral deformation fields.

Coordinates are local metres, Z-up, subject facing -Y. Project-specific
geometry can be supplied by the growth profile; defaults remain compatible
with older profiles that do not contain a geometry block.
"""
from __future__ import annotations

import math


DEFAULT_PECTORAL_GEOMETRY = {
    "projection": {
        "centre": (0.36, -0.29, 2.27),
        "radius": (0.43, 0.42, 0.32),
        "offset": (0.045, -0.205, 0.0),
    },
    "upper": {
        "centre": (0.34, -0.27, 2.43),
        "radius": (0.40, 0.38, 0.24),
        "offset": (0.018, -0.070, 0.028),
    },
    "outer": {
        "centre": (0.58, -0.22, 2.25),
        "radius": (0.30, 0.40, 0.34),
        "offset": (0.075, -0.052, 0.0),
    },
    "sternal": {
        "centre": (0.17, -0.38, 2.27),
        "radius": (0.17, 0.36, 0.28),
        "offset": (0.030, -0.040, 0.0),
    },
    "lower_shelf": {
        "centre": (0.36, -0.30, 2.12),
        "radius": (0.42, 0.40, 0.20),
        "offset": (0.025, -0.115, -0.018),
    },
    "sternal_groove": {
        "centre": (0.0, -0.50, 2.28),
        "radius": (0.10, 0.25, 0.32),
        "offset": (0.0, 0.055, 0.0),
    },
}


def gaussian(point, centre, radius):
    """Smooth ellipsoidal influence in local mesh coordinates."""
    q = sum(((point[i] - centre[i]) / radius[i]) ** 2 for i in range(3))
    return math.exp(-2.4 * q)


def validate_pectorals_geometry(geometry):
    if geometry is None:
        return []
    if not isinstance(geometry, dict):
        return ["pectorals geometry must be an object"]
    errors = []
    unknown = set(geometry) - set(DEFAULT_PECTORAL_GEOMETRY)
    if unknown:
        errors.append("unsupported pectoral geometry regions: " + ", ".join(sorted(unknown)))
    for region, spec in geometry.items():
        if region not in DEFAULT_PECTORAL_GEOMETRY:
            continue
        if not isinstance(spec, dict):
            errors.append(f"pectorals geometry {region} must be an object")
            continue
        for field in ("centre", "radius", "offset"):
            vector = spec.get(field)
            if not isinstance(vector, (list, tuple)) or len(vector) != 3:
                errors.append(f"pectorals geometry {region}.{field} must contain three numbers")
                continue
            if any(
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or (isinstance(value, float) and not math.isfinite(value))
                or abs(value) > 1000
                for value in vector
            ):
                errors.append(f"pectorals geometry {region}.{field} must contain finite, bounded numbers")
        radius = spec.get("radius")
        if isinstance(radius, (list, tuple)) and len(radius) == 3 and all(
            isinstance(value, (int, float)) and not isinstance(value, bool)
            and (not isinstance(value, float) or math.isfinite(value)) and abs(value) <= 1000
            for value in radius
        ) and any(value <= 0 for value in radius):
            errors.append(f"pectorals geometry {region}.radius values must be positive")
    return errors


def pectoral_offset(point, region, geometry=None):
    """Return a bilateral (dx, dy, dz) offset for one chest shape-key layer."""
    if region not in DEFAULT_PECTORAL_GEOMETRY:
        raise ValueError(f"Unknown pectoral deformation region: {region}")
    x, y, z = map(float, point)
    settings = dict(DEFAULT_PECTORAL_GEOMETRY[region])
    if geometry and region in geometry:
        settings.update(geometry[region])
    centre = tuple(float(value) for value in settings["centre"])
    radius = tuple(float(value) for value in settings["radius"])
    offset = tuple(float(value) for value in settings["offset"])
    dx = dy = dz = 0.0
    for side in (-1.0, 1.0):
        mirrored_centre = (side * abs(centre[0]), centre[1], centre[2])
        weight = gaussian((x, y, z), mirrored_centre, radius)
        dx += side * offset[0] * weight
        dy += offset[1] * weight
        dz += offset[2] * weight
    return dx, dy, dz
