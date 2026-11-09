# Video 6 — Reference Analysis and Rigging Plan

Source: Library file `generated_video6(1).mp4`.
Technical properties: 448×672 portrait, 24 fps, 6.0417 seconds (145 samples including the first and last time points).

## Observed action

This is a front-facing bodybuilding pose sequence, not a running reference. The character keeps a broad planted stance and remains approximately in place. The camera stays low and frontal. The arms begin lowered beside the torso, rise laterally into a broad spread, bend into a double-biceps pose, hold, then open and lower toward a wide finish. The head and trunk remain comparatively steady; the legs and feet do not perform a locomotion cycle.

Observed time beats, translated to the build scene's frames 216–360:

| Source time | Scene frame | Visible pose |
|---|---:|---|
| 0.00–1.00 s | 216–240 | Neutral front stance, arms lowered |
| ~1.50 s | 252 | Arms begin abducting away from the torso |
| ~2.00 s | 264 | Broad lateral arm spread |
| ~2.25 s | 270 | Screen-right fist rises first while the opposite arm remains extended |
| ~2.50 s | 276 | Both elbows fold toward the double-biceps pose |
| ~2.75 s | 282 | Double-biceps flex reaches its peak |
| 3.00–5.00 s | 288–336 | Flex held; minor head and expression changes |
| ~5.50 s | 348 | Arms open laterally again |
| ~6.00 s | 360 | Arms return to the lowered neutral stance |

These are visual timing anchors, not recovered motion-capture markers. The important asymmetrical transition at 2.25 seconds is preserved: the screen-right fist rises first while the screen-left arm remains extended. The final half-second is also a real return to the lowered stance, not a continued wide-arm hold. Intermediate curves are eased between these beats.

## Build interpretation

The action requires arm IK targets that can move independently, elbow pole targets that preserve the outward bend, and a planted leg IK setup so the feet do not slide while the upper body poses. The arm chain includes a clavicle link so the shoulder girdle can participate in the IK solution. Each leg uses a foot target and knee pole. The pose driver object `CTRL_VIDEO6_DRIVER` animates both hand targets and both elbow poles through one reusable action. Arm and leg IK explicitly solve target position; wrist orientation remains a separate calibration because the source provides only a frontal view.

The body should preserve the same base silhouette across the clip. Do not encode the source's small generative frame-to-frame muscle-shape fluctuations as actual volume animation. Instead, reproduce stable visual mass, arm trajectory, held flex, and release. The video shows only one camera view: it does not reveal depth, hidden elbow trajectory, actual joint centers, or a physically measured skeleton. Those aspects must be inferred and checked against anatomy.

## Expected rig controls

- `CTRL_Hand_IK.L/R`: hand endpoint targets.
- `CTRL_Elbow_Pole.L/R`: elbow bend direction.
- `CTRL_Foot_IK.L/R`: planted foot endpoints.
- `CTRL_Knee_Pole.L/R`: knee bend direction.
- `CTRL_Heel_Pivot.L/R` and `CTRL_Toe_Pivot.L/R`: pivot references for the next foot-roll implementation.
- `arm_ik` and `leg_ik`: independent IK/FK influence channels.

The base rig starts in FK mode to preserve its original rest pose. The Video6 action switches both arm and leg IK on for hand targeting and planted-foot control. The Video6 action is housed in a separate Blender scene named `VIDEO6_POSE_STUDY` with its own 216–360 frame range and low frontal camera. It shares the character, rig, controls, and environment objects, but its timeline is independent of the main growth/run-away scene. This prevents an unwanted transition between the two distinct motion studies.

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


## Rigging references consulted

The control design follows Blender's documented IK model: the end-effector target controls position, the pole target controls chain bend direction, chain length selects the ancestors included in the solve, and rotation following is an explicit option. This build currently enables position targeting and leaves target rotation disabled; wrist orientation therefore remains a calibration item.

- Blender 4.5 LTS Manual, Inverse Kinematics Constraint: https://docs.blender.org/manual/en/4.5/animation/constraints/tracking/ik_solver.html
- Blender 4.5 LTS Manual, NLA tracks and strips: https://docs.blender.org/manual/en/4.5/editors/nla/introduction.html
- Blender 4.5 LTS Manual, Editing NLA strips and visual keying: https://docs.blender.org/manual/en/4.5/editors/nla/editing/strip.html
- Blender 4.5 LTS Manual, Rigify limb types: https://docs.blender.org/manual/en/4.5/addons/rigging/rigify/rig_types/limbs.html

The references are used as general rig architecture and verification guidance, not as evidence that the current custom rig already behaves identically to Rigify or has been validated in Blender.
