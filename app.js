let world=null;
const $=s=>document.querySelector(s);
const seen=new Set(readSeen());
const SEEN_KEY='geehub-world-seen';
function readSeen(){try{const x=JSON.parse(localStorage.getItem(SEEN_KEY)||'[]');return Array.isArray(x)?x.filter(v=>typeof v==='string'):[];}catch{return[];}}
function saveSeen(){localStorage.setItem(SEEN_KEY,JSON.stringify([...seen]));}
function syncVisited(){document.querySelectorAll('.node').forEach(x=>x.classList.toggle('visited',seen.has(x.dataset.id)));$('#visit').textContent=seen.size?seen.size+' PLACE'+(seen.size===1?'':'S')+' VISITED':'FIRST ARRIVAL';}
async function load(){
  const r=await fetch('./world.json'); if(!r.ok) throw new Error('world unavailable');
  world=await r.json(); draw(); bit(); syncVisited();
}
function draw(){
  const nodes=$('#nodes'), svg=$('#links');
  nodes.innerHTML=world.regions.map(n=>'<button type="button" class="node" data-id="'+n.id+'" style="left:'+n.x+'%;top:'+n.y+'%;--scale:'+n.size+'" aria-label="'+n.name+'"><span class="node-name">'+n.name+'</span><span class="node-kind">'+n.kind+'</span></button>').join('');
  const by=Object.fromEntries(world.regions.map(n=>[n.id,n]));
  svg.innerHTML=world.pleasureBits.map(b=>{const a=by[b.from],c=by[b.to];return '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+c.x+'" y2="'+c.y+'"></line>'}).join('');
  nodes.querySelectorAll('.node').forEach(el=>el.addEventListener('click',()=>enter(el.dataset.id)));
}
function enter(id){
  const n=world.regions.find(x=>x.id===id); if(!n)return;
  if(id==='colossal-escalation') triggerHit();
  seen.add(id); saveSeen(); syncVisited();
  $('#bitTitle').textContent=n.name;
  $('#bitText').textContent=n.description;
  $('#trailText').textContent='YOU → '+n.name+' → '+n.kind;
  if(n.path && n.path!=='#'){
    const a=document.createElement('a'); a.href=n.path; a.className='enter-link'; a.textContent='enter this place ↗';
    const old=document.querySelector('.enter-link'); if(old)old.remove(); $('.encounter-copy').appendChild(a);
  }
}
function triggerHit(){
  const atlas=$('.atlas');
  atlas.classList.remove('hit'); void atlas.offsetWidth; atlas.classList.add('hit');
  $('#bitTitle').textContent='THE HIT';
  $('#bitText').textContent='The reference stays familiar until the changed scale becomes impossible to miss. Then the world has to admit the new baseline.';
  $('#trailText').textContent='BASELINE → DISCONTINUITY → HIT → NEW BASELINE';
  setTimeout(()=>atlas.classList.remove('hit'),900);
}
let bitIndex=0;
let siphonIndex=0;
let siphonArtifacts=[];
const liveTrace=[['NARRATOR','CHASE / C.W.SACHS','voice → inside the record'],['TRACE','LUKE / MUSTANG','proximity → confirmed'],['SCENE','PARKING LOT / NIGHT','engine heat retained'],['CHARACTER','LUKE','speech profile → yo'],['MEMORY','ONE PUTS HIS HEAD ON ANOTHER','active motif'],['FILM','SHOT 018 → 019 → 020','wide → Mustang → Luke'],['CONTINUITY','YOU ─ LUKE ─ MUSTANG','distance → arrival'],['HUB','MEMORY → EVENT','the archive is playing back']];
let liveIndex=0;
function livePulse(){const x=liveTrace[liveIndex%liveTrace.length];liveIndex++;$('#liveTitle').textContent=x[0]+' // '+x[1];$('#liveText').textContent=x[2];$('#trailText').textContent='LIVE → '+x[1];}
function startLive(){livePulse();setInterval(livePulse,4200);}
async function loadSiphon(){const r=await fetch('./creative/kirk-siphon.json');if(!r.ok)return;siphonArtifacts=(await r.json()).artifacts||[];}
function siphon(){if(!siphonArtifacts.length){$('#bitTitle').textContent='SIPHON EMPTY';$('#bitText').textContent='No resonance artifacts available yet.';return;}const x=siphonArtifacts[siphonIndex%siphonArtifacts.length];siphonIndex++;$('#bitTitle').textContent='KIRK RESONANCE // '+x.title;$('#bitText').textContent=x.draft;$('#trailText').textContent='DISCOVERY → FILTER → KIRK RESONANCE → '+x.type.toUpperCase()+' → MEMORY';syncVisited();}
function forgetTrail(){seen.clear();saveSeen();syncVisited();$('#bitTitle').textContent='TRAIL CLEARED';$('#bitText').textContent='The world remains. Your local memory has been cleared.';$('#trailText').textContent='you → arrival';}
function bit(){
  const b=world.pleasureBits[bitIndex%world.pleasureBits.length];
  $('#bitTitle').textContent=b.title; $('#bitText').textContent=b.text; $('#trailText').textContent=b.from+' → '+b.to;
}
$('#nextBit').addEventListener('click',()=>{bitIndex++;bit();});
$('#siphon').addEventListener('click',siphon);
$('#forgetTrail').addEventListener('click',forgetTrail);
$('#center').addEventListener('click',()=>{$('#bitTitle').textContent='YOU ARE IN THE WORLD';$('#bitText').textContent='Nothing has to be finished. The constellation is the thing you live inside.';$('#trailText').textContent='you → world';});
loadSiphon();
startLive();
load().catch(e=>{$('#bitTitle').textContent='WORLD OFFLINE';$('#bitText').textContent=e.message;});
