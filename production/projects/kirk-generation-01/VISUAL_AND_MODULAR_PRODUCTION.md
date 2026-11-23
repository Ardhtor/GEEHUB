# Generation 01 — Visual and Modular Production Standard

This document defines the minimum production package for each of the twenty founding characters. It is a specification and review checklist; it does not claim that a render, rig, or mesh exists before the corresponding asset is generated and reviewed.

## Reference sheet layout

Each character receives an individual sheet with a stable character ID and prompt version. The sheet contains a face strip (front, three-quarter, profile, back), a full-body orthographic turnaround (front, left profile, back), four signature poses, and four expression states. Include a silhouette-only pass and proportion callouts for shoulder width, ribcage depth, waist, pelvis, arm length, thigh length, and calf volume. Use a neutral studio environment, consistent eye-height camera, even lighting, and a lens that does not distort proportions.

## Pose library

Every character must have: (1) neutral front relaxed, (2) three-quarter signature bodybuilding pose, (3) side pose, and (4) action/work pose tied to his competence. Add a back pose when the specialization depends on lats, traps, or posterior chain. A pose must show balance, joint placement, weight transfer, and a readable center of mass.

## Modular model breakdown

Keep these components separable and consistently named: head, hair, neck, torso, chest_L/R, back_L/R, upper_arm_L/R, forearm_L/R, hand_L/R, pelvis, thigh_L/R, calf_L/R, foot_L/R, wardrobe_top, wardrobe_bottom, footwear, accessories, and props. Character-specific components may be split further. Clothing must remain independent of body geometry and support alternate fit states. Equipment and environment props must not be baked into the character mesh.

## Rig and deformation

Use a humanoid skeleton with clavicle/scapula, spine, pelvis, shoulder, elbow, wrist, hip, knee, ankle, hand, and foot controls. Include corrective shapes for overhead reach, front double-biceps, rear double-biceps, side chest, side triceps, lat spread, deep squat, hip hinge, loaded carry, and relaxed breathing. Weight distribution must be testable under static and moving poses. Do not use global scale as a substitute for anatomical growth; regional geometry changes must preserve joints, skin folds, tendon transitions, and wardrobe fit.

## Materials and lighting

Maintain distinct material assignments for skin, hair, cloth, rubber, leather, painted metal, bare metal, and studio floor. Skin roughness and pore scale remain stable across render resolution. Use neutral key/fill/rim lighting for reference sheets; use dramatic lighting only for separate presentation renders so it does not obscure anatomy.

## Asset naming and provenance

Use G01_<CHARACTER_ID>_<ASSET_KIND>_v###. Record character ID, generation, parent asset IDs, prompt text and version, tool/model, seed if available, dimensions, color space, creation date, review status, reviewer, and notes. A derivative must reference its source asset. Never overwrite an approved baseline; create a new version and record the difference.

## Quality gates

- Identity: face landmarks and hair silhouette remain recognizable across all views.
- Anatomy: joint centers, limb lengths, insertions, and body balance agree across views.
- Differentiation: twenty silhouettes remain distinguishable at thumbnail size.
- Pose: each pose is anatomically coherent and communicates specialization.
- Modularity: clothing, props, and body parts remain separately editable.
- Deformation: corrective shapes work at the extremes listed above.
- Continuity: each growth pass retains the previous baseline and documents regional changes.
- Provenance: every final asset has a complete manifest entry.

## Current truth

Generation 01 identity and production specification are established. Rendered reference sheets, finished 3D assets, rigs, and animation clips are not yet evidenced by this package and remain pending until delivered and reviewed.
