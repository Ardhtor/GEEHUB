#!/usr/bin/env node
import { composeGrowthFrameFiles } from "../core/complete-frame-file-compositor.js";

const usage = [
  "Usage:",
  "  npm run compose:frame -- <source.png> <body-mask.png> <protected-face-mask.png> <body-layer.png> <batch-receipt.json> <source-frame-index.json> <scene-plate-directory> <new-output.png>",
  "",
  "The source PNG must be one of the exact frames named by the source-frame index.",
  "The batch receipt must prove complete source-frame revalidation and bind the body-layer receipt.",
  "The scene-plate directory must contain scene-plate.receipt.json and all four verified artifacts.",
  "The output PNG and its adjacent .receipt.json must both be new files.",
  "",
  "This writes one complete-frame candidate or an explicitly partial frame; it never marks video export ready."
].join("\n");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    process.stdout.write(usage + "\n");
    return;
  }
  if (args.length !== 8) {
    process.stderr.write(usage + "\n");
    process.exitCode = 2;
    return;
  }
  const [sourcePath, bodyMaskPath, protectedFaceMaskPath, bodyLayerPath,
    batchReceiptPath, sourceFrameIndexPath, scenePlateDirectory, outputPath] = args;
  const receipt = await composeGrowthFrameFiles({
    sourcePath,
    bodyMaskPath,
    protectedFaceMaskPath,
    bodyLayerPath,
    batchReceiptPath,
    sourceFrameIndexPath,
    scenePlateDirectory,
    outputPath
  });
  process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write("[GEEHUB FRAME COMPOSITOR] " +
    (error.code || "frame-composite-failed") + ": " + error.message + "\n");
  process.exitCode = 1;
});
