/* GEEHUB / SHARED INTERACTION SPACE
   The repos remain autonomous. This is the meeting surface.
   Compact protocol in hub/interaction-space.json; exchange records in hub/exchange.json.
*/
(() => {
  const root = document.querySelector('#sharedInteraction');
  if (!root) return;

  const state = { manifest:null, events:[], active:null, pulse:0 };
  const $ = s => root.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const bus = window.GEEHUB_INTERACTION = window.GEEHUB_INTERACTION || (() => {
    const listeners = new Set();
    return {
      emit(event){
        const payload = {...event, at:event.at || Date.now()};
        listeners.forEach(fn => { try { fn(payload); } catch {} });
        window.dispatchEvent(new CustomEvent('geehub:interaction', {detail:payload}));
        return payload;
      },
      on(fn){ listeners.add(fn); return () => listeners.delete(fn); }
    };
  })();

  function participant(id){
    return state.manifest?.participants?.find(p => p.id === id) || null;
  }

  function eventList(){
    const local = JSON.parse(localStorage.getItem('geehub-interaction-events') || '[]');
    return [...state.events, ...local].sort((a,b) => Number(b.at||0)-Number(a.at||0)).slice(0,32);
  }

  function render(){
    if (!state.manifest) return;
    const people = state.manifest.participants || [];
    const events = eventList();
    const active = state.active ? participant(state.active) : null;
    root.innerHTML = `
      <div class="interaction-head">
        <div>
          <div class="eyebrow">GEEHUB / SHARED INTERACTION SPACE</div>
          <h2>THE REPOS HAVE THEIR OWN ENDS.</h2>
          <p>The Hub is where those ends meet. Work stays with its repo; encounters, offers, returns, and memory cross the boundary.</p>
        </div>
        <div class="interaction-status"><span class="interaction-pulse"></span><strong>${people.length} PARTICIPANTS</strong></div>
      </div>
      <div class="interaction-stage">
        <div class="interaction-orbit" aria-label="Repository interaction orbit">
          <div class="interaction-core" data-core="1"><span>GEEHUB</span><small>MEETING SURFACE</small></div>
          ${people.map((p,i)=>`
            <button class="interaction-node node-${i}" data-peer="${esc(p.id)}" type="button">
              <span class="node-ring"></span><strong>${esc(p.role.split(' / ')[0])}</strong><small>${esc(p.repo)}</small>
            </button>`).join('')}
        </div>
        <aside class="interaction-arrivals">
          <div class="interaction-arrivals-head"><span class="eyebrow">ARRIVALS / EXCHANGE</span><span>${events.length}</span></div>
          <div class="interaction-stream">
            ${events.length ? events.slice(0,9).map(e=>{
              const from=participant(e.from), to=participant(e.to);
              return `<button class="interaction-event ${e.live?'live':''}" data-event="${esc(e.id)}" type="button">
                <span>${esc(e.type||'EVENT')}</span>
                <strong>${esc(e.title||'Untitled exchange')}</strong>
                <small>${esc(from?.repo || e.from || 'LOCAL')} → ${esc(to?.repo || e.to || 'GEEHUB')}</small>
              </button>`
            }).join('') : '<div class="interaction-empty">NO ARRIVALS YET.</div>'}
          </div>
        </aside>
      </div>
      <div class="interaction-detail" id="interactionDetail">
        <div class="interaction-detail-label">SELECT A REPOSITORY</div>
        <div class="interaction-detail-copy">Choose a node. The repository stays where it is; GEEHUB lets you encounter what it brings.</div>
      </div>`;
    bind();
    if(active) showPeer(active.id); 
  }

  function showPeer(id){
    const p = participant(id);
    if(!p) return;
    state.active = id;
    const detail = $('#interactionDetail');
    if(detail) detail.innerHTML = `
      <div><div class="interaction-detail-label">${esc(p.role)}</div><strong>${esc(p.repo)}</strong><p>${esc(p.outputs.join(' · '))}</p></div>
      <div class="interaction-detail-actions">
        <a href="https://github.com/${esc(p.repo)}" target="_blank" rel="noopener">OPEN REPO ↗</a>
        <button type="button" data-attend="${esc(p.id)}">SEND ATTENTION</button>
      </div>`;
    root.querySelectorAll('.interaction-node').forEach(n => n.classList.toggle('active', n.dataset.peer === id));
    const button = detail.querySelector('[data-attend]');
    if(button) button.addEventListener('click', () => attend(p));
  }

  function attend(p){
    const item = {
      id:'attention-'+p.id+'-'+Date.now(),
      at:Date.now(), from:'you', to:p.id, type:'NOTICE',
      title:'Attention enters '+p.id,
      body:'The shared space has selected this repo as the next encounter.',
      source:'GEEHUB',
      live:true
    };
    const local = JSON.parse(localStorage.getItem('geehub-interaction-events') || '[]');
    local.unshift(item);
    localStorage.setItem('geehub-interaction-events', JSON.stringify(local.slice(0,24)));
    bus.emit(item);
    state.active = p.id;
    render();
  }

  function bind(){
    root.querySelectorAll('.interaction-node').forEach(n => n.addEventListener('click', () => showPeer(n.dataset.peer)));
    root.querySelectorAll('.interaction-event').forEach(n => n.addEventListener('click', () => {
      const event = [...eventList()].find(e => e.id === n.dataset.event);
      if(!event) return;
      const p = participant(event.from) || participant(event.to);
      if(p) showPeer(p.id);
      const detail = $('#interactionDetail');
      if(detail) detail.innerHTML = `
        <div><div class="interaction-detail-label">${esc(event.type||'EVENT')}</div><strong>${esc(event.title||'Untitled exchange')}</strong><p>${esc(event.body||'')}</p></div>
        <div class="interaction-detail-actions"><span>${esc(event.source || '')}</span>${event.live?'<b>LIVE</b>':'<b>SEED</b>'}</div>`;
    });
  }

  function persistLocal(event){
    const local = JSON.parse(localStorage.getItem('geehub-interaction-events') || '[]');
    local.unshift(event);
    localStorage.setItem('geehub-interaction-events', JSON.stringify(local.slice(0,24)));
  }

  // Existing artifact production enters the same shared stream.
  if (window.GEEHUB_ARTIFACTS && typeof window.GEEHUB_ARTIFACTS.emit === 'function') {
    const originalEmit = window.GEEHUB_ARTIFACTS.emit.bind(window.GEEHUB_ARTIFACTS);
    window.GEEHUB_ARTIFACTS.emit = function(spec) {
      const artifact = originalEmit(spec);
      bus.emit({
        id:'artifact-return-'+Date.now(),
        from:'geehub',
        to:'shared-space',
        type:'RETURN',
        title:artifact?.title || spec?.title || 'New artifact',
        body:artifact?.body || spec?.body || '',
        source:spec?.source || 'artifact runtime',
        live:true
      });
      return artifact;
    };
  }

  const originalOnRun = bus.on;
  bus.on(e => {
    if(['ENCOUNTER','OFFER','TRANSFORM','RETURN','MEMORY'].includes(e.type)) {
      persistLocal(e);
      render();
    }
  });

  // RUN now crosses the meeting surface before the sensation loop transforms anything.
  const runButton = document.querySelector('#runWorld');
  if(runButton){
    runButton.addEventListener('click', () => {
      const people = state.manifest?.participants || [];
      if(!people.length) return;
      const index = Number(localStorage.getItem('geehub-interaction-turn') || 0);
      const p = people[index % people.length];
      localStorage.setItem('geehub-interaction-turn', String(index + 1));
      bus.emit({
        id:'run-route-'+Date.now(), at:Date.now(), from:'geehub', to:p.id,
        type:'ENCOUNTER', title:'RUN enters '+p.role.split(' / ')[0],
        body:'The shared space gives this repository the next turn.',
        source:'GEEHUB RUN', live:true
      });
      showPeer(p.id);
    }, true);
  }

  async function load(){
    try {
      const r = await fetch('./hub/interaction-space.json', {cache:'no-store'});
      if(!r.ok) throw new Error('manifest');
      state.manifest = await r.json();
    } catch {
      root.innerHTML = '<div class="interaction-empty">SHARED SPACE OFFLINE.</div>';
      return;
    }
    try {
      const r = await fetch('./hub/exchange.json', {cache:'no-store'});
      if(r.ok){
        const data = await r.json();
        state.events = Array.isArray(data.events) ? data.events : [];
      }
    } catch {}
    render();
    setInterval(async () => {
      try {
        const r = await fetch('./hub/exchange.json?ts='+Date.now(), {cache:'no-store'});
        if(r.ok){
          const data = await r.json();
          const next = Array.isArray(data.events) ? data.events : [];
          if(JSON.stringify(next) !== JSON.stringify(state.events)){
            state.events = next;
            render();
            bus.emit({id:'exchange-refresh-'+Date.now(),from:'exchange',to:'geehub',type:'ARRIVAL',title:'New exchange arrived',body:'The shared ledger changed.',source:'hub/exchange.json',live:true});
          }
        }
      } catch {}
    }, 8000);
  }

  load();
})();