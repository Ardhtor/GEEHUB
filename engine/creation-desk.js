(() => {
  const root = document.querySelector('#creationDesk');
  if (!root) return;

  const state = { items: [], active: 0 };

  const escape = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const kindLabel = (k) => String(k || 'artifact').toUpperCase();

  function render() {
    if (!state.items.length) {
      root.innerHTML = '<div class="desk-empty">NO CREATIONS LOADED // THE DESK IS WAITING</div>';
      return;
    }
    const active = state.items[state.active] || state.items[0];
    root.innerHTML = `
      <div class="desk-head">
        <div>
          <div class="eyebrow">CREATION DESK</div>
          <h2>WORK WITH WHAT EXISTS</h2>
          <p>Select a creation. The desk makes its source, state, and possible next transformations visible without turning them into a feed.</p>
        </div>
        <div class="desk-status">${state.items.length} MATERIALS / ${kindLabel(active.kind)}</div>
      </div>
      <div class="desk-body">
        <div class="desk-shelf" role="list">
          ${state.items.map((x,i) => `
            <button class="desk-item ${i===state.active?'active':''}" data-i="${i}" type="button" role="listitem">
              <span>${kindLabel(x.kind)}</span><strong>${escape(x.title)}</strong><small>${escape(x.state || 'unknown')}</small>
            </button>`).join('')}
        </div>
        <article class="desk-stage">
          <div class="desk-stage-meta"><span>${kindLabel(active.kind)}</span><span>${escape(active.state || 'STATE UNKNOWN')}</span></div>
          <h3>${escape(active.title)}</h3>
          <p class="desk-path">${escape(active.path)}</p>
          <div class="desk-actions">
            <a href="./${encodeURI(active.path)}" class="desk-open">OPEN SOURCE</a>
            <button type="button" data-action="enter">ENTER</button>
            <button type="button" data-action="branch">BRANCH</button>
          </div>
          <div class="desk-result" id="deskResult">Select ENTER to bring this material into the world, or BRANCH to mark a new derivative for the next production pass.</div>
        </article>
      </div>`;
    root.querySelectorAll('.desk-item').forEach(b => b.addEventListener('click', () => {
      state.active = Number(b.dataset.i);
      render();
    }));
    root.querySelector('[data-action="enter"]').addEventListener('click', () => {
      const a = state.items[state.active];
      const target = document.querySelector('#visualTitle');
      const caption = document.querySelector('#visualCaption');
      if (target) target.textContent = a.title;
      if (caption) caption.textContent = `${kindLabel(a.kind)} / ${String(a.state || 'ACTIVE').toUpperCase()} / ENTERED`;
      document.querySelector('#worldVisual')?.scrollIntoView({behavior:'smooth', block:'center'});
      root.querySelector('#deskResult').textContent = `ENTERED: ${a.title}. The material is now the current world encounter.`;
    });
    root.querySelector('[data-action="branch"]').addEventListener('click', () => {
      const a = state.items[state.active];
      const key = 'geehub-creation-branches';
      const branches = JSON.parse(localStorage.getItem(key) || '[]');
      branches.unshift({from:a.id || a.title,title:a.title,time:Date.now()});
      localStorage.setItem(key, JSON.stringify(branches.slice(0,24)));
      root.querySelector('#deskResult').textContent = `BRANCH MARKED: ${a.title} → a new derivative can now be produced from this material.`;
    });
  }

  fetch('./creations/index.json').then(r => r.json()).then(data => {
    state.items = (data.entries || []).map(x => ({...x, id:x.id || x.title}));
    render();
  }).catch(() => {
    root.innerHTML = '<div class="desk-empty">CREATION INDEX UNAVAILABLE // OPEN THE FILESPACE</div>';
  });
})();