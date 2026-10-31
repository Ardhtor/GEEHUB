/**
 * Deterministic growth-curve evaluator.
 *
 * Growth keys describe the intended body-scale change over source time.
 * The renderer maps these channels onto tracked body regions; this module
 * does not synthesize pixels or claim to perform deformation itself.
 */

const CHANNELS = ["height", "torso", "shoulders", "arms", "legs"];

function finiteScale(value, name) {
  if (!Number.isFinite(value) || value < 1) {
    throw new TypeError(`${name} must be a finite scale >= 1`);
  }
  return value;
}

export function normalizeGrowthCurve(keys) {
  if (!Array.isArray(keys) || keys.length < 2) {
    throw new TypeError("growth curve requires at least two keys");
  }

  const normalized = keys.map((key, index) => {
    if (!Number.isFinite(key.time) || key.time < 0) {
      throw new TypeError(`growth key ${index} has invalid time`);
    }
    const values = {};
    for (const channel of CHANNELS) {
      values[channel] = finiteScale(key[channel] ?? 1, channel);
    }
    return { time: key.time, ...values };
  }).sort((a, b) => a.time - b.time);

  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i].time <= normalized[i - 1].time) {
      throw new TypeError("growth key times must be unique and increasing");
    }
    for (const channel of CHANNELS) {
      if (normalized[i][channel] < normalized[i - 1][channel]) {
        throw new RangeError(`${channel} growth must be cumulative`);
      }
    }
  }
  return normalized;
}

export function evaluateGrowthCurve(keys, time) {
  const curve = normalizeGrowthCurve(keys);
  if (!Number.isFinite(time) || time < 0) {
    throw new TypeError("time must be a non-negative number");
  }

  if (time <= curve[0].time) return { ...curve[0] };
  if (time >= curve.at(-1).time) return { ...curve.at(-1) };

  const nextIndex = curve.findIndex((key) => key.time >= time);
  const a = curve[nextIndex - 1];
  const b = curve[nextIndex];
  const t = (time - a.time) / (b.time - a.time);
  // Smoothstep eases the rate of change while keeping every channel monotonic.
  const eased = t * t * (3 - 2 * t);
  const result = { time };
  for (const channel of CHANNELS) {
    result[channel] = a[channel] + (b[channel] - a[channel]) * eased;
  }
  return result;
}

export function sampleGrowthCurve(keys, duration, sampleRate = 24) {
  const curve = normalizeGrowthCurve(keys);
  if (!(duration > 0) || !(sampleRate > 0)) {
    throw new TypeError("duration and sampleRate must be positive");
  }
  const count = Math.ceil(duration * sampleRate);
  return Array.from({ length: count + 1 }, (_, frame) => {
    const time = Math.min(frame / sampleRate, duration);
    return { frame, ...evaluateGrowthCurve(curve, time) };
  });
}

export const GROWTH_CHANNELS = Object.freeze([...CHANNELS]);
