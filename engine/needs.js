/* GEEHUB / GROWTH-DRIVEN NEEDS
   Growth creates demand. Needs are concrete requests for another participant.
   This surface does not claim a request was fulfilled until an exchange record arrives.
*/
(() => {
  const root=document.querySelector('#worldNeeds');
  if(!root)return;
  const state={needs:[],lastFetched:0};
  const $=s=>root.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function render(){
    const open=state.needs.filter(n=>n.status!=='FULFILLED'&&n.status!=='RETURNED');
    root.innerHTML=`
      <div class="needs-head">
        <div><div class="eyebrow">WORLD / NEEDS</div><h2>GROWTH ASKS FOR MATERIAL.</h2><p>When the world exceeds its current baseline, it can ask another repo for something specific. A request remains visible until a real return arrives.</p></div>
        <div class="needs-count">${open.length} OPEN</div>
      </div>
      <div class="needs-grid">
        ${state.needs.map(n=>`
          <article class="need-card ${esc(String(n.status||'OPEN').toLowerCase())}">
            <span>${esc(n.type)} / ${esc(n.status||'OPEN')}</span>
            <strong>${esc(n.title)}</strong>
            <small>${esc(n.reason)}</small>
            <b class="need-target">REQUEST → ${esc(n.target)}</b>
          </article>`).join('')}
      </div>`;
  }
  async function load(){
    try{
      const r=await fetch('./hub/needs.json?ts='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('needs unavailable');
      const data=await r.json();
      state.needs=Array.isArray(data.requests)?data.requests:[];
      state.lastFetched=Date.now();
      render();
    }catch{
      root.innerHTML='<div class="interaction-empty">WORLD NEEDS OFFLINE.</div>';
    }
  }
  const bus=window.GEEHUB_INTERACTION;
  bus?.on(e=>{
    if(e.type==='TRANSFORM') load();
    if(e.type==='RETURN'){
      const matches=state.needs.filter(n=>n.target===e.from || n.target===e.to);
      if(matches.length){
        state.needs=state.needs.map(n=>matches.some(m=>m.id===n.id)?{...n,status:'RETURNED'}:n);
        render();
      }
    }
  });
  load();
  setInterval(load,15000);
})();