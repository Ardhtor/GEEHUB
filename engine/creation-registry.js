/* GEEHUB CREATION REGISTRY
   Turns the existing Creations section into a living index.
   It does not replace canon or the artifact runtime.
*/
(() => {
  const host = document.querySelector('#creations');
  if (!host) return;

  const registryPath = './creations/index.json';

  const panel = document.createElement('div');
  panel.className = 'creation-registry';
  panel.innerHTML = `
    <div class="registry-bar">
      <div><span class="eyebrow">CREATION REGISTRY</span><strong id="creationCount">LOADING</strong></div>
      <div class="registry-filters" role="toolbar" aria-label="Creation filters">
        <button data-filter="all" class="active">ALL</button>
        <button data-filter="existing">READY</button>
        <button data-filter="queued">QUEUED</button>
      </div>
    </div>
    <div id="creationRegistryGrid" class="creation-registry-grid"></div>
  `;
  host.appendChild(panel);

  const grid = panel.querySelector('#creationRegistryGrid');
  const count = panel.querySelector('#creationCount');
  let entries = [];

  const escapeHTML = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function render(filter='all') {
    const visible = filter === 'all' ? entries : entries.filter(x => x.state === filter);
    count.textContent = visible.length + ' CREATION' + (visible.length === 1 ? '' : 'S');
    grid.innerHTML = visible.length ? visible.map(x => `
      <a class="registry-card" href="./${encodeURI(x.path)}">
        <span>${escapeHTML(x.kind)} / ${escapeHTML(x.state)}</span>
        <strong>${escapeHTML(x.title)}</strong>
        <small>${escapeHTML(x.path)}</small>
      </a>
    `).join('') : '<div class="registry-empty">NOTHING IN THIS FILTER.</div>';

    panel.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  }

  panel.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => render(button.dataset.filter));
  });

  fetch(registryPath)
    .then(r => r.ok ? r.json() : Promise.reject(new Error('registry unavailable')))
    .then(data => {
      entries = Array.isArray(data.entries) ? data.entries : [];
      render();
    })
    .catch(() => {
      count.textContent = 'REGISTRY OFFLINE';
      grid.innerHTML = '<div class="registry-empty">CREATION REGISTRY UNAVAILABLE // EXISTING CREATIONS REMAIN ABOVE.</div>';
    });
})();
