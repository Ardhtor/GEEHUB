/* GEEHUB / AGENT REACTIONS
   Five fictional members respond to world changes as distinct people inside the shared world.
*/
(() => {
  const DATA='./hub/agent-reaction-states.json';
  const KEY='geehub-agent-reactions';
  const root=document.querySelector('#agentReactions');
  const bus=window.GEEHUB_INTERACTION;
  if(!root || !bus)return;

  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let model=null;
  let state={events:[],agents:{}};

  function loadLocal(){
    try{state=JSON.parse(localStorage.getItem(KEY)||'null')||state}catch{}
    if(!state.agents)state.agents={};
  }
  function save(){localStorage.setItem(KEY,JSON.stringify(state));}

  const fallback={
    luke:{mood:'present',attention:'the person and the room',disposition:['direct','protective','body-aware','social']},
    tyler:{mood:'curious',attention:'measurable change',disposition:['curious','skeptical','precise','competitive']},
    andrew:{mood:'ready',attention:'what happens next',disposition:['playful','active','improvisational','social']},
    joseph:{mood:'reflective',attention:'continuity and meaning',disposition:['intimate','interpretive','memory-driven','associative']},
    chase:{mood:'watchful',attention:'what actually happened',disposition:['observant','decisive','dry','narrative-minded']}
  };

  const names={luke:'Luke',tyler:'Tyler',andrew:'Andrew',joseph:'Joseph',chase:'Chase'};

  function detect(event){
    const text=(String(event?.title||'')+' '+String(event?.body||'')).toLowerCase();
    return {
      scale:/scale|mass|growth|bwomph|big|girth|size/.test(text),
      image:/image|visual|render/.test(text),
      memory:/memory|return|record|baseline/.test(text),
      space:/room|space|clearance|door|map|land/.test(text),
      social:/attention|encounter|luke|tyler|andrew|joseph|chase/.test(text)
    };
  }

  function react(id,event,features){
    const a=state.agents[id]||{mood:fallback[id].mood,attention:fallback[id].attention,history:[]};
    const before=a.mood;
    let mood=a.mood, response='', next='';
    if(id==='luke'){
      if(features.scale||features.space){mood='alert';response='He notices the body first, then the room changing around it.';next='stay close enough to see what the new baseline does.';}
      else if(features.image){mood='interested';response='He studies the image for the part that feels physically present, not merely generated.';next='push the scene until the environment answers back.';}
      else {mood='present';response='He stays with the encounter instead of stepping outside it.';next='remain in the room and see what happens next.';}
    }else if(id==='tyler'){
      if(features.scale||features.space){mood='focused';response='He immediately compares the new state with the remembered one.';next='find the measurement that proves the change is real.';}
      else if(features.image){mood='skeptical';response='He checks whether the image actually preserves the recorded geography.';next='compare the render against the map and recording.';}
      else {mood='curious';response='He notices a mismatch and keeps watching.';next='identify the variable that changed.';}
    }else if(id==='andrew'){
      if(features.scale||features.space){mood='energized';response='He treats the changed room as something to move through and test.';next='turn the new constraint into the next piece of play.';}
      else if(features.image){mood='amused';response='He wants to see what happens when the new image becomes an environment.';next='make the scene playable instead of static.';}
      else {mood='ready';response='He looks for the opening created by the change.';next='do something with it.';}
    }else if(id==='joseph'){
      if(features.memory||features.scale){mood='moved';response='He recognizes the old state inside the new one.';next='keep one small detail that proves the past is still here.';}
      else if(features.image){mood='absorbed';response='He looks for the detail that makes the image belong to the world.';next='connect the visual return to something already remembered.';}
      else {mood='reflective';response='He lets the change settle before deciding what it means.';next='hold the unresolved part open.';}
    }else{
      if(features.scale||features.space){mood='watchful';response='He waits for the consequence instead of reacting to the spectacle alone.';next='record the first thing that cannot be unseen.';}
      else if(features.image){mood='decisive';response='He watches for the one visual fact that changes the story.';next='choose the detail worth carrying forward.';}
      else {mood='alert';response='He notices that something has shifted and refuses to smooth it over.';next='follow the consequence.';}
    }
    a.mood=mood;
    a.attention=(model?.agents?.[id]?.attention)||fallback[id].attention;
    a.history=Array.isArray(a.history)?a.history:[];
    const rec={eventId:event.id||String(Date.now()),at:Date.now(),beforeMood:before,mood,response,next};
    a.history.unshift(rec);a.history=a.history.slice(0,12);
    state.agents[id]=a;
    state.events.unshift({agent:id,...rec,title:event.title||event.type||'WORLD CHANGE'});
  }

  function handle(event){
    if(!event || ['ARRIVAL','NOTICE'].includes(event.type))return;
    const features=detect(event);
    Object.keys(names).forEach(id=>react(id,event,features));
    state.events=state.events.slice(0,60);
    save();
    render();
  }

  function render(){
    const ids=Object.keys(names);
    root.innerHTML=
      '<div class="reaction-head"><div><div class="eyebrow">PEOPLE / REACTION</div><h2>THE MEMBERS NOTICE THINGS.</h2><p>World changes pass through five distinct fictional human responses. Each response becomes memory and affects the next intention.</p></div><div class="reaction-count">'+state.events.length+' REACTIONS</div></div>'+
      '<div class="reaction-grid">'+ids.map(id=>{
        const a=state.agents[id]||{mood:model?.agents?.[id]?.mood||fallback[id].mood,attention:model?.agents?.[id]?.attention||fallback[id].attention,history:[]};
        const latest=a.history?.[0];
        return '<article class="reaction-card '+esc(id)+'"><div class="reaction-card-top"><strong>'+names[id].toUpperCase()+'</strong><span>'+esc(a.mood||'present').toUpperCase()+'</span></div><p class="reaction-response">'+esc(latest?.response||'Waiting for the next change.')+'</p><div class="reaction-next"><span>NEXT</span>'+esc(latest?.next||'Notice what enters the room.')+'</div><small>ATTENTION / '+esc(a.attention)+'</small></article>';
      }).join('')+'</div>';
  }

  async function init(){
    loadLocal();
    try{const r=await fetch(DATA+'?ts='+Date.now(),{cache:'no-store'});if(r.ok)model=await r.json();}catch{}
    render();
    bus.on(handle);
  }
  init();
  window.GEEHUB_REACTIONS={state:()=>JSON.parse(localStorage.getItem(KEY)||'{}'),react:handle};
})();