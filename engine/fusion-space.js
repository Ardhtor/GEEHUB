(() => {
  const root = document.querySelector('#fusionSpace');
  if (!root) return;
  const state = { items: [], selected: new Set(), dragging: null, offset: [0,0], sequence: 0, anchor: 'CHARACTER' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const kinds = { novel:'PLACE', characters:'PERSON', motion:'MOTION', rules:'THREAD', assets:'MATERIAL', scene:'SCENE', map:'PLACE', image:'IMAGE', sound:'SOUND', fusion:'EMERGENCE' };

  function seed(data) {
    state.items = (data.entries || []).slice(0, 12).map((x, i) => ({
      ...x, id:x.id || ('material-' + i),
      x: 9 + (i % 4) * 27, y: 15 + Math.floor(i / 4) * 31
    }));
    render();
  }

  function render() {
    root.innerHTML = `
      <div class="fusion-head">
        <div><div class="eyebrow">SCRY / CHARACTER FIELD</div><h2>LOOK THROUGH THE FACE</h2><p>The character is the landmark. Everything else becomes easier to find by what gathers around them.</p></div>
        <div class="fusion-state"><span id="fusionCount">${state.items.length}</span> MATERIALS / <span id="fusionMode">WATCHING</span></div>
      </div>
      <div class="fusion-body">
        <div id="fusionField" class="fusion-field scry-field" tabindex="0" aria-label="Character scrying field">
          <div class="fusion-haze"></div><div class="fusion-grid"></div>
          <div class="scry-ring scry-ring-a"></div><div class="scry-ring scry-ring-b"></div>
          <div class="scry-threads"></div><div id="fusionObjects"></div>
          <button id="characterAnchor" class="character-anchor" type="button" aria-label="Character landmark">
            <span class="character-aura"></span><span class="character-face"><i class="eye a"></i><i class="eye b"></i><i class="nose"></i><i class="mouth"></i></span>
            <strong>CHARACTER</strong><small>LANDMARK / LOOK HERE</small>
          </button>
          <div class="fusion-center">SCRY</div>
        </div>
        <aside class="fusion-inspector">
          <div class="eyebrow">WHAT IS NEAR THEM</div>
          <div id="fusionInspector"><span class="fusion-muted">Select something around the character.</span></div>
          <div class="fusion-actions">
            <button type="button" data-fusion="scry">SCRY THE FIELD</button>
            <button type="button" data-fusion="fuse">BRING TOGETHER</button>
            <button type="button" data-fusion="enter">ENTER WORLD</button>
            <button type="button" data-fusion="clear">CLEAR</button>
          </div>
          <div id="fusionLineage" class="fusion-lineage">The face is the fixed point. Location is relational.</div>
        </aside>
      </div>`;

    const field = root.querySelector('#fusionField');
    const objects = root.querySelector('#fusionObjects');

    state.items.forEach(item => {
      const el = document.createElement('button');
      el.type='button';
      el.className='fusion-object scry-object' + (state.selected.has(item.id) ? ' selected' : '');
      el.style.left=item.x+'%'; el.style.top=item.y+'%';
      el.innerHTML=`<span>${esc(kinds[item.kind] || String(item.kind || 'THING').toUpperCase())}</span><strong>${esc(item.title)}</strong><small>${esc(item.state || 'seed')}</small>`;
      el.addEventListener('click', e => {
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          state.selected.has(item.id) ? state.selected.delete(item.id) : state.selected.add(item.id);
        } else {
          state.selected.clear(); state.selected.add(item.id);
        }
        update();
      });
      el.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        state.dragging=item;
        const r=field.getBoundingClientRect();
        state.offset=[e.clientX-r.left-r.width*item.x/100,e.clientY-r.top-r.height*item.y/100];
        el.setPointerCapture(e.pointerId);
        root.querySelector('#fusionMode').textContent='MOVING';
      });
      el.addEventListener('pointermove', e => {
        if(state.dragging!==item)return;
        const r=field.getBoundingClientRect();
        item.x=Math.max(4,Math.min(96,((e.clientX-r.left-state.offset[0])/r.width)*100));
        item.y=Math.max(7,Math.min(93,((e.clientY-r.top-state.offset[1])/r.height)*100));
        el.style.left=item.x+'%'; el.style.top=item.y+'%';
        checkNear();
      });
      el.addEventListener('pointerup',()=>{state.dragging=null;root.querySelector('#fusionMode').textContent='WATCHING';checkNear();});
      objects.appendChild(el);
    });
    root.querySelector('#characterAnchor').addEventListener('click', scry);
    update();
  }

  function update() {
    root.querySelectorAll('.fusion-object').forEach((el,i)=>el.classList.toggle('selected',state.selected.has(state.items[i]?.id)));
    const chosen=state.items.filter(x=>state.selected.has(x.id));
    root.querySelector('#fusionInspector').innerHTML=chosen.length
      ? chosen.map(x=>`<div class="fusion-presence"><span>${esc(kinds[x.kind] || String(x.kind||'THING').toUpperCase())}</span><strong>${esc(x.title)}</strong><small>${esc(x.path||'')}</small></div>`).join('')
      : '<span class="fusion-muted">Select something around the character.</span>';
    root.querySelector('#fusionCount').textContent=state.items.length;
  }

  function scry() {
    const field=root.querySelector('#fusionField');
    field.classList.add('scrying');
    root.querySelector('#fusionMode').textContent='SCRYING';
    state.items.forEach(item=>{
      const dx=50-item.x, dy=47-item.y, d=Math.hypot(dx,dy);
      item.x += dx * Math.min(.18, d/1000);
      item.y += dy * Math.min(.18, d/1000);
    });
    render();
    root.querySelector('#fusionField').classList.add('scrying');
    root.querySelector('#fusionMode').textContent='SCRYING';
    root.querySelector('#fusionLineage').textContent='THE FIELD HAS BEEN READ FROM THE CHARACTER OUTWARD.';
    setTimeout(()=>{ root.querySelector('#fusionMode').textContent='WATCHING'; root.querySelector('#fusionField').classList.remove('scrying'); },1600);
  }

  function checkNear() {
    const chosen=state.items.filter(x=>state.selected.has(x.id));
    const close=chosen.length>1 && chosen.every(a=>chosen.every(b=>a===b||Math.hypot(a.x-b.x,a.y-b.y)<18));
    root.querySelector('#fusionMode').textContent=close?'RESONANCE':'WATCHING';
    root.querySelector('#fusionField').classList.toggle('resonating',close);
  }

  function fuse() {
    const chosen=state.items.filter(x=>state.selected.has(x.id));
    if(chosen.length<2)return;
    const title=chosen.map(x=>x.title).join(' + ');
    const fusion={id:'fusion-'+(++state.sequence),kind:'fusion',title,state:'experimental',path:'creations/fusions/'+state.sequence+'.json',parents:chosen.map(x=>x.id),x:50,y:47};
    state.items.push(fusion); state.selected.clear(); state.selected.add(fusion.id);
    localStorage.setItem('geehub-fusion-lineage',JSON.stringify({created:Date.now(),from:chosen.map(x=>x.id),title}));
    render();
    root.querySelector('#fusionLineage').textContent='EMERGED // '+chosen.map(x=>x.title).join(' + ')+' → '+title;
    root.querySelector('#fusionMode').textContent='EMERGED';
  }

  root.addEventListener('click',e=>{
    const action=e.target.closest('[data-fusion]')?.dataset.fusion;
    if(action==='scry')scry();
    if(action==='fuse')fuse();
    if(action==='clear'){state.selected.clear();update();}
    if(action==='enter'){
      const x=state.items.find(i=>state.selected.has(i.id));
      if(!x)return;
      const t=document.querySelector('#visualTitle'),c=document.querySelector('#visualCaption');
      if(t)t.textContent=x.title;
      if(c)c.textContent='CHARACTER / '+String(x.state||'ACTIVE').toUpperCase()+' / PRESENT';
      document.querySelector('#worldVisual')?.scrollIntoView({behavior:'smooth',block:'center'});
    }
  });

  fetch('./creations/index.json').then(r=>r.json()).then(seed).catch(()=>seed({entries:[
    {id:'worlds',kind:'novel',title:'WORLDS',state:'existing',path:'novel/WORLDS.md'},
    {id:'beefythiq-biographies',kind:'characters',title:'BEEFYTHIQ BIOGRAPHIES',state:'existing',path:'lore/BEEFYTHIQ_BIOGRAPHIES.md'},
    {id:'swarvic-dance',kind:'motion',title:'SWARVIC DANCE',state:'existing',path:'creative/swarvic-dance.json'},
    {id:'recursive-control',kind:'rules',title:'RECURSIVE CONTROL',state:'existing',path:'engine/RECURSIVE_NARRATIVE_CONTROL.md'}
  ]}));
})();