/* GEEHUB // HYPER-MORPH GRAMMAR
   A cumulative transformation grammar for the sensation engine.
   seed -> desire -> growth -> stress -> mutation -> corruption -> new baseline
   The subject remains the same subject; each state inherits the last state.
*/
(() => {
  const KEY = 'geehub-hyper-morph-v1';
  const now = () => new Date().toISOString();
  const defaults = {
    run: 0,
    stage: 'SEED',
    intensity: 0.12,
    mass: 1,
    warp: 0.04,
    baseline: 1,
    continuity: 1,
    history: [],
    subject: 'PERSISTENT HUMANOID'
  };
  const read = () => {
    try { return {...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}')}; }
    catch { return {...defaults}; }
  };
  let state = read();

  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const clamp = (x,a=0,b=1) => Math.max(a, Math.min(b,x));

  const grammar = [
    ['SEED',      'A remembered form exists.',                    0.00],
    ['DESIRE',    'The form acquires a direction.',              0.06],
    ['GROWTH',    'Scale accumulates across the whole figure.',   0.12],
    ['STRESS',    'The old proportions begin to resist.',        0.18],
    ['MUTATION',  'The silhouette adapts instead of resetting.', 0.26],
    ['CORRUPTION','The previous baseline is no longer neutral.', 0.34],
    ['NEW BASELINE','The changed form becomes the remembered form.',0.08]
  ];

  function derive() {
    return {
      stage: state.stage,
      intensity: state.intensity,
      mass: state.mass,
      warp: state.warp,
      baseline: state.baseline,
      continuity: clamp(state.continuity)
    };
  }

  function nextStage() {
    const i = grammar.findIndex(x => x[0] === state.stage);
    return grammar[(i + 1) % grammar.length][0];
  }

  function applyVisual() {
    const figure = document.querySelector('#biggenerFigure');
    const stage = document.querySelector('#hyperMorphStage');
    if (figure) {
      const scale = state.mass * (1 + state.intensity * 0.18);
      const warp = 1 + state.warp * 0.22;
      figure.style.setProperty('--body-scale', scale.toFixed(3));
      figure.style.setProperty('--body-reach', warp.toFixed(3));
      figure.style.setProperty('--body-joint', (1 + state.intensity * 0.10).toFixed(3));
      figure.style.transform = 'translate(-50%,-50%) scale(' + scale.toFixed(3) + ') skewX(' + (state.warp * 3).toFixed(2) + 'deg)';
    }
    if (stage) {
      stage.style.setProperty('--hyper-intensity', state.intensity.toFixed(3));
      stage.style.setProperty('--hyper-warp', state.warp.toFixed(3));
      stage.style.setProperty('--hyper-mass', state.mass.toFixed(3));
    }
  }

  function render(label) {
    const stage = document.querySelector('#hyperMorphStage');
    if (!stage) return;
    const title = stage.querySelector('#hyperMorphTitle');
    const text = stage.querySelector('#hyperMorphText');
    const readout = stage.querySelector('#hyperMorphReadout');
    const timeline = stage.querySelector('#hyperMorphTimeline');
    if (title) title.textContent = label || state.stage;
    if (text) {
      const g = grammar.find(x => x[0] === state.stage) || grammar[0];
      text.textContent = g[1];
    }
    if (readout) {
      readout.textContent =
        'RUN ' + String(state.run).padStart(3,'0') +
        ' // BASELINE ' + state.baseline.toFixed(2) +
        ' // MASS ' + Math.round(state.mass * 100) + '%' +
        ' // WARP ' + Math.round(state.warp * 100) + '%' +
        ' // CONTINUITY ' + Math.round(state.continuity * 100) + '%';
    }
    if (timeline) {
      timeline.innerHTML = grammar.map(g =>
        '<span class="' + (g[0] === state.stage ? 'active' : '') + '">' + g[0] + '</span>'
      ).join('');
    }
    applyVisual();
  }

  function record(source) {
    state.history.unshift({
      run: state.run,
      stage: state.stage,
      intensity: state.intensity,
      mass: state.mass,
      warp: state.warp,
      baseline: state.baseline,
      source,
      at: now()
    });
    state.history = state.history.slice(0, 64);
  }

  function run(source='MANUAL') {
    state.run += 1;
    const previous = state.stage;
    state.stage = nextStage();

    if (state.stage === 'SEED') {
      state.baseline = Math.max(state.baseline, state.mass);
      state.intensity = clamp(state.intensity * 0.72);
      state.warp = clamp(state.warp * 0.72);
    } else if (state.stage === 'DESIRE') {
      state.intensity = clamp(state.intensity + 0.07);
    } else if (state.stage === 'GROWTH') {
      state.mass = Math.min(3.5, state.mass * 1.09);
      state.intensity = clamp(state.intensity + 0.11);
    } else if (state.stage === 'STRESS') {
      state.warp = clamp(state.warp + 0.12);
      state.intensity = clamp(state.intensity + 0.08);
    } else if (state.stage === 'MUTATION') {
      state.mass = Math.min(3.5, state.mass * 1.06);
      state.warp = clamp(state.warp + 0.16);
      state.intensity = clamp(state.intensity + 0.10);
    } else if (state.stage === 'CORRUPTION') {
      state.mass = Math.min(3.5, state.mass * 1.13);
      state.warp = clamp(state.warp + 0.22);
      state.intensity = clamp(state.intensity + 0.14);
      state.continuity = clamp(state.continuity - 0.035);
    } else if (state.stage === 'NEW BASELINE') {
      state.baseline = state.mass;
      state.intensity = clamp(state.intensity * 0.82);
      state.warp = clamp(state.warp * 0.74);
      state.continuity = clamp(state.continuity + 0.055);
    }

    record(source);
    save();
    render(state.stage);
    document.body.classList.add('hyper-morph-running');
    setTimeout(() => document.body.classList.remove('hyper-morph-running'), 850);

    if (window.GEEHUB_ARTIFACTS?.add) {
      window.GEEHUB_ARTIFACTS.add({
        type: 'HYPER-MORPH',
        title: state.subject + ' // ' + state.stage,
        body: 'Previous state: ' + previous + '. Current state: ' + state.stage + '. The new state inherits the previous morphology.',
        source: 'hyper-morph-grammar',
        lineage: {run: state.run, stage: state.stage, baseline: state.baseline, mass: state.mass, warp: state.warp},
        at: now()
      });
    }

    document.dispatchEvent(new CustomEvent('geehub:hyper-morph', {
      detail: {state: {...state}, previous, source}
    }));
  }

  function ensureUI() {
    if (document.querySelector('#hyperMorphStage')) return;
    const host = document.querySelector('#biggener');
    const main = document.querySelector('.world');
    if (!host || !main) return;

    const el = document.createElement('section');
    el.id = 'hyperMorphStage';
    el.className = 'hyper-morph-stage';
    el.innerHTML = `
      <div class="hyper-head">
        <div>
          <div class="eyebrow">GRAMMAR / HYPER-MORPH</div>
          <h2 id="hyperMorphTitle">SEED</h2>
          <p id="hyperMorphText">A remembered form exists.</p>
        </div>
        <button id="hyperMorphRun" class="run-button" type="button">RUN MORPH</button>
      </div>
      <div class="hyper-field">
        <div class="hyper-scan"></div>
        <div class="hyper-core"></div>
        <div class="hyper-readout" id="hyperMorphReadout"></div>
      </div>
      <div class="hyper-timeline" id="hyperMorphTimeline"></div>
      <div class="hyper-history"><span>HISTORY</span><strong id="hyperHistoryCount">0</strong><small>states retained / identity continuous</small></div>
    `;
    main.insertBefore(el, host.nextSibling);

    el.querySelector('#hyperMorphRun').addEventListener('click', () => run('MANUAL'));
    document.addEventListener('geehub:sensation', () => {
      // Sensation is the stimulus; hyper-morph is the inherited transformation.
      run('SENSATION');
    });
  }

  window.GEEHUB_HYPER_MORPH = {
    read: () => ({...state, history:[...state.history]}),
    run,
    derive,
    reset: () => { state = {...defaults}; save(); render('SEED'); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    ensureUI();
    const count = document.querySelector('#hyperHistoryCount');
    if (count) count.textContent = String(state.history.length);
    render();
  });
})();
