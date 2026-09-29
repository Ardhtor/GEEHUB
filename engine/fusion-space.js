(() => {
  const root = document.querySelector('#fusionSpace');
  if (!root) return;
  const state = { items: [], selected: new Set(), dragging: null, offset: [0,0], sequence: 0 };

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const kinds = { novel:'CHAPTER', characters:'PERSON', motion:'MOTION', rules:'RULE', assets:'MATERIAL', scene:'SCENE', map:'PLACE', image:'IMAGE', sound:'SOUND' };

  function seed(data) {
    state.items = (data.entries || []).slice(0, 12).map((x, i) => ({
      ...x, id: x.id || ('material-' + i), x: 8 + (i % 4) * 23, y: 12 + Math.floor(i / 4) * 31
    }));
    render();
  }

  function render() {
    root.innerHTML = `
      <div class="fusion-head">
        <div><div class="eyebrow">CENTRAL SPACE / FUSION</div><h2>STAY WITH THE MATERIAL</h2><p>Bring things together. Let proximity become a relationship. Nothing is consumed when something new emerges.</p></div>
        <div class="fusion-state"><span id="fusionCount">${state.items.length}</span> MATERIALS / <span id="fusionMode">QUIET</span></div>
      </div>
      <div class="fusion-body">
        <div id="fusionField" class="fusion-field" tabindex="0" aria-label="Meditative fusion space">
          <div class="fusion-haze"></div><div class="fusion-grid"></div><div id="fusionObjects"></div>
          <div class="fusion-center">DWELL</div>
        </div>
        <aside class="fusion-inspector">
          <div class="eyebrow">PRESENCE</div>
          <div id="fusionInspector"><span class="fusion-muted">Select material.</span></div>
          <div class="fusion-actions">
            <button type="button" data-fusion="fuse">FUSE SELECTED</button>
            <button type="button" data-fusion="enter">ENTER WORLD</button>
            <button type="button" data-fusion="clear">CLEAR</button>
          </div>
          <div id="fusionLineage" class="fusion-lineage">No fusion yet.</div>
        </aside>
      </div>`;

    const field = root.querySelector('#fusionField');
    const objects = root.querySelector('#fusionObjects');
    state.items.forEach((item, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'fusion-object' + (state.selected.has(item.id) ? ' selected' : '');
      el.style.left = item.x + '%'; el.style.top = item.y + '%';
      el.innerHTML = `<span>${esc(kinds[item.kind] || String(item.kind || 'THING').toUpperCase())}</span><strong>${esc(item.title)}</strong><small>${esc(item.state || 'seed')}</small>`;
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
        state.dragging = item;
        const r = field.getBoundingClientRect();
        state.offset = [e.clientX - r.left - r.width * item.x / 100, e.clientY - r.top - r.height * item.y / 100];
        el.setPointerCapture(e.pointerId);
        root.querySelector('#fusionMode').textContent = 'MOVING';
      });
      el.addEventListener('pointermove', e => {
        if (state.dragging !== item) return;
        const r = field.getBoundingClientRect();
        item.x = Math.max(3, Math.min(97, ((e.clientX - r.left - state.offset[0]) / r.width) * 100));
        item.y = Math.max(5, Math.min(95, ((e.clientY - r.top - state.offset[1]) / r.height) * 100));
        el.style.left = item.x + '%'; el.style.top = item.y + '%';
        checkNear();
      });
      el.addEventListener('pointerup', () => { state.dragging = null; root.querySelector('#fusionMode').textContent = 'QUIET'; checkNear(); });
      objects.appendChild(el);
    });
    update();
  }

  function update() {
    root.querySelectorAll('.fusion-object').forEach((el, i) => el.classList.toggle('selected', state.selected.has(state.items[i]?.id)));
    const chosen = state.items.filter(x => state.selected.has(x.id));
    const inspector = root.querySelector('#fusionInspector');
    inspector.innerHTML = chosen.length
      ? chosen.map(x => `<div class="fusion-presence"><span>${esc(kinds[x.kind] || String(x.kind || 'THING').toUpperCase())}</span><strong>${esc(x.title)}</strong><small>${esc(x.path || '')}</small></div>`).join('')
      : '<span class="fusion-muted">Select material.</span>';
    root.querySelector('#fusionCount').textContent = state.items.length;
  }

  function checkNear() {
    const chosen = state.items.filter(x => state.selected.has(x.id));
    if (chosen.length < 2) return;
    const close = chosen.every((a, _, arr) => arr.every(b => a === b || Math.hypot(a.x-b.x, a.y-b.y) < 18));
    if (close) {
      root.querySelector('#fusionMode').textContent = 'RESONANCE';
      root.querySelector('#fusionField').classList.add('resonating');
    } else {
      root.querySelector('#fusionField').classList.remove('resonating');
    }
  }

  function fuse() {
    const chosen = state.items.filter(x => state.selected.has(x.id));
    if (chosen.length < 2) return;
    const title = chosen.map(x => x.title).join(' + ');
    const fusion = { id:'fusion-' + (++state.sequence), kind:'fusion', title, state:'experimental', path:'creations/fusions/' + state.sequence + '.json',
      parents:chosen.map(x=>x.id), x:50, y:48 };
    state.items.push(fusion);
    state.selected.clear(); state.selected.add(fusion.id);
    const lineage = root.querySelector('#fusionLineage');
    lineage.textContent = 'EMERGED // ' + chosen.map(x => x.title).join(' + ') + ' → ' + title;
    localStorage.setItem('geehub-fusion-lineage', JSON.stringify({created:Date.now(), from:chosen.map(x=>x.id), title}));
    render();
    root.querySelector('#fusionLineage').textContent = 'EMERGED // ' + chosen.map(x => x.title).join(' + ') + ' → ' + title;
    root.querySelector('#fusionMode').textContent = 'EMERGED';
  }

  root.addEventListener('click', e => {
    const action = e.target.closest('[data-fusion]')?.dataset.fusion;
    if (action === 'fuse') fuse();
    if (action === 'clear') { state.selected.clear(); update(); }
    if (action === 'enter') {
      const x = state.items.find(i => state.selected.has(i.id));
      if (!x) return;
      const t = document.querySelector('#visualTitle'), c = document.querySelector('#visualCaption');
      if (t) t.textContent = x.title;
      if (c) c.textContent = 'FUSION / ' + String(x.state || 'ACTIVE').toUpperCase() + ' / PRESENT';
      document.querySelector('#worldVisual')?.scrollIntoView({behavior:'smooth', block:'center'});
    }
  });

  fetch('./creations/index.json').then(r => r.json()).then(seed).catch(() => {
    seed({entries:[
      {id:'worlds',kind:'novel',title:'WORLDS',state:'existing',path:'novel/WORLDS.md'},
      {id:'beefythiq-biographies',kind:'characters',title:'BEEFYTHIQ BIOGRAPHIES',state:'existing',path:'lore/BEEFYTHIQ_BIOGRAPHIES.md'},
      {id:'swarvic-dance',kind:'motion',title:'SWARVIC DANCE',state:'existing',path:'creative/swarvic-dance.json'},
      {id:'recursive-control',kind:'rules',title:'RECURSIVE CONTROL',state:'existing',path:'engine/RECURSIVE_NARRATIVE_CONTROL.md'}
    ]});
  });
})();