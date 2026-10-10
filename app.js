let world=null;
let worldRunning=false;
let autonomousTimer=null;
// Encounter outcomes are derived from persisted world relations, never random rolls.
let worldSequenceIndex=0;
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
async function load(){
  const r=await fetch('./world.json');
  if(!r.ok)throw new Error('world unavailable');
  world=await r.json();
  draw();bit();syncVisited();renderRoom();initSwarvic();
  const savedId=localStorage.getItem('geehub-current-story-region');
  const saved=world.regions.find(item=>item.id===savedId);
  if(saved){
    lastException=null;
    syncStoryLocation(saved.id,saved.name);
    gameOutput(saved,'restore',saved.id);
    $('#bitTitle').textContent=saved.name;
    $('#bitText').textContent=saved.description;
    $('#trailText').textContent='you → '+saved.name;
  }
}
function draw(){const nodes=$('#nodes'),svg=$('#links');nodes.innerHTML=world.regions.map(n=>'<button type="button" class="node" data-id="'+n.id+'" style="left:'+n.x+'%;top:'+n.y+'%;--scale:'+n.size+'" aria-label="'+n.name+'"><span class="node-name">'+n.name+'</span><span class="node-kind">'+n.kind+'</span></button>').join('');const by=Object.fromEntries(world.regions.map(n=>[n.id,n]));svg.innerHTML=world.pleasureBits.map(b=>{const a=by[b.from],c=by[b.to];return '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+c.x+'" y2="'+c.y+'"></line>'}).join('');nodes.querySelectorAll('.node').forEach(el=>el.addEventListener('click',()=>enter(el.dataset.id)));}
const GEEHUB_FILES=['README.md','CANON.md','CURRENT_STATE_2026-09.md','BUILD_NARRATIVE.md','THE_FIRST_MEN.md','world.json','projects.json','records.json','index.html','app.js','style.css','archive/male-harem/README.md','lore/DEEP_LORE.md','lore/veyrthalis/HYPERSPACE_EXPEDITION_2026-09-21.md','creative/kirk-siphon.json','rooms/PYYRO_ROOMS.json'];
function initFilespace(){const tree=$('#fileTree'),view=$('#fileView'),top=$('#fileViewTop'),path=$('#filePath');if(!tree)return;tree.innerHTML=GEEHUB_FILES.map(f=>'<button type="button" data-file="'+f+'">'+f+'</button>').join('');tree.querySelectorAll('button').forEach(b=>b.addEventListener('click',async()=>{const f=b.dataset.file;path.textContent='/GEEHUB/'+f;top.textContent=f.toUpperCase();view.textContent='LOADING…';try{const r=await fetch('./'+f);if(!r.ok)throw new Error('unavailable');const t=await r.text();view.textContent=t.slice(0,18000)+(t.length>18000?'\n\n… FILE CONTINUES …':'');}catch(e){view.textContent='FILE UNAVAILABLE IN THIS BUILD.\n\n'+f;}}));}
function renderPlane(){const host=$('#planeObjects');if(!host||!world)return;const base=world.regions.slice(0,12).map((n,i)=>({kind:n.kind||'PLACE',name:n.name,text:n.description||'',x:8+(i%4)*24,y:12+Math.floor(i/4)*29}));const extra=artifacts().slice(0,6).map((a,i)=>({kind:a.type||'TRACE',name:a.title,text:a.body||'',x:14+(i%3)*31,y:22+Math.floor(i/3)*42}));const items=[...base,...extra];host.innerHTML=items.map((x,i)=>'<button class="plane-object" type="button" data-plane="'+i+'" style="left:'+x.x+'%;top:'+x.y+'%"><span class="eyebrow">'+x.kind+'</span><strong>'+x.name+'</strong><small>'+x.text.slice(0,72)+'</small></button>').join('');host.querySelectorAll('.plane-object').forEach((el,i)=>el.addEventListener('click',()=>{host.querySelectorAll('.plane-object').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');const x=items[i];$('#planeSelection').textContent=x.name.toUpperCase();$('#planeReadout').textContent=x.kind+' // '+x.name+' // '+x.text;}));}
const SWARVIC_MOVES=[['ORBIT',900,120,8],['SNAP',260,18,-14],['FOLD',620,-70,22],['CROSS',780,155,-8],['RELEASE',1100,220,4],['RETURN',840,-105,-18]];
let swarvicTimer=null,swarvicIndex=0,swarvicAngle=0;
let visualFrame=0,visualRunning=false,visualMode=0,visualLast=0;
function initWorldVisual(){
  const canvas=$('#worldCanvas'), stage=$('#worldVisual'), enter=$('#visualEnter'), title=$('#visualTitle'), caption=$('#visualCaption');
  if(!canvas||!stage)return;
  const ctx=canvas.getContext('2d');
  const resize=()=>{const d=Math.min(devicePixelRatio||1,2),r=stage.getBoundingClientRect();canvas.width=r.width*d;canvas.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);};
  const points=Array.from({length:28},(_,i)=>({a:i*.82,r:90+(i%7)*34,s:.4+(i%5)*.16}));
  const draw=(t)=>{
    const r=stage.getBoundingClientRect(),w=r.width,h=r.height,cx=w*.5,cy=h*.52;
    ctx.clearRect(0,0,w,h);
    const g=ctx.createRadialGradient(cx,cy,10,cx,cy,Math.max(w,h)*.65);g.addColorStop(0,'#202832');g.addColorStop(.38,'#0e141b');g.addColorStop(1,'#030507');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.sin(t*.00012)*.06);
    ctx.strokeStyle='rgba(190,205,220,.10)';ctx.lineWidth=1;
    for(let j=0;j<13;j++){ctx.beginPath();ctx.ellipse(0,0,150+j*45,70+j*24,0,0,Math.PI*2);ctx.stroke();}
    for(let j=0;j<18;j++){const a=j*Math.PI/9+t*.00008;ctx.beginPath();ctx.moveTo(Math.cos(a)*40,Math.sin(a)*20);ctx.lineTo(Math.cos(a)*700,Math.sin(a)*360);ctx.stroke();}
    points.forEach((p,i)=>{const a=p.a+t*.00025*(i%2?-.8:1), rr=p.r+Math.sin(t*.0012+i)*24;const x=Math.cos(a)*rr,y=Math.sin(a)*rr*.48;ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.fillStyle=i%5===0?'rgba(235,240,245,.9)':'rgba(150,165,180,.48)';ctx.fillRect(-2,-18,4,36);ctx.beginPath();ctx.arc(0,-25,5,0,Math.PI*2);ctx.fill();ctx.restore();});
    const ax=Math.cos(t*.00034)*190,ay=Math.sin(t*.00034)*190*.48,bx=Math.cos(t*.00034+Math.PI)*190,by=Math.sin(t*.00034+Math.PI)*190*.48;
    ctx.strokeStyle='rgba(225,232,240,.35)';ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
    [ [ax,ay,1],[bx,by,-1] ].forEach(([x,y,s])=>{ctx.save();ctx.translate(x,y);ctx.scale(s,1);ctx.fillStyle='#dbe2e8';ctx.shadowBlur=28;ctx.shadowColor='rgba(210,225,240,.35)';ctx.beginPath();ctx.arc(0,-32,12,0,Math.PI*2);ctx.fill();ctx.fillRect(-9,-18,18,48);ctx.fillRect(-18,27,13,7);ctx.fillRect(5,27,13,7);ctx.restore();});
    ctx.restore();
    visualFrame=requestAnimationFrame(draw);
  };
  const start=()=>{if(visualRunning)return;visualRunning=true;stage.classList.add('visual-active');title.textContent='THE WORLD HAS BECOME VISUAL';caption.textContent='SPACE / PRESENCE / MOTION / MEMORY';draw(performance.now());};
  enter.addEventListener('click',start);window.addEventListener('resize',resize);resize();start();
}
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
  initWorldVisual();
  const b=$('#danceRun'); if(!b)return;
  b.addEventListener('click',()=>{b.textContent='DANCING';b.setAttribute('aria-pressed','true');swarvicStep();});
  const f=$('#danceField'); if(f)f.addEventListener('click',swarvicStep);
}
function initPlane(){const s=$('#planeSurface');if(!s)return;let down=false,sx=0,sy=0,ox=0,oy=0;const move=e=>{if(!down)return;const dx=e.clientX-sx,dy=e.clientY-sy;const o=$('#planeObjects');o.style.transform='translate('+ (ox+dx) +'px,'+(oy+dy)+'px)';};s.addEventListener('pointerdown',e=>{down=true;sx=e.clientX;sy=e.clientY;const m=getComputedStyle($('#planeObjects')).transform;if(m&&m!=='none'){const q=new DOMMatrix(m);ox=q.m41;oy=q.m42;}s.classList.add('dragging');s.setPointerCapture(e.pointerId);});s.addEventListener('pointermove',move);s.addEventListener('pointerup',e=>{down=false;s.classList.remove('dragging');s.releasePointerCapture(e.pointerId);});s.addEventListener('pointercancel',()=>{down=false;s.classList.remove('dragging');});}
const STORY_PLACE_BY_REGION = {"bodylounger":"THE HOUSE OF OPEN SCREENS","beefythiq":"THE NEW BASELINE","male-harem":"THE HOUSE OF OPEN SCREENS","growth":"THE BLUE HALL","complex":"THE RESERVOIR CITY","facility":"THE SEVENTH WELL","veyrthalis":"VEYRTHALIS / DIGITORIUM","muscle-myth":"THE BLUE HALL","discovery":"THE NORTHERN ROAD","embodied-scale":"THE SEVENTH WELL","colossal-escalation":"THE NEW BASELINE","kingdom-land":"THE NORTHERN ROAD","deep-lore":"THE BLUE HALL","luke-bwomph":"THE NEW BASELINE"};
const WORLD_BROADCASTS = {"bodylounger":["The archive is lit by old monitor glass and the pale reflection of a browser left open overnight. Shelves hold screenshots, dates, names, half-preserved pages, and the blue-white glow of things found before anyone knew they would matter. A paper cup has gone cold beside the keyboard, and the room smells of dust warming near the fan.","The images here aren't just examples lined up for inspection. They're a trail of visits and versions: the first silhouette, the next stage, the little difference somebody thought worth saving. One broad-shouldered man remains recognizable across the sequence, face and manner intact while the frame around him slowly becomes inadequate."],"beefythiq":["The room registers accumulation before anybody names it. A chair is pushed closer to the wall; the shirt seam across a broad chest draws taut; the floorboards answer a heavier stance with a lower sound. The light stays the same, and the man's face stays his own, but the room around him begins measuring itself against a new baseline.","This is where growth becomes a lived change instead of a number. Arms hang farther from the ribs, shoulders alter the width of the doorway, and an old shirt remembers a smaller shape. The earlier version hasn't vanished; it's still there in the way everyone remembers him standing before the room had to make space."],"male-harem":["An industrial hall opens into a shared residence: concrete floor, exposed beams, gym benches, clean shirts hung over chair backs, and late afternoon coming in through high panes of glass. Broad men move between the rooms with the ease of people who know one another's habits. Someone nudges a chair into place with his boot; another pauses to admire a friend's new breadth of shoulder without interrupting the conversation.","The roster is a living one. Each man brings his own posture, humor, size, preferences, and way of standing close to another man. They are not interchangeable figures arranged for a display. They eat together, tease one another, and remember exactly how each person has changed."],"growth":["The Blue Hall holds a soft, cool light over a dark floor. A silhouette is projected against the far wall, then another outline gathers around it, preserving the original head, hands, and stance while the shoulders and chest widen. The room's markings provide a quiet scale reference; a bench that once seemed spacious now sits close to the man's thighs.","The transformation reads in several small truths at once: fabric tension, the new curve of the deltoids, thicker legs beneath familiar shorts, and the way he turns his body to pass between two pieces of furniture. Nobody needs to announce that he's different. The room and the people in it have already noticed."],"complex":["The Complex has the comfortable disorder of a place that is used every day. A corridor smells faintly of cedar and warm electronics; a mug rests on a windowsill; the carpet changes where one room gives way to another floor. Doors lead to rooms built at different moments, and a patch of sunlight still falls across the wall even after the hallway has lengthened.","The place accumulates rather than resets. A route walked yesterday remains legible today, and new rooms grow around what people have already made together. Some details will matter later; most won't. The sound of a chair scraping the floor belongs here simply because somebody sat down."],"facility":["White walls, blue CRT glow, stainless rails, and observation windows define the facility. The air has the dry chill of conditioned rooms, with a faint disinfectant smell beneath the warm electrical odor of monitors. Behind the glass, an adult man stands broad through the shoulders and chest, calm under the measured light as technicians try to make the instruments agree with what they can see.","The room keeps turning him into a measurement, but his habitual expression and the way he rests one hand against the counter remain unmistakably his. Every time his silhouette widens, the rails and door clearances become witnesses. The data records a changed scale; his companions remember the same man."],"veyrthalis":["Fog moves through amber woods at a height that hides the far ends of the trunks. The Digitorium rises through the mist, Florentine stone at its base and dark Victorian glass above, with blue displays glowing behind tall windows. On a suspended bridge, the Procession moves quietly past its own reflections. Damp leaves cling to the steps, and somewhere beyond the trees a bell sounds once.","Veyrthalis isn't empty between its landmarks. It has wet bark, cold stone, long distances, and paths that are easy to lose in fog. The men pass through it as residents rather than tourists, carrying familiar gestures and relationships into a country that keeps making more room around them."],"muscle-myth":["The hall of symbols is built from dark stone and resin-dark beams, with carved marks worn smooth where hands have touched them across generations. A statue of a powerful adult man stands in a recessed arch, not frozen in triumph but resting with one hand against the wall. Amber light collects along his shoulders while the rest of the room stays cool and quiet.","Here, strength is a language the world uses for memory, devotion, and change. The figures remain individuals, not generic idols. One has a dry sense of humor, another prefers silence, and another keeps looking back toward the doorway to see who has followed. The mythology lives in those differences as much as in the carvings."],"discovery":["The observer's room is quiet enough to hear the window seal flex in the wind. A notebook lies open beside a cup, the pencil rolled into the crease between pages. Beyond the window, the amber tree line breaks into low hills and a pale road. Nothing is happening at the center of the view, but the light keeps changing across the tabletop.","Discovery begins by allowing the unremarkable thing to remain in view. A friend pauses before answering. A far-off car crosses a bridge. Someone's shoulders fill more of a doorway than yesterday. Not every detail is a clue; some simply gives the world its size and texture."],"embodied-scale":["The doorframe provides the first measure. The man standing beside it is familiar in face and expression, but his shoulders now come close to the jamb and his thighs change the way he sets his feet. One hand rests against the wood for balance as he turns. The hallway itself hasn't moved yet; the relationship between body and passage has changed.","Reach, turning radius, clearance, and the distance between two people become things that can be felt. A chair takes a different effort to move. A shirt drapes differently across the back. The body is not an abstract mass—it is how a person occupies the space available to him."],"colossal-escalation":["The view draws back across roofs, towers, roads, and finally the broad sweep of the landscape. The man remains recognizable through every change: familiar face, hands, expression, and relaxed stance. His shoulders begin to dominate the nearby architecture; later, the building and then the distant terrain become the scale references. Clouds drift behind him without turning him into an anonymous silhouette.","The escalation is cumulative, not a replacement. The old baseline remains in memory while the new one makes the former doorways look narrow and the former streets look slight. He continues to move as himself, using familiar gestures at a size the world has never had to accommodate before."],"kingdom-land":["Stone ridges break through a mantle of lichen, and small channels of water darken the pale rock. The ground rises into a broad plateau, its edges softened by moss and weather. From this height the roads seem like drawn threads, but close by each path has rough footing, loose grit, and shallow pools that catch the gray sky.","This geography is meant to be entered, not merely labeled. Rock carries weight, lichen spreads over surfaces, and the water finds its own route through the hollows. The land has a texture before it has a legend, and it remains worth looking at even when no character crosses it."],"deep-lore":["A narrow passage holds a series of marks that look like scratches until the light shifts and reveals that each line was made at a different time. Dust gathers along the baseboard. A small object sits beneath the wall where someone placed it and forgot to return for it. The room gives no explanation for the arrangement; it preserves the residue of what has passed through.","Deep lore is the part left over after an event is over. A phrase returns with a slight change, a doorway appears in different accounts, and a name remains when the person carrying it has gone. The narrators don't have to turn every repetition into an answer. They can notice it, leave it intact, and keep moving."],"luke-bwomph":["Luke stands in the familiar bar-gym light, the mirrors clouded at their edges and the rubber floor marked by chalk and old shoe tracks. His face remains Luke's, his hands move with the same confidence, and he gives a familiar little nod before turning toward the mirror. His shoulders now stretch farther across the tank top; his chest fills the fabric differently, and his legs make his stance wider and more settled.","The next stage is visible in the way he moves. He turns, checks the line of his shoulder, rolls his arms loose at his sides, and walks past the bench without having to think about his changed proportions. Nothing about the growth requires a new identity. This is Luke, already comfortable enough in himself to try the new baseline on for size."]};
function syncStoryLocation(regionId, regionName){const place=STORY_PLACE_BY_REGION[regionId]||regionName;const atlas=window.GEEHUB_STORY_ATLAS;if(atlas&&typeof atlas.locate==='function')atlas.locate({location:place});}
function gameOutput(n,source='render',priorId=null){
  const el=$('#gameNarrative'),state=$('#gameRunState'),cmd=$('#gameCommand');
  if(!el)return;
  try{localStorage.setItem('geehub-current-story-region',n.id);}catch{}
  state.textContent=worldRunning?'RUNNING // LIVE':'WORLD / RESPONDING';
  cmd.textContent=n.name.toUpperCase();
  const scene=WORLD_BROADCASTS[n.id]||[
    n.name+' comes into view gradually. The room has a quiet electrical hum, a worn floor, and light collecting along the edges of the doorway. The available record reads: '+(n.description||'A place without a finished description.'),
    'Nothing here needs to become a plot point. The place can keep its weather, surfaces, distances, and small signs of use while the world decides what happens next.'
  ];
  const response={
    ARRIVAL:'This is the first recorded arrival at this place. The room registers the visitor; the prior places remain in the history behind this one.',
    RETURN:'A place already visited has returned. Its earlier trace remains underneath the present view, so the return carries more history than the first arrival.',
    ECHO:'The same place has been entered again without crossing elsewhere. The world answers with an echo instead of pretending this is a new destination.',
    RESONANCE:'The previous place and this one share a recorded relation. The path between them is active, and the arrival inherits that connection.',
    DRIFT:'The path here was not directly related to the prior place. The world preserves the gap instead of inventing a connection.'
  }[lastException]||'The world keeps its previous state beneath this view. Nothing has been erased merely because the scene has changed.';
  el.textContent='SETH / '+n.name.toUpperCase()+'\n\n'+scene[0]+'\n\nNICK / THE WORLD AROUND IT\n\n'+scene[1]+'\n\nSETH / WHAT THE WORLD REMEMBERS\n\n'+response;
  document.dispatchEvent(new CustomEvent('geehub:world-encounter',{detail:{
    id:n.id,name:n.name,description:n.description||'',source,priorId,exception:lastException,
    at:new Date().toISOString()
  }}));
}function deriveWorldResponse(id,priorId){
  if(priorId===id)return 'ECHO';
  if(seen.has(id))return 'RETURN';
  const related=Boolean(priorId&&world?.pleasureBits?.some(b=>(b.from===priorId&&b.to===id)||(b.to===priorId&&b.from===id)));
  return related?'RESONANCE':'ARRIVAL';
}
function enter(id,context={}){
  const n=world?.regions?.find(x=>x.id===id);
  if(!n)return;
  document.body.classList.add('world-touched');
  let priorId=null;
  try{priorId=localStorage.getItem('geehub-current-story-region');}catch{}
  lastException=deriveWorldResponse(id,priorId);
  if(id==='colossal-escalation')triggerHit();
  seen.add(id);saveSeen();syncVisited();touchPresence(n.name);
  gameOutput(n,context.source||'user',priorId);
  renderPlane();
  const weight=$('#weightText');if(weight)weight.textContent='The world is beginning to take up room.';
  $('#bitTitle').textContent=n.name;$('#bitText').textContent=n.description;$('#trailText').textContent='you → '+n.name;
  if(n.path&&n.path!=='#'){
    const a=document.createElement('a');a.href=n.path;a.className='enter-link dynamic-link';a.textContent='enter this place ↗';
    const old=document.querySelector('.encounter-copy .dynamic-link');if(old)old.remove();
    $('.encounter-copy')?.appendChild(a);
  }
}function triggerHit(){const atlas=$('.atlas');atlas.classList.remove('hit');void atlas.offsetWidth;atlas.classList.add('hit');$('#bitTitle').textContent='THE HIT';$('#bitText').textContent='The reference stays familiar until the changed scale becomes impossible to miss. Then the world has to admit the new baseline.';$('#trailText').textContent='something changed → you noticed';setTimeout(()=>atlas.classList.remove('hit'),900);}
let bitIndex=0,siphonIndex=0,siphonArtifacts=[],liveIndex=0,seepIndex=0;
const liveTrace=[['NARRATOR','CHASE / C.W.SACHS','voice → inside the record'],['TRACE','LUKE / MUSTANG','proximity → confirmed'],['SCENE','PARKING LOT / NIGHT','engine heat retained'],['CHARACTER','LUKE','speech profile → yo'],['MEMORY','ONE PUTS HIS HEAD ON ANOTHER','active motif'],['FILM','SHOT 018 → 019 → 020','wide → Mustang → Luke'],['CONTINUITY','YOU ─ LUKE ─ MUSTANG','distance → arrival'],['HUB','MEMORY → EVENT','the archive is playing back']];
const seep=[['DEPARTURE','the Mustang leaves; the heat remains'],['DISTANCE','ten thousand miles is still inside the sentence'],['RETURN','what leaves can remain legible as coming back'],['UNSPOKEN','the thing nobody says becomes the strongest trace'],['POETRY','event → residue → association → image'],['SEEP','the archive leaks meaning between nodes']];
function seepPulse(){const x=seep[seepIndex++%seep.length];$('#liveTitle').textContent='SEEP // '+x[0];$('#liveText').textContent=x[1];$('#trailText').textContent='event → residue → '+x[0];}
function livePulse(){const x=liveTrace[liveIndex++%liveTrace.length];$('#liveTitle').textContent=x[0]+' // '+x[1];$('#liveText').textContent=x[2];$('#trailText').textContent='live → '+x[1];}
function startLive(){livePulse();setInterval(()=>{(liveIndex%3===2)?seepPulse():livePulse();},4200);}
function runWorld(){
  if(worldRunning)return;
  worldRunning=true;document.body.classList.add('running');$('#runWorld').textContent='RUNNING';$('#runWorld').setAttribute('aria-pressed','true');
  if(window.GEEHUB_WORLD_AUTONOMY){window.GEEHUB_WORLD_AUTONOMY.setRunMode(true);}
  else{
    const ordered=['bodylounger','growth','beefythiq','complex','embodied-scale','colossal-escalation','facility','male-harem','deep-lore','veyrthalis','discovery'];
    let step=0;const move=()=>{const id=ordered[step++%ordered.length];if(world?.regions?.some(n=>n.id===id))enter(id,{source:'run'});};
    move();autonomousTimer=setInterval(move,12000);
  }
}
function stopWorld(){
  worldRunning=false;document.body.classList.remove('running');$('#runWorld').textContent='RUN';$('#runWorld').setAttribute('aria-pressed','false');
  clearInterval(autonomousTimer);autonomousTimer=null;
  window.GEEHUB_WORLD_AUTONOMY?.setRunMode(false);
}async function loadSiphon(){const r=await fetch('./creative/kirk-siphon.json');if(!r.ok)return;siphonArtifacts=(await r.json()).artifacts||[];}
function siphon(){if(!siphonArtifacts.length){$('#bitTitle').textContent='NO RESONANCE YET';$('#bitText').textContent='Nothing is calling from there yet.';return;}const x=siphonArtifacts[siphonIndex++%siphonArtifacts.length];$('#bitTitle').textContent='KIRK RESONANCE // '+x.title;$('#bitText').textContent=x.draft;$('#trailText').textContent='discovery → '+x.type.toLowerCase()+' → memory';}
function forgetTrail(){seen.clear();saveSeen();saveRoomState({});syncVisited();renderRoom();$('#bitTitle').textContent='THE TRAIL IS GONE';$('#bitText').textContent='The world remains. This local memory has gone quiet.';$('#trailText').textContent='you → arrival';}
function bit(){const b=world.pleasureBits[bitIndex++%world.pleasureBits.length];$('#bitTitle').textContent=b.title;$('#bitText').textContent=b.text;$('#trailText').textContent=b.from+' → '+b.to;}
function roomClick(){const s=roomState();s.visits=(s.visits||0)+1;const seed=['A door without a room.','A faint machine tone behind the wall.','Dust disturbed in a place nobody has entered.','One line of writing, not yet a story.'];const event=seed[(s.visits-1)%seed.length];s.traces=s.traces||[];s.traces.push({visit:s.visits,event,time:new Date().toISOString()});s.lore=s.traces.map(x=>x.event).join(' / ');saveRoomState(s);renderRoom();$('#bitTitle').textContent='THE ROOM SAID';$('#bitText').textContent=event;$('#trailText').textContent='room → '+(s.visits>=3?'poetry':'trace');}
const WORLD_GATE_KEY='geehub-world-gate';
function transport(){const select=$('#worldSelect'),destination=select.value;if(!destination){$('#transportStatus').textContent='No place is chosen yet.';return;}const names={'pyyro-chamber':'PYYRO ENERGY CHAMBER','poetry-seep':'POETRY SEEP','deep-lore':'DEEP LORE','novel-engine':'NOVEL ENGINE','veyrthalis':'VEY RTHALIS'};const s=roomState();s.transit=s.transit||[];s.transit.push({from:'GEEHUB',to:destination,time:new Date().toISOString()});saveRoomState(s);localStorage.setItem(WORLD_GATE_KEY,destination);$('#transportTitle').textContent='A WAY OPENS';$('#transportStatus').textContent='Someone goes to '+names[destination]+'. The destination inherits memory, not coordinates.';$('#trailText').textContent='world → '+names[destination];if(destination==='veyrthalis')setTimeout(()=>{window.location.href='./lore/veyrthalis/HYPERSPACE_EXPEDITION_2026-09-21.md';},350);}
function renderRoom(){const host=document.querySelector('#pyyroRoom');if(!host)return;const s=roomState(),traces=s.traces||[];if(!traces.length){host.innerHTML='<div class="room-empty"><div class="eyebrow">PYYRO ROOM</div><h2>QUIET</h2><p>The room is quiet.</p><button id="enterEmptyRoom">enter the room</button></div>';$('#enterEmptyRoom').onclick=roomClick;return;}host.innerHTML='<div class="room-lived"><div class="eyebrow">PYYRO ROOM / MEMORY</div><h2>THE ROOM REMEMBERS</h2><p>'+traces.map((x,i)=>'<span class="room-trace">'+(i+1)+'. '+x.event+'</span>').join('')+'</p><button id="produceAgain">let the room speak again</button></div>';$('#produceAgain').onclick=roomClick;}
$('#runWorld').addEventListener('click',()=>worldRunning?stopWorld():runWorld());$('#nextBit').addEventListener('click',bit);$('#transportBtn').addEventListener('click',transport);$('#siphon').addEventListener('click',siphon);$('#forgetTrail').addEventListener('click',forgetTrail);$('#center').addEventListener('click',()=>{$('#bitTitle').textContent='YOU ARE IN THE WORLD';$('#bitText').textContent='Nothing has to be finished. The constellation is the thing you live inside.';$('#trailText').textContent='you → world';});loadSiphon();startLive();renderArtifacts();dreamFromArtifacts();renderPresence();renderPlane();initPlane();initFilespace();setInterval(renderPresence,7000);load().catch(e=>{$('#bitTitle').textContent='WORLD OFFLINE';$('#bitText').textContent=e.message;});

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

window.GEEHUB_WORLD={
  enter:(id,context={})=>enter(id,context),
  getWorld:()=>world,
  currentId:()=>{try{return localStorage.getItem('geehub-current-story-region')||null;}catch{return null;}},
  getRegion:id=>world?.regions?.find(region=>region.id===id)||null
};
