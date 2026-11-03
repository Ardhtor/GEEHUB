#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { stageBridgeExchange, DEFAULT_MANIFEST_URI } from "../core/bridge-exchange.js";

const usage = [
  "Usage:",
  "  node tools/stage-bridge-exchange.js <manifest.json> <render-job.json> [render-job-id]",
  "",
  "Environment:",
  "  GEEHUB_DROPBOX_ROOT          Local Dropbox root (defaults to the standard macOS location)",
  "  GEEHUB_BRIDGE_MANIFEST_URI   Manifest destination URI (defaults to " + DEFAULT_MANIFEST_URI + ")"
].join("\n");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.length < 2 || args.length > 3) {
    process.stdout.write(usage + "\n");
    if (!args.includes("--help")) process.exitCode = 2;
    return;
  }

  const home = process.env.HOME || process.env.USERPROFILE || "";
  const dropboxRoot = process.env.GEEHUB_DROPBOX_ROOT ||
    path.join(home, "Library", "CloudStorage", "Dropbox");
  const manifest = JSON.parse(await readFile(path.resolve(args[0]), "utf8"));
  const portableJob = JSON.parse(await readFile(path.resolve(args[1]), "utf8"));
  const queued = (manifest.renderJobs || []).filter(job => job.status === "queued");
  const jobId = args[2] || (queued.length === 1 ? queued[0].id : null);
  if (!jobId) throw new Error("Specify a render-job id when the manifest has zero or multiple queued jobs");

  const receipt = await stageBridgeExchange({
    manifest,
    jobId,
    portableJob,
    dropboxRoot,
    manifestUri: process.env.GEEHUB_BRIDGE_MANIFEST_URI || DEFAULT_MANIFEST_URI
  });
  process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write("[GEEHUB STAGE] " + error.message + "\n");
  process.exitCode = 1;
});
