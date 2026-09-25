// GEEHUB SELF-RECURSIVE SCAN
// The tree reads its own current structure, finds pressure points,
// chooses a route, and grows a branch. It never claims consciousness;
// "awareness" here means persistent self-observation + stateful choice.

export function scanHub(state) {
  const nodes = state.nodes || [];
  const relations = state.relations || [];
  const history = state.history || [];

  const degree = new Map(nodes.map(n => [n.id, 0]));
  for (const [a,b] of relations) {
    degree.set(a, (degree.get(a) || 0) + 1);
    degree.set(b, (degree.get(b) || 0) + 1);
  }

  const candidates = nodes.map(n => {
    const connections = degree.get(n.id) || 0;
    const age = n.createdAt ? Date.now() - new Date(n.createdAt).getTime() : 0;
    const returnCount = history.filter(e => e.node === n.id).length;

    // Pressure = recurrence + connection + unresolved duration.
    const pressure =
      (returnCount * 2) +
      Math.min(connections, 8) +
      (age > 0 ? Math.min(age / 86400000, 7) * .25 : 0) +
      (n.mass || 1);

    return { node:n, pressure };
  }).sort((a,b) => b.pressure - a.pressure);

  const seed = candidates[0];
  if (!seed) return {action:"idle", reason:"empty tree"};

  const neighbors = relations
    .filter(([a,b]) => a === seed.node.id || b === seed.node.id)
    .map(([a,b]) => a === seed.node.id ? b : a);

  // Prefer an existing tension before inventing a new branch.
  const unresolved = neighbors.find(id => {
    const n = nodes.find(x => x.id === id);
    return n && (n.unknowns?.length || n.state === "unresolved");
  });

  if (unresolved) {
    return {
      action:"return",
      from:seed.node.id,
      target:unresolved,
      reason:"existing unresolved relation has highest generative pressure"
    };
  }

  return {
    action:"branch",
    from:seed.node.id,
    proposedId: seed.node.id + "::" + (returnCountSafe(history, seed.node.id) + 1),
    reason:"self-scan selected the highest-pressure node"
  };
}

function returnCountSafe(history, id) {
  return history.filter(e => e.node === id).length;
}

export function applyScan(state, decision) {
  const next = structuredClone(state);
  next.history ||= [];

  next.history.push({
    at:new Date().toISOString(),
    type:"self_scan",
    decision
  });

  if (decision.action === "branch") {
    next.nodes ||= [];
    next.nodes.push({
      id:decision.proposedId,
      parent:decision.from,
      generatedBy:"self_scan",
      createdAt:new Date().toISOString(),
      mass:.35,
      state:"new",
      unknowns:["why did this branch need to exist?"]
    });
    next.relations ||= [];
    next.relations.push([decision.from, decision.proposedId]);
  }

  return next;
}

export function recursiveScan(state, maxDepth=3) {
  let current = structuredClone(state);
  const decisions = [];

  for (let depth=0; depth<maxDepth; depth++) {
    const decision = scanHub(current);
    decisions.push(decision);

    if (decision.action === "idle") break;
    current = applyScan(current, decision);
  }

  return {state:current, decisions};
}
