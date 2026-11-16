#!/usr/bin/env node
import { renderGrowthFrameFiles } from "../core/frame-file-renderer.js";

const usage = [
  "Usage:",
  "  npm run render:frame -- <source.png> <body-mask.png> <protected-face-mask.png> <deformation-plan.json> <new-body-layer.png>",
  "",
  "The plan must be one ready geehub.growth-deformation-frame from the validated sequence deformation pass.",
  "The output directory must already exist. The worker creates the PNG and adjacent .receipt.json exclusively.",
  "Source footage, masks, plans, and existing outputs are never overwritten."
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
  const [sourcePath, bodyMaskPath, protectedFaceMaskPath, planPath, outputPath] = args;
  const receipt = await renderGrowthFrameFiles({
    sourcePath,
    bodyMaskPath,
    protectedFaceMaskPath,
    planPath,
    outputPath
  });
  process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write("[GEEHUB FRAME RENDER] " + (error.code || "render-failed") + ": " + error.message + "\n");
  process.exitCode = 1;
});
