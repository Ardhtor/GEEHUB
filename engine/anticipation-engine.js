/* GEEHUB ANTICIPATION ENGINE
   Turns the current corpus into a next-action surface.
   It anticipates from what already exists; it does not invent canon.
*/
(() => {
  const host = document.querySelector('#anticipation');
  if (!host) return;

  const registryPath = './creations/index.json';
  const sourcePaths = [
    './world.json',
    './creations/index.json'
  ];

  const stateKey = 'geehub-anticipation-state';
  const readState = () => { try { return JSON.parse(localStorage.getItem(stateKey) || '{}'); } catch { return {}; } };
  const saveState = s => localStorage.setItem(stateKey, JSON.stringify(s));

  const escapeHTML = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const shell = document.createElement('div');
  shell.className = 'anticipation-shell';
  shell.innerHTML = `
    <div class="anticipation-head">
      <div>
        <div class="eyebrow">ANTICIPATION</div>
        <h2>WHAT WANTS TO HAPPEN NEXT</h2>
        <p>The Hub reads its existing material and exposes a next move. Nothing here becomes canon automatically.</p>
      </div>
      <button id="anticipateAgain" class="run-button" type="button">ANTICIPATE</button>
    </div>
    <div id="anticipationDesk" class="anticipation-desk"></div>
  `;
  host.appendChild(shell);

  const desk = shell.querySelector('#anticipationDesk');
  const state = readState();

  Promise.all(sourcePaths.map(p => fetch(p).then(r => r.ok ? r.json() : null).catch(() => null)))
    .then(([world, registry]) => {
      const regions = Array.isArray(world?.regions) ? world.regions : [];
      const entries = Array.isArray(registry?.entries) ? registry.entries : [];
      const existing = entries.filter(x => x.state === 'existing');
      const queued = entries.filter(x => x.state === 'queued');

      const candidates = [
        ...existing.map(x => ({
          mode: 'OPEN',
          title: x.title,
          text: 'Enter an existing creation and let it become the next encounter.',
          path: x.path,
          weight: 3
        })),
        ...regions.slice(0, 8).map(x => ({
          mode: 'ENTER',
          title: x.name,
          text: x.description || 'A place already present in the world.',
          path: x.path && x.path !== '#' ? x.path : '#',
          weight: 2
        })),
        ...queued.map(x => ({
          mode: 'BUILD',
          title: x.title,
          text: 'A queued material wants an artifact surface before it becomes part of the world.',
          path: x.path,
          weight: 4
        }))
      ];

      const last = state.lastTitle;
      const shuffled = candidates
        .filter(x => x.title !== last)
        .sort((a,b) => b.weight - a.weight || Math.random() - .5);

      const next = shuffled.slice(0, 4);
      state.lastTitle = next[0]?.title || '';
      saveState(state);

      desk.innerHTML = next.map((x,i) => `
        <a class="anticipation-card ${i === 0 ? 'primary' : ''}" href="${x.path && x.path !== '#' ? './' + encodeURI(x.path) : '#'}" data-title="${escapeHTML(x.title)}">
          <span>${escapeHTML(x.mode)}</span>
          <strong>${escapeHTML(x.title)}</strong>
          <small>${escapeHTML(x.text)}</small>
          <em>${x.path && x.path !== '#' ? escapeHTML(x.path) : 'WORLD / LOCAL'}</em>
        </a>
      `).join('') || '<div class="anticipation-empty">THE CORPUS HAS NOT PRODUCED A NEXT MOVE.</div>';

      shell.querySelector('#anticipateAgain').addEventListener('click', () => {
        state.lastTitle = '';
        saveState(state);
        location.reload();
      });
    });
})();
