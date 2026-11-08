/**
 * GEEHUB Developing Voices
 * Small, dependency-free voice-history engine.
 *
 * This module records observations; it does not claim to infer a complete
 * personality from a few lines. All profile hypotheses remain editable.
 */

const clone = (value) => JSON.parse(JSON.stringify(value));
const words = (text) => (String(text).toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) || []);
const sentenceParts = (text) => String(text).split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
const PROFANITY = new Set(["fuck", "fucking", "shit", "bullshit", "damn", "hell", "ass", "asshole", "bastard", "crap"]);

export function createVoiceStore(seed) {
  if (!seed || !seed.characters) throw new TypeError("A seed with characters is required.");
  return clone(seed);
}

export function analyseSample(text) {
  const tokens = words(text);
  const sentences = sentenceParts(text);
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  const repeated = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, count]) => ({ term, count }));
  const contractions = (String(text).match(/\b(?:\w+['’](?:t|re|ve|ll|d|m)|ain't|y'all)\b/gi) || []).length;
  const profanity = tokens.filter(token => PROFANITY.has(token));
  return {
    word_count: tokens.length,
    sentence_count: sentences.length,
    average_sentence_length: sentences.length ? Number((tokens.length / sentences.length).toFixed(1)) : 0,
    contraction_count: contractions,
    profanity_count: profanity.length,
    profanity_terms: [...new Set(profanity)],
    repeated_terms: repeated
  };
}

export function recordUtterance(store, { characterId, text, scene = "", emotion = "unspecified", source = "generated", timestamp = new Date().toISOString() }) {
  const character = store.characters[characterId];
  if (!character) throw new Error(`Unknown character: ${characterId}`);
  const sample = { text, scene, emotion, source, timestamp, analysis: analyseSample(text) };
  character.observed_samples.push(sample);
  return clone(sample);
}

export function recordEncounter(store, { title, participants, scene = "", outcome = "", timestamp = new Date().toISOString() }) {
  for (const id of participants) {
    if (!store.characters[id]) throw new Error(`Unknown participant: ${id}`);
  }
  const encounter = { id: `encounter-${store.encounters.length + 1}`, title, participants: [...participants], scene, outcome, timestamp };
  store.encounters.push(encounter);
  return clone(encounter);
}

export function transferExpression(store, { expression, origin, adopters = [], context = "", meaning = "", timestamp = new Date().toISOString() }) {
  if (!store.characters[origin]) throw new Error(`Unknown origin: ${origin}`);
  for (const id of adopters) if (!store.characters[id]) throw new Error(`Unknown adopter: ${id}`);
  const item = { expression, origin, adopters: [...new Set(adopters)], context, meaning, status: "emerging", timestamp };
  store.characters[origin].expressions.push({ ...item, role: "origin" });
  for (const id of item.adopters) {
    store.characters[id].expressions.push({ ...item, role: "adopter" });
  }
  return clone(item);
}

export function updateHypotheses(store, characterId, hypotheses) {
  const character = store.characters[characterId];
  if (!character) throw new Error(`Unknown character: ${characterId}`);
  character.starting_hypotheses = [...new Set(hypotheses)];
  return clone(character);
}

export function getVoiceReport(store, characterId) {
  const character = store.characters[characterId];
  if (!character) throw new Error(`Unknown character: ${characterId}`);
  const samples = character.observed_samples;
  const totals = samples.reduce((sum, sample) => {
    sum.words += sample.analysis.word_count;
    sum.sentences += sample.analysis.sentence_count;
    sum.profanity += sample.analysis.profanity_count;
    return sum;
  }, { words: 0, sentences: 0, profanity: 0 });
  return {
    id: characterId,
    display_name: character.display_name,
    status: character.status,
    hypotheses: [...character.starting_hypotheses],
    sample_count: samples.length,
    average_sentence_length: totals.sentences ? Number((totals.words / totals.sentences).toFixed(1)) : 0,
    profanity_per_100_words: totals.words ? Number((totals.profanity / totals.words * 100).toFixed(1)) : 0,
    expressions: clone(character.expressions),
    open_questions: [...character.open_questions]
  };
}

export function exportVoiceStore(store) {
  return JSON.stringify(store, null, 2);
}
