# GEEHUB — Clothing and Flesh System

**Status:** active design target for Growth Study 001  
**Scope:** fictional adult characters, visual continuity, procedural character assets, still-image and moving-image production.

## Governing principle

GEEHUB treats clothing and flesh as two distinct material systems that continually affect one another. The body is not a rigid sculpture with a shirt painted over it, and clothing is not a decorative texture that automatically scales with the wearer. Flesh has living volume, connected anatomy, skin, soft tissue, posture, motion and contact. A garment has its own cut, construction, material, seams, closures, fit, weight and response to movement. A convincing transformation makes both systems legible and preserves the relationship between them.

The body may become broader, deeper, taller or more muscular; the garment must respond according to its actual construction. Fabric can drape, hang away from the body, gather, wrinkle, stretch, compress, pull at a seam, shift at a waistband or restrict a movement. Those responses should be materially plausible and cumulative. A garment does not have to tear whenever a body grows. It may remain comfortable, become close-fitting, require adjustment, be replaced, or become an object the character deliberately keeps. Damage is one possible consequence, not the default visual payoff.

## Flesh as continuous living form

Preserve the character as the same recognizable adult person while the physical baseline changes. Retain face, posture, habitual movement, asymmetry and established body proportions. Muscles should read as rounded, layered and continuous beneath skin, not as separate triangular wedges or hard panels. Large mass should retain transitions, weight and softness; avoid plastic surfaces, excessive pore noise, metallic gloss and artificially etched separations.

A growth pass must consider the body as a connected structure. Changes to chest, shoulders and upper back affect the silhouette together; arm mass affects the distance between the arms and torso; neck and trapezius development alter the transition from head to shoulders; legs and hips affect stance, stride and balance. Do not inflate isolated body parts while leaving joints, limb lengths, posture and the rest of the silhouette behind. Where source evidence does not support an exact measurement, preserve a qualitative observation rather than inventing a number.

Skin and flesh are not interchangeable with a shader. Skin needs believable tonal variation, light response and contact with surrounding materials. Under movement, the body should settle, compress and carry weight in a coherent way. Rigging, corrective shapes, deformation and muscle sliding remain separate production concerns; a smooth surface alone does not prove that the body moves convincingly.

## Clothing as construction, wardrobe and evidence

Every recurring garment should have an identity beyond its colour. Record its type, cut, material, panels, seams, hems, closures, elastic, waistband, pockets, distinctive wear and known fit. Preserve signature clothing cues unless a scene deliberately changes the outfit. A tank top, fitted shirt, training trunks, shorts, trousers, jacket or uniform each reveals and conceals the body differently. Their construction should matter to the image.

Observe the parts of a garment that correspond to the changing body:

- **Chest and upper back:** front-panel ease, shoulder seams, armholes, collar position, placket or closure tension, and fabric direction across the torso.
- **Shoulders and arms:** sleeve circumference, sleeve opening, armhole depth, seam placement and the clearance needed for the arm to move.
- **Neck and upper back:** collar position, neckline, yoke and the way the garment sits when the wearer turns or raises his arms.
- **Waist, hips and abdomen:** waistband position, side seams, front rise, seat, hem and the garment's ability to remain in place while the wearer sits or bends.
- **Thighs and legs:** leg openings, inseam, fabric contact, stride clearance and folds produced by sitting, walking or training.

The same garment should not change cut or material arbitrarily between frames. If the character changes clothes, show or record that choice. Tailoring, borrowing a larger size, opening a seam, replacing a garment or choosing a different cut can become ordinary character actions, social exchanges or production events. Clothing should express personal taste and agency as well as bodily scale.

## Fit and strain are a sequence

Treat fit as a changing state rather than a binary condition. A useful sequence is:

