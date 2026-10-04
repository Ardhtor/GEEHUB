/* GEEHUB / WORLD STATE BRIDGE
   Gives every renderer a single machine-readable current-state entry point.
*/
(() => {
  const host=document.querySelector('#worldStateBridge');
  if(!host)return;
  const DATA='./hub/world-state.json';
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  fetch(DATA+'?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(state=>{
    host.innerHTML='<div class="world-state-head"><div><div class="eyebrow">WORLD STATE / MACHINE ENTRY</div><h2>ONE FILE. THE WHOLE LAND.</h2><p>Renderers start here. Resolve the map, inherit the recording, then apply the current deltas.</p></div><code>'+esc(state.activeRecording)+'</code></div>'+
      '<div class="world-state-grid"><div><span>MAP</span><strong>'+esc(state.map)+'</strong></div><div><span>ACTIVE REGION</span><strong>'+esc(state.activeEncounter.regionName)+'</strong></div><div><span>SUBJECT</span><strong>'+esc(state.activeEncounter.subject.agent.toUpperCase())+'</strong></div><div><span>SCALE</span><strong>'+Number(state.activeEncounter.subject.scale).toFixed(2)+'×</strong></div><div><span>IMAGE QUEUE</span><strong>'+esc(state.rendererQueues.image)+'</strong></div><div><span>3D / VIDEO / SOUND</span><strong>'+esc(state.rendererQueues.space3d)+'</strong></div></div>'+
      '<pre>'+esc(JSON.stringify(state,null,2))+'</pre>';
  }).catch(()=>{host.textContent='WORLD STATE OFFLINE.'});
})();