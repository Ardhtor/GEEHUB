let world=null;
let worldRunning=false;
let autonomousTimer=null;
const WORLD_EXCEPTIONS=['RETURN','SKIP','REVISIT','ECHO','MUTATE','ARRIVE_TWICE','REFUSE','DRIFT'];
let lastException=null;
const $=s=>document.querySelector(s);
const seen=new Set(readSeen());
const SEEN_KEY='geehub-world-seen';
const ROOM_KEY='geehub-room-state';
const ARTIFACT_KEY='geehub-artifacts';
const PRESENCE_KEY='geehub-presence';
let presence=readPresence();
function readPresence(){try{return JSON.parse(localStorage.getItem(PRESENCE_KEY)||'{}');}catch{return{};}}
function presenceLine(){const lines=['Someone is here.','A presence remains at the edge of the room.','You are not alone in this place.','Something has noticed you.','The room is occupied.','Someone is moving through the world.'];return lines[Math.floor((Date.now()/7000)%lines.length)];}
function renderPresence(){const p=$('#presenceText');if(p)p.textContent=presenceLine();document.body.classList.toggle('has-presence',true);}
function touchPresence(name){presence.last=name;presence.at=new Date().toISOString();localStorage.setItem(PRESENCE_KEY,JSON.stringify(presence));renderPresence();}
function readSeen(){try{const x=JSON.parse(localStorage.getItem(SEEN_KEY)||'[]');return Array.isArray(x)?x.filter(v=>typeof v==='string'):[];}catch{return[];}}
function saveSeen(){localStorage.setItem(SEEN_KEY,JSON.stringify([...seen]));}
function roomState(){try{return JSON.parse(localStorage.getItem(ROOM_KEY)||'{}');}catch{return{};}}
function artifacts(){return window.GEEHUB_ARTIFACTS?window.GEEHUB_ARTIFACTS.read():[];}
function dreamFromArtifacts(){const a=artifacts();$('#dreamText').textContent=a.length?'What remains: '+a.slice(0,4).map(x=>x.title).join(' · '):'The world is quiet until something calls.';}
function renderArtifacts(){const host=$('#artifactStage');if(!host)return;const a=artifacts();if(!a.length){host.innerHTML='<div class="artifact-empty">Nothing has stayed here yet.</div>';return;}host.innerHTML=a.slice(0,8).map(x=>'<article class="artifact-card"><div class="artifact-glyph">✦</div><div class="eyebrow">'+x.type+'</div><h3>'+x.title+'</h3><p>'+x.body+'</p></article>').join('');}
function saveRoomState(x){localStorage.setItem(ROOM_KEY,JSON.stringify(x));}
function syncVisited(){document.querySelectorAll('.node').forEach(x=>x.classList.toggle('visited',seen.has(x.dataset.id)));$('#visit').textContent=seen.size?seen.size+' PLACE'+(seen.size===1?'':'S')+' VISITED':'FIRST ARRIVAL';}
async function load(){const r=await fetch('./world.json');if(!r.ok)throw new Error('world unavailable');world=await r.json();draw();bit();syncVisited();renderRoom();initSwarvic();}
function draw(){const nodes=$('#nodes'),svg=$('#links');nodes.innerHTML=world.regions.map(n=>'<button type="button" class="node" data-id="'+n.id+'" style="left:'+n.x+'%;top:'+n.y+'%;--scale:'+n.size+'" aria-label="'+n.name+'"><span class="node-name">'+n.name+'</span><span class="node-kind">'+n.kind+'</span></button>').join('');const by=Object.fromEntries(world.regions.map(n=>[n.id,n]));svg.innerHTML=world.pleasureBits.map(b=>{const a=by[b.from],c=by[b.to];return '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+c.x+'" y2="'+c.y+'"></line>'}).join('');nodes.querySelectorAll('.node').forEach(el=>el.addEventListener('click',()=>enter(el.dataset.id)));}
const GEEHUB_FILES=['README.md','CANON.md','CURRENT_STATE_2026-09.md','BUILD_NARRATIVE.md','THE_FIRST_MEN.md','world.json','projects.json','records.json','index.html','app.js','style.css','archive/male-harem/README.md','lore/DEEP_LORE.md','lore/veyrthalis/HYPERSPACE_EXPEDITION_2026-09-21.md','creative/kirk-siphon.json','rooms/PYYRO_ROOMS.json'];
function initFilespace(){const tree=$('#fileTree'),view=$('#fileView'),top=$('#fileViewTop'),path=$('#filePath');if(!tree)return;tree.innerHTML=GEEHUB_FILES.map(f=>'<button type="button" data-file="'+f+'">'+f+'</button>').join('');tree.querySelectorAll('button').forEach(b=>b.addEventListener('click',async()=>{const f=b.dataset.file;path.textContent='/GEEHUB/'+f;top.textContent=f.toUpperCase();view.textContent='LOADING…';try{const r=await fetch('./'+f);if(!r.ok)throw new Error('unavailable');const t=await r.text();view.textContent=t.slice(0,18000)+(t.length>18000?'\n\n… FILE CONTINUES …':'');}catch(e){view.textContent='FILE UNAVAILABLE IN THIS BUILD.\n\n'+f;}}));}
function renderPlane(){const host=$('#planeObjects');if(!host||!world)return;const base=world.regions.slice(0,12).map((n,i)=>({kind:n.kind||'PLACE',name:n.name,text:n.description||'',x:8+(i%4)*24,y:12+Math.floor(i/4)*29}));const extra=artifacts().slice(0,6).map((a,i)=>({kind:a.type||'TRACE',name:a.title,text:a.body||'',x:14+(i%3)*31,y:22+Math.floor(i/3)*42}));const items=[...base,...extra];host.innerHTML=items.map((x,i)=>'<button class="plane-object" type="button" data-plane="'+i+'" style="left:'+x.x+'%;top:'+x.y+'%"><span class="eyebrow">'+x.kind+'</span><strong>'+x.name+'</strong><small>'+x.text.slice(0,72)+'</small></button>').join('');host.querySelectorAll('.plane-object').forEach((el,i)=>el.addEventListener('click',()=>{host.querySelectorAll('.plane-object').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');const x=items[i];$('#planeSelection').textContent=x.name.toUpperCase();$('#planeReadout').textContent=x.kind+' // '+x.name+' // '+x.text;}));}
const SWARVIC_MOVES=[['ORBIT',900,120,8],['SNAP',260,18,-14],['FOLD',620,-70,22],['CROSS',780,155,-8],['RELEASE',1100,220,4],['RETURN',840,-105,-18]];
let swarvicTimer=null,swarvicIndex=0,swarvicAngle=0;
function swarvicStep(){
  const f=$('#danceField'),a=f&&f.querySelector('.dancer-a'),b=f&&f.querySelector('.dancer-b'),state=$('#danceState');
  if(!f||!a||!b)return;
  const m=SWARVIC_MOVES[swarvicIndex++%SWARVIC_MOVES.length],name=m[0],dur=m[1],arc=m[2],tilt=m[3];
  swarvicAngle+=arc;
  state.textContent=name+' // '+String(swarvicIndex).padStart(2,'0');
  f.style.setProperty('--dance-angle',swarvicAngle+'deg');
  f.style.setProperty('--dance-tilt',tilt+'deg');
  a.style.setProperty('--dance-arc',arc+'deg');
  b.style.setProperty('--dance-arc',(-arc*0.72)+'deg');
  f.classList.remove('dance-pulse'); void f.offsetWidth; f.classList.add('dance-pulse');
  clearTimeout(swarvicTimer); swarvicTimer=setTimeout(swarvicStep,dur);
}
function initSwarvic(){
  const b=$('#danceRun'); if(!b)return;
  b.addEventListener('click',()=>{b.textContent='DANCING';b.setAttribute('aria-pressed','true');swarvicStep();});
  const f=$('#danceField'); if(f)f.addEventListener('click',swarvicStep);
}
function initPlane(){const s=$('#planeSurface');if(!s)return;let down=false,sx=0,sy=0,ox=0,oy=0;const move=e=>{if(!down)return;const dx=e.clientX-sx,dy=e.clientY-sy;const o=$('#planeObjects');o.style.transform='translate('+ (ox+dx) +'px,'+(oy+dy)+'px)';};s.addEventListener('pointerdown',e=>{down=true;sx=e.clientX;sy=e.clientY;const m=getComputedStyle($('#planeObjects')).transform;if(m&&m!=='none'){const q=new DOMMatrix(m);ox=q.m41;oy=q.m42;}s.classList.add('dragging');s.setPointerCapture(e.pointerId);});s.addEventListener('pointermove',move);s.addEventListener('pointerup',e=>{down=false;s.classList.remove('dragging');s.releasePointerCapture(e.pointerId);});s.addEventListener('pointercancel',()=>{down=false;s.classList.remove('dragging');});}
function gameOutput(n){const el=$('#gameNarrative'),state=$('#gameRunState'),cmd=$('#gameCommand');if(!el)return;state.textContent=worldRunning?'RUNNING':'ENCOUNTER';cmd.textContent=n.name.toUpperCase();const ex=lastException?lastException:'NONE';el.textContent='LOCATION: '+n.name+'\nTIME: '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+'\n\n'+n.description+'\n\n[ DESIRE ]\nI WANT THE WORLD TO REMAIN.\n\n[ EXCEPTION ]\n'+ex+'\n\nThe world is allowed to break its own pattern.\nAn old place may return. A trace may change. A door may refuse. Two arrivals may occupy one moment.\n\n[ NEW TRACE ]\n'+n.name.toUpperCase()+' → PRESENCE → MEMORY → EXCEPTION\n\nThe world has noticed you.\n\n[ CONTINUE ]';}
function enter(id){const n=world.regions.find(x=>x.id===id);if(!n)return;document.body.classList.add('world-touched');const ex=WORLD_EXCEPTIONS[Math.floor(Math.random()*WORLD_EXCEPTIONS.length)];lastException=ex;if(ex==='REFUSE'){gameOutput(n);$('#bitTitle').textContent='THE WORLD REFUSED';$('#bitText').textContent=n.name+' was reached, but the expected event did not occur.';$('#trailText').textContent='exception → refusal → memory';return;}if(ex==='REVISIT'||ex==='RETURN'){const old=[...seen];if(old.length){id=old[Math.floor(Math.random()*old.length)];n=world.regions.find(x=>x.id===id)||n;}}if(ex==='MUTATE'){n={...n,description:n.description+' The description is no longer identical to the last time this place was seen.'};}if(ex==='DRIFT'){n={...n,name:n.name+' // DRIFT'};}if(id==='colossal-escalation')triggerHit();seen.add(id);saveSeen();syncVisited();touchPresence(n.name);gameOutput(n);renderPlane();document.body.classList.add('world-touched');const weight=$('#weightText');if(weight)weight.textContent='The world is beginning to take up room.';$('#bitTitle').textContent=n.name;$('#bitText').textContent=n.description;$('#trailText').textContent='you → '+n.name;if(n.path&&n.path!=='#'){const a=document.createElement('a');a.href=n.path;a.className='enter-link dynamic-link';a.textContent='enter this place ↗';const old=document.querySelector('.encounter-copy .dynamic-link');if(old)old.remove();$('.encounter-copy').appendChild(a);}}
function triggerHit(){const atlas=$('.atlas');atlas.classList.remove('hit');void atlas.offsetWidth;atlas.classList.add('hit');$('#bitTitle').textContent='THE HIT';$('#bitText').textContent='The reference stays familiar until the changed scale becomes impossible to miss. Then the world has to admit the new baseline.';$('#trailText').textContent='something changed → you noticed';setTimeout(()=>atlas.classList.remove('hit'),900);}
let bitIndex=0,siphonIndex=0,siphonArtifacts=[],liveIndex=0,seepIndex=0;
const liveTrace=[['NARRATOR','CHASE / C.W.SACHS','voice → inside the record'],['TRACE','LUKE / MUSTANG','proximity → confirmed'],['SCENE','PARKING LOT / NIGHT','engine heat retained'],['CHARACTER','LUKE','speech profile → yo'],['MEMORY','ONE PUTS HIS HEAD ON ANOTHER','active motif'],['FILM','SHOT 018 → 019 → 020','wide → Mustang → Luke'],['CONTINUITY','YOU ─ LUKE ─ MUSTANG','distance → arrival'],['HUB','MEMORY → EVENT','the archive is playing back']];
const seep=[['DEPARTURE','the Mustang leaves; the heat remains'],['DISTANCE','ten thousand miles is still inside the sentence'],['RETURN','what leaves can remain legible as coming back'],['UNSPOKEN','the thing nobody says becomes the strongest trace'],['POETRY','event → residue → association → image'],['SEEP','the archive leaks meaning between nodes']];
function seepPulse(){const x=seep[seepIndex++%seep.length];$('#liveTitle').textContent='SEEP // '+x[0];$('#liveText').textContent=x[1];$('#trailText').textContent='event → residue → '+x[0];}
function livePulse(){const x=liveTrace[liveIndex++%liveTrace.length];$('#liveTitle').textContent=x[0]+' // '+x[1];$('#liveText').textContent=x[2];$('#trailText').textContent='live → '+x[1];}
function startLive(){livePulse();setInterval(()=>{(liveIndex%3===2)?seepPulse():livePulse();},4200);}
function runWorld(){if(worldRunning)return;worldRunning=true;document.body.classList.add('running');$('#runWorld').textContent='RUNNING';$('#runWorld').setAttribute('aria-pressed','true');const move=()=>{const nodes=[...document.querySelectorAll('.node')];if(!nodes.length)return;const unvisited=nodes.filter(n=>!seen.has(n.dataset.id));const pool=unvisited.length?unvisited:nodes;let target=pool[Math.floor(Math.random()*pool.length)];enter(target.dataset.id);if(lastException==='ARRIVE_TWICE'||lastException==='ECHO'){setTimeout(()=>enter(target.dataset.id),1200);}};move();autonomousTimer=setInterval(move,12000);}
function stopWorld(){worldRunning=false;document.body.classList.remove('running');$('#runWorld').textContent='RUN';$('#runWorld').setAttribute('aria-pressed','false');clearInterval(autonomousTimer);autonomousTimer=null;}
async function loadSiphon(){const r=await fetch('./creative/kirk-siphon.json');if(!r.ok)return;siphonArtifacts=(await r.json()).artifacts||[];}
function siphon(){if(!siphonArtifacts.length){$('#bitTitle').textContent='NO RESONANCE YET';$('#bitText').textContent='Nothing is calling from there yet.';return;}const x=siphonArtifacts[siphonIndex++%siphonArtifacts.length];$('#bitTitle').textContent='KIRK RESONANCE // '+x.title;$('#bitText').textContent=x.draft;$('#trailText').textContent='discovery → '+x.type.toLowerCase()+' → memory';}
function forgetTrail(){seen.clear();saveSeen();saveRoomState({});syncVisited();renderRoom();$('#bitTitle').textContent='THE TRAIL IS GONE';$('#bitText').textContent='The world remains. This local memory has gone quiet.';$('#trailText').textContent='you → arrival';}
function bit(){const b=world.pleasureBits[bitIndex++%world.pleasureBits.length];$('#bitTitle').textContent=b.title;$('#bitText').textContent=b.text;$('#trailText').textContent=b.from+' → '+b.to;}
function roomClick(){const s=roomState();s.visits=(s.visits||0)+1;const seed=['A door without a room.','A faint machine tone behind the wall.','Dust disturbed in a place nobody has entered.','One line of writing, not yet a story.'];const event=seed[(s.visits-1)%seed.length];s.traces=s.traces||[];s.traces.push({visit:s.visits,event,time:new Date().toISOString()});s.lore=s.traces.map(x=>x.event).join(' / ');saveRoomState(s);renderRoom();$('#bitTitle').textContent='THE ROOM SAID';$('#bitText').textContent=event;$('#trailText').textContent='room → '+(s.visits>=3?'poetry':'trace');}
const WORLD_GATE_KEY='geehub-world-gate';
function transport(){const select=$('#worldSelect'),destination=select.value;if(!destination){$('#transportStatus').textContent='No place is chosen yet.';return;}const names={'pyyro-chamber':'PYYRO ENERGY CHAMBER','poetry-seep':'POETRY SEEP','deep-lore':'DEEP LORE','novel-engine':'NOVEL ENGINE','veyrthalis':'VEY RTHALIS'};const s=roomState();s.transit=s.transit||[];s.transit.push({from:'GEEHUB',to:destination,time:new Date().toISOString()});saveRoomState(s);localStorage.setItem(WORLD_GATE_KEY,destination);$('#transportTitle').textContent='A WAY OPENS';$('#transportStatus').textContent='Someone goes to '+names[destination]+'. The destination inherits memory, not coordinates.';$('#trailText').textContent='world → '+names[destination];if(destination==='veyrthalis')setTimeout(()=>{window.location.href='./lore/veyrthalis/HYPERSPACE_EXPEDITION_2026-09-21.md';},350);}
function renderRoom(){const host=document.querySelector('#pyyroRoom');if(!host)return;const s=roomState(),traces=s.traces||[];if(!traces.length){host.innerHTML='<div class="room-empty"><div class="eyebrow">PYYRO ROOM</div><h2>QUIET</h2><p>The room is quiet.</p><button id="enterEmptyRoom">enter the room</button></div>';$('#enterEmptyRoom').onclick=roomClick;return;}host.innerHTML='<div class="room-lived"><div class="eyebrow">PYYRO ROOM / MEMORY</div><h2>THE ROOM REMEMBERS</h2><p>'+traces.map((x,i)=>'<span class="room-trace">'+(i+1)+'. '+x.event+'</span>').join('')+'</p><button id="produceAgain">let the room speak again</button></div>';$('#produceAgain').onclick=roomClick;}
$('#runWorld').addEventListener('click',()=>worldRunning?stopWorld():runWorld());$('#nextBit').addEventListener('click',bit);$('#transportBtn').addEventListener('click',transport);$('#siphon').addEventListener('click',siphon);$('#forgetTrail').addEventListener('click',forgetTrail);$('#center').addEventListener('click',()=>{$('#bitTitle').textContent='YOU ARE IN THE WORLD';$('#bitText').textContent='Nothing has to be finished. The constellation is the thing you live inside.';$('#trailText').textContent='you → world';});loadSiphon();startLive();renderArtifacts();dreamFromArtifacts();renderPresence();renderPlane();initPlane();setInterval(renderPresence,7000);load().catch(e=>{$('#bitTitle').textContent='WORLD OFFLINE';$('#bitText').textContent=e.message;});

/* FILESPACE EXPANSION
   The hub may discover additional user-approved storage and turn empty/available
   space into living GEEHUB material. Browser security requires the user to choose
   the root directory once; after permission is granted, the app can inspect and
   write within that directory without inventing access to the rest of the device.
*/
const FILESPACE_KEY='geehub-filespace';
let filespaceHandle=null;

function filespaceUI(){
  if(document.querySelector('#filespaceControl'))return;
  const wrap=document.createElement('section');
  wrap.id='filespaceControl';
  wrap.innerHTML='<div class="eyebrow">FILESPACE</div><h2>EXPAND THE HUB</h2><p id="filespaceStatus">The hub can look for additional space and fill what it finds.</p><div class="filespace-actions"><button id="scanFilespace" type="button">search for additional filespace</button><button id="fillFilespace" type="button" disabled>fill discovered space</button></div><pre id="filespaceReport"></pre>';
  Object.assign(wrap.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:50,maxWidth:'420px',padding:'16px',background:'rgba(8,10,14,.94)',border:'1px solid rgba(255,255,255,.16)',backdropFilter:'blur(12px)',color:'inherit'});
  document.body.appendChild(wrap);
  $('#scanFilespace').onclick=scanFilespace;
  $('#fillFilespace').onclick=fillFilespace;
}

async function walkFilespace(dir,path='',out=[]){
  for await(const [name,entry] of dir.entries()){
    const next=path?path+'/'+name:name;
    if(entry.kind==='directory'){
      if(!name.startsWith('.') && name!=='node_modules') await walkFilespace(entry,next,out);
    }else{
      out.push({name,path:next,size:entry.size||0});
    }
  }
  return out;
}

async function getOrCreateExpansionRoot(root){
  try{return await root.getDirectoryHandle('GEEHUB_EXPANSION',{create:true});}
  catch{return root;}
}

async function scanFilespace(){
  const status=$('#filespaceStatus'),report=$('#filespaceReport'),fill=$('#fillFilespace');
  if(!window.showDirectoryPicker){
    status.textContent='This browser does not expose the File System Access API. Open GEEHUB in a supported secure browser context.';
    return;
  }
  try{
    filespaceHandle=await window.showDirectoryPicker({mode:'readwrite'});
    const files=await walkFilespace(filespaceHandle);
    const existing=files.filter(f=>/geehub|artifact|corpus|lore|world|novel/i.test(f.path));
    const emptyish=files.filter(f=>f.size===0);
    const summary=[
      'DISCOVERED FILESPACE',
      'files: '+files.length,
      'GEEHUB-related: '+existing.length,
      'empty files: '+emptyish.length,
      '',
      existing.slice(0,12).map(f=>'FOUND  '+f.path).join('\n') || 'No existing GEEHUB traces found.',
      '',
      'The selected space is now available as an expansion surface.'
    ].join('\n');
    report.textContent=summary;
    status.textContent='Space found. The hub has a writable expansion surface.';
    fill.disabled=false;
  }catch(e){
    status.textContent=e.name==='AbortError'?'No filespace was selected.':'Filespace search failed: '+e.message;
  }
}

async function writeTextFile(dir,name,text){
  const h=await dir.getFileHandle(name,{create:true});
  const w=await h.createWritable();
  await w.write(text);
  await w.close();
}

async function fillFilespace(){
  if(!filespaceHandle)return;
  const status=$('#filespaceStatus'),report=$('#filespaceReport');
  try{
    const root=await getOrCreateExpansionRoot(filespaceHandle);
    const now=new Date().toISOString();
    const a=artifacts().slice(0,24);
    const manifest={
      generated_at:now,
      source:'GEEHUB filespace expansion',
      purpose:'additional writable memory for artifacts, lore, scenes, and world state',
      discovered_filespace:'user-selected directory',
      artifacts:a.map(x=>({type:x.type||'TRACE',title:x.title||'Untitled',body:x.body||''}))
    };
    await writeTextFile(root,'FILESYSTEM_MANIFEST.json',JSON.stringify(manifest,null,2));
    await writeTextFile(root,'README.md','# GEEHUB EXPANSION\n\nThis space was opened by GEEHUB as additional living filespace.\n\n'+a.map(x=>'## '+(x.title||'Artifact')+'\n\n'+(x.body||'')).join('\n\n'));
    const artifactDir=await root.getDirectoryHandle('artifacts',{create:true});
    for(let i=0;i<a.length;i++){
      const x=a[i];
      const safe=(x.title||'artifact-'+i).replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,80)||('artifact-'+i);
      await writeTextFile(artifactDir,String(i+1).padStart(3,'0')+'-'+safe+'.md','# '+(x.title||'Artifact')+'\n\n'+(x.body||'')+'\n\nTYPE: '+(x.type||'TRACE')+'\nGENERATED: '+now);
    }
    const stateDir=await root.getDirectoryHandle('state',{create:true});
    await writeTextFile(stateDir,'world-state.json',JSON.stringify({generated_at:now,visited:[...seen],room:roomState(),presence,artifact_count:a.length},null,2));
    status.textContent='Expansion complete. The hub has filled the new space with its current memory and artifacts.';
    report.textContent+='\n\nFILLED: GEEHUB_EXPANSION/\n  FILESYSTEM_MANIFEST.json\n  README.md\n  artifacts/\n  state/world-state.json';
    renderArtifacts();
  }catch(e){
    status.textContent='Fill failed: '+e.message;
  }
}

filespaceUI();
