/* GEEHUB / USER RESPONSE LOOP
   Immediate, inspectable adaptation to the user's actual navigation and controls.
   Signals stay in this browser. No keystrokes, field contents, or private text are collected.
*/
(() => {
  const KEY='geehub-user-response-v1';
  const root=document.querySelector('#userResponse');
  if(!root)return;
  const bus=window.GEEHUB_INTERACTION;
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
  const state=Object.assign({signals:[],weights:{},current:null,lastAction:null},read());
  let lastFocusAt=0;

  const labelFor=el=>{
    const section=el.closest('section[id],article[id],main[id]');
    const sectionName=section?.getAttribute('aria-label')||section?.querySelector('h1,h2,h3')?.textContent||section?.id||'GEEHUB';
    const label=el.getAttribute('aria-label')||el.getAttribute('title')||el.dataset?.userResponse||el.textContent||el.getAttribute('href')||el.id||el.tagName;
    return {section:section?.id||'world',sectionName:String(sectionName).trim().slice(0,90),label:String(label).trim().replace(/\s+/g,' ').slice(0,100)};
  };
  const categoryFor=section=>{
    if(['worldVisual','storyAtlas','atlas','pyyroRoom'].includes(section))return 'world';
    if(['fileSpace','artifactRoom','creations','mindHorizon'].includes(section))return 'archive';
    if(['sculptPreview','biggener','assetPlane','hulumscaveForge'].includes(section))return 'making';
    if(['sharedInteraction','agentReactions','reactionConsequence','socialCyberspace'].includes(section))return 'people';
    if(['gameConsole','textReplyLab','creationDesk','fusionSpace'].includes(section))return 'story';
    return 'exploration';
  };

  function persist(){
    state.signals=state.signals.slice(0,32);
    localStorage.setItem(KEY,JSON.stringify(state));
  }
  function preference(){
    const entries=Object.entries(state.weights||{}).sort((a,b)=>b[1]-a[1]);
    return entries[0]?.[1]>0?entries[0][0]:null;
  }
  function message(){
    const p=preference();
    const current=state.current;
    if(!current)return 'I am here. Move through the Hub and I will adjust to what you actually choose.';
    const category=categoryFor(current.section);
    if(p&&p===category)return 'You have asked for more '+category+' work. I will give this area more room in the next cycle.';
    if(state.lastAction)return 'You just acted in '+current.sectionName+'. I have kept that as the active thread; the next response should continue from here.';
    return 'You are spending time in '+current.sectionName+'. I will keep this as the current point of attention.';
  }
  function render(){
    const current=state.current;
    const recent=state.signals.slice(0,4);
    root.innerHTML=`
      <div class="user-response-head">
        <div><div class="eyebrow">YOU / LIVE RESPONSE</div><h2>THE HUB TURNS WHEN YOU TURN.</h2>
        <p>This space follows your actual choices. Its local trail is visible and correctable.</p></div>
        <div class="user-response-state"><i></i><span>RESPONDING / LOCAL</span></div>
      </div>
      <div class="user-response-body">
        <div class="user-response-now"><span class="eyebrow">CURRENT ATTENTION</span><strong>${esc(current?.sectionName||'THE WHOLE WORLD')}</strong><p>${esc(message())}</p>
          <div class="user-response-actions"><button type="button" data-feedback="more">MORE OF THIS</button><button type="button" data-feedback="less">LESS OF THIS</button><button type="button" data-feedback="hold">STAY WITH THIS</button></div>
        </div>
        <aside class="user-response-trail"><span class="eyebrow">RECENT SIGNALS</span>
          ${recent.length?recent.map(x=>`<div><b>${esc(x.kind)}</b><span>${esc(x.label)}</span><small>${esc(x.sectionName)}</small></div>`).join(''):'<p>No choices recorded yet. The trail begins when you move.'}
          <button type="button" data-feedback="clear">CLEAR LOCAL TRAIL</button>
        </aside>
      </div>`;
    root.querySelectorAll('[data-feedback]').forEach(button=>button.addEventListener('click',()=>feedback(button.dataset.feedback)));
  }
  function record(kind,detail){
    const signal={kind,at:Date.now(),...detail};
    state.signals.unshift(signal);
    state.current={section:detail.section,sectionName:detail.sectionName};
    if(kind==='ACTION')state.lastAction=signal;
    persist();render();
    bus?.emit({id:'user-'+kind.toLowerCase()+'-'+signal.at,from:'you',to:'geehub',type:'USER_ACTION',title:detail.label,body:detail.sectionName,section:detail.section,category:categoryFor(detail.section),feedback:detail.feedback||null,preference_score:detail.preferenceScore??null,source:'user-response-loop',local:true});
  }
  function feedback(kind){
    if(kind==='clear'){
      state.signals=[];state.weights={};state.lastAction=null;persist();render();return;
    }
    const section=state.current?.section||'world';
    const category=categoryFor(section);
    if(kind==='more')state.weights[category]=(state.weights[category]||0)+1;
    if(kind==='less')state.weights[category]=(state.weights[category]||0)-1;
    if(kind==='hold')state.weights[category]=Math.max(1,state.weights[category]||0);
    record('FEEDBACK',{section,sectionName:state.current?.sectionName||'GEEHUB',label:kind.toUpperCase()+' '+category,feedback:kind,preferenceScore:state.weights[category]||0});
  }

  document.addEventListener('click',event=>{
    const el=event.target.closest('button,a,[role="button"],[data-user-response]');
    if(!el||root.contains(el))return;
    const detail=labelFor(el);
    record('ACTION',detail);
  },true);

  if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      const now=Date.now();if(now-lastFocusAt<3500)return;
      const section=visible.target;
      if(state.current?.section===section.id)return;
      lastFocusAt=now;
      const detail={section:section.id,sectionName:(section.getAttribute('aria-label')||section.querySelector('h1,h2,h3')?.textContent||section.id).trim().slice(0,90),label:'Entered '+section.id};
      state.current={section:detail.section,sectionName:detail.sectionName};
      state.signals.unshift({kind:'FOCUS',at:now,...detail});persist();render();
      bus?.emit({id:'user-focus-'+now,from:'you',to:'geehub',type:'USER_FOCUS',title:detail.label,body:detail.sectionName,section:detail.section,category:categoryFor(detail.section),source:'user-response-loop',local:true});
    },{threshold:[0.35,0.6]});
    document.querySelectorAll('main section[id]').forEach(section=>observer.observe(section));
  }

  const previous=state.current;
  if(!previous&&state.signals[0])state.current={section:state.signals[0].section,sectionName:state.signals[0].sectionName};
  render();
  window.GEEHUB_USER_RESPONSE={state:()=>JSON.parse(JSON.stringify(state)),feedback,record};
})();
