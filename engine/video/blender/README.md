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

## Hulum's Cave target translation

The public search did not surface a verifiable Hulum's Cave technical breakdown, so this implementation is guided by the visual target you named and by documented Maya-era character-TD techniques. The important rigging layers are not just a skeleton: facial and body deformation, sliding skin, volume-preserving shoulder/hip behavior, secondary jiggle, and corrective blend shapes. A 2010 character-TD reel documents these as separate systems (facial deformation, skin sliding, spherical radial-basis-function joints, dynamic transforms, GPU blend shapes, jiggle and wrap deformers). A production feature-film workflow also describes animating with a fast low-resolution rig first, then transferring the motion to a muscle/skin rig for flex, jiggle and sliding before caching for render.

GEEHUB's next rig iterations should therefore add, in this order:
1. **Animator controls:** clean FK/IK controls, pole vectors, foot/hand spaces, spine controls, picker and switch logic.
2. **Corrective deformation:** shoulder, chest, elbow, hip and knee corrective shapes; volume preservation through joint rotations.
3. **Muscle layer:** muscle bulge and sliding under the skin, driven by joint angles and stretch, with phase-four growth as a separate global deformation control.
4. **Secondary motion:** damped jiggle and soft-tissue settling, never replacing the underlying skeletal motion.
5. **Facial identity rig:** jaw, eyes, brows and expression shapes fitted to the actual source subject.
6. **Two-rig workflow:** low-cost animation proxy for blocking, then a higher-detail deformation rig for final render.

References used to shape the engineering target:
- Chad Vernon, *Character TD Reel 2010* — facial deformation, skin sliding, SRBF joints, dynamic transforms, blend shapes, jiggle and wrap deformers: https://vimeo.com/13353565
- *Fur Less*, Computer Graphics World — low-resolution animation rig followed by muscle/skin rig for jiggle, flex and sliding: https://www.cgw.com/Publications/CGW/2010/Volume-33-Issue-9-October-2010-/Fur-Less.aspx

These are technical analogues, not evidence that Hulum's Cave used the same rig. Exact matching still requires frame-by-frame inspection of the reference videos and the supplied source clip.


## Structural validation and diagnostic renders

After generating the scene, run the validator from the folder containing the saved
`.blend` file:

```bash
blender --background Luke_Rig_Scaffold.blend --python validate_luke_rig.py
```

The validator checks the fused body mesh, armature binding, core skeleton, IK
constraints, sanity action, camera, and the phase-four-only growth control. It then
renders four diagnostic stills at frames 1, 90, 110, and 180 into
`GEEHUB_DIAGNOSTICS/` and writes `rig_validation.json`.

A PASS means the expected scene structure exists and renders. It does **not** mean
the model resembles Luke, the weights deform cleanly, or the motion matches the
reference clip. Those require visual review and source-footage measurements. The
diagnostic frames are review artifacts, not a substitute for the continuous final
video.
