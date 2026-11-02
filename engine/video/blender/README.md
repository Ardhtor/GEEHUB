# Luke rig scaffold — engineering notes

This Blender 4.x generator creates a fused body surface, named armature, spatially blended vertex groups, limb IK targets, a short sanity action, camera, lights, and a saveable .blend project.

## Established
- Real Blender armature and Armature modifier.
- One voxel-remeshed body surface rather than separate flat cut-outs.
- Four-neighbour spatial skin weighting.
- Spine, chest, neck, head, clavicle, arm, hand, thigh, shin, and foot chains.
- IK targets for arms and legs.
- Short motion test to validate basic deformation.

## Not yet established
This is a neutral anatomy blockout, not a faithful Luke likeness or finished Hulum's Cave recreation. It lacks source-fitted face sculpt, detailed muscle topology, fingers, clothing simulation, facial rig, corrective shape keys, and source-matched performance. IK placement and weights require visual inspection in Blender. The source clip must be measured before proportions or animation can be called accurate.

## Next pass
1. Inspect the source clip at representative timestamps.
2. Fit base mesh and camera to source silhouette and perspective.
3. Sculpt recognizable face and add facial controls.
4. Add corrective shape keys for shoulder, elbow, hip, and knee bends.
5. Add continuous phase-four growth with stable terminal values.
6. Fit motion and timing to source; render and review a diagnostic before full export.

The target is the user's stated reference: early Maya-era, fully three-dimensional character animation with continuous body deformation, stable recognizable identity, deliberate camera framing, and uncanny but coherent physical presence. This reproduces broad production characteristics, not a proprietary source model or rig.
