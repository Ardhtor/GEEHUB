import test from "node:test";
import assert from "node:assert/strict";
import { createGrowthState, createChildState, BASELINE } from "./growth-state.js";
import { REQUIRED_ANCHORS } from "./landmark-track.js";
import { createRenderJob } from "./render-job.js";

const frame=timeSeconds=>({timeSeconds,landmarks:Object.fromEntries(REQUIRED_ANCHORS.map(k=>[k,{x:0.5,y:0.5,confidence:0.99}]))});
test("creates a render-ready manifest only with source, growth, and tracking evidence",()=>{
  const base=createGrowthState(BASELINE,{id:"base"});
  const grown=createChildState(base,{stature:1.1,torsoLength:1.05,armLength:1.1,thighLength:1.1,shoulderSpan:1.2,chestDepth:1.15,armMass:1.2,thighMass:1.2,calfMass:1.1},{id:"grown"});
  const result=createRenderJob({
    source:{name:"source.mp4",duration:2,width:720,height:1280},
    growthStates:[base,grown],
    landmarkFrames:[frame(0),frame(0.1)],
    settings:{fps:24}
  });
  assert.equal(result.valid,true);
  assert.equal(result.job.status,"ready-for-renderer");
  assert.equal(result.job.constraints.protectFace,true);
});
test("blocks incomplete evidence",()=>{
  const result=createRenderJob({source:{name:"source.mp4"},growthStates:[],landmarkFrames:[]});
  assert.equal(result.valid,false);
  assert.ok(result.errors.length>=3);
});
