/* GEEHUB / LONG-RUN SUPERVISOR
   Observes the shared interaction space. It does not fabricate peer activity.
   It remains active while the world page is open and records a local supervision trail.
*/
(() => {
  const root=document.querySelector('#geeSupervisor');
  if(!root) return;
  const state={started:Date.now(),lastChange:null,checks:0,events:0,active:true,lastHash:'',log:[]};
  const $=s=>root.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmtTime=ms=>new Date(ms).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const fmtAge=ms=>{
    if(!ms) return 'NO CHANGE YET';
    const s=Math.max(0,Math.floor((Date.now()-ms)/1000));
    if(s<60) return s+'S AGO';
    const m=Math.floor(s/60),h=Math.floor(m/60);
    return h? h+'H '+(m%60)+'M AGO' : m+'M AGO';
  };
  function log(type,message){
    state.log.unshift({at:Date.now(),type,message});
    state.log=state.log.slice(0,18);
  }
  function persist(){
    localStorage.setItem('geehub-supervisor-state',JSON.stringify({
      started:state.started,lastChange:state.lastChange,checks:state.checks,events:state.events
    }));
  }
  function render(){
    root.innerHTML=`
      <div class="supervisor-head">
        <div><div class="eyebrow">SUPERVISION / LONG RUN</div><h2>THE SHARED SPACE STAYS AWAKE.</h2><p>Watching the exchange surface is the supervisor's job. Repo work remains autonomous; only observed arrivals become events here.</p></div>
        <div class="supervisor-live"><i class="supervisor-dot ${state.active?'':'off'}"></i><span>${state.active?'SUPERVISED // ACTIVE':'PAUSED'}</span></div>
      </div>
      <div class="supervisor-grid">
        <div class="supervisor-beat"><div class="supervisor-clock" id="supervisorClock">00:00:00</div><div class="supervisor-caption">SUPERVISION UPTIME / PAGE SESSION</div><div class="supervisor-scan"><i></i></div></div>
        <div class="supervisor-readout">
          <div class="supervisor-stat"><span>EXCHANGE CHECKS</span><strong id="supervisorChecks">${state.checks}</strong></div>
          <div class="supervisor-stat"><span>OBSERVED ARRIVALS</span><strong id="supervisorEvents">${state.events}</strong></div>
          <div class="supervisor-stat"><span>LAST CHANGE</span><strong id="supervisorAge">${fmtAge(state.lastChange)}</strong></div>
          <div class="supervisor-stat"><span>MODE</span><strong>OBSERVE / RETURN</strong></div>
        </div>
      </div>
      <div class="supervisor-log" id="supervisorLog">
        ${state.log.length?state.log.map(x=>`<div class="supervisor-log-line"><time>${fmtTime(x.at)}</time><b>${esc(x.type)}</b><span>${esc(x.message)}</span></div>`).join(''):'<div class="interaction-empty">SUPERVISION HAS JUST STARTED.</div>'}
      </div>`;
    tickClock();
  }
  function tickClock(){
    const el=$('#supervisorClock');
    if(el){
      const total=Math.floor((Date.now()-state.started)/1000), h=Math.floor(total/3600), m=Math.floor((total%3600)/60), s=total%60;
      el.textContent=[h,m,s].map(v=>String(v).padStart(2,'0')).join(':');
      const age=$('#supervisorAge'); if(age) age.textContent=fmtAge(state.lastChange);
    }
  }
  async function check(){
    if(!state.active) return;
    state.checks++;
    try{
      const r=await fetch('./hub/exchange.json?supervisor='+Date.now(),{cache:'no-store'});
      if(!r.ok) throw new Error('exchange unavailable');
      const data=await r.json();
      const events=Array.isArray(data.events)?data.events:[];
      const hash=JSON.stringify(events);
      if(state.lastHash && hash!==state.lastHash){
        const previous=state.events;
        state.events=Math.max(state.events,events.length);
        state.lastChange=Date.now();
        const newest=events[0];
        log(newest?.type||'ARRIVAL','Exchange changed: '+(newest?.title||'new record observed.'));
        window.GEEHUB_INTERACTION?.emit({
          id:'supervisor-observation-'+Date.now(),
          from:'supervisor',to:'geehub',type:'ARRIVAL',
          title:'Supervisor observed an exchange change',
          body:newest?.title||'The shared exchange changed.',
          source:'engine/supervisor.js',live:true
        });
      } else if(!state.lastHash){
        state.events=events.length;
        log('BOOT','Exchange surface attached. '+events.length+' records visible.');
      }
      state.lastHash=hash;
    }catch(err){
      log('WATCH','Exchange surface unavailable on this check.');
    }
    persist(); render();
  }
  render();
  check();
  setInterval(check,10000);
  setInterval(tickClock,1000);
})();