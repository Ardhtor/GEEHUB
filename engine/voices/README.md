# Developing Voices — engine

This directory contains the first executable layer of the GEEHUB voice system.

- `voice-profiles.json` stores provisional character hypotheses and the encounter ledger.
- `voice-engine.js` records utterances, analyses basic speech mechanics, tracks expression transfers, and produces per-character reports.
- `voice-engine.test.mjs` verifies the core behaviour with Node's built-in test runner.

Run the tests from the repository root:

```sh
node --test engine/voices/voice-engine.test.mjs
```

The analysis is deliberately modest. It counts words, sentence lengths, contractions, recurring terms, and a small profanity vocabulary. It does not infer accent, identity, emotion, or personality from text. Scene and emotion labels are supplied as context by the writer. Profiles begin as provisional hypotheses and should be revised only when actual dialogue supports the change.

Example:

```js
import seed from "./voice-profiles.json" with { type: "json" };
import { createVoiceStore, recordUtterance, transferExpression, getVoiceReport } from "./voice-engine.js";

const store = createVoiceStore(seed);
recordUtterance(store, {
  characterId: "marcus",
  text: "That was fucking enormous.",
  scene: "Gold's on 5th",
  emotion: "excited"
});
transferExpression(store, {
  expression: "That's the point.",
  origin: "teal-titan",
  adopters: ["joey", "arthur"],
  context: "A recurring correction during a group conversation"
});
console.log(getVoiceReport(store, "marcus"));
```

The store is an in-memory data structure. Export it with `exportVoiceStore` and persist the returned JSON through the host application's storage layer. The engine itself does not silently write to disk or a remote service.
