/* GEEHUB / SENSATION ENGINE RUN LOOP
   The RUN button must return something visible, not merely start motion.
   This layer makes RUN a complete archive cycle:
   memory -> encounter -> transformation -> artifact -> visible return.
*/
(() => {
  const $ = s => document.querySelector(s);
  const button = $('#runWorld');
  if (!button || !window.GEEHUB_ARTIFACTS) return;

  let places = [];
  let runCount = Number(localStorage.getItem('geehub-run-count') || 0);

  const safe = value => String(value || '').replace(/[&<>"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
  }[c]));

  async function memory() {
    const memories = [];
    if (window.world?.regions?.length) memories.push(...window.world.regions);
    try {
      const response = await fetch('./world.json');
      if (response.ok) {
        const data = await response.json();
        window.world = data;
        memories.push(...(data.regions || []));
      }
    } catch {}
    try {
      const response = await fetch('./lore/novel/INDEX.json');
      if (response.ok) {
        const data = await response.json();
        memories.push(...(data.entries || []).map(entry => ({
          id: 'novel:' + entry.file,
          name: entry.title,
          description: entry.description,
          source: 'living novel corpus',
          file: entry.file
        })));
      }
    } catch {}
    const seen = new Set();
    return memories.filter(item => {
      const key = item.id || item.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function choose() {
    if (!places.length) return null;
    return places[Math.floor(Math.random() * places.length)];
  }

  function renderReturn(artifact, place) {
    const narrative = $('#gameNarrative');
    const command = $('#gameCommand');
    const state = $('#gameRunState');
    if (state) state.textContent = 'RETURNED';
    if (command) command.textContent = 'MEMORY → ' + String(place.name).toUpperCase();
    if (narrative) {
      narrative.textContent =
        'RUN #' + runCount +
        '\\n\\nMEMORY: ' + place.name +
        '\\n\\n' + (place.description || 'A place without a fixed description.') +
        '\\n\\n[ TRANSFORMATION ]\\n' +
        artifact.body +
        '\\n\\n[ CREATION ]\\n' +
        artifact.title +
        '\\n\\n[ CONTINUITY ]\\n' +
        'The place remains. The record has changed. The next run inherits both.';
    }

    const stage = $('#artifactStage');
    if (stage) {
      const card = document.createElement('article');
      card.className = 'artifact-card';
      card.innerHTML =
        '<div class="artifact-glyph">✦</div>' +
        '<div class="eyebrow">LIVE TRACE</div>' +
        '<h3>' + safe(artifact.title) + '</h3>' +
        '<p>' + safe(artifact.body) + '</p>';
      stage.prepend(card);
      while (stage.children.length > 8) stage.lastElementChild.remove();
    }

    const grid = $('#liveCreationGrid');
    if (grid) {
      const empty = grid.querySelector('.live-empty');
      if (empty) empty.remove();
      const card = document.createElement('article');
      card.className = 'live-creation-card';
      card.innerHTML =
        '<span>WORLD-TRACE</span>' +
        '<strong>' + safe(artifact.title) + '</strong>' +
        '<small>' + safe(artifact.body) + '</small>' +
        '<em>unclassified</em>';
      grid.prepend(card);
    }

    const dream = $('#dreamText');
    if (dream) dream.textContent = 'What remains: ' + artifact.title;
  }

  async function runSensation() {
    button.textContent = 'RUNNING…';
    button.disabled = true;
    const all = await memory();
    places = all;
    const selfNeed = window.GEEHUB_SELF?.choose?.() || null;
    const preferredPlaces = selfNeed
      ? places.filter(p => String(p.source || '').toLowerCase().includes(String(selfNeed.target || '').split('-')[0]))
      : [];
    const place = preferredPlaces[runCount % Math.max(1, preferredPlaces.length)] || choose();

    if (!place) {
      button.textContent = 'RUN';
      button.disabled = false;
      return;
    }

    runCount += 1;
    localStorage.setItem('geehub-run-count', String(runCount));

    const transformations = [
      'The archive notices a relationship that was not visible before.',
      'An old trace returns carrying one altered detail.',
      'The place becomes more specific because it has been remembered again.',
      'Two records briefly occupy the same scene.',
      'The description changes without erasing what came before.',
      'A quiet association becomes part of the world.'
    ];
    const change = transformations[(runCount - 1) % transformations.length];
    const direction = selfNeed
      ? 'SELF-DIRECTION: reduce ' + selfNeed.name + ' by moving work toward ' + selfNeed.target + '.'
      : 'SELF-DIRECTION: continue observing the current world.';
    window.GEEHUB_SELF?.run?.();

    const artifact = window.GEEHUB_ARTIFACTS.emit({
      type: 'sensation',
      title: place.name + ' // RUN ' + String(runCount).padStart(3, '0'),
      body: direction + ' ' + change + ' ' + (place.description || ''),
      source: 'GEEHUB sensation engine',
      lineage: {
        run: runCount,
        place: place.id || place.name,
        rule: 'remember -> transform -> return'
      },
      canon: 'unclassified',
      dreamable: true,
      quietness: 'high'
    });

    renderReturn(artifact, place);
    document.body.classList.add('world-touched');
    document.body.classList.add('running');
    button.textContent = 'RUN AGAIN';
    button.disabled = false;
  }

  // PLAY MODE: let the internal world continue without repeated manual clicks.
  const playKey = 'geehub-play-mode';
  const playDueKey = 'geehub-play-due';
  let playTimer = null;

  function markDue(){
    localStorage.setItem(playDueKey,String(Date.now()+18000));
  }

  function startPlay(){
    if(playTimer) return;
    document.body.classList.add('geehub-playing');
    const tick = () => {
      if(!button.disabled){
        runSensation();
        markDue();
      }
    };
    playTimer = setInterval(tick,18000);
  }

  function stopPlay(){
    if(playTimer){ clearInterval(playTimer); playTimer = null; }
    document.body.classList.remove('geehub-playing');
  }

  function resumePlay(){
    if(localStorage.getItem(playKey)==='off') return;
    startPlay();
    const due=Number(localStorage.getItem(playDueKey)||0);
    if(due && Date.now()>=due && !button.disabled) runSensation();
    markDue();
  }

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden) resumePlay();
  });

  window.addEventListener('pageshow', resumePlay);

  window.GEEHUB_PLAY = {
    start(){ localStorage.setItem(playKey,'on'); startPlay(); },
    stop(){ localStorage.setItem(playKey,'off'); stopPlay(); },
    toggle(){ if(playTimer) this.stop(); else this.start(); }
  };

  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    runSensation();
  }, true);
  if (localStorage.getItem(playKey) !== 'off') {
    setTimeout(() => {
      if (!document.hidden) {
        resumePlay();
        if (!Number(localStorage.getItem('geehub-run-count')||0)) runSensation();
      }
    }, 3500);
  }

})();
