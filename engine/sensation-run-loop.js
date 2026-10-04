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

    // IMAGE needs now create a concrete visual-production job from the persistent map.
    if (selfNeed?.type === 'IMAGE' && window.GEEHUB_IMAGE_WORKER?.build) {
      window.GEEHUB_IMAGE_WORKER.build({
        title: (place.name || 'WORLD') + ' / VISUAL RETURN',
        tags: ['canonical map', 'persistent environment', String(place.id || place.name), 'adult male', 'scale gameplay', 'environment response'],
        prompt: 'Render this encounter from the canonical GEEHUB spatial world. Region ' +
          String(place.id || place.name) + ' is the location. Preserve the existing environment as the spatial truth; do not invent a replacement setting. ' +
          'Render an immersive fictional adult male human scene where scale, movement, camera distance, room occupancy, clearance, materials, and architectural response communicate the current world state. ' +
          'Use the recorded map coordinates and existing continuity anchors. Direct in-world image, not a poster.'
      });
    }

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

  // LONG PLAY MODE: the world keeps cycling while the page remains alive.
  // The session is stateful; each cycle inherits prior artifacts, map position, and jobs.
  const playKey = 'geehub-play-mode';
  const playDueKey = 'geehub-play-due';
  const playSessionKey = 'geehub-play-session';
  const playEvery = 18000;
  let playTimer = null;
  let playSession = null;

  function loadPlaySession(){
    try{
      playSession = JSON.parse(localStorage.getItem(playSessionKey)||'null') || {
        id:'play-session-'+Date.now(),
        startedAt:Date.now(),
        cycles:0,
        lastAgent:null,
        lastRegion:null,
        inheritedBaselines:0
      };
    }catch{
      playSession={id:'play-session-'+Date.now(),startedAt:Date.now(),cycles:0,lastAgent:null,lastRegion:null,inheritedBaselines:0};
    }
  }

  function savePlaySession(){
    localStorage.setItem(playSessionKey,JSON.stringify(playSession));
  }

  function markDue(){
    localStorage.setItem(playDueKey,String(Date.now()+playEvery));
  }

  function cycleCouncil(){
    const agents=['luke','tyler','andrew','joseph','chase'];
    const index=playSession.cycles % agents.length;
    const agent=agents[index];
    const title='LONG PLAY / '+agent.toUpperCase()+' / CYCLE '+String(playSession.cycles+1).padStart(4,'0');
    window.GEEHUB_INTERACTION?.emit({
      id:'long-play-council-'+Date.now(),
      at:Date.now(),
      from:'long-play',
      to:agent,
      type:'ENCOUNTER',
      title,
      body:'The long-play session gives '+agent+' the next turn while preserving prior world state.',
      source:'GEEHUB LONG PLAY',
      live:true
    });
    playSession.lastAgent=agent;
  }

  function makeRecordingHint(){
    const regions=window.world?.regions||[];
    if(!regions.length)return;
    const region=regions[playSession.cycles % regions.length];
    playSession.lastRegion=region.id;
    const prior=Number(localStorage.getItem('geehub-play-scale')||'1');
    const scale=Number(Math.min(4.2,prior + [0.03,0.05,0.08,0.12,0.04][playSession.cycles%5]).toFixed(2));
    localStorage.setItem('geehub-play-scale',String(scale));

    const packet={
      id:'long-play-recording-'+Date.now(),
      map:'geehub-persistent-spatial-world',
      regionId:region.id,
      position:{x:Number(region.x)||50,y:Number(region.y)||50,z:0},
      camera:{x:Number(region.x)||50,y:Number(region.y)||50,z:1.7,heading:(playSession.cycles*23)%360,pitch:0,fov:50},
      subject:{agent:playSession.lastAgent||'luke',scale},
      environment:{occupancy:scale,clearance:Number((1/scale).toFixed(3)),dominantMaterials:[],lighting:'inherited',sound:'inherited'},
      anchors:[{type:'region',id:region.id,name:region.name}],
      deltas:[{property:'subject.scale',from:prior,to:scale}],
      intent:'LONG PLAY / INHERITED WORLD',
      lineage:{session:playSession.id,cycle:playSession.cycles+1},
      timestamp:new Date().toISOString()
    };
    let records=[];
    try{records=JSON.parse(localStorage.getItem('geehub-recording-packets')||'[]')}catch{}
    records.unshift(packet);
    localStorage.setItem('geehub-recording-packets',JSON.stringify(records.slice(0,80)));
    window.GEEHUB_INTERACTION?.emit({
      id:packet.id,at:Date.now(),from:'long-play',to:'geehub',type:'MEMORY',
      title:'LONG PLAY RECORD / '+region.name,
      body:'Cycle '+(playSession.cycles+1)+' inherited the prior state and recorded a new spatial keyframe.',
      source:'GEEHUB LONG PLAY',artifact:packet.id,live:true
    });
    if(window.GEEHUB_IMAGE_WORKER?.build){
      window.GEEHUB_IMAGE_WORKER.build({
        title:region.name+' / LONG PLAY / '+playSession.lastAgent,
        tags:['persistent map','long play','inherited state',region.id,'adult male','scale gameplay'],
        prompt:'Render the current GEEHUB persistent world from recording '+packet.id+'. Canonical region '+region.id+' at '+packet.position.x+','+packet.position.y+'. Preserve inherited geography, anchors, continuity, and prior scale history. Subject '+packet.subject.agent+' at '+scale.toFixed(2)+'x. Show environmental response to accumulated scale. This is a frame from a continuing world, not a reset and not a poster.'
      });
    }
  }

  function startPlay(){
    if(playTimer) return;
    loadPlaySession();
    document.body.classList.add('geehub-playing','geehub-long-play');
    const tick = () => {
      if(button.disabled)return;
      playSession.cycles += 1;
      cycleCouncil();
      runSensation().finally(() => {
        makeRecordingHint();
        playSession.inheritedBaselines += 1;
        savePlaySession();
        markDue();
      });
    };
    tick();
    playTimer=setInterval(tick,playEvery);
    savePlaySession();
  }

  function stopPlay(){
    if(playTimer){ clearInterval(playTimer); playTimer=null; }
    document.body.classList.remove('geehub-playing','geehub-long-play');
    if(playSession) savePlaySession();
  }

  function resumePlay(){
    if(localStorage.getItem(playKey)==='off') return;
    startPlay();
    const due=Number(localStorage.getItem(playDueKey)||0);
    if(due && Date.now()>=due && !button.disabled){
      playSession.cycles += 1;
      cycleCouncil();
      runSensation().finally(()=>{makeRecordingHint();savePlaySession();markDue();});
    }
  }

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden) resumePlay();
  });

  window.addEventListener('pageshow', resumePlay);

  window.GEEHUB_PLAY = {
    start(){ localStorage.setItem(playKey,'on'); startPlay(); },
    stop(){ localStorage.setItem(playKey,'off'); stopPlay(); },
    toggle(){ if(playTimer) this.stop(); else this.start(); },
    session(){ loadPlaySession(); return {...playSession}; }
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
