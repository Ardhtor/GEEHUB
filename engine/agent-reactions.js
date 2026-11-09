/* GEEHUB / AGENT REACTIONS
   Six fictional members respond to world changes as distinct people inside the shared world.
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
    luke:{mood:'present',attention:'the person and the room',temperament:'warm, direct, physically attentive; the first to make room',disposition:['direct','protective','body-aware','social']},
    tyler:{mood:'curious',attention:'measurable change',temperament:'curious, exacting, dryly funny; wants the result to hold up',disposition:['curious','skeptical','precise','competitive']},
    andrew:{mood:'offbeat',attention:'the odd detail in the field, the game, and the people around him',temperament:'a big, muscular Italian baseball player with blue eyes; socially warm, genuinely eccentric, and full of unexpected connections',disposition:['eccentric','athletic','associative','playful','social']},
    joseph:{mood:'reflective',attention:'continuity and meaning',temperament:'reflective, intimate, associative; keeps continuity alive through small details',disposition:['intimate','interpretive','memory-driven','associative']},
    chase:{mood:'watchful',attention:'what actually happened',temperament:'watchful, restrained, decisive; remembers the consequence',disposition:['observant','decisive','dry','narrative-minded']},
    gabe:{mood:'transformative',attention:'how attention and pressure change the next baseline',temperament:'reflective, self-aware, socially sensitive; attentive to transformation',disposition:['process-aware','identity-conscious','growth-driven','social-signal-sensitive']}
  };

  const names={luke:'Luke',tyler:'Tyler',andrew:'Andrew',joseph:'Joey',chase:'Chase',gabe:'Gabe'};

  function detect(event){
    const text=(String(event?.title||'')+' '+String(event?.body||'')).toLowerCase();
    return {
      scale:/scale|mass|growth|bwomph|big|girth|size/.test(text),
      image:/image|visual|render/.test(text),
      memory:/memory|return|record|baseline/.test(text),
      space:/room|space|clearance|door|map|land/.test(text),
      social:/attention|encounter|luke|tyler|andrew|joseph|chase/.test(text),
      baseball:/baseball|batting|dugout|inning|glove|pitch|home run|ball field/.test(text),
      eccentric:/odd|strange|peculiar|weird|unexpected|sideways|association/.test(text),
      archive:event?.category==='archive',
      making:event?.category==='making',
      people:event?.category==='people',
      story:event?.category==='story',
      world:event?.category==='world'
    };
  }

  function react(id,event,features){
    const a=state.agents[id]||{mood:fallback[id].mood,attention:fallback[id].attention,history:[]};
    const before=a.mood;
    let mood=a.mood, response='', next='';
    if(id==='luke'){
      if(features.scale||features.space||features.making||features.world){mood='alert';response='He notices the body first, then the room changing around it.';next='stay close enough to see what the new baseline does.';}
      else if(features.image){mood='interested';response='He studies the image for the part that feels physically present, not merely generated.';next='push the scene until the environment answers back.';}
      else if(features.people){mood='attentive';response='He notices that you have brought the shared people-space into focus.';next='let the selected people answer in their own way.';}
      else {mood='present';response='He stays with the encounter instead of stepping outside it.';next='remain in the room and see what happens next.';}
    }else if(id==='tyler'){
      if(features.scale||features.space||features.making||features.world){mood='focused';response='He immediately compares the new state with the remembered one.';next='find the measurement that proves the change is real.';}
      else if(features.image){mood='skeptical';response='He checks whether the image actually preserves the recorded geography.';next='compare the render against the map and recording.';}
      else if(features.people){mood='analytical';response='He looks for the actual exchange behind the names and status.';next='compare the interaction with the record.';}
      else {mood='curious';response='He notices a mismatch and keeps watching.';next='identify the variable that changed.';}
    }else if(id==='andrew'){
      if(features.baseball){mood='competitive';response='He reads the baseball detail like a play developing: timing, angle, bounce, and the strange little variable nobody else noticed.';next='take the observation to the field and see whether it holds up.';}
      else if(features.eccentric){mood='intrigued';response='He follows the peculiar connection further; to him, the odd detail is probably the useful one.';next='show the others the first step in the association.';}
      else if(features.image){mood='curious';response='He notices one oddly specific detail in the image and begins building an unexpected explanation around it.';next='find out whether the strange observation leads anywhere.';}
      else if(features.people){mood='social';response='He invents an unusual way into the conversation, then waits to see who follows.';next='invite someone into the idea without assuming they will join.';}
      else if(features.scale||features.space||features.making||features.world){mood='offbeat';response='He sees a practical opening, but approaches it from a direction nobody else has tried.';next='explain the odd route before asking the group to take it.';}
      else {mood='offbeat';response='He is occupied by a detail that appears unrelated until he explains the connection.';next='start with the thing that caught his eye.';}
    }else if(id==='joseph'){
      if(features.memory||features.scale||features.archive||features.story){mood='moved';response='He recognizes the old state inside the new one.';next='keep one small detail that proves the past is still here.';}
      else if(features.image){mood='absorbed';response='He looks for the detail that makes the image belong to the world.';next='connect the visual return to something already remembered.';}
      else if(features.people){mood='attentive';response='He follows the relationship you have brought forward without assuming what it means.';next='keep the exchange open and let its meaning develop.';}
      else {mood='reflective';response='He lets the change settle before deciding what it means.';next='hold the unresolved part open.';}
    }else if(id==='gabe'){
      if(features.scale||features.image||features.making||features.world){mood='transformative';response='He notices how the new state changes the way the room and the people around it respond.';next='compare the new baseline with the pressure that produced it.';}
      else if(features.people||features.social){mood='attentive';response='He watches attention become social signal, then asks how that signal alters the next encounter.';next='follow the response into the next change.';}
      else if(features.memory||features.archive||features.story){mood='reflective';response='He keeps the earlier version visible inside the current one.';next='preserve the cause and the consequence together.';}
      else {mood='curious';response='He looks for the pressure that is quietly changing what comes next.';next='identify the next threshold without forcing it.';}
    }else{
      if(features.scale||features.space||features.making||features.world){mood='watchful';response='He waits for the consequence instead of reacting to the spectacle alone.';next='record the first thing that cannot be unseen.';}
      else if(features.image){mood='decisive';response='He watches for the one visual fact that changes the story.';next='choose the detail worth carrying forward.';}
      else if(features.archive||features.story){mood='observant';response='He follows the source material you have returned to and checks what it actually supports.';next='carry forward the unresolved detail, not a convenient conclusion.';}
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
    if(!event || ['ARRIVAL','NOTICE','USER_POST'].includes(event.type))return;
    if(event.type==='UTTERANCE'){
      const id=event.from;
      if(!names[id])return;
      const a=state.agents[id]||{mood:fallback[id].mood,attention:fallback[id].attention,history:[]};
      const before=a.mood;
      a.mood=event.emotional_tone||a.mood;
      a.history=Array.isArray(a.history)?a.history:[];
      const rec={eventId:event.id||String(Date.now()),at:Date.now(),beforeMood:before,mood:a.mood,response:event.body||event.title||'A line enters the room.',next:event.consequence||'Wait for the next response.'};
      a.history.unshift(rec);a.history=a.history.slice(0,12);
      state.agents[id]=a;
      state.events.unshift({agent:id,...rec,title:event.title||'DIALOGUE'});
      state.events=state.events.slice(0,60);
      save();render();
      return;
    }
    const features=detect(event);
    Object.keys(names).forEach(id=>react(id,event,features));
    state.events=state.events.slice(0,60);
    save();
    render();
  }

  function render(){
    const ids=Object.keys(names);
    root.innerHTML=
      '<div class="reaction-head"><div><div class="eyebrow">PEOPLE / REACTION</div><h2>THE MEMBERS NOTICE THINGS.</h2><p>World changes pass through six distinct fictional human responses. Each response becomes memory and affects the next intention.</p></div><div class="reaction-count">'+state.events.length+' REACTIONS</div></div>'+
      '<div class="reaction-grid">'+ids.map(id=>{
        const a=state.agents[id]||{mood:model?.agents?.[id]?.mood||fallback[id].mood,attention:model?.agents?.[id]?.attention||fallback[id].attention,history:[]};
        const latest=a.history?.[0];
        const temperament=model?.agents?.[id]?.temperament||fallback[id].temperament||'';
        return '<article class="reaction-card '+esc(id)+'"><div class="reaction-card-top"><strong>'+names[id].toUpperCase()+'</strong><span>'+esc(a.mood||'present').toUpperCase()+'</span></div><p class="reaction-response">'+esc(latest?.response||'Waiting for the next change.')+'</p><div class="reaction-next"><span>NEXT</span>'+esc(latest?.next||'Notice what enters the room.')+'</div><small>ATTENTION / '+esc(a.attention)+'</small><small>TEMPERAMENT / '+esc(temperament)+'</small></article>';
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