/* GEEHUB / SELF-BUILDER
   RUN = advance toward the strongest diagnosed lack.
   This is a bounded systems model: observe -> prioritize -> build -> remember -> reassess.
*/
(() => {
  const MODEL='./hub/self-model.json';
  const STATE='geehub-self-builder-state';
  let model=null;
  let state={runs:0,lastNeed:null,lastAction:null,lastAt:null};
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const $=s=>document.querySelector(s);
  async function load(){
    try{const r=await fetch(MODEL+'?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;model=await r.json();}catch{return false;}
    try{state=JSON.parse(localStorage.getItem(STATE)||'null')||state}catch{}
    return true;
  }
  function choose(){
    return [...(model?.lacks||[])].filter(x=>String(x.status||'OPEN')==='OPEN').sort((a,b)=>Number(b.severity||0)-Number(a.severity||0))[0]||null;
  }
  function describe(need){
    const map={IMAGE:'VISUAL',VIDEO:'VIDEO',RETURN:'EXCHANGE',BUILD:'CAPABILITY',SOCIAL:'SOCIAL'};
    return (map[need.type]||need.type)+' / '+need.name;
  }
  async function run(){
    if(!(await load())) return null;
    const need=choose();
    if(!need)return null;
    state.runs++;state.lastNeed=need.id;state.lastAt=Date.now();
    const mindText={
      luke:'How should this need alter the felt presence of the world?',
      tyler:'What evidence would show that this lack has actually been reduced?',
      andrew:'What can be built right now rather than merely described?',
      joseph:'What should be remembered after this need is answered?',
      chase:'What is the actual absence, without filling it with assumptions?'
    };
    const payload={
      id:'self-build-'+Date.now(),from:'geehub-self',to:need.target,type:'OFFER',
      title:'SELF-BUILD / '+need.name,
      body:'GEEHUB identified '+need.name+' as its strongest current lack. Five minds first: Luke — '+mindText.luke+' Tyler — '+mindText.tyler+' Andrew — '+mindText.andrew+' Joseph — '+mindText.joseph+' Chase — '+mindText.chase,
      source:'self-builder',live:true,need:need.id
    };
    localStorage.setItem(STATE,JSON.stringify(state));
    window.GEEHUB_INTERACTION?.emit(payload);
    const artifact=window.GEEHUB_ARTIFACTS?.emit?.({type:'self-build',title:'BUILD TRACE / '+need.name,body:'The world selected this lack as the next direction: '+need.reason+'. '+need.type+' work is now being requested from '+need.target+'.',source:'GEEHUB self-builder',lineage:{need:need.id,target:need.target,minds:['Luke','Tyler','Andrew','Joseph','Chase'],rule:'observe -> prioritize -> build -> reassess'},canon:'unclassified',dreamable:true,quietness:'high'});
    state.lastAction=artifact?.id||payload.id;localStorage.setItem(STATE,JSON.stringify(state));
    render();
    return {need,payload,artifact};
  }
  function render(){
    const root=$('#selfBuilder');if(!root||!model)return;
    const need=choose();
    root.innerHTML='<div class="self-builder-head"><div><div class="eyebrow">SELF-CONSTRUCTION</div><h2>THE WORLD KNOWS WHAT IT LACKS.</h2><p>RUN chooses the strongest open absence, passes it through the five minds, then advances the system toward a concrete reduction.</p></div><div class="self-builder-state">RUN '+state.runs+' / '+(need?esc(need.name).toUpperCase():'NO OPEN LACK')+'</div></div>'
      +'<div class="self-builder-body">'+(need?'<article class="self-need"><span>HIGHEST CURRENT LACK / '+esc(need.type)+'</span><strong>'+esc(need.name)+'</strong><p>'+esc(need.reason)+'</p><small>TARGET → '+esc(need.target)+'</small></article>':'<article class="self-need complete"><span>SELF-MODEL</span><strong>NOTHING OPEN</strong><p>The current model reports no unresolved high-priority lack.</p></article>')
      +'<div class="self-minds">'+Object.entries({Luke:'PRESENCE',Tyler:'MEASUREMENT',Andrew:'ACTION',Joseph:'MEMORY',Chase:'OBSERVATION'}).map(([n,l])=>'<div><b>'+n+'</b><span>'+l+'</span></div>').join('')+'</div></div>'
      +'<div class="self-builder-foot">'+(state.lastAt?'LAST SELF-BUILD '+new Date(state.lastAt).toLocaleString():'SELF-BUILD HAS NOT RUN')+'</div>';
  }
  window.GEEHUB_SELF={run,choose,getModel:()=>model};
  load().then(render);
})();