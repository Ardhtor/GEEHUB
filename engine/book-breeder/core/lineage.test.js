import test from "node:test";
import assert from "node:assert/strict";
import {
  createBook, createBookLineage, addBookToLineage,
  breedBook, recordBookMaterial, getBookFamily, exportBookManifest
} from "./lineage.js";

test("a book can breed descendants without changing its source", () => {
  let lineage = createBookLineage("Test lineage");
  const root = createBook("Root book", { kind: "manuscript", uri: "library://root" });
  lineage = addBookToLineage(lineage, root);
  lineage = recordBookMaterial(lineage, root.id, {
    concepts: [{ label: "memory", provenance: root.id }]
  });
  const before = structuredClone(lineage.books[root.id]);
  lineage = breedBook(lineage, [root.id], {
    title: "A descendant",
    mutations: ["change the central question"]
  });
  assert.deepEqual(lineage.books[root.id].source, before.source);
  assert.equal(lineage.books[root.id].children.length, 1);
  assert.equal(Object.keys(lineage.books).length, 2);
});

test("two books can crossbreed and retain both parents", () => {
  let lineage = createBookLineage();
  const a = createBook("A");
  const b = createBook("B");
  lineage = addBookToLineage(lineage, a);
  lineage = addBookToLineage(lineage, b);
  lineage = breedBook(lineage, [a.id, b.id], { title: "Crossover" });
  const child = Object.values(lineage.books).find(book => book.title === "Crossover");
  assert.deepEqual(child.parents, [a.id, b.id]);
  assert.equal(lineage.crosses.length, 1);
  assert.deepEqual(getBookFamily(lineage, a.id).descendants, [child.id]);
});

test("manifest exports lineage and provenance", () => {
  let lineage = createBookLineage("Manifest");
  const root = createBook("Seed");
  lineage = addBookToLineage(lineage, root);
  const manifest = exportBookManifest(lineage);
  assert.equal(manifest.name, "Manifest");
  assert.equal(manifest.books[0].title, "Seed");
});
