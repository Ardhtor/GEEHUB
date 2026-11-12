#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { inspectFrameSequenceFiles } from "../core/frame-sequence-worker.js";
import { prepareFrameSequenceBridgeInputs } from "../core/frame-sequence-bridge.js";
import {
  createFrameSequenceExchangeUris,
  registerFrameSequenceBridgeInputs
} from "../core/frame-sequence-registration.js";

const usage = [
  "Usage:",
  "  node tools/register-frame-sequence.js <manifest.json> <frame-sequence.json>",
  "",
  "Environment:",
  "  GEEHUB_DROPBOX_ROOT             Local Dropbox root (defaults to the standard macOS location)",
  "  GEEHUB_FRAME_SEGMENTATION_URI   Optional explicit segmentation sidecar URI",
  "  GEEHUB_FRAME_LANDMARKS_URI      Optional explicit landmark sidecar URI",
  "  GEEHUB_FRAME_DEFORMATION_URI    Optional explicit mask-mesh sidecar URI",
  "  GEEHUB_FRAME_MANIFEST_URI       Optional explicit versioned manifest URI",
  "",
  "The command rechecks mask files, requires a connected mesh, writes all three sidecars, verifies their bytes,",
  "and writes the new manifest revision last. Existing evidence is never replaced."
].join("\n");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.length !== 2) {
    process.stdout.write(usage + "\n");
    if (!args.includes("--help")) process.exitCode = 2;
    return;
  }

  const home = process.env.HOME || process.env.USERPROFILE || "";
  const dropboxRoot = process.env.GEEHUB_DROPBOX_ROOT ||
    path.join(home, "Library", "CloudStorage", "Dropbox");
  const manifest = JSON.parse(await readFile(path.resolve(args[0]), "utf8"));
  const sequence = JSON.parse(await readFile(path.resolve(args[1]), "utf8"));

  const audit = await inspectFrameSequenceFiles(sequence, { dropboxRoot });
  if (!audit.readyForGeometry || !audit.meshReady) {
    process.stdout.write(JSON.stringify(audit, null, 2) + "\n");
    process.exitCode = 1;
    return;
  }

  const revision = manifest.revision + 3;
  const defaults = createFrameSequenceExchangeUris(sequence, revision);
  const prepared = prepareFrameSequenceBridgeInputs(manifest, sequence, audit, {
    segmentationUri: process.env.GEEHUB_FRAME_SEGMENTATION_URI || defaults.segmentationUri,
    landmarksUri: process.env.GEEHUB_FRAME_LANDMARKS_URI || defaults.landmarksUri,
    deformationUri: process.env.GEEHUB_FRAME_DEFORMATION_URI || defaults.deformationUri
  });
  const receipt = await registerFrameSequenceBridgeInputs({
    prepared,
    dropboxRoot,
    manifestUri: process.env.GEEHUB_FRAME_MANIFEST_URI || defaults.manifestUri
  });

  process.stdout.write(JSON.stringify({
    ...receipt,
    audit: {
      status: audit.status,
      masksChecked: audit.fileVerification.checked,
      masksVerified: audit.fileVerification.verified,
      pixelSemanticsVerified: audit.pixelSemanticsVerified
    }
  }, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write("[GEEHUB FRAME REGISTRATION] " + error.message + "\n");
  process.exitCode = 1;
});
