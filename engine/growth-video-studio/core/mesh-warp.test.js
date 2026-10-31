import test from "node:test";
import assert from "node:assert/strict";
import { affineFromTriangles, validateWarpMesh } from "./mesh-warp.js";

test("affine transform maps source triangle vertices to target vertices", () => {
  const src=[{x:0,y:0},{x:10,y:0},{x:0,y:10}];
  const dst=[{x:2,y:3},{x:22,y:3},{x:2,y:13}];
  const m=affineFromTriangles(src,dst);
  const map=p=>({x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f});
  src.forEach((p,i)=> {
    assert.ok(Math.abs(map(p).x-dst[i].x)<1e-8);
    assert.ok(Math.abs(map(p).y-dst[i].y)<1e-8);
  });
});

test("mesh validation rejects degenerate triangles", () => {
  const pts=[{x:0,y:0},{x:1,y:1},{x:2,y:2}];
  const result=validateWarpMesh(pts,pts,[[0,1,2]]);
  assert.equal(result.valid,false);
  assert.match(result.errors.join(" "),/degenerate/);
});

test("mesh validation accepts a valid triangle", () => {
  const src=[{x:0,y:0},{x:10,y:0},{x:0,y:10}];
  const dst=[{x:0,y:0},{x:20,y:0},{x:0,y:20}];
  assert.equal(validateWarpMesh(src,dst,[[0,1,2]]).valid,true);
});
