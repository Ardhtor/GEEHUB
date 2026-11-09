/* GEEHUB / REACTION CONSEQUENCE
   Character-state reactions feed the next world action.
*/
(() => {
  const KEY='geehub-reaction-consequence';
  const agents=['luke','tyler','andrew','joseph','chase'];
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
  const save=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const state=read();

  function apply(event){
    if(!event)return;
    state.lastEvent={id:event.id||String(Date.now()),type:event.type||'CHANGE',title:event.title||'WORLD CHANGE',section:event.section||null,category:event.category||null,at:Date.now()};
    state.turn=Number(state.turn||0)+1;
    const categoryLane={world:'luke',making:'tyler',people:'andrew',story:'joseph',archive:'chase',exploration:'chase'};
    const isUserSignal=['USER_ACTION','USER_FOCUS'].includes(event.type);
    if(isUserSignal && event.feedback==='less'){
      state.active='chase';
    }else if(isUserSignal && categoryLane[event.category]){
      state.active=categoryLane[event.category];
    }else{
      state.active=agents.includes(event.to) ? event.to : agents[(state.turn-1)%agents.length];
    }
    if(event.feedback){
      state.preference={category:event.category||'exploration',direction:event.feedback,score:event.preference_score??0,at:Date.now()};
    }

    const intents={
      luke:'develop the world or physical environment you entered',
      tyler:'make the selected tool or sculpting area more capable',
      andrew:'turn the people-space into a concrete exchange',
      joseph:'continue the story or relationship thread you selected',
      chase:'retrieve the relevant archive and preserve its unresolved detail'
    };
    state.intent=state.preference?.direction==='less' && isUserSignal
      ? 'lower the priority of this area without erasing it'
      : intents[state.active];

    state.chain=[
      {agent:'luke',input:'presence',output:'environmental observation'},
      {agent:'tyler',input:'measurement',output:'state comparison'},
      {agent:'andrew',input:'action',output:'next playable possibility'},
      {agent:'joseph',input:'memory',output:'continuity record'},
      {agent:'chase',input:'observation',output:'next narrative consequence'}
    ];
    save(state);

    window.dispatchEvent(new CustomEvent('geehub:reaction-consequence',{detail:state}));
  }

  window.GEEHUB_REACTION_CONSEQUENCE={apply,state:()=>read()};
  window.addEventListener('geehub:interaction',e=>{
    const x=e.detail;
    if(x && ['ENCOUNTER','TRANSFORM','RETURN','MEMORY','UTTERANCE','USER_ACTION','USER_FOCUS'].includes(x.type)) apply(x);
  });
})();