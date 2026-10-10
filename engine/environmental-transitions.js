/* GEEHUB // ENVIRONMENTAL TRANSITIONS
   Prose transitions are expressed as changes in the room, not decorative separators.
   One durable event updates atmosphere, motion, focus, and the living trace.
*/
(() => {
  const KEY = 'geehub-environmental-transition-v1';
  const stages = [
    {name:'NOTICE', light:'0.20', depth:'0.00', drift:'0.15', line:'The light narrows and the room turns its attention toward the new detail.'},
    {name:'PRESSURE', light:'0.36', depth:'0.08', drift:'0.35', line:'A low pulse moves through the architecture; the far wall begins to give way.'},
    {name:'SWELL', light:'0.48', depth:'0.12', drift:'0.55', line:'Light rolls across the room and catches the changing silhouette.'},
    {name:'EXPANSION', light:'0.64', depth:'0.22', drift:'0.75', line:'The camera draws back as the floor markings and doorways make room.'},
    {name:'BALLOONING', light:'0.82', depth:'0.34', drift:'0.92', line:'The chamber opens outward; blue and amber light travel along its beams.'},
    {name:'HYPER', light:'1.00', depth:'0.46', drift:'1.00', line:'The ceiling rises into darkness and the whole space holds the new scale.'},
    {name:'HOLD', light:'0.72', depth:'0.30', drift:'0.12', line:'The lights settle. The room remains alive around the current form.'},
    {name:'COMPARE', light:'0.58', depth:'0.20', drift:'0.28', line:'An earlier outline appears on the far wall, linked to the present by a band of light.'},
    {name:'NEW BASELINE', light:'0.68', depth:'0.24', drift:'0.40', line:'The doorway stays open; the room records this state as the next point of departure.'}
  ];
  let index = 0;
  let host = null;
  let status = null;
  let audioContext = null;
  const HISTORY_LIMIT = 120;
  function echo(stage) {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audioContext ||= new Audio();
      if (audioContext.state === 'suspended') audioContext.resume();
      const start = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      const stageIndex = Math.max(0, stages.findIndex(s => s.name === stage.name));
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(92 + stageIndex * 13, start);
      oscillator.frequency.exponentialRampToValueAtTime(48 + stageIndex * 5, start + 0.42);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420 + stageIndex * 45, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.035, start + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.62);
      oscillator.connect(filter).connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.65);
    } catch (_) { /* Sound is an enhancement; the world transition still works. */ }
  }
  function record(state) {
    const prior = read();
    const history = Array.isArray(prior.history) ? prior.history : [];
    history.push(state);
    save({...prior, index, stage:state.stage, line:state.line, at:state.at, history:history.slice(-HISTORY_LIMIT)});
  }
  const now = () => new Date().toISOString();
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = state => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  function ensure() {
    if (document.querySelector('#environmentalTransition')) return;
    host = document.createElement('section');
    host.id = 'environmentalTransition';
    host.className = 'environmental-transition';
    host.setAttribute('aria-live','polite');
    host.innerHTML = '<div class="environmental-horizon"><span></span><span></span><span></span></div><div class="environmental-copy"><div class="eyebrow">ROOM RESPONSE</div><strong id="environmentalTitle">THE ROOM IS LISTENING</strong><p id="environmentalLine">Light rests along the floor. The next event can change the space.</p></div><div class="environmental-trace" id="environmentalTrace">ENVIRONMENT / READY</div>';
    const main = document.querySelector('.world');
    if (main) main.insertBefore(host, main.children[2] || null);
    status = host.querySelector('#environmentalLine');
    const previous = read();
    if (previous.index != null) index = previous.index % stages.length;
    apply(stages[index], false);
  }

  function apply(stage, persist = true, detail = '') {
    if (!host) ensure();
    if (!host) return;
    host.dataset.stage = stage.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    host.style.setProperty('--room-light', stage.light);
    host.style.setProperty('--room-depth', stage.depth);
    host.style.setProperty('--room-drift', stage.drift);
    const title = host.querySelector('#environmentalTitle');
    const line = host.querySelector('#environmentalLine');
    const trace = host.querySelector('#environmentalTrace');
    if (title) title.textContent = stage.name;
    if (line) line.textContent = detail || stage.line;
    if (trace) trace.textContent = 'ROOM / ' + stage.name + ' / ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    document.body.dataset.environmentalStage = stage.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    if (persist) {
      const state = {index, stage:stage.name, line:detail || stage.line, at:now()};
      record(state);
      echo(stage);
      if (window.GEEHUB_ARTIFACTS?.add) window.GEEHUB_ARTIFACTS.add({
        type:'ENVIRONMENTAL TRANSITION',
        title:'ROOM RESPONSE // ' + stage.name,
        body:detail || stage.line,
        source:'environmental-transitions',
        canon:'unclassified',
        at:state.at
      });
      document.dispatchEvent(new CustomEvent('geehub:environmental-transition',{detail:state}));
      document.dispatchEvent(new CustomEvent('geehub:world-history',{detail:{...state, history:read().history || []}}));
    }
  }

  function transition(name, detail) {
    const key = String(name || '').toUpperCase();
    let found = stages.find(s => s.name === key);
    if (!found) {
      index = (index + 1) % stages.length;
      found = stages[index];
    } else index = stages.indexOf(found);
    apply(found, true, detail || '');
  }

  document.addEventListener('geehub:sensation', event => {
    const mode = event.detail?.mode?.[0] || event.detail?.mode || '';
    transition(({presence:'NOTICE',memory:'COMPARE',visual:'SWELL',intimacy:'HOLD',pressure:'PRESSURE',scale:'EXPANSION'})[mode] || 'NOTICE');
  });
  document.addEventListener('geehub:hyper-morph', event => {
    const stage = String(event.detail?.state?.stage || '').toUpperCase();
    transition(stage === 'NEW BASELINE' ? 'NEW BASELINE' : stage === 'GROWTH' || stage === 'MUTATION' || stage === 'CORRUPTION' ? 'BALLOONING' : stage === 'STRESS' ? 'PRESSURE' : 'SWELL');
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const label = (button.textContent || '').trim().toUpperCase();
    if (/\b(HYPER|MORE|BALLOON|GROWTH)\b/.test(label)) transition('BALLOONING');
    else if (/\b(HOLD|PAUSE)\b/.test(label)) transition('HOLD');
    else if (/\b(COMPARE|BASELINE)\b/.test(label)) transition('COMPARE');
    else if (/\b(RUN|MORPH|EXPAND)\b/.test(label)) transition('EXPANSION');
  });

  window.GEEHUB_ENVIRONMENT = {transition, read, stages:() => stages.map(s => ({...s}))};
  document.addEventListener('DOMContentLoaded', ensure);
  if (document.readyState !== 'loading') ensure();
})();
