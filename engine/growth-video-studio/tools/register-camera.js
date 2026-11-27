#!/usr/bin/env node
import os from "node:os";
import path from "node:path";
import { estimateFixedCameraRegistrationFromFiles } from "../core/camera-registration-files.js";

const usage = [
  "Usage:",
  "  npm run register:camera -- <bridge-manifest.json> <segmentation-frame-set-id> <source-frame-index.json> <new-camera-registration.json>",
  "",
  "The manifest must register the exact segmentation sidecar and immutable source checksum.",
  "Every indexed source PNG and every body/protected-face mask is rehashed and decoded before camera measurement.",
  "The command writes a checksummed camera-registration JSON and an adjacent .receipt.json.",
  "A moving or insufficiently textured camera is recorded as unverified; source-video derivation and anatomical mask semantics remain unverified.",
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
  if (args.length !== 4) {
    process.stderr.write(usage + "\n");
    process.exitCode = 2;
    return;
  }
  const [manifestPath, segmentationFrameSetId, sourceFrameIndexPath, outputPath] = args;
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  const dropboxRoot = process.env.GEEHUB_DROPBOX_ROOT ||
    path.join(home, "Library", "CloudStorage", "Dropbox");
  const receipt = await estimateFixedCameraRegistrationFromFiles({
    manifestPath,
    segmentationFrameSetId,
    sourceFrameIndexPath,
    dropboxRoot,
    outputPath
  });
  process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write("[GEEHUB CAMERA REGISTRATION] " +
    (error.code || "camera-registration-failed") + ": " + error.message + "\n");
  process.exitCode = 1;
});
