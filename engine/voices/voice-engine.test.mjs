import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const seed = JSON.parse(readFileSync(new URL("./voice-profiles.json", import.meta.url), "utf8"));
import { createVoiceStore, analyseSample, recordUtterance, recordEncounter, transferExpression, getVoiceReport, exportVoiceStore } from "./voice-engine.js";

test("analyses sentence rhythm and profanity without assigning personality", () => {
  const result = analyseSample("That's fucking enormous. What the hell happened?");
  assert.equal(result.sentence_count, 2);
  assert.equal(result.profanity_count, 2);
  assert.ok(result.average_sentence_length > 0);
});

test("records an utterance against a known character", () => {
  const store = createVoiceStore(seed);
  recordUtterance(store, { characterId: "joey", text: "What the fuck happened?", emotion: "surprised" });
  assert.equal(store.characters.joey.observed_samples.length, 1);
  assert.equal(getVoiceReport(store, "joey").sample_count, 1);
});

test("records shared encounters and expression acquisition", () => {
  const store = createVoiceStore(seed);
  recordEncounter(store, { title: "The room", participants: ["teal-titan", "joey", "marcus", "arthur"] });
  transferExpression(store, { expression: "That's the point.", origin: "teal-titan", adopters: ["joey", "arthur"] });
  assert.equal(store.encounters.length, 1);
  assert.equal(store.characters.joey.expressions[0].role, "adopter");
  assert.equal(store.characters.teal-titan.expressions[0].role, "origin");
});

test("exports valid portable JSON", () => {
  const store = createVoiceStore(seed);
  assert.equal(JSON.parse(exportVoiceStore(store)).engine, "geehub-developing-voices");
});
