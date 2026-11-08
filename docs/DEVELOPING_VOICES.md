# Developing Voices

GEEHUB character voices develop from repeated use rather than from fixed personality labels. A voice begins with observable speech habits and becomes distinctive through conversation, changing circumstances, relationships, and accumulated linguistic history. The purpose is not to make every line conform to a template. It is to give each inhabitant a stable point of departure from which credible variation and surprise can emerge.

## Initial speech mechanics

Each character record should establish sentence length and rhythm, preferred vocabulary, syntax, contractions, slang, profanity, pauses, interruptions, unfinished thoughts, humour, and conversational initiative. These are observations, not restrictions. A character may speak differently when tired, excited, distracted, comfortable, or under pressure.

## Behaviour in conversation

Record what a character tends to do with language. He may explain, demonstrate, tease, challenge, reassure, deflect, exaggerate, question, or assert. Include how he handles disagreement, embarrassment, praise, uncertainty, and silence. Profanity belongs here as a contextual behaviour: its force depends on whether it expresses surprise, irritation, affection, emphasis, humour, or aggression. Do not distribute swear words uniformly across the cast.

## Acquired language

Conversations change the participants. Characters may borrow expressions, imitate rhythms, develop private references, misquote one another, or turn an accidental phrase into a recurring joke. Record meaningful transfers with their origin, adopters, altered meanings, and the encounter in which they arose. Acquisition should influence a voice without erasing its earlier characteristics.

## Emotional variation

Maintain a flexible account of how the same person speaks across excitement, anger, embarrassment, affection, competition, vulnerability, fatigue, and relaxation. These are situational variations of one identity, not separate personas. Do not force every emotional state to produce a conspicuous verbal marker.

## Linguistic history

Preserve recurring expressions, nicknames, private jokes, verbal habits, and changes in register. Mark expressions as current, emerging, dormant, or retired where useful. Earlier speech should remain part of the character's history; new language does not overwrite it. An old expression may return when a particular person, place, or memory is present.

## Iterative generation

The working cycle is instantaneous: write a line, let it alter the shared situation, and let the next line inherit that altered situation. The writer does not stop to build a profile between turns. Each utterance changes the immediate conversational context: who has the floor, what has just been understood, what emotional tone is active, what the participants now know about one another, and which earlier remarks remain present. A voice develops in the act of speaking. Later editorial review may preserve durable discoveries, but it does not stand between one line and the next.

## Initial ensemble

The first voice-development group is Teal Titan, Joey, Marcus, and Arthur. Teal Titan's starting register is relaxed, confident, economical, and dryly amused. Joey's is responsive, intimate, improvisational, and variable with company. Marcus's is direct, socially expressive, competitive, and prone to comic amplification. Arthur begins as a precise observer whose language develops through acquisition; he notices how expressions function socially and gradually makes some of them his own.

These are initial hypotheses, not finished voice profiles. Dialogue samples and later encounters should refine them. Do not assume that a character's name, role, body, or broad temperament is enough to determine his speech.

## Editorial standard

Write dialogue as inhabited speech, not as a demonstration of the voice system. Avoid making every character equally witty, equally articulate, equally profane, or equally self-aware. Let conversations contain ordinary remarks, incomplete thoughts, misunderstandings, interruptions, jokes that do not land, and moments when nobody has anything useful to say. Use restrained formatting and let the prose carry the scene without excessive headings, bold emphasis, badges, or decorative labels.

The durable result of each exchange is not merely a transcript. It is any consequential change in familiarity, shared language, relationship, memory, or future expectation. Apply that change immediately to the live context so the very next line can respond to it. Preserve durable changes in character records and story continuity without making record-keeping a prerequisite for conversation.

## Instantaneous runtime

The runtime in `engine/voices/` treats every utterance as a synchronous state transition. `applyTurn` updates the speaker's recent history, the scene, the participants' relationship context, and the shared conversational state before returning. Its `next_context` value is intended for the very next generation step. There is no queue or delayed analysis stage. The host/model supplies the next utterance; the runtime makes the changed context immediately available to it. Lightweight speech analysis remains available for later inspection, but it does not control the transition. See `engine/voices/README.md` for the API and test command.

