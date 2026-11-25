#!/usr/bin/env node
import os from "node:os";
import path from "node:path";
import { composeGrowthFrameSequenceFiles } from "../core/sequence-file-compositor.js";

const usage = [
  "Usage:",
  "  npm run compose:sequence -- <batch-receipt.json> <source-frame-index.json> <segmentation-sidecar.json> <scene-plate-directory> <new-output-directory>",
  "",
  "Environment:",
  "  GEEHUB_DROPBOX_ROOT   Local Dropbox root containing the GEEHUB/ directory",
  "",
  "The segmentation sidecar must be the exact registered frame-set revision named by the batch receipt.",
  "Every source frame, body mask, protected-face mask, body layer, and per-frame receipt is verified.",
  "The new directory receives one PNG and receipt per frame plus sequence.receipt.json, published last.",
  "Partial frames are retained and explicitly marked; any processing failure rolls back this attempt.",
  "The PNG sequence is not marked ready for video export."
].join("\n");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    process.stdout.write(usage + "\n");
    return;
  }
  if (args.length !== 5) {
    process.stderr.write(usage + "\n");
    process.exitCode = 2;
    return;
  }
  const [batchReceiptPath, sourceFrameIndexPath, segmentationSidecarPath,
    scenePlateDirectory, outputDirectory] = args;
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  const dropboxRoot = process.env.GEEHUB_DROPBOX_ROOT ||
    path.join(home, "Library", "CloudStorage", "Dropbox");
  const receipt = await composeGrowthFrameSequenceFiles({
    batchReceiptPath,
    sourceFrameIndexPath,
    segmentationSidecarPath,
    scenePlateDirectory,
    outputDirectory,
    dropboxRoot
  });
  process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write("[GEEHUB SEQUENCE COMPOSITOR] " +
    (error.code || "sequence-composite-failed") + ": " + error.message + "\n");
  process.exitCode = 1;
});
