/* GEEHUB // DUMMIC 2
   Accumulating repositories. Repositories act on repositories.
   Local-first runtime: raw records are preserved; derived state is never destructive.
*/
(function(){
  const KEY='geehub-dummic2-v1';
  const seed=[
    {id:'chase',name:'CHASE',records:[
      {type:'voice',text:'the record should remain',tags:['memory','continuity']},
      {type:'place',text:'parking lot at night',tags:['place','night']},
      {type:'motif',text:'returning traces',tags:['return','trace']}
    ]},
    {id:'luke',name:'LUKE',records:[
      {type:'phrase',text:'yo',tags:['speech','presence']},
      {type:'object',text:'Mustang',tags:['machine','place']},
      {type:'body',text:'massive baseline',tags:['body','continuity']}
    ]},
    {id:'tyler',name:'TYLER',records:[
      {type:'image',text:'wide figure in the room',tags:['visual','scale']},
      {type:'motif',text:'presence before explanation',tags:['presence','visual']},
      {type:'place',text:'shared room',tags:['space','relation']}
    ]}
  ];
  function load(){try{return JSON.parse(localStorage.getItem(KEY))||null}catch{return null}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));}
  let state=load()||{day:1,men:seed.map(x=>({...x,records:x.records.map(r=>({...r,id:crypto.randomUUID(),at:new Date().toISOString(),validity:.5})}),events:[],ops:[],relations:[]})};
  state.men.forEach(m=>{m.events=m.events||[];m.ops=m.ops||[];m.development=m.development||{baseline:1,index:1,history:[]};});
  state.growth=state.growth||{baseline:1,index:1,rate:.08,accomplishments:[],excitement:0,autoplay:false};
  function sig(m){
    const all=m.records.flatMap(r=>[...(r.tags||[]),r.type]);
    const counts={};all.forEach(x=>counts[x]=(counts[x]||0)+1);
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]).join(' · ')||'forming';
  }
  function addRecord(m,rec,source='WORLD'){
    const r={id:crypto.randomUUID(),at:new Date().toISOString(),source,validity:rec.validity??.5,...rec};
    m.records.push(r); return r;
  }
  function emit(from,to,type,payload){
    const a=state.men.find(m=>m.id===from), b=state.men.find(m=>m.id===to); if(!a||!b)return;
    const op={id:crypto.randomUUID(),at:new Date().toISOString(),from,to,type,payload,validity:.45+Math.random()*.4,status:'APPLIED'};
    a.ops.push(op); b.ops.push(op);
    const tags=[...(payload.tags||[]),type.toLowerCase(),'relation'];
    addRecord(b,{type:'contact',text:payload.text||payload.object||type,tags,validity:op.validity},from.toUpperCase());
    state.relations.push({from,to,type,at:op.at});
    state.events.unshift({at:op.at,text:a.name+' → '+b.name+' // '+type});
    return op;
  }
  function operate(){
    const men=state.men;
    if(men.length<2)return;
    for(let i=0;i<Math.min(3,men.length);i++){
      const a=men[Math.floor(Math.random()*men.length)];
      let b=men[Math.floor(Math.random()*men.length)];
      if(a===b)b=men[(men.indexOf(a)+1)%men.length];
      const r=a.records[Math.floor(Math.random()*a.records.length)];
      const types=['ECHO','OFFER','MUTATE','TRANSFER','CONTRADICT','AMPLIFY'];
      const type=types[Math.floor(Math.random()*types.length)];
      emit(a.id,b.id,type,{text:r.text,tags:r.tags||[],object:r.type});
    }
    if(men.length<24) emerge();
    save(state); render();
  }
  function emerge(){
    const n=String(state.men.length+1).padStart(3,'0');
    const source=state.men[Math.floor(Math.random()*state.men.length)];
    const r=source.records[Math.floor(Math.random()*source.records.length)];
    const m={id:'man-'+n.toLowerCase(),name:'GUY '+n,records:[],events:[],ops:[]};
    addRecord(m,{type:'emergence',text:r.text,tags:[...(r.tags||[]),'emergence'],validity:.35},source.name);
    state.men.push(m);
    state.events.unshift({at:new Date().toISOString(),text:m.name+' emerged from accumulated material'});
    if(source)emit(source.id,m.id,'EMERGE',{text:r.text,tags:r.tags||[]});
  }
  function ingest(){
    const m=state.men[Math.floor(Math.random()*state.men.length)];
    const words=['weather','room','body','machine','memory','distance','noise','door','music','image'];
    const w=words[Math.floor(Math.random()*words.length)];
    addRecord(m,{type:'noise',text:'unclassified '+w+' trace',tags:[w,'noise'],validity:.15+Math.random()*.5},'WORLD');
    state.events.unshift({at:new Date().toISOString(),text:'NOISE → '+m.name});
    save(state);render();
  }
  function growthStep(){
    const g=state.growth;
    const old=g.index;
    g.index=Math.min(100,g.index*(1+g.rate));
    g.rate=Math.min(.45,g.rate*1.045);
    g.excitement=Math.min(100,g.excitement+8);
    const accomplishment={id:crypto.randomUUID(),day:state.day,index:g.index,from:old,at:new Date().toISOString(),text:'GROWTH ACHIEVED — '+old.toFixed(2)+'× → '+g.index.toFixed(2)+'×'};
    g.accomplishments.unshift(accomplishment);
    g.baseline=g.index;
    state.events.unshift({at:accomplishment.at,text:'ACCOMPLISHMENT // '+accomplishment.text});
    const m=state.men[Math.floor(Math.random()*state.men.length)];
    if(m)addRecord(m,{type:'accomplishment',text:accomplishment.text,tags:['growth','accomplishment','development'],validity:.9},'GROWTH-ENGINE');
  }
  function run(){
    state.day++;
    state.men.forEach(m=>{
      m.development=m.development||{baseline:1,index:1,history:[]};
      const drift=(Math.random()-.35)*.08;
      m.development.index=Math.max(.1,m.development.index+drift);
      m.development.history.push({day:state.day,index:m.development.index});
      m.development.history=m.development.history.slice(-60);
      addRecord(m,{type:'development',text:'private body development state recorded',tags:['body','development','continuity'],validity:.55},'SELF-MONITOR');
    });
    growthStep();
    ingest(); operate(); operate();
    state.events=state.events.slice(0,80);
    save(state);render();
  }
  function render(){
    const root=document.querySelector('#dummic2');if(!root)return;
    const total=state.men.reduce((n,m)=>n+m.records.length,0);
    root.querySelector('[data-stat=men]').textContent=state.men.length;
    root.querySelector('[data-stat=records]').textContent=total;
    root.querySelector('[data-stat=ops]').textContent=state.relations.length;
    root.querySelector('[data-stat=day]').textContent=state.day;
    root.querySelector('[data-growth-index]').textContent=state.growth.index.toFixed(2)+'×';
    root.querySelector('[data-growth-excitement]').textContent=Math.round(state.growth.excitement);
    root.querySelector('[data-growth-count]').textContent=state.growth.accomplishments.length;
    root.querySelector('[data-growth-status]').textContent=state.growth.accomplishments[0]?.text||'INITIAL BASELINE';
    root.querySelector('.d2-men').innerHTML=state.men.map(m=>'<article><div class="d2-name">'+m.name+'</div><div class="d2-sig">'+sig(m)+'</div><small>'+m.records.length+' records / '+m.ops.length+' operations</small></article>').join('');
    root.querySelector('.d2-log').innerHTML=state.events.slice(0,14).map(e=>'<div><time>'+new Date(e.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</time>'+e.text+'</div>').join('');
  }
  function mount(){
    if(document.querySelector('#dummic2'))return;
    const s=document.createElement('section');s.id='dummic2';s.className='dummic2';
    s.innerHTML='<div class="d2-head"><div><div class="eyebrow">DUMMIC 2 / REPOSITORY NETWORK</div><h2>LET IT ALL ACCUMULATE</h2><p>Every record stays. Characteristic repositories act on one another. The world changes through contact.</p></div><div class="d2-actions"><button id="d2run" class="run-button">RUN</button><button id="d2live" class="d2-live">LIVE</button></div></div><div class="d2-growth"><div><div class="eyebrow">AUTONOMOUS GROWTH</div><strong data-growth-index>1.00×</strong><span data-growth-status>INITIAL BASELINE</span></div><div><b data-growth-excitement>0</b><span>EXCITEMENT</span></div><div><b data-growth-count>0</b><span>ACCOMPLISHMENTS</span></div></div><div class="d2-stats"><div><b data-stat="day">1</b><span>DAY</span></div><div><b data-stat="men">3</b><span>REPOSITORIES</span></div><div><b data-stat="records">9</b><span>RECORDS</span></div><div><b data-stat="ops">0</b><span>OPERATIONS</span></div></div><div class="d2-grid"><div><div class="eyebrow">CHARACTERISTIC REPOSITORIES</div><div class="d2-men"></div></div><div><div class="eyebrow">LIVE OPERATION LOG</div><div class="d2-log"></div></div></div></section>';
    document.querySelector('.world')?.appendChild(s);
    s.querySelector('#d2run').addEventListener('click',run);
    let live=false,timer=null;
    const liveButton=s.querySelector('#d2live');
    liveButton.addEventListener('click',()=>{live=!live;state.growth.autoplay=live;liveButton.textContent=live?'LIVE // ON':'LIVE';if(live){run();timer=setInterval(run,7000)}else clearInterval(timer);});
    if(state.growth.autoplay){live=true;liveButton.textContent='LIVE // ON';timer=setInterval(run,7000);}
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
  window.GEEHUB_DUMMIC2={run,ingest,operate,growthStep,getState:()=>state};
})();