/**
 * Book Breeder strategy library.
 * Strategies specify editorial mutations; they do not generate prose by themselves.
 */
export const BREEDING_STRATEGIES = Object.freeze({
  continuation: {
    label: "Continuation",
    purpose: "Carry an unresolved movement forward into a genuinely new work.",
    preserve: ["world rules", "key unresolved questions", "selected voice traits"],
    mutate: ["central conflict", "scope", "consequences"],
    instruction: "Continue the inquiry or world, but do not recap or imitate the parent."
  },
  contradiction: {
    label: "Counter-book",
    purpose: "Build the strongest independent challenge to the source work.",
    preserve: ["claims being challenged", "source evidence", "historical context"],
    mutate: ["thesis", "interpretive frame", "conclusion"],
    instruction: "Argue against the parent fairly and substantively; do not caricature it."
  },
  synthesis: {
    label: "Synthesis",
    purpose: "Combine compatible and incompatible ideas into a third position.",
    preserve: ["distinct contributions of each parent", "points of tension"],
    mutate: ["organizing question", "conceptual architecture", "proposed resolution"],
    instruction: "Create a third position that neither parent could have produced alone."
  },
  adaptation: {
    label: "Adaptation",
    purpose: "Translate the source into another medium or form.",
    preserve: ["core motifs", "character or argument relationships", "emotional logic"],
    mutate: ["medium", "structure", "sensory vocabulary"],
    instruction: "Translate the source logic into a new form; do not merely summarize it."
  },
  excavation: {
    label: "Excavation",
    purpose: "Develop a neglected passage, motif, or unresolved question into a full work.",
    preserve: ["selected seed passage", "its provenance", "nearby context"],
    mutate: ["scale", "discipline", "point of view"],
    instruction: "Treat the selected seed as the beginning of an inquiry, not as a topic to paraphrase."
  },
  mutation: {
    label: "Mutation",
    purpose: "Introduce a controlled conceptual mutation and follow its consequences.",
    preserve: ["recognizable ancestry", "one or two governing motifs"],
    mutate: ["one foundational assumption", "resulting world or argument"],
    instruction: "Change one foundational assumption and rigorously follow the consequences."
  }
});

export function getBreedingStrategy(name) {
  const strategy = BREEDING_STRATEGIES[name];
  if (!strategy) throw new Error(`Unknown breeding strategy: ${name}`);
  return structuredClone({ name, ...strategy });
}