1. **Baseline fit:** the garment's ordinary drape, clearance and contact are established.
2. **Closer fit:** a specific region begins to sit more closely against the changing body; the surrounding cloth still behaves naturally.
3. **Tension or displacement:** fabric direction, seam position, waistband, closure or movement clearance shows a visible change.
4. **Adaptation:** the wearer adjusts the garment, changes size, chooses another cut, or accepts a new wardrobe arrangement.
5. **Material failure, where justified:** a seam, closure, elastic or panel gives way only when the garment's construction and the visible force support that event.
6. **New baseline:** the chosen garment and the body state are recorded together, including whether the item remains in use.

Not every character follows this sequence. A loose garment may continue to fit; a tailored garment may become restrictive early; a character may prefer to replace clothing before it becomes uncomfortable. Preserve these differences. Do not turn every scene into the same shirt-stretching joke or every transformation into an automatic clothing rupture.

## Interaction, movement and camera

A garment must be evaluated while the character moves, not only in a neutral pose. Use matched observations of standing, turning, reaching, lifting, flexing, sitting, walking and relaxed recovery when those actions belong to the scene. Cloth should respond to gravity, body contact, motion and the garment's anchoring points. Skin, fabric, furniture and equipment should create coherent contact rather than visibly intersecting or floating through one another.

Camera placement should make the relationship readable. A close view may reveal a sleeve seam or waistband shifting; a medium view can show how the torso changes the whole garment; a full-body view can show stance, leg proportions and overall silhouette. Keep camera, pose, lens or projection, crop and lighting comparable when judging a before-and-after pass. Do not infer a physical change from a different camera angle alone.

In prose, allow physical evidence to enter the scene through action: a man pulls his shirt straight after training, notices the shoulder seam has moved, borrows a different size, sits carefully in familiar shorts, or asks a friend whether the new fit looks right. These moments should arise from the character and the situation. They are not a mandatory checklist and should not displace personality, humour, relationships or the rest of ordinary life.

## Continuity record

Each approved subject state should retain:

- subject and revision identifiers;
- source image or video and frame/timecode where available;
- body baseline, region observations and known measurement basis;
- identity and proportion invariants;
- garment IDs and outfit state;
- garment construction and material notes;
- fit state by relevant body region;
- observed fabric response, contact and movement;
- camera, pose, lighting and environment conditions;
- intended change, observed result, confidence and review status;
- user correction or approval and the next state reference.

Keep direct observations separate from interpretation and invention. Preserve prior states so a later frame can be compared with the actual previous baseline rather than a remembered description.

## Production implementation boundary

Growth Study 001 V3 is still a blockout. It uses a voxel-fused anatomical surface and separate simple forms for training trunks and a waistband. It has distinct skin and cloth materials, but the scene specification explicitly records that cloth simulation, production topology, corrective shapes, muscle sliding and final rig validation are not yet present. Do not describe the current prototype as a working garment simulation.

The next engineering sequence is:

1. Run and inspect the existing V3 scene in Blender; retain its render and rig checks as the baseline.
2. Improve connected body deformation, joint behaviour and corrective shapes before adding detailed surface complexity.
3. Replace the simple trunks and waistband forms with a separate, reusable garment mesh built around panels, openings, seams and anchoring points.
4. Add body collision and cloth response, beginning with a stable waistband and controlled cloth drape; keep the garment independently addressable from the body.
5. Test the garment across matched growth values and several poses, recording intersections, stretch, fold direction, seam displacement and movement clearance.
6. Add more garment types as reusable modular assets. Do not generate a complete wardrobe or full scene when a single garment component is the requested deliverable.

Blender execution and render validation must be recorded separately from source-code creation and syntax checks. A specification, a script, a successful scene build and a visually approved cloth simulation are four different states.

## Acceptance test

A result passes this system when the adult subject remains recognizable; flesh reads as a continuous living form; the garment retains its own construction and identity; fit and material response follow the body change; movement does not expose avoidable intersections or arbitrary shape changes; and the new state can be compared with its actual source. The result should feel specific to this man, this garment and this stage—not like a generic body with generic clothing.

The clothing-and-flesh relationship is a primary GEEHUB visual and narrative concern. It belongs in image generation, animation, comic panels, character continuity, scene writing and reusable production assets.
