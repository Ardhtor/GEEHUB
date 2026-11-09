# GEEHUB Growth Study 001 — Locomotion System

Status: V2.3 run-away action authored in the procedural builder. Blender execution and visual gait validation remain pending.

## Motion requirement

The character must be able to turn away from the viewer, accelerate into a run, and travel away from the fixed camera. This must be genuine object/root movement with an articulated gait, not a camera zoom or an enlarged body moved by perspective alone.

## Action structure

The rig has two independent NLA tracks:

- 01_GROWTH — independent stage control: the original master growth custom-property action. It holds its selected final stage while the locomotion track runs.
- 02_LOCOMOTION — run away: a separate RUN_AWAY — turn, gait, and retreat action. It can be muted or unmuted without deleting growth animation.

The run clip occupies frames 108–208. It turns the rig from its initial front-facing direction to world +Y, away from the camera, over frames 108–112. Four 24-frame gait cycles run from frame 112 through 208. Root motion travels nine scene units along +Y, with constant-speed interpolation. The final render preview is run_away_retreat_endpoint.png.

## Gait contents

The cycle keys alternate left/right thigh drive, knee recovery, counter-swinging upper arms, flexed forearms, relaxed wrists, a restrained torso rhythm, a light finger grip, and toe articulation. Root motion carries the entire rig through the scene; the camera remains static. The camera uses a 65 mm perspective lens calibrated to the old orthographic starting composition so the figure recedes as it moves away. The backdrop has been moved downrange and a pair of runway guides plus a distant threshold establish direction.

## Controls

In Blender, open the NLA Editor and locate 02_LOCOMOTION — run away. Mute it to disable the turn and retreat; unmute it to play the run-away action. The growth-stage strip is independent and remains available on its own track. Adjust the master growth property or growth strip separately. To change distance or duration, edit RUN_RETREAT_DISTANCE, RUN_CYCLE_START, and RUN_CYCLE_END near the top of the builder script.

## Validation gates

1. Verify both NLA tracks exist, are unmuted, and evaluate independently.
2. Scrub frames 108–112 to inspect the turn away from the camera.
3. Scrub the 24-frame gait cycle at multiple phases; verify the opposing leg/arm movement is readable.
4. Check foot clearance, heel strike, toe-off, and floor penetration against the ground plane.
5. Inspect knee, ankle, hip, shoulder, elbow, wrist, hand, finger, and toe deformation during the cycle.
6. Verify the camera marker switches to CAM_RunAway at frame 108, root translation proceeds along world +Y, and the runner stays centered while naturally receding.
7. Render and read back frames 1, 108, and 208. Record Blender execution, animation evaluation, and render validation separately.

## Current boundary

The script now contains the authored action and NLA-track setup, but Blender has not been run here. Do not call the gait validated or production-ready until the track behavior, axis directions, ground contact, and endpoint render have been checked in Blender.
