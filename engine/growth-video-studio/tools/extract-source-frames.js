#!/usr/bin/env node
import path from "node:path";
import { extractSourceFrames } from "../core/source-frame-extractor.js";

const usage = [
  "Usage:",
  "  npm run extract:frames -- <bridge-manifest.json> <segmentation-frame-set-id> <new-output-directory>",
  "",
  "The manifest source must resolve to an immutable, checksummed video in the local Dropbox mirror.",
  "The selected registered segmentation sidecar defines the exact frame range, dimensions, FPS, and timestamps.",
  "ffprobe validates source timing; ffmpeg extracts PNGs into a new directory and writes source-frame-index.json.",
  "The output directory must not already exist. Source media and registered sidecars are never modified.",
  "",
  "Environment:",
  "  GEEHUB_DROPBOX_ROOT  Local Dropbox root (defaults to the standard macOS location)",
  "  FFMPEG_PATH          ffmpeg executable (defaults to ffmpeg)",
  "  FFPROBE_PATH         ffprobe executable (defaults to ffprobe)"
].join("\n");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    process.stdout.write(usage + "\n");
    return;
  }
  if (args.length !== 3) {
    process.stderr.write(usage + "\n");
    process.exitCode = 2;
    return;
  }
  const [manifestPath, segmentationFrameSetId, outputDirectory] = args;
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const dropboxRoot = process.env.GEEHUB_DROPBOX_ROOT ||
    path.join(home, "Library", "CloudStorage", "Dropbox");
  const receipt = await extractSourceFrames({
    manifestPath,
    segmentationFrameSetId,
    outputDirectory,
    dropboxRoot,
    ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
    ffprobePath: process.env.FFPROBE_PATH || "ffprobe"
  });
  process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write("[GEEHUB SOURCE EXTRACTION] " +
    (error.code || "source-extraction-failed") + ": " + error.message + "\n");
  process.exitCode = 1;
});
