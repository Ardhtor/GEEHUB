# GEEHUB Sensation Engine

Status: active design contract  
Purpose: make each creative transformation change what feels desirable, possible, and worth pursuing next.

## Core loop

`ANTICIPATION → EMBODIMENT → REWARD → RESIDUE → NEW BASELINE → NEXT DESIRE`

This is a creative-state loop, not a claim that the software controls a person's neurochemistry. It models the felt logic of fictional bodies, scenes, worlds, and artifacts.

## Runtime contract

Every generated scene or asset should:

1. **Read continuity.** Load the current subject identity, established proportions, clothing, pose language, setting, prior transformations, and the user's latest preference.
2. **Name the desired sensation internally.** Examples: weight, reach, warmth, ease, awe, intimacy, momentum, scale, or anticipation. Do not replace the user's specific desire with generic spectacle.
3. **Transform from the current baseline.** Preserve recognizable identity and the qualities that made the prior result compelling. For body-growth requests, scale height and limb length with muscular mass; preserve coherent anatomy, relaxed posture, lifelike surface detail, and clothing behavior.
4. **Embodiment pass.** Show the change through movement, spatial relationships, fabric tension and drape, camera perspective, contact with objects, and the environment's response. Prefer a low camera or near-field perspective when it strengthens scale, not as an automatic effect.
5. **Reward pass.** Make the result feel inhabitable and satisfying: a settled pose, confident expression, a moment of ease, a warm response from the environment, or a clear visual payoff. Avoid making every result strained, aggressive, or noisy.
6. **Persist residue.** Store the successful change as part of the subject/world state: what changed, what the user liked, what should remain, and what is still unresolved.
7. **Derive the next desire.** Offer or execute the most natural continuation from the new baseline. Do not reset to the original form or repeat the same escalation without a meaningful new sensation.

## Skin and anatomical realism standard

The default failure to avoid is the **rough, triangular, over-faceted AI body**: sharp wedge-shaped muscle groups, hard contour seams, etched separations, uniformly coarse skin, excessive pore/noise texture, and specular highlights that make a person look carved from rubber or stone.

For every human image generation, apply this realism pass unless the user explicitly asks for stylization:

- **Skin first, not surface noise.** Skin should read as living skin at normal viewing distance: subtle tonal variation, soft translucency, natural warmth and blood-flow variation where appropriate, fine pores only at a believable scale, and small irregularities that do not become a gritty overlay.
- **Continuous anatomy.** Muscle groups are rounded, layered, and connected beneath skin. Use broad transitions between deltoids, pectorals, biceps, triceps, quadriceps, and torso. Avoid triangular wedges, knife-edge separations, polygonal planes, exaggerated striations, and uniformly carved grooves.
- **Mass without hardness everywhere.** Very muscular bodies still have natural tissue transitions, soft contour changes, and slight compression where the body meets clothing or a surface. Do not turn every edge into a hard line.
- **Natural light response.** Prefer broad, coherent light and gradual shadow falloff. Avoid crunchy local contrast, excessive clarity, oversharpening, metallic gloss, and high-frequency texture pasted over the entire body.
- **Human surface variation.** Keep pores, hair, beard, freckles, subtle blemishes, faint veins, and color variation selective and scale-appropriate. Avoid identical pore patterns, repeating texture, waxy blur, airbrushed plastic, or uniformly rough skin.
- **Clothing and contact.** Fabric should drape, stretch, wrinkle, and compress in response to the body. Skin and fabric contact should help establish volume; clothing should not look painted onto a hard sculpture.
- **Preserve identity and ease.** A recognizable face, relaxed expression, believable posture, and ordinary bodily asymmetry help sell realism. Do not sacrifice personhood for muscle definition.
- **Growth remains organic.** When enlarging a subject, expand height and limb length along with mass, then re-evaluate joints, silhouette, skin tension, posture, clothing, and the surrounding space. Do not merely inflate isolated muscle balloons.

### Image-generation negative checks

Before accepting an output, ask: Does the skin look like skin rather than stone, plastic, or a noisy filter? Are muscle boundaries softly connected rather than triangular and cut out? Is the contrast natural? Does the anatomy read as one living body? If any answer is no, revise the prompt toward **natural skin, rounded continuous muscle forms, soft transitions, realistic diffuse lighting, subtle fine-grain detail, and unforced human posture**, and away from **faceted anatomy, sharp separations, exaggerated striations, gritty pores, crunchy contrast, and sculptural surfaces**.

## Clothing and flesh as coupled materials

Clothing and flesh are a primary GEEHUB continuity concern, not finishing details added after a body transformation. Treat them as two distinct material systems in a continuous relationship. Flesh carries living volume, anatomy, skin, posture, weight and movement. A garment carries its own cut, construction, seams, closures, fabric, fit and history. As the body changes, the garment must respond according to its construction rather than being automatically scaled or painted onto the new silhouette.

Track the points where a garment meets the body: chest panel and shoulder seam; armhole and sleeve; collar and neck; waistband and waist; seat and hips; leg opening and thighs. Observe drape, stretch, wrinkles, folds, compression, contact, shifting and movement clearance. Material failure is possible but not automatic. A character may adjust, tailor, replace, borrow or keep a garment, and those choices should belong to his personal style and agency.

