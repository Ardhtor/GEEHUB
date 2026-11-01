import test from "node:test";
import assert from "node:assert/strict";
import { createBook, createBookLineage, addBookToLineage } from "./lineage.js";
import { createManuscriptBrief, createBatchPlan, reviewManuscriptDraft, attachManuscriptDraft } from "./manuscript-pipeline.js";

test("brief captures strategy, source material, and provenance rules", () => {
  let lineage = createBookLineage();
  const root = createBook("Seed book");
  lineage = addBookToLineage(lineage, root);
  const brief = createManuscriptBrief(lineage, [root.id], { strategy: "contradiction" });
  assert.equal(brief.strategy.name, "contradiction");
  assert.ok(brief.generationInstruction.includes("Do not invent quotations"));
  assert.equal(brief.parentIds[0], root.id);
});

test("batch plan creates separate briefs for each recipe", () => {
  let lineage = createBookLineage();
  const root = createBook("Seed");
  lineage = addBookToLineage(lineage, root);
  const plan = createBatchPlan(lineage, [root.id], [
    { strategy: "continuation", title: "Next" },
    { strategy: "mutation", title: "Elsewhere" }
  ]);
  assert.equal(plan.briefs.length, 2);
  assert.notEqual(plan.briefs[0].strategy.name, plan.briefs[1].strategy.name);
});

test("draft review flags weak structure and attachment creates a child", () => {
  let lineage = createBookLineage();
  const root = createBook("Seed");
  lineage = addBookToLineage(lineage, root);
  const brief = createManuscriptBrief(lineage, [root.id], { title: "Child" });
  const review = reviewManuscriptDraft("# Child\n\nA short draft.", brief);
  assert.ok(review.flags.includes("below-short-book-minimum"));
  lineage = attachManuscriptDraft(lineage, brief, "# Child\n\nA short draft.", review);
  const child = Object.values(lineage.books).find(book => book.title === "Child");
  assert.equal(child.parents[0], root.id);
  assert.equal(lineage.books[root.id].children[0], child.id);
});
