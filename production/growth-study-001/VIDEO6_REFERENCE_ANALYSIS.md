# Video 6 — Reference Analysis and Rigging Plan

Source: Library file `generated_video6(1).mp4`.
Technical properties: 448×672 portrait, 24 fps, 6.0417 seconds (145 samples including the first and last time points).

## Observed action

This is a front-facing bodybuilding pose sequence, not a running reference. The character keeps a broad planted stance and remains approximately in place. The camera stays low and frontal. The arms begin lowered beside the torso, rise laterally into a broad spread, bend into a double-biceps pose, hold, then open and lower toward a wide finish. The head and trunk remain comparatively steady; the legs and feet do not perform a locomotion cycle.

Observed time beats, translated to the build scene's frames 216–360:

| Source time | Scene frame | Visible pose |
|---|---:|---|
| 0.00–1.25 s | 216–246 | Neutral front stance, arms lowered |
| ~1.50 s | 252 | Arms begin rising away from the torso |
| ~2.00–2.25 s | 264–270 | Broad lateral arm spread |
| ~2.75 s | 282 | Double-biceps flex reaches its peak |
| 3.25–4.50 s | 294–324 | Flex held with small head/torso changes |
| ~5.00 s | 336 | Arms begin opening from the flex |
| ~5.50–6.00 s | 348–360 | Wide arm finish and settle |

These are visual timing anchors, not recovered motion-capture markers. Intermediate curves are eased between these beats.

## Build interpretation

The action requires arm IK targets that can move independently, elbow pole targets that preserve the outward bend, and a planted leg IK setup so the feet do not slide while the upper body poses. The arm chain includes a clavicle link so the shoulder girdle can participate in the IK solution. Each leg uses a foot target and knee pole. The pose driver object `CTRL_VIDEO6_DRIVER` animates both hand targets and both elbow poles through one reusable action.

The body should preserve the same base silhouette across the clip. Do not encode the source's small generative frame-to-frame muscle-shape fluctuations as actual volume animation. Instead, reproduce stable visual mass, arm trajectory, held flex, and release. The video shows only one camera view: it does not reveal depth, hidden elbow trajectory, actual joint centers, or a physically measured skeleton. Those aspects must be inferred and checked against anatomy.

## Expected rig controls

- `CTRL_Hand_IK.L/R`: hand endpoint targets.
- `CTRL_Elbow_Pole.L/R`: elbow bend direction.
- `CTRL_Foot_IK.L/R`: planted foot endpoints.
- `CTRL_Knee_Pole.L/R`: knee bend direction.
- `CTRL_Heel_Pivot.L/R` and `CTRL_Toe_Pivot.L/R`: pivot references for the next foot-roll implementation.
- `arm_ik` and `leg_ik`: independent IK/FK influence channels.

The Video6 action is housed in a separate Blender scene named `VIDEO6_POSE_STUDY` with its own 216–360 frame range and low frontal camera. It shares the character, rig, controls, and environment objects, but its timeline is independent of the main growth/run-away scene. This prevents an unwanted transition between the two distinct motion studies.

## Validation required

1. Run the generator in Blender 4.x and confirm all control objects, IK constraints, pole targets, drivers, NLA tracks, and the separate VIDEO6_POSE_STUDY scene are created.
2. Confirm neutral IK targets exactly match the rest-pose hand and foot endpoints.
3. Adjust elbow and knee pole angles until joints bend in the intended anatomical plane.
4. Render the five key pose frames and compare them side by side with matching source timestamps.
5. Check that the shoulder contour remains connected through the clavicle, the elbow does not collapse, and the forearm/wrist transition remains continuous.
6. Confirm foot contact is stable throughout the pose action.
7. Verify the fingers close naturally for the double-biceps hold and relax on release.
8. Record all Blender execution, render, and visual checks. Python syntax checks alone do not validate the rig.

## Limitations

The source is a generated single-view video rather than calibrated multi-camera footage or marker-based motion capture. The resulting rig can be matched to its visible screen-space poses and timing, but exact 3D depth trajectories cannot be inferred uniquely. IK pole settings, joint limits, skinning, corrective shapes, and final silhouette fidelity require actual Blender inspection.
