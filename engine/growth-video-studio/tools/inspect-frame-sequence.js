#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { inspectFrameSequenceFiles } from "../core/frame-sequence-worker.js";

const usage = [
  "Usage:",
  "  node tools/inspect-frame-sequence.js <frame-sequence.json>",
  "",
  "Environment:",
  "  GEEHUB_DROPBOX_ROOT  Local Dropbox root (defaults to the standard macOS location)"
].join("\n");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.length !== 1) {
    process.stdout.write(usage + "\n");
    if (!args.includes("--help")) process.exitCode = 2;
    return;
  }
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const dropboxRoot = process.env.GEEHUB_DROPBOX_ROOT ||
    path.join(home, "Library", "CloudStorage", "Dropbox");
  const sequence = JSON.parse(await readFile(path.resolve(args[0]), "utf8"));
  const audit = await inspectFrameSequenceFiles(sequence, { dropboxRoot });
  process.stdout.write(JSON.stringify(audit, null, 2) + "\n");
  if (!audit.readyForGeometry) process.exitCode = 1;
}

main().catch(error => {
  process.stderr.write("[GEEHUB FRAME SEQUENCE] " + error.message + "\n");
  process.exitCode = 1;
});
