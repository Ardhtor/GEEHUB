import { getBreedingStrategy } from "./breeding-strategies.js";

const uid = () => `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function createManuscriptBrief(lineage, parentIds, options = {}) {
  if (!lineage?.books) throw new TypeError("A valid book lineage is required.");
  const parents = [...new Set(parentIds || [])].map(id => {
    const book = lineage.books[id];
    if (!book) throw new Error(`Unknown parent book: ${id}`);
    return book;
  });
  if (!parents.length) throw new Error("At least one parent book is required.");

  const strategy = getBreedingStrategy(options.strategy || "excavation");
  const target = options.target || "A complete, independently readable manuscript";
  const title = options.title || "Untitled descendant";
  const seedMaterial = parents.map(book => ({
    bookId: book.id,
    title: book.title,
    premise: book.premise || "",
    passages: book.passages,
    concepts: book.concepts,
    openQuestions: book.openQuestions
  }));

  return {
    id: uid(),
    title,
    target,
    strategy,
    parentIds: parents.map(p => p.id),
    parentTitles: parents.map(p => p.title),
    seedMaterial,
    editorialConstraints: {
      preserve: strategy.preserve,
      mutate: strategy.mutate,
      distinctness: "The descendant must have its own thesis, structure, and reason to exist.",
      provenance: "Mark inherited passages and ideas; distinguish quotation, paraphrase, and new invention.",
      canon: options.canon || "experimental",
      audience: options.audience || "general adult reader",
      length: options.length || "short book: 8–12 chapters"
    },
    requestedStructure: options.structure || [
      "title and subtitle",
      "original thesis or narrative premise",
      "preface explaining the new work's independent purpose",
      "8–12 chapters with distinct functions",
      "conclusion that opens a new question",
      "source ancestry and divergence note"
    ],
    generationInstruction: [
      strategy.instruction,
      "Write a new work, not a summary of the parent material.",
      "Do not invent quotations, citations, page numbers, or source facts.",
      "If source evidence is insufficient, mark the gap instead of fabricating it.",
      "Keep a clear boundary between inherited material and original development.",
      "Return the manuscript with chapter headings and an ancestry note."
    ].join("\n")
  };
}

export function createBatchPlan(lineage, parentIds, recipes = []) {
  if (!Array.isArray(recipes) || recipes.length === 0) {
    throw new Error("A batch needs at least one breeding recipe.");
  }
  const briefs = recipes.map(recipe => createManuscriptBrief(lineage, parentIds, recipe));
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    parentIds: [...new Set(parentIds)],
    briefs,
    status: "planned"
  };
}

/**
 * Accepts generated manuscript text from any writing provider.
 * Quality checks are transparent flags, not claims of human editorial review.
 */
export function reviewManuscriptDraft(draft, brief) {
  const text = typeof draft === "string" ? draft : draft?.text;
  if (!text || typeof text !== "string") throw new TypeError("Draft text is required.");
  const headings = [...text.matchAll(/^#{1,3}\s+.+$/gm)].map(match => match[0]);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const flags = [];
  if (wordCount < 1200) flags.push("below-short-book-minimum");
  if (headings.length < 5) flags.push("insufficient-chapter-structure");
  if (!/ancestry|parent|source|divergence/i.test(text)) flags.push("missing-lineage-note");
  if (!brief?.parentIds?.length) flags.push("missing-parent-provenance");
  return {
    wordCount,
    headingCount: headings.length,
    headings,
    flags,
    status: flags.length ? "needs-review" : "ready-for-editorial-review",
    note: "Automated structural checks only; this is not a fact-check or quality certification."
  };
}

export function attachManuscriptDraft(lineage, brief, draft, review = reviewManuscriptDraft(draft, brief)) {
  if (!lineage?.books) throw new TypeError("A valid book lineage is required.");
  const text = typeof draft === "string" ? draft : draft?.text;
  if (!text) throw new TypeError("Draft text is required.");
  const parentIds = brief.parentIds || [];
  const title = brief.title || draft.title || "Untitled descendant";
  const source = { kind: "generated-manuscript", uri: null };
  const now = new Date().toISOString();
  const child = {
    id: `book_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type: "book",
    title,
    version: 1,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    source: { ...source, immutable: true },
    parents: [...parentIds],
    children: [],
    passages: [],
    concepts: [],
    openQuestions: [],
    premise: brief.target,
    manuscript: { text, wordCount: review.wordCount, review },
    lineageRule: {
      preserve: brief.editorialConstraints.preserve,
      mutations: brief.editorialConstraints.mutate,
      divergence: brief.strategy.name
    },
    operations: [{
      id: brief.id,
      type: "manuscript-generated",
      parentIds: [...parentIds],
      strategy: brief.strategy.name,
      createdAt: now
    }]
  };

  const books = { ...lineage.books, [child.id]: child };
  for (const parentId of parentIds) {
    const parent = books[parentId];
    if (!parent) throw new Error(`Unknown parent book: ${parentId}`);
    books[parentId] = { ...parent, children: [...new Set([...parent.children, child.id])], updatedAt: now };
  }
  return {
    ...lineage,
    books,
    roots: parentIds.length ? lineage.roots : [...lineage.roots, child.id],
    updatedAt: now,
    events: [...(lineage.events || []), {
      id: uid(), type: "manuscript-attached", bookId: child.id,
      parentIds: [...parentIds], createdAt: now
    }]
  };
}
