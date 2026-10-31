import test from "node:test";
import assert from "node:assert/strict";
import { REQUIRED_ANCHORS, validateLandmarkTrack, interpolateLandmarkFrame } from "./landmark-track.js";

const frame=(time,x=0.5)=>({timeSeconds:time,landmarks:Object.fromEntries(REQUIRED_ANCHORS.map(k=>[k,{x,y:0.5,confidence:0.99}]))});

test("validates continuous tracked frames",()=>{
  assert.equal(validateLandmarkTrack([frame(0),frame(0.1)]).valid,true);
});
test("rejects tracking gaps and missing anchors",()=>{
  const broken=frame(0.5); delete broken.landmarks.leftKnee;
  const result=validateLandmarkTrack([frame(0),broken]);
  assert.equal(result.valid,false);
  assert.match(result.errors.join(" "),/gap exceeds|leftKnee/);
});
test("interpolates normalized landmarks between frames",()=>{
  const mid=interpolateLandmarkFrame(frame(0,0.2),frame(1,0.8),0.5);
  assert.ok(Math.abs(mid.landmarks.faceCenter.x-0.5)<1e-9);
});
