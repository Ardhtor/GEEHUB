let world=null;
const $=s=>document.querySelector(s);
const seen=new Set(readSeen());
const SEEN_KEY='geehub-world-seen';
const ROOM_KEY='geehub-room-state';
function readSeen(){try{const x=JSON.parse(localStorage.getItem(SEEN_KEY)||'[]');return Array.isArray(x)?x.filter(v=>typeof v==='string'):[];}catch{return[];}}
function saveSeen(){localStorage.setItem(SEEN_KEY,JSON.stringify([...seen]));}
function roomState(){try{return JSON.parse(localStorage.getItem(ROOM_KEY)||'{}');}catch{return{};}}
function saveRoomState(x){localStorage.setItem(ROOM_KEY,JSON.stringify(x));}
function syncVisited(){document.querySelectorAll('.node').forEach(x=>x.classList.toggle('visited',seen.has(x.dataset.id)));$('#visit').textContent=seen.size?seen.size+' PLACE'+(seen.size===1?'':'S')+' VISITED':'FIRST ARRIVAL';}
async function load(){
  const r=await fetch('./world.json'); if(!r.ok) throw new Error('world unavailable');
  world=await r.json(); draw(); bit(); syncVisited(); renderRoom();
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
  $('#bitTitle').textContent=n.name; $('#bitText').textContent=n.description; $('#trailText').textContent='YOU → '+n.name+' → '+n.kind;
  if(n.path&&n.path!=='#'){const a=document.createElement('a');a.href=n.path;a.className='enter-link';a.textContent='enter this place ↗';const old=document.querySelector('.encounter-copy .dynamic-link');if(old)old.remove();a.classList.add('dynamic-link');$('.encounter-copy').appendChild(a);}
}
function triggerHit(){const atlas=$('.atlas');atlas.classList.remove('hit');void atlas.offsetWidth;atlas.classList.add('hit');$('#bitTitle').textContent='THE HIT';$('#bitText').textContent='The reference stays familiar until the changed scale becomes impossible to miss. Then the world has to admit the new baseline.';$('#trailText').textContent='BASELINE → DISCONTINUITY → HIT → NEW BASELINE';setTimeout(()=>atlas.classList.remove('hit'),900);}
let bitIndex=0,siphonIndex=0,siphonArtifacts=[],liveIndex=0,seepIndex=0;
const liveTrace=[['NARRATOR','CHASE / C.W.SACHS','voice → inside the record'],['TRACE','LUKE / MUSTANG','proximity → confirmed'],['SCENE','PARKING LOT / NIGHT','engine heat retained'],['CHARACTER','LUKE','speech profile → yo'],['MEMORY','ONE PUTS HIS HEAD ON ANOTHER','active motif'],['FILM','SHOT 018 → 019 → 020','wide → Mustang → Luke'],['CONTINUITY','YOU ─ LUKE ─ MUSTANG','distance → arrival'],['HUB','MEMORY → EVENT','the archive is playing back']];
const seep=[['DEPARTURE','the Mustang leaves; the heat remains'],['DISTANCE','ten thousand miles is still inside the sentence'],['RETURN','what leaves can remain legible as coming back'],['UNSPOKEN','the thing nobody says becomes the strongest trace'],['POETRY','event → residue → association → image'],['SEEP','the archive leaks meaning between nodes']];
function seepPulse(){const x=seep[seepIndex++%seep.length];$('#liveTitle').textContent='SEEP // '+x[0];$('#liveText').textContent=x[1];$('#trailText').textContent='EVENT → RESIDUE → '+x[0];}
function livePulse(){const x=liveTrace[liveIndex++%liveTrace.length];$('#liveTitle').textContent=x[0]+' // '+x[1];$('#liveText').textContent=x[2];$('#trailText').textContent='LIVE → '+x[1];}
function startLive(){livePulse();setInterval(()=>{(liveIndex%3===2)?seepPulse():livePulse();},4200);}
async function loadSiphon(){const r=await fetch('./creative/kirk-siphon.json');if(!r.ok)return;siphonArtifacts=(await r.json()).artifacts||[];}
function siphon(){if(!siphonArtifacts.length){$('#bitTitle').textContent='SIPHON EMPTY';$('#bitText').textContent='No resonance artifacts available yet.';return;}const x=siphonArtifacts[siphonIndex++%siphonArtifacts.length];$('#bitTitle').textContent='KIRK RESONANCE // '+x.title;$('#bitText').textContent=x.draft;$('#trailText').textContent='DISCOVERY → FILTER → KIRK RESONANCE → '+x.type.toUpperCase()+' → MEMORY';}
function forgetTrail(){seen.clear();saveSeen();saveRoomState({});syncVisited();renderRoom();$('#bitTitle').textContent='TRAIL CLEARED';$('#bitText').textContent='The world remains. Your local memory has been cleared.';$('#trailText').textContent='you → arrival';}
function bit(){const b=world.pleasureBits[bitIndex++%world.pleasureBits.length];$('#bitTitle').textContent=b.title;$('#bitText').textContent=b.text;$('#trailText').textContent=b.from+' → '+b.to;}
function roomClick(){
  const s=roomState(); s.visits=(s.visits||0)+1;
  const seed=['A door without a room.','A faint machine tone behind the wall.','Dust disturbed in a place nobody has entered.','One line of writing, not yet a story.'];
  const event=seed[(s.visits-1)%seed.length];
  s.traces=s.traces||[]; s.traces.push({visit:s.visits,event,time:new Date().toISOString()});
  s.lore=s.traces.map(x=>x.event).join(' / ');
  saveRoomState(s); renderRoom();
  $('#bitTitle').textContent='THE ROOM PRODUCED SOMETHING';
  $('#bitText').textContent=event;
  $('#trailText').textContent='EMPTY → ENCOUNTER → RESIDUE → '+(s.visits>=3?'POETRY':'TRACE');
}
const WORLD_GATE_KEY='geehub-world-gate';
function transport(){
  const select=$('#worldSelect'), destination=select.value;
  if(!destination){$('#transportStatus').textContent='Choose a destination.';return;}
  const names={ 'pyyro-chamber':'PYYRO ENERGY CHAMBER','poetry-seep':'POETRY SEEP','deep-lore':'DEEP LORE','novel-engine':'NOVEL ENGINE','veyrthalis':'VEY RTHALIS' };
  const s=roomState(); s.transit=s.transit||[]; s.transit.push({from:'GEEHUB',to:destination,time:new Date().toISOString()}); saveRoomState(s);
  localStorage.setItem(WORLD_GATE_KEY,destination);
  $('#transportTitle').textContent='GATE OPEN';
  $('#transportStatus').textContent='Transporting the character to '+names[destination]+'. The destination inherits memory, not coordinates.';
  $('#trailText').textContent='WORLD → GATE → '+names[destination];
  if(destination==='veyrthalis') setTimeout(()=>{window.location.href='./lore/veyrthalis/HYPERSPACE_EXPEDITION_2026-09-21.md';},350);
}
function renderRoom(){
  const host=document.querySelector('#pyyroRoom'); if(!host)return;
  const s=roomState(), traces=s.traces||[];
  if(!traces.length){host.innerHTML='<div class="room-empty"><div class="eyebrow">PYYRO ROOM</div><h2>EMPTY</h2><p>Nothing has happened here yet.</p><button id="enterEmptyRoom">enter the room</button></div>';$('#enterEmptyRoom').onclick=roomClick;return;}
  host.innerHTML='<div class="room-lived"><div class="eyebrow">PYYRO ROOM / MEMORY</div><h2>THE ROOM REMEMBERS</h2><p>'+traces.map((x,i)=>'<span class="room-trace">'+(i+1)+'. '+x.event+'</span>').join('')+'</p><button id="produceAgain">produce again</button></div>';
  $('#produceAgain').onclick=roomClick;
}
$('#nextBit').addEventListener('click',bit);
$('#transportBtn').addEventListener('click',transport);
$('#siphon').addEventListener('click',siphon);
$('#forgetTrail').addEventListener('click',forgetTrail);
$('#center').addEventListener('click',()=>{$('#bitTitle').textContent='YOU ARE IN THE WORLD';$('#bitText').textContent='Nothing has to be finished. The constellation is the thing you live inside.';$('#trailText').textContent='you → world';});
loadSiphon(); startLive(); load().catch(e=>{$('#bitTitle').textContent='WORLD OFFLINE';$('#bitText').textContent=e.message;});