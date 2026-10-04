(() => {
  const stage = document.getElementById('biggener');
  if (!stage) return;
  const figure = document.getElementById('biggenerFigure');
  const level = document.getElementById('biggenerLevel');
  const size = document.getElementById('biggenerSize');
  const text = document.getElementById('biggenerText');
  const legacyButtons = stage.querySelectorAll('[data-biggener]');
  const runButton = document.getElementById('biggenerRun');
  if (!figure || !level || !size || !text) return;

  const state = { growth:0, baseline:1, selected:null, cursor:0, components:[], componentScale:{} };

  const injectStyle = () => {
    if (document.getElementById('alpha-physique-style')) return;
    const style = document.createElement('style');
    style.id = 'alpha-physique-style';
    style.textContent = `
      .sculpt-event-dock{position:absolute;inset:0;display:grid;grid-template-columns:180px 1fr 210px;pointer-events:none;font:10px/1.45 "Courier New",monospace}
      .sculpt-rack,.sculpt-inspector{pointer-events:auto;background:rgba(9,12,16,.84);backdrop-filter:blur(4px);border-right:1px solid rgba(145,155,165,.18);padding:12px}
      .sculpt-inspector{border-right:0;border-left:1px solid rgba(145,155,165,.18)}
      .sculpt-rack-title,.sculpt-inspector-title{color:#8f9aa6;letter-spacing:.15em;margin-bottom:8px}
      .sculpt-rack button{display:block;width:100%;margin:0 0 6px;padding:8px 7px;text-align:left;background:#11161c;border:1px solid #2e3741;color:#cfd6dd;border-radius:5px;font:inherit;cursor:pointer}
      .sculpt-rack button:hover,.sculpt-rack button.active{border-color:#7c8793;background:#1a2027}
      .sculpt-rack button.done{opacity:.66}
      .sculpt-viewport{position:relative;pointer-events:none;overflow:hidden}
      .sculpt-viewport:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 44%,transparent 0,rgba(2,4,6,.18) 60%,rgba(2,4,6,.62) 100%)}
      .sculpt-cursor{position:absolute;left:50%;top:10px;transform:translateX(-50%);padding:5px 8px;border:1px solid #3a444f;background:rgba(8,11,15,.78);color:#aab3bd;letter-spacing:.11em;z-index:4}
      .sculpt-inspector .value{color:#dce2e8;margin:6px 0 12px}
      .sculpt-inspector .hint{color:#7f8994;margin-top:16px}
      .sculpt-event-controls{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:6px;pointer-events:auto;z-index:5}
      .sculpt-event-controls button{padding:8px 10px;border:1px solid #3a444f;background:#11161c;color:#d2d9e0;border-radius:5px;font:10px "Courier New",monospace;letter-spacing:.08em;cursor:pointer}
      .sculpt-event-controls button:hover{border-color:#89939d}
      .alpha-event-line{position:absolute;left:50%;top:48px;transform:translateX(-50%);width:min(70%,520px);text-align:center;color:#9ca7b2;z-index:4;pointer-events:none}
      .alpha-event-line strong{display:block;color:#e0e5ea;font-size:12px;letter-spacing:.12em;margin-bottom:2px}
      .alpha-component-halo{position:absolute;left:50%;top:50%;width:220px;height:300px;transform:translate(-50%,-45%);border:1px dashed rgba(195,204,214,.2);border-radius:46%;transition:.35s;pointer-events:none;z-index:1}
      .alpha-component-halo.active{border-color:rgba(225,232,240,.55);box-shadow:0 0 30px rgba(205,215,225,.08)}
      @media(max-width:800px){.sculpt-event-dock{grid-template-columns:130px 1fr 150px}.sculpt-rack,.sculpt-inspector{padding:8px}.sculpt-event-controls{flex-wrap:wrap;justify-content:center;width:90%}}
      @media(max-width:620px){.sculpt-event-dock{grid-template-columns:1fr 116px}.sculpt-rack{display:none}}
    `;
    document.head.appendChild(style);
  };

  const buildDock = components => {
    injectStyle();
    stage.querySelector('.sculpt-event-dock')?.remove();
    const dock = document.createElement('div');
    dock.className = 'sculpt-event-dock';
    dock.innerHTML = `
      <aside class="sculpt-rack"><div class="sculpt-rack-title">COMPONENT RACK</div><div id="alphaRack"></div></aside>
      <div class="sculpt-viewport">
        <div class="sculpt-cursor" id="alphaCursor">SCULPTING / READY</div>
        <div class="alpha-event-line"><strong id="alphaEventTitle">ALPHA PHYSIQUE // MOTIVATION</strong><span id="alphaEventText">Generate the component the sculpture needs next.</span></div>
        <div class="alpha-component-halo" id="alphaHalo"></div>
        <div class="sculpt-event-controls">
          <button type="button" data-alpha="minus">SCULPT −</button>
          <button type="button" data-alpha="plus">SCULPT +</button>
          <button type="button" data-alpha="next">GENERATE NEXT</button>
          <button type="button" data-alpha="reset">RESET</button>
        </div>
      </div>
      <aside class="sculpt-inspector">
        <div class="sculpt-inspector-title">INSPECTOR</div>
        <div id="alphaSelected" class="value">NO COMPONENT</div>
        <div id="alphaKind" class="value">—</div>
        <div id="alphaScale" class="value">100%</div>
        <div id="alphaState" class="hint">The next necessary piece will appear here.</div>
      </aside>`;
    stage.querySelector('.biggener-stage')?.appendChild(dock);

    const rack = dock.querySelector('#alphaRack');
    components.forEach((c,i) => {
      const b = document.createElement('button');
      b.type='button'; b.dataset.i=String(i); b.textContent=c.name; rack.appendChild(b);
      b.addEventListener('click',()=>select(i));
    });
    dock.querySelectorAll('[data-alpha]').forEach(b=>b.addEventListener('click',()=>alphaAction(b.dataset.alpha)));
  };

  function select(i) {
    const c=state.components[i]; if(!c)return;
    state.selected=i;
    stage.querySelector('#alphaRack')?.querySelectorAll('button').forEach((b,n)=>b.classList.toggle('active',n===i));
    document.getElementById('alphaSelected').textContent=c.name;
    document.getElementById('alphaKind').textContent=String(c.kind||'asset').toUpperCase();
    const scale=state.componentScale[c.id]||1;
    document.getElementById('alphaScale').textContent=Math.round(scale*100)+'%';
    document.getElementById('alphaState').textContent=c.description;
    document.getElementById('alphaCursor').textContent='SCULPTING / '+c.name;
    document.getElementById('alphaEventText').textContent=c.description;
    document.getElementById('alphaHalo')?.classList.add('active');
    localStorage.setItem('geehub-alpha-selected',c.id);
  }

  function applyFigure() {
    const scale=1+state.growth*.12, reach=1+state.growth*.045;
    figure.style.setProperty('--body-scale',scale.toFixed(3));
    figure.style.setProperty('--body-reach',reach.toFixed(3));
    figure.style.setProperty('--body-joint',(1+state.growth*.065).toFixed(3));
    size.textContent=Math.round(scale*state.baseline*100)+'%';
    level.textContent='BASELINE '+String(Math.max(1,Math.floor(state.growth/3)+state.baseline)).padStart(2,'0');
    const lines=['The body is at its remembered baseline.','Mass is accumulating without losing continuity.','The joints are adapting to the new scale.','Reach extends. The silhouette has become architectural.','The old proportions are becoming memory.','A larger baseline is holding.'];
    text.textContent=lines[Math.min(lines.length-1,Math.floor(state.growth/2))];
    stage.classList.remove('biggener-pulse'); void stage.offsetWidth; stage.classList.add('biggener-pulse');
  }

  function sculpt(delta) {
    if(state.selected==null){state.growth=Math.max(0,state.growth+delta);applyFigure();return;}
    const c=state.components[state.selected];
    state.componentScale[c.id]=Math.max(.7,Math.min(1.9,(state.componentScale[c.id]||1)+delta*.08));
    const pct=Math.round(state.componentScale[c.id]*100);
    document.getElementById('alphaScale').textContent=pct+'%';
    document.getElementById('alphaState').textContent=c.name+' is now '+pct+'% of its current sculpt size.';
    if(c.id==='shoulders') figure.style.setProperty('--shoulder-scale',String(state.componentScale[c.id]));
    if(c.id==='chest') figure.style.setProperty('--chest-scale',String(state.componentScale[c.id]));
    if(c.id==='arms') figure.style.setProperty('--arm-scale',String(state.componentScale[c.id]));
    if(c.id==='joints') figure.style.setProperty('--joint-scale',String(state.componentScale[c.id]));
    if(c.id==='legs') figure.style.setProperty('--leg-scale',String(state.componentScale[c.id]));
    applyFigure();
  }

  function nextComponent() {
    if(!state.components.length)return;
    if(state.cursor>=state.components.length){
      document.getElementById('alphaEventText').textContent='The current pass is complete. Every component remains addressable for another sculpt.';
      return;
    }
    select(state.cursor);
    stage.querySelector('#alphaRack')?.querySelectorAll('button')[state.cursor]?.classList.add('done');
    state.cursor+=1; state.growth+=1; applyFigure();
  }

  function reset(){
    state.growth=0; state.baseline=1; state.cursor=0; state.selected=null; state.componentScale={};
    ['--shoulder-scale','--chest-scale','--arm-scale','--joint-scale','--leg-scale'].forEach(x=>figure.style.removeProperty(x));
    stage.querySelector('#alphaRack')?.querySelectorAll('button').forEach(b=>b.classList.remove('active','done'));
    document.getElementById('alphaSelected').textContent='NO COMPONENT';
    document.getElementById('alphaKind').textContent='—';
    document.getElementById('alphaScale').textContent='100%';
    document.getElementById('alphaState').textContent='The next necessary piece will appear here.';
    document.getElementById('alphaCursor').textContent='SCULPTING / READY';
    document.getElementById('alphaEventText').textContent='Generate the component the sculpture needs next.';
    document.getElementById('alphaHalo')?.classList.remove('active');
    applyFigure();
  }

  function alphaAction(action){ if(action==='plus')sculpt(1); if(action==='minus')sculpt(-1); if(action==='next')nextComponent(); if(action==='reset')reset(); }

  fetch('./events/alpha-physique-motivation.json')
    .then(r=>{if(!r.ok)throw new Error('event unavailable');return r.json();})
    .then(event=>{
      state.components=event.sequence||[];
      buildDock(state.components);
      if(runButton){
        runButton.textContent='GENERATE NEXT';
        runButton.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();nextComponent();},true);
      }
      legacyButtons.forEach(button=>{
        button.addEventListener('click',e=>{
          e.preventDefault(); e.stopImmediatePropagation();
          const action=Number(button.dataset.biggener);
          if(action<0)state.growth=Math.max(0,state.growth-1);
          else if(action===5){state.baseline+=1;state.growth=0;}
          else state.growth+=action;
          applyFigure();
        });
      });
      applyFigure();
    })
    .catch(()=>{applyFigure();if(runButton)runButton.textContent='GENERATE';});
})();