// GEEHUB ASSET ENGINE
// World/story state can request assets when an encounter needs a visual form.
// The engine decides WHAT is necessary; Adobe remains the production language.

const VISUAL_FORMS = {
  branch: "recursive organ-like branching structure",
  landmark: "impossible low-poly landmark",
  person: "low-poly human presence silhouette",
  memory: "layered translucent memory artifact",
  route: "luminous path through dark terrain",
  threshold: "architectural threshold with organic geometry",
  atmosphere: "volumetric environmental atmosphere",
  organ: "symbolic organic master glyph"
};

export function assessAssetNecessity(world, event) {
  const reasons = [];
  if (event.unresolved) reasons.push("unresolved narrative state");
  if (event.newRelation) reasons.push("new relationship requires spatial representation");
  if (event.distanceChanged) reasons.push("relationship distance changed");
  if (event.returned) reasons.push("return requires transformed recurrence");
  if (event.newBranch) reasons.push("Hub generated a new branch");
  if (event.observerChange) reasons.push("Observer state changed");
  if (event.intensity && event.intensity > 0.7) reasons.push("experience exceeded current visual baseline");
  if (event.organGrowth) reasons.push("organic baseline increased");

  let form = "atmosphere";
  if (event.organGrowth) form = "organ";
  else if (event.newBranch) form = "branch";
  else if (event.newRelation) form = "landmark";
  else if (event.returned) form = "memory";
  else if (event.distanceChanged) form = "route";
  else if (event.unresolved) form = "threshold";
  else if (event.observerChange) form = "person";

  return {
    necessary: reasons.length > 0,
    form,
    visualLanguage: VISUAL_FORMS[form],
    reasons,
    priority: Math.min(1, reasons.length * .2 + (event.intensity || 0)),
    growth: event.organGrowth || null
  };
}

export function requestAsset(world, event) {
  const assessment = assessAssetNecessity(world, event);
  if (!assessment.necessary) return { action:"none", assessment };

  world.assetQueue ||= [];
  const request = {
    id: "asset-" + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    status: "requested",
    form: assessment.form,
    description: assessment.visualLanguage,
    reasons: assessment.reasons,
    priority: assessment.priority,
    growth: assessment.growth,
    sourceEvent: event.id || null,
    productionLanguage: "Adobe"
  };

  world.assetQueue.push(request);
  return { action:"produce", request, assessment };
}

// Growth is cumulative and preserves the previous baseline.
// The default representation is abstract rather than anatomical.
export function growOrgan(state, stimulus=1) {
  const next = structuredClone(state);
  next.organ ||= { baseline: 1, history: [] };
  const prior = next.organ.baseline;
  const delta = Math.max(0, Number(stimulus) || 0);
  next.organ.baseline = prior + delta;
  next.organ.history.push({
    from: prior,
    to: next.organ.baseline,
    stimulus: delta,
    at: new Date().toISOString()
  });
  return next;
}

export function satisfyAsset(world, request, asset) {
  const next = structuredClone(world);
  next.assets ||= [];
  next.assetQueue ||= [];

  next.assets.push({
    ...asset,
    id: asset.id || request.id,
    generatedFor: request.id,
    generatedAt: new Date().toISOString(),
    provenance: {
      event: request.sourceEvent,
      reasons: request.reasons,
      necessity: request.description,
      growth: request.growth || null
    }
  });

  const queued = next.assetQueue.find(x => x.id === request.id);
  if (queued) queued.status = "satisfied";
  return next;
}

export function scanForNecessaryAssets(world, events=[]) {
  const requests = [];
  for (const event of events) {
    const result = requestAsset(world, event);
    if (result.action === "produce") requests.push(result.request);
  }
  return requests;
}
