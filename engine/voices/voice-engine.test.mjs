import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const seed = JSON.parse(readFileSync(new URL("./voice-profiles.json", import.meta.url), "utf8"));
import { createVoiceStore, analyseSample, applyTurn, getLiveContext, recordEncounter, transferExpression, getVoiceReport, exportVoiceStore } from "./voice-engine.mjs";

test("analyses sentence rhythm and profanity descriptively", () => {
  const result = analyseSample("That's fucking enormous. What the hell happened?");
  assert.equal(result.sentence_count, 2);
  assert.equal(result.profanity_count, 2);
  assert.ok(result.average_sentence_length > 0);
});

test("applies a spoken line synchronously to the next-turn context", () => {
  const store = createVoiceStore(seed);
  const result = applyTurn(store, { characterId: "marcus", text: "That was fucking enormous.", scene: "Gold's on 5th", participants: ["joey", "arthur"], emotion: "excited", consequence: "The others understand Marcus is impressed, not angry." });
  assert.equal(store.runtime_context.turn, 1);
  assert.equal(result.next_context.turn, 1);
  assert.equal(result.next_context.last_speaker, "marcus");
  assert.equal(result.next_context.participants.find(p => p.id === "arthur").relationship_context.marcus.last_line, "That was fucking enormous.");
  assert.equal(getLiveContext(store, ["joey"] ).recent_turns.length, 1);
});

test("shared encounters and acquired expressions remain editable", () => {
  const store = createVoiceStore(seed);
  recordEncounter(store, { title: "The room", participants: ["teal-titan", "joey", "marcus", "arthur"] });
  transferExpression(store, { expression: "That's the point.", origin: "teal-titan", adopters: ["joey", "arthur"] });
  assert.equal(store.encounters.length, 1);
  assert.equal(store.characters.joey.expressions[0].role, "adopter");
  assert.equal(store.characters["teal-titan"].expressions[0].role, "origin");
});

test("exports valid portable JSON", () => {
  const store = createVoiceStore(seed);
  assert.equal(JSON.parse(exportVoiceStore(store)).engine, "geehub-developing-voices");
  assert.equal(getVoiceReport(store, "marcus").sample_count, 0);
});
