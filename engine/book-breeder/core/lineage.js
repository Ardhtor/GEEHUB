/**
 * GEEHUB Book Breeder — lineage engine
 *
 * Books are generative nodes, not terminal documents. A lineage records source
 * ancestry, derived works, crossbreeding, and the operations that produced each
 * descendant. Source texts are referenced, never silently rewritten.
 */

const VERSION = 1;

const id = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function createBook(title, source = {}) {
  if (!title || typeof title !== "string") throw new TypeError("A book needs a title.");
  const now = new Date().toISOString();
  return {
    id: id("book"),
    type: "book",
    title,
    version: VERSION,
    status: "seed",
    createdAt: now,
    updatedAt: now,
    source: {
      kind: source.kind || "original",
      uri: source.uri || null,
      checksum: source.checksum || null,
      immutable: true
    },
    parents: [],
    children: [],
    passages: [],
    concepts: [],
    openQuestions: [],
    operations: []
  };
}

export function addBookToLineage(lineage, book) {
  assertLineage(lineage);
  if (lineage.books[book.id]) throw new Error(`Book already exists: ${book.id}`);
  return {
    ...lineage,
    books: { ...lineage.books, [book.id]: structuredClone(book) },
    roots: book.parents.length ? lineage.roots : [...lineage.roots, book.id],
    updatedAt: new Date().toISOString()
  };
}

export function createBookLineage(name = "Untitled lineage") {
  return {
    schema: "geehub.book-lineage",
    version: VERSION,
    id: id("lineage"),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roots: [],
    books: {},
    crosses: [],
    events: []
  };
}

export function breedBook(lineage, parentIds, childSpec = {}) {
  assertLineage(lineage);
  const uniqueParents = [...new Set(parentIds || [])];
  if (!uniqueParents.length) throw new Error("A descendant needs at least one parent.");
  const parents = uniqueParents.map((parentId) => {
    const parent = lineage.books[parentId];
    if (!parent) throw new Error(`Unknown parent book: ${parentId}`);
    return parent;
  });

  const child = createBook(childSpec.title || `Descendant of ${parents.map(p => p.title).join(" + ")}`, {
    kind: "derived",
    uri: childSpec.uri || null
  });
  child.status = "draft";
  child.parents = uniqueParents;
  child.lineageRule = {
    preserve: childSpec.preserve || ["ancestry", "source passages", "concept provenance"],
    mutations: childSpec.mutations || [],
    divergence: childSpec.divergence || "open"
  };
  child.premise = childSpec.premise || "";
  child.passages = structuredClone(childSpec.passages || []);
  child.concepts = structuredClone(childSpec.concepts || []);
  child.openQuestions = structuredClone(childSpec.openQuestions || []);
  child.operations.push({
    id: id("op"),
    type: uniqueParents.length > 1 ? "crossbreed" : "descend",
    parentIds: uniqueParents,
    createdAt: new Date().toISOString(),
    instruction: childSpec.instruction || "Generate a distinct work while retaining traceable ancestry."
  });

  const next = addBookToLineage(lineage, child);
  next.books = { ...next.books };
  for (const parentId of uniqueParents) {
    const parent = structuredClone(next.books[parentId]);
    parent.children = [...new Set([...parent.children, child.id])];
    parent.updatedAt = new Date().toISOString();
    next.books[parentId] = parent;
  }
  if (uniqueParents.length > 1) {
    next.crosses = [...next.crosses, {
      id: id("cross"),
      parentIds: uniqueParents,
      childId: child.id,
      createdAt: new Date().toISOString()
    }];
  }
  next.events = [...next.events, {
    id: id("event"),
    type: uniqueParents.length > 1 ? "crossbreed" : "descendant-created",
    bookId: child.id,
    parentIds: uniqueParents,
    createdAt: new Date().toISOString()
  }];
  return next;
}

export function recordBookMaterial(lineage, bookId, material) {
  assertLineage(lineage);
  const current = lineage.books[bookId];
  if (!current) throw new Error(`Unknown book: ${bookId}`);
  const book = structuredClone(current);
  const allowed = ["passages", "concepts", "openQuestions"];
  for (const field of allowed) {
    if (material[field]) book[field] = [...book[field], ...structuredClone(material[field])];
  }
  book.updatedAt = new Date().toISOString();
  book.operations.push({
    id: id("op"),
    type: "material-added",
    fields: allowed.filter(field => material[field]?.length),
    createdAt: new Date().toISOString()
  });
  return {
    ...lineage,
    books: { ...lineage.books, [bookId]: book },
    updatedAt: new Date().toISOString()
  };
}

export function getBookFamily(lineage, bookId) {
  assertLineage(lineage);
  const book = lineage.books[bookId];
  if (!book) throw new Error(`Unknown book: ${bookId}`);
  const ancestors = new Set();
  const descendants = new Set();
  const walk = (id, direction, seen) => {
    const node = lineage.books[id];
    for (const nextId of node[direction] || []) {
      if (seen.has(nextId)) continue;
      seen.add(nextId);
      walk(nextId, direction, seen);
    }
  };
  walk(bookId, "parents", ancestors);
  walk(bookId, "children", descendants);
  return { book, ancestors: [...ancestors], descendants: [...descendants] };
}

export function exportBookManifest(lineage) {
  assertLineage(lineage);
  return {
    schema: lineage.schema,
    version: lineage.version,
    lineageId: lineage.id,
    name: lineage.name,
    exportedAt: new Date().toISOString(),
    roots: lineage.roots,
    books: Object.values(lineage.books).map(book => ({
      ...structuredClone(book),
      parentTitles: book.parents.map(id => lineage.books[id]?.title).filter(Boolean),
      childTitles: book.children.map(id => lineage.books[id]?.title).filter(Boolean)
    })),
    crosses: structuredClone(lineage.crosses),
    events: structuredClone(lineage.events)
  };
}

function assertLineage(lineage) {
  if (!lineage || lineage.schema !== "geehub.book-lineage" || !lineage.books) {
    throw new TypeError("Invalid GEEHUB book lineage.");
  }
}
