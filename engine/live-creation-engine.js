/* GEEHUB LIVE CREATION ENGINE
   Turns encounters into visible, durable local artifacts.
   It deliberately stays separate from canon: emitted material is unclassified
   until a human/author promotes it.
*/
(() => {
  const ARTIFACTS = window.GEEHUB_ARTIFACTS;
  if (!ARTIFACTS) return;

  const root = document.querySelector('#creations');
  if (!root) return;

  const live = document.createElement('section');
  live.className = 'live-creations';
  live.innerHTML = '<div class="live-creations-head"><div><div class="eyebrow">LIVE OUTPUT</div><h3>THE WORLD IS MAKING THINGS</h3><p>Each meaningful encounter leaves a trace here. Local traces remain unclassified until they are deliberately promoted.</p></div><button type="button" id="takeArtifacts">TAKE WHAT EXISTS</button></div><div id="liveCreationGrid" class="live-creation-grid"></div>';
  root.appendChild(live);

  const grid = live.querySelector('#liveCreationGrid');
  const seenIds = new Set();

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function render() {
    const items = ARTIFACTS.read().slice(0, 10);
    grid.innerHTML = items.length
      ? items.map(a => '<article class="live-creation-card" data-id="' + escapeHTML(a.id) + '">' +
          '<span>' + escapeHTML(a.kind || a.type || 'TRACE') + '</span>' +
          '<strong>' + escapeHTML(a.title) + '</strong>' +
          '<small>' + escapeHTML(a.content || a.body || '') + '</small>' +
          '<em>' + escapeHTML(a.canon || 'unclassified') + '</em>' +
        '</article>').join('')
      : '<div class="live-empty">NO OUTPUT YET // RUN THE WORLD</div>';
    items.forEach(a => seenIds.add(a.id));
  }

  function emitFromNode(node, reason='encounter') {
    if (!node) return;
    const title = node.name || node.textContent || 'Unnamed place';
    const body = node.description || 'The world changed because someone entered.';
    ARTIFACTS.emit({
      type: 'world-trace',
      title: title + ' // ' + reason.toUpperCase(),
      body: body + ' The encounter remains as a local trace.',
      source: 'GEEHUB live creation engine',
      lineage: {event: reason, place: title},
      canon: 'unclassified',
      dreamable: true,
      quietness: 'high'
    });
    render();
  }

  document.addEventListener('click', event => {
    const node = event.target.closest('.node');
    if (node) {
      window.setTimeout(() => {
        const id = node.dataset.id;
        const place = window.world?.regions?.find(x => x.id === id);
        if (place) emitFromNode(place, 'arrival');
      }, 40);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && document.body.classList.contains('running')) {
      const active = document.querySelector('.node.visited');
      if (active) window.setTimeout(() => {
        const place = window.world?.regions?.find(x => x.id === active.dataset.id);
        if (place) emitFromNode(place, 'world-pulse');
      }, 80);
    }
  });

  const take = live.querySelector('#takeArtifacts');
  take.addEventListener('click', () => {
    const count = ARTIFACTS.take();
    take.textContent = count ? 'EXPORTED ' + count : 'NOTHING TO TAKE';
    window.setTimeout(() => { take.textContent = 'TAKE WHAT EXISTS'; }, 1800);
  });

  render();
  window.addEventListener('storage', render);
})();
