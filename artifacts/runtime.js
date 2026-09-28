const GEEHUB_ARTIFACT_KEY = "geehub-artifacts";

export function readArtifacts() {
  try {
    const value = JSON.parse(localStorage.getItem(GEEHUB_ARTIFACT_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function emitArtifact({type, title, body, source="GEEHUB", lineage=null, canon="unclassified", dreamable=true, quietness="high"}) {
  const artifact = {
    id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    created_at: new Date().toISOString(),
    source, kind: type, title, content: body,
    lineage, canon, dreamable, quietness
  };
  const all = [artifact, ...readArtifacts()].slice(0, 200);
  localStorage.setItem(GEEHUB_ARTIFACT_KEY, JSON.stringify(all));
  return artifact;
}

export function exportArtifacts() {
  const artifacts = readArtifacts();
  const payload = {version: 1, exported_at: new Date().toISOString(), source: "GEEHUB", artifacts};
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "geehub-artifacts-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  URL.revokeObjectURL(url);
  return artifacts.length;
}
