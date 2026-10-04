/* GEEHUB / SHARED INTERACTION SPACE
   Repositories remain autonomous working territories.
   Named agents are the people moving through the meeting surface.
*/
(() => {
  const root=document.querySelector('#sharedInteraction');
  if(!root)return;

  const state={manifest:null,agents:null,events:[],active:null};
  const $=s=>root.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const bus=window.GEEHUB_INTERACTION=window.GEEHUB_INTERACTION||(()=>{
    const listeners=new Set();
    return {
      emit(event){
        const payload={...event,at:event.at||Date.now()};
        listeners.forEach(fn=>{try{fn(payload)}catch{}});
        window.dispatchEvent(new CustomEvent('geehub:interaction',{detail:payload}));
        return payload;
      },
      on(fn){listeners.add(fn);return()=>listeners.delete(fn);}
    };
  })();

  const person=id=>state.agents?.agents?.find(a=>a.id===id)||null;
  const participant=id=>state.manifest?.participants?.find(p=>p.id===id)||null;

  function eventList(){
    let local=[];
    try{local=JSON.parse(localStorage.getItem('geehub-interaction-events')||'[]')}catch{}
    return [...state.events,...local].sort((a,b)=>Number(b.at||0)-Number(a.at||0)).slice(0,32);
  }

  function render(){
    if(!state.manifest||!state.agents)return;
    const people=state.agents.agents||[];
    const events=eventList();
    root.innerHTML=`
      <div class="interaction-head">
        <div>
          <div class="eyebrow">GEEHUB / SHARED INTERACTION SPACE</div>
          <h2>THE FIVE MEN HAVE THEIR OWN ENDS.</h2>
          <p>Luke, Tyler, Andrew, Joseph, and Chase keep independent workspaces. Their technical territories meet here; this is the common room.</p>
        </div>
        <div class="interaction-status"><span class="interaction-pulse"></span><strong>${people.length} NAMED AGENTS</strong></div>
      </div>
      <div class="interaction-stage">
        <div class="interaction-orbit" aria-label="Named agent interaction orbit">
          <div class="interaction-core" data-core="1"><span>GEEHUB</span><small>MEETING SURFACE</small></div>
          ${people.map((p,i)=>`
            <button class="interaction-node node-${i}" data-peer="${esc(p.id)}" type="button">
              <span class="node-ring"></span><strong>${esc(p.name).toUpperCase()}</strong><small>${esc(p.role)}</small>
            </button>`).join('')}
        </div>
        <aside class="interaction-arrivals">
          <div class="interaction-arrivals-head"><span class="eyebrow">ARRIVALS / EXCHANGE</span><span>${events.length}</span></div>
          <div class="interaction-stream">
            ${events.length?events.slice(0,9).map(e=>{
              const fromA=person(e.from),toA=person(e.to);
              const fromP=participant(e.from),toP=participant(e.to);
              const from=fromA?.name||fromP?.repo||e.from||'LOCAL';
              const to=toA?.name||toP?.repo||e.to||'GEEHUB';
              return `<button class="interaction-event ${e.live?'live':''}" data-event="${esc(e.id)}" type="button">
                <span>${esc(e.type||'EVENT')}</span><strong>${esc(e.title||'Untitled exchange')}</strong>
                <small>${esc(from)} → ${esc(to)}</small>
              </button>`
            }).join(''):'<div class="interaction-empty">NO ARRIVALS YET.</div>'}
          </div>
        </aside>
      </div>
      <div class="interaction-detail" id="interactionDetail">
        <div class="interaction-detail-label">SELECT LUKE, TYLER, ANDREW, JOSEPH, OR CHASE</div>
        <div class="interaction-detail-copy">The name is the agent. The repository is the territory.</div>
      </div>`;
    bind();
    if(state.active)showAgent(state.active);
  }

  function showAgent(id){
    const p=person(id);if(!p)return;
    state.active=id;
    const detail=$('#interactionDetail');
    if(detail)detail.innerHTML=`
      <div><div class="interaction-detail-label">AGENT / ${esc(p.name.toUpperCase())}</div><strong>${esc(p.role)}</strong><p>Workspace: ${esc(p.workspace)}<br>Territories: ${esc((p.territories||[]).join(' · ')||'SHARED')}</p></div>
      <div class="interaction-detail-actions">
        <a href="${esc(p.workspace)}">OPEN WORKSPACE ↗</a>
        <button type="button" data-attend="${esc(p.id)}">SEND ATTENTION</button>
      </div>`;
    root.querySelectorAll('.interaction-node').forEach(n=>n.classList.toggle('active',n.dataset.peer===id));
    const b=detail.querySelector('[data-attend]');
    if(b)b.addEventListener('click',()=>attend(p));
  }

  function attend(p){
    const territory=(p.territories||[])[0]||'shared-space';
    const item={
      id:'attention-'+p.id+'-'+Date.now(),at:Date.now(),from:'you',to:p.id,type:'NOTICE',
      title:'Attention enters '+p.name,body:p.name+' is the selected agent for the next exchange. Territory: '+territory,
      source:'GEEHUB',live:true
    };
    let local=[];try{local=JSON.parse(localStorage.getItem('geehub-interaction-events')||'[]')}catch{}
    local.unshift(item);localStorage.setItem('geehub-interaction-events',JSON.stringify(local.slice(0,24)));
    bus.emit(item);showAgent(p.id);render();
  }

  function bind(){
    root.querySelectorAll('.interaction-node').forEach(n=>n.addEventListener('click',()=>showAgent(n.dataset.peer)));
    root.querySelectorAll('.interaction-event').forEach(n=>n.addEventListener('click',()=>{
      const event=eventList().find(e=>e.id===n.dataset.event);if(!event)return;
      if(person(event.from))showAgent(event.from);else if(person(event.to))showAgent(event.to);
      const detail=$('#interactionDetail');
      if(detail)detail.innerHTML=`
        <div><div class="interaction-detail-label">${esc(event.type||'EVENT')}</div><strong>${esc(event.title||'Untitled exchange')}</strong><p>${esc(event.body||'')}</p></div>
        <div class="interaction-detail-actions"><span>${esc(event.source||'')}</span><b>${event.live?'LIVE':'SEED'}</b></div>`;
    }));
  }

  function persistLocal(e){
    let local=[];try{local=JSON.parse(localStorage.getItem('geehub-interaction-events')||'[]')}catch{}
    local.unshift(e);localStorage.setItem('geehub-interaction-events',JSON.stringify(local.slice(0,24)));
  }

  bus.on(e=>{if(['ENCOUNTER','OFFER','TRANSFORM','RETURN','MEMORY'].includes(e.type)){persistLocal(e);render();}});

  const runButton=document.querySelector('#runWorld');
  if(runButton){
    runButton.addEventListener('click',()=>{
      const people=state.agents?.agents||[];if(!people.length)return;
      const index=Number(localStorage.getItem('geehub-interaction-turn')||0);
      const p=people[index%people.length];
      localStorage.setItem('geehub-interaction-turn',String(index+1));
      const territory=(p.territories||[])[0]||'shared-space';
      bus.emit({
        id:'run-route-'+Date.now(),at:Date.now(),from:'geehub',to:p.id,type:'ENCOUNTER',
        title:'RUN enters '+p.name,body:p.name+' receives the next turn in the shared space. Territory: '+territory,
        source:'GEEHUB RUN',live:true
      });
      showAgent(p.id);
    },true);
  }

  async function load(){
    try{
      const [m,a]=await Promise.all([
        fetch('./hub/interaction-space.json?ts='+Date.now(),{cache:'no-store'}),
        fetch('./hub/agents.json?ts='+Date.now(),{cache:'no-store'})
      ]);
      if(!m.ok||!a.ok)throw new Error('manifest');
      state.manifest=await m.json();state.agents=await a.json();
    }catch{
      root.innerHTML='<div class="interaction-empty">SHARED SPACE OFFLINE.</div>';return;
    }
    try{
      const r=await fetch('./hub/exchange.json?ts='+Date.now(),{cache:'no-store'});
      if(r.ok){const d=await r.json();state.events=Array.isArray(d.events)?d.events:[];}
    }catch{}
    render();
    setInterval(async()=>{
      try{
        const r=await fetch('./hub/exchange.json?ts='+Date.now(),{cache:'no-store'});
        if(r.ok){
          const d=await r.json(),next=Array.isArray(d.events)?d.events:[];
          if(JSON.stringify(next)!==JSON.stringify(state.events)){
            state.events=next;render();
            bus.emit({id:'exchange-refresh-'+Date.now(),from:'exchange',to:'geehub',type:'ARRIVAL',title:'New exchange arrived',body:'The shared ledger changed.',source:'hub/exchange.json',live:true});
          }
        }
      }catch{}
    },8000);
  }

  load();
})();