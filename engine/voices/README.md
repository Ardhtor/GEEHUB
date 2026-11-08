# Developing Voices — instantaneous runtime

The voice engine is a synchronous context transition. Each line is applied as it is written, and the returned context is already the context for the next line. There is no sample queue, waiting period, scheduled analysis, or separate profile-building pass.

- `voice-profiles.json` supplies editable starting hypotheses for Teal Titan, Joey, Marcus, and Arthur.
- `voice-engine.mjs` applies each utterance to the shared scene, speaker history, participant relationships, and recent conversational state.
- `voice-engine.test.mjs` verifies that a turn changes the next-turn context immediately.

Run the tests from the repository root:

```sh
node --test engine/voices/voice-engine.test.mjs
```

The host or language model writes the actual next utterance. The runtime does not pretend to be a language model or independently invent dialogue. Its job is to make the context transition explicit and immediate, so the next generation step inherits the changed situation. The return value from `applyTurn` contains `next_context`; pass that directly into the next generation step.

```js
import seed from "./voice-profiles.json" with { type: "json" };
import { createVoiceStore, applyTurn } from "./voice-engine.mjs";

const store = createVoiceStore(seed);
const first = applyTurn(store, {
  characterId: "marcus",
  text: "That was fucking enormous.",
  scene: "Gold's on 5th",
  participants: ["teal-titan", "joey", "arthur"],
  emotion: "impressed",
  consequence: "The room reads the profanity as emphasis and admiration, not hostility."
});

// first.next_context is the live context for the very next line.
const contextForNextLine = first.next_context;
```

The engine keeps lightweight descriptive analysis for editorial inspection, but analysis does not gate or delay the transition. It does not infer accent, identity, or personality from word counts. A durable change in the scene should be supplied as `consequence`; expression transfers remain explicit editorial decisions rather than guesses. The store is in memory until a host application persists its exported JSON.
