/**
 * GEEHUB instantaneous voice/context engine.
 *
 * A turn is a state transition, not a batch-analysis job. applyTurn mutates
 * the shared in-memory context synchronously before the next line is written.
 * The host/model supplies the actual next utterance; this module carries
 * forward the context that utterance must inherit.
 */
const clone = value => JSON.parse(JSON.stringify(value));
const words = text => (String(text).toLowerCase().match(/[\\p{L}\\p{N}'’-]+/gu) || []);
const sentenceParts = text => String(text).split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
const PROFANITY = new Set(["fuck", "fucking", "shit", "bullshit", "damn", "hell", "ass", "asshole", "bastard", "crap"]);

export function createVoiceStore(seed) {
  if (!seed || !seed.characters) throw new TypeError("A seed with characters is required.");
  const store = clone(seed);
  store.runtime_context ??= { turn: 0, scene: "", last_speaker: null, recent_turns: [], shared_state: [] };
  for (const character of Object.values(store.characters)) {
    character.relationship_context ??= {};
    character.recent_context ??= [];
  }
  return store;
}

export function analyseSample(text) {
  const tokens = words(text), sentences = sentenceParts(text), counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  const repeated = [...counts.entries()].filter(([, count]) => count > 1).sort((a,b) => b[1]-a[1]).slice(0,8).map(([term,count]) => ({term,count}));
  const contractions = (String(text).match(/\\b(?:\\w+['’](?:t|re|ve|ll|d|m)|ain't|y'all)\\b/gi) || []).length;
  const profanity = tokens.filter(token => PROFANITY.has(token));
  return { word_count: tokens.length, sentence_count: sentences.length, average_sentence_length: sentences.length ? Number((tokens.length/sentences.length).toFixed(1)) : 0, contraction_count: contractions, profanity_count: profanity.length, profanity_terms: [...new Set(profanity)], repeated_terms: repeated };
}

/**
 * Apply one spoken line immediately. No timer, queue, sampling window, or
 * later analysis pass: the returned context is already the state for the
 * very next generation step.
 */
export function applyTurn(store, { characterId, text, scene, emotion = "unspecified", participants = [], consequence = "", source = "generated", timestamp = new Date().toISOString() }) {
  const speaker = store.characters[characterId];
  if (!speaker) throw new Error(`Unknown character: ${characterId}`);
  const cast = [...new Set([characterId, ...participants])];
  for (const id of cast) if (!store.characters[id]) throw new Error(`Unknown participant: ${id}`);

  const context = store.runtime_context;
  context.turn += 1;
  context.scene = scene ?? context.scene;
  context.last_speaker = characterId;

  const turn = { turn: context.turn, speaker: characterId, text, scene: context.scene, emotion, participants: cast, consequence, timestamp };
  const sample = { text, scene: context.scene, emotion, source, timestamp, turn: context.turn, analysis: analyseSample(text) };
  speaker.observed_samples.push(sample);
  speaker.recent_context.push(turn);
  speaker.recent_context = speaker.recent_context.slice(-8);

  for (const id of cast) {
    const character = store.characters[id];
    character.relationship_context[characterId] = {
      last_interaction_turn: context.turn,
      last_line: text,
      emotional_tone: emotion,
      consequence
    };
  }
  context.recent_turns.push(turn);
  context.recent_turns = context.recent_turns.slice(-12);
  if (consequence) context.shared_state.push({ turn: context.turn, scene: context.scene, participants: cast, change: consequence, timestamp });
  context.shared_state = context.shared_state.slice(-24);

  return { turn: clone(turn), next_context: getLiveContext(store, cast) };
}

export function getLiveContext(store, participantIds = Object.keys(store.characters)) {
  const context = store.runtime_context;
  return {
    turn: context.turn,
    scene: context.scene,
    last_speaker: context.last_speaker,
    recent_turns: clone(context.recent_turns),
    shared_state: clone(context.shared_state),
    participants: participantIds.map(id => {
      const c = store.characters[id];
      if (!c) throw new Error(`Unknown participant: ${id}`);
      return { id, display_name: c.display_name, starting_hypotheses: [...c.starting_hypotheses], recent_context: clone(c.recent_context.slice(-4)), relationship_context: clone(c.relationship_context) };
    })
  };
}

// Compatibility helpers remain available for editorial backfills.
export function recordUtterance(store, { characterId, text, scene = "", emotion = "unspecified", source = "generated", timestamp }) {
  return applyTurn(store, { characterId, text, scene, emotion, source, timestamp }).turn;
}
export function recordEncounter(store, { title, participants, scene = "", outcome = "", timestamp = new Date().toISOString() }) {
  for (const id of participants) if (!store.characters[id]) throw new Error(`Unknown participant: ${id}`);
  const encounter = { id: `encounter-${store.encounters.length + 1}`, title, participants: [...participants], scene, outcome, timestamp };
  store.encounters.push(encounter);
  if (outcome) store.runtime_context.shared_state.push({ turn: store.runtime_context.turn, scene, participants: [...participants], change: outcome, timestamp });
  return clone(encounter);
}
export function transferExpression(store, { expression, origin, adopters = [], context = "", meaning = "", timestamp = new Date().toISOString() }) {
  if (!store.characters[origin]) throw new Error(`Unknown origin: ${origin}`);
  for (const id of adopters) if (!store.characters[id]) throw new Error(`Unknown adopter: ${id}`);
  const item = { expression, origin, adopters: [...new Set(adopters)], context, meaning, status: "emerging", timestamp };
  store.characters[origin].expressions.push({ ...item, role: "origin" });
  for (const id of item.adopters) store.characters[id].expressions.push({ ...item, role: "adopter" });
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
  const totals = character.observed_samples.reduce((sum, sample) => {
    sum.words += sample.analysis.word_count; sum.sentences += sample.analysis.sentence_count; sum.profanity += sample.analysis.profanity_count; return sum;
  }, { words: 0, sentences: 0, profanity: 0 });
  return { id: characterId, display_name: character.display_name, status: character.status, hypotheses: [...character.starting_hypotheses], sample_count: character.observed_samples.length, average_sentence_length: totals.sentences ? Number((totals.words/totals.sentences).toFixed(1)) : 0, profanity_per_100_words: totals.words ? Number((totals.profanity/totals.words*100).toFixed(1)) : 0, expressions: clone(character.expressions), open_questions: [...character.open_questions] };
}
export function exportVoiceStore(store) { return JSON.stringify(store, null, 2); }
