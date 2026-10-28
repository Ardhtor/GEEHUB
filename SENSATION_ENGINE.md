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
