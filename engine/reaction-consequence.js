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
    state.lastEvent={id:event.id||String(Date.now()),type:event.type||'CHANGE',title:event.title||'WORLD CHANGE',at:Date.now()};
    state.turn=Number(state.turn||0)+1;
    state.active=agents[(state.turn-1)%agents.length];

    state.intent={
      luke:'inspect presence and environmental response',
      tyler:'compare inherited state with new state',
      andrew:'convert the change into an action',
      joseph:'preserve the meaningful continuity detail',
      chase:'select the consequence worth carrying forward'
    }[state.active];

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
    if(x && ['ENCOUNTER','TRANSFORM','RETURN','MEMORY'].includes(x.type)) apply(x);
  });
})();