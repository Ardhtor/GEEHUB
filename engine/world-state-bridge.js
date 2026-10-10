/* GEEHUB / WORLD STATE BRIDGE
   Combines the canonical recording contract with the live rule-governed world state.
   Static files remain the baseline; browser-local history supplies the current delta.
*/
(() => {
  const host = document.querySelector('#worldStateBridge');
  if (!host) return;
  const DATA = './hub/world-state.json';
  const esc = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let baseState = null;

  function runtimeState() {
    try { return window.GEEHUB_WORLD_AUTONOMY?.state?.() || null; } catch { return null; }
  }
  function liveRegionName(id) {
    try { return window.GEEHUB_WORLD?.getRegion?.(id)?.name || id || 'UNSET'; } catch { return id || 'UNSET'; }
  }
  function phaseName(phase) {
    return ['ARRIVAL','ENVIRONMENT','MEMORY','ROUTE OPEN'][Number(phase) || 0] || 'ARRIVAL';
  }
  function render() {
    if (!baseState) return;
    const runtime = runtimeState();
    const live = runtime ? {
      rule: 'TIME → ATMOSPHERE → MEMORY → RELATED ROUTE → CROSSING',
      activeRegion: runtime.currentRegion,
      activeRegionName: liveRegionName(runtime.currentRegion),
      nextRegion: runtime.nextRegion,
      nextRegionName: liveRegionName(runtime.nextRegion),
      phase: phaseName(runtime.phase),
      pressure: Number(runtime.pressure || 0).toFixed(2),
      memory: Number(runtime.memory || 0).toFixed(2),
      runMode: Boolean(runtime.runMode),
      visits: runtime.visits || {},
      latestResponses: (runtime.history || []).slice(0, 6).map(event => ({
        type:event.type,title:event.title,from:event.from,to:event.to,at:event.at
      }))
    } : null;
    const state = {...baseState, liveAutonomy:live};
    const fields = [
      ['MAP', state.map],
      ['CANONICAL RECORDING', state.activeRecording],
      ['CANONICAL SUBJECT', state.activeEncounter?.subject?.agent?.toUpperCase()],
      ['LIVE LOCATION', live?.activeRegionName || 'WORLD STARTING'],
      ['WORLD PHASE', live?.phase || 'WORLD STARTING'],
      ['PRESSURE / MEMORY', live ? live.pressure + ' / ' + live.memory : 'WAITING'],
      ['NEXT RELATED ROUTE', live?.nextRegionName || 'NOT YET OPEN'],
      ['IMAGE QUEUE', state.rendererQueues?.image],
      ['3D / VIDEO / SOUND', state.rendererQueues?.space3d]
    ];
    host.innerHTML =
      '<div class="world-state-head"><div><div class="eyebrow">WORLD STATE / MACHINE ENTRY</div><h2>THE WORLD KEEPS ITS OWN TIME.</h2><p>Canonical recording first; current location, pressure, memory, and route decisions are derived from persisted events and the relation graph.</p></div><code>' + esc(state.activeRecording) + '</code></div>' +
      '<div class="world-state-grid">' + fields.map(([label,value]) => '<div><span>' + esc(label) + '</span><strong>' + esc(value ?? 'UNSET') + '</strong></div>').join('') + '</div>' +
      '<pre>' + esc(JSON.stringify(state, null, 2)) + '</pre>';
  }

  document.addEventListener('geehub:world-autonomy-ready', render);
  document.addEventListener('geehub:world-response', render);
  document.addEventListener('geehub:world-encounter', render);
  document.addEventListener('geehub:story-location', render);
  fetch(DATA + '?ts=' + Date.now(), {cache:'no-store'})
    .then(response => {
      if (!response.ok) throw new Error('world-state unavailable');
      return response.json();
    })
    .then(state => { baseState = state; render(); })
    .catch(() => { host.textContent = 'WORLD STATE OFFLINE.'; });
})();