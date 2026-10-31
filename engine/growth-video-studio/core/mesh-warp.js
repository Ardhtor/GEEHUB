/**
 * Landmark-driven piecewise-affine image warp.
 *
 * This is the first pixel renderer primitive: it can deform a supplied frame
 * when a tracker/segmentation stage provides stable source and destination
 * landmarks. It does not detect a body or infer masks on its own.
 */

export function affineFromTriangles(source, target) {
  if (source.length !== 3 || target.length !== 3) {
    throw new TypeError("Each triangle must contain exactly three points");
  }
  const [s0, s1, s2] = source;
  const [t0, t1, t2] = target;
  const det = (s1.x-s0.x)*(s2.y-s0.y) - (s2.x-s0.x)*(s1.y-s0.y);
  if (Math.abs(det) < 1e-8) throw new RangeError("Source triangle is degenerate");

  const inv = [
    [(s2.y-s0.y)/det, -(s2.x-s0.x)/det],
    [-(s1.y-s0.y)/det, (s1.x-s0.x)/det]
  ];
  const solve = (v0,v1,v2) => {
    const dx1=v1-v0, dx2=v2-v0;
    return [
      inv[0][0]*dx1 + inv[0][1]*dx2,
      inv[1][0]*dx1 + inv[1][1]*dx2,
      v0
    ];
  };
  const x = solve(t0.x,t1.x,t2.x);
  const y = solve(t0.y,t1.y,t2.y);
  // Canvas transform: x'=a*x+c*y+e, y'=b*x+d*y+f
  return { a:x[0], c:x[1], e:x[2]-x[0]*s0.x-x[1]*s0.y,
           b:y[0], d:y[1], f:y[2]-y[0]*s0.x-y[1]*s0.y };
}

export function validateWarpMesh(sourcePoints, targetPoints, triangles) {
  const errors = [];
  if (!Array.isArray(sourcePoints) || !Array.isArray(targetPoints) ||
      sourcePoints.length !== targetPoints.length || sourcePoints.length < 3) {
    return { valid:false, errors:["Matching source and target landmarks are required"] };
  }
  if (!Array.isArray(triangles) || triangles.length === 0) {
    return { valid:false, errors:["At least one triangle is required"] };
  }
  for (const [i,p] of sourcePoints.entries()) {
    const q=targetPoints[i];
    if (![p?.x,p?.y,q?.x,q?.y].every(Number.isFinite)) errors.push(`Landmark ${i} is invalid`);
  }
  for (const [i,tri] of triangles.entries()) {
    if (!Array.isArray(tri) || tri.length!==3 || tri.some(n=>!Number.isInteger(n)||n<0||n>=sourcePoints.length)) {
      errors.push(`Triangle ${i} has invalid indices`);
      continue;
    }
    const area = pts => {
      const [a,b,c]=pts;
      return (b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);
    };
    if (Math.abs(area(tri.map(n=>sourcePoints[n])))<1e-8) errors.push(`Triangle ${i} source is degenerate`);
    if (Math.abs(area(tri.map(n=>targetPoints[n])))<1e-8) errors.push(`Triangle ${i} target is degenerate`);
  }
  return { valid:errors.length===0, errors };
}

/**
 * Draw a mesh warp. Triangles should share edges and cover only the deformable
 * mask; keep face/background outside the mesh or provide a separate protected
 * identity layer. Canvas state is isolated per triangle.
 */
export function renderMeshWarp(ctx, image, sourcePoints, targetPoints, triangles) {
  const validation=validateWarpMesh(sourcePoints,targetPoints,triangles);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  for (const indices of triangles) {
    const src=indices.map(i=>sourcePoints[i]);
    const dst=indices.map(i=>targetPoints[i]);
    const m=affineFromTriangles(src,dst);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dst[0].x,dst[0].y);
    ctx.lineTo(dst[1].x,dst[1].y);
    ctx.lineTo(dst[2].x,dst[2].y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
    ctx.drawImage(image,0,0);
    ctx.restore();
  }
  return { renderedTriangles:triangles.length, validation };
}
