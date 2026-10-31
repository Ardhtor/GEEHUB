/**
 * GEEHUB Growth Video Studio — content profile.
 *
 * Describes a reproducible bodybuilding-growth video genre, not a copy of
 * any creator's exact footage, edit, or signature assets.
 */

export const growthContentProfile = {
  id: "hyperreal-gym-growth",
  version: 1,
  premise: "A recognizable athlete becomes progressively more imposing in a grounded gym scene.",
  invariants: [
    "preserve the subject's face and identity",
    "preserve the original action and temporal direction",
    "keep anatomy, joints, and limb proportions coherent",
    "retain a consistent camera, lighting, and environment unless a shot change is explicit",
    "make clothing and nearby objects respond plausibly to increasing scale",
    "show gradual change across frames rather than isolated before-and-after jumps"
  ],
  visualLanguage: {
    subject: "adult bodybuilder",
    physique: "extreme muscular development with believable structure and long, proportional limbs",
    surface: "photoreal skin, natural texture, credible highlights and shadows",
    setting: "working gym with recognizable equipment and spatial depth",
    camera: "low-to-neutral angle, deliberate framing, stable perspective",
    movement: ["hold a pose", "controlled flex", "turn or quarter-turn", "relax and reset"],
    pacing: "slow, legible escalation with time to read each change"
  },
  sequence: [
    { beat: "establish", progress: 0.00, direction: "show the athlete, gym, pose, and baseline scale" },
    { beat: "engage", progress: 0.12, direction: "begin a controlled flex or pose transition" },
    { beat: "build", progress: 0.38, direction: "increase height and muscular volume smoothly while preserving motion" },
    { beat: "escalate", progress: 0.68, direction: "make scale unmistakable; let fabric and surroundings register the change" },
    { beat: "arrive", progress: 0.90, direction: "hold the final imposing physique in a readable pose" },
    { beat: "resolve", progress: 1.00, direction: "settle the motion and preserve the final state for a clean ending" }
  ],
  growthChannels: ["height", "torso", "shoulders", "chest", "arms", "legs"],
  continuity: {
    identityAnchor: "face",
    motionAnchor: "tracked body landmarks across adjacent frames",
    temporalRule: "growth is monotonic unless an explicit reverse transformation is requested",
    environmentRule: "environmental reactions follow contact, clearance, and scale evidence"
  }
};

/**
 * Build a shot plan from a requested duration. This is a planning primitive;
 * it does not claim to generate pixels or render a video.
 */
export function buildGrowthSequence(durationSeconds, fps = 24) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError("durationSeconds must be a positive number");
  }
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) {
    throw new RangeError("fps must be an integer from 1 to 120");
  }

  const totalFrames = Math.max(2, Math.round(durationSeconds * fps));
  return growthContentProfile.sequence.map((beat) => ({
    ...beat,
    frame: Math.min(totalFrames - 1, Math.round(beat.progress * (totalFrames - 1))),
    timeSeconds: Math.min(durationSeconds, beat.progress * durationSeconds)
  }));
}
