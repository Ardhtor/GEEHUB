#!/usr/bin/env node
import path from "node:path";
import { renderGrowthFrameBatchFiles } from "../core/frame-batch-renderer.js";

const usage = [
  "Usage:",
  "  npm run render:batch -- <queued-manifest.json> <render-job.json> <deformation-plans.json> <source-frame-index.json> <new-output-directory>",
  "",
  "The source-frame index must live beside its extracted PNG frames.",
  "It must bind the source asset id/checksum, sequence id, dimensions, frame rate, frame range, and each frame PNG checksum.",
  "The output directory must not already exist. The worker writes body layers and per-frame receipts, then a sequence receipt last.",
  "This produces transparent body layers, not a completed composite or video.",
  "",
  "Environment:",
  "  GEEHUB_DROPBOX_ROOT  Local Dropbox root (defaults to the standard macOS location)"
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
  const [manifestPath, renderJobPath, deformationPlansPath, sourceFrameIndexPath, outputDirectory] = args;
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const dropboxRoot = process.env.GEEHUB_DROPBOX_ROOT ||
    path.join(home, "Library", "CloudStorage", "Dropbox");
  const receipt = await renderGrowthFrameBatchFiles({
    manifestPath,
    renderJobPath,
    deformationPlansPath,
    sourceFrameIndexPath,
    outputDirectory,
    dropboxRoot
  });
  process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
}

function pathJoin(...parts) {
  return parts.filter(Boolean).join(process.platform === "win32" ? "\\" : "/");
}

main().catch(error => {
  process.stderr.write("[GEEHUB BATCH RENDER] " +
    (error.code || "batch-render-failed") + ": " + error.message + "\n");
  process.exitCode = 1;
});