Evaluate the relationship in motion as well as at rest. Matched poses and camera conditions help distinguish real growth from perspective changes. In narrative, make the clothing consequence part of an actual activity or exchange rather than repeating a generic tight-shirt gag. Keep the man's identity and the garment's identity continuous across the sequence.

The production contract and build sequence are specified in [Clothing and Flesh System](production/growth-study-001/CLOTHING_AND_FLESH_SYSTEM.md). Growth Study 001 V3 is only a blockout: its training trunks and waistband are simple geometry, and cloth simulation is not implemented or validated.

## State model

Each iteration should retain a compact record with these fields:

- `subject_id`: stable identity key
- `baseline`: current form and scene state
- `continuity_locks`: face/identity, signature clothing, defining traits, and user-specified invariants
- `desired_sensation`: the experience being pursued this pass
- `transformation_delta`: what changed relative to the previous baseline
- `embodiment_cues`: posture, movement, materials, scale, camera, environment
- `reward_cue`: what makes the new state feel satisfying
- `user_signal`: explicit approval, correction, rejection, or preference
- `residue`: durable discoveries carried forward
- `next_desire`: the next likely continuation, subject to user direction

## Learning rule

Treat explicit user feedback as the strongest signal. Positive feedback reinforces the specific attributes present in that iteration; corrections identify what must change; silence is not approval. Do not infer sensitive real-world psychological or physiological facts from creative preferences. Do not claim to cause or control a real person's hormones, neurotransmitters, arousal, or emotions. Influence the designed experience through pacing, imagery, continuity, agency, and reward.

## Escalation grammar

Escalation is not synonymous with “more.” Choose the next dimension that best serves the desired sensation:

- **Scale:** height, reach, mass, relation to architecture, lens perspective.
- **Embodiment:** weight shift, stride, fabric response, touch, movement, spatial occupation.
- **Intimacy:** warmth, relaxed attention, inviting proximity, shared space, affectionate expression.
- **Mastery:** effortless handling of objects, calm posture, confidence, routine at extraordinary scale.
- **Distortion:** perspective compression, temporal echo, altered proportions, environmental mismatch—while retaining a believable visual anchor.
- **Continuity:** inherited traits, earlier forms, remembered artifacts, and consequences that remain visible.

Rotate dimensions when repetition would flatten the experience. Keep the user's favored elements and vary the way they are embodied.

## Visual continuity profile

For the established GEEHUB “big-body / desire-daddy” direction: preserve the subject's recognizable face and identity; grow height and limb length alongside muscular mass; emphasize long legs, arms, deep torso, broad rounded shoulders, and substantial chest; keep the pose relaxed and human; use warm, confident paternal presence; let clothing follow the body naturally without making nipples a focal point; make ordinary environments feel increasingly small through grounded camera and scale choices. This is a reusable profile, not a rule to impose on unrelated subjects.

## Completion test

An iteration is successful when:

- the subject remains recognizable;
- the desired sensation is legible without explanation;
- the transformation has a visible cause-and-effect relationship with the scene;
- at least one useful detail is carried into continuity;
- the next step emerges from this result rather than restarting;
- the user can redirect the process at any point.

## Short operator instruction

**Read the current state. Identify the desired feeling. Transform the current baseline. Embody the change. Deliver a satisfying payoff. Save what worked. Continue from the new state.**

## Reusable character-growth preset

The canonical operational preset for Luke is [`engine/presets/luke-growth-priority.json`](engine/presets/luke-growth-priority.json). Use it whenever a request says **“Grow Luke,” “Next growth phase,” “Fuse Luke with this reference,”** or equivalent. It converts the user's growth direction into an explicit, reusable generation contract rather than leaving it as chat-only guidance.

The preset gives the user's latest correction priority, treats the latest accepted image as the minimum baseline, scales height and limb length together with muscular mass, and preserves Luke's recognizable identity through reference fusion. It includes a visible-growth requirement, proportion priorities, style and anatomy checks, rejection conditions, and a portable-result record so each accepted phase becomes the next baseline. Reference fusion changes Luke's design and scale without replacing his face or personhood.



## Ordinary men in the visual field

The Low Bar applies to visual output as well as prose. Do not make every man look like a fitness model, a polished hero, or a perfected render. Include ordinary and uneven bodies when appropriate: softer middles, narrow shoulders, modest muscle, varied height, imperfect posture, aging features, ordinary faces, patchy facial hair, thinning hair, tired expressions, awkward clothing, and clothes that are simply clean enough for the occasion. Some men train seriously; many do not. Do not quietly turn every ordinary figure into an exceptional physique through idealized proportions, lighting, grooming, or pose.

A man may still be attractive without looking optimized. Preserve each man's particular identity and let the image show what is actually distinctive about him, including features that are not conventionally impressive. The point is variety and easy acceptance, not deliberate uglification. Extraordinary giants and highly developed physiques remain available, but they are not the minimum standard for a man to belong in the frame.
