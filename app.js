let world=null;
const $=s=>document.querySelector(s);
const seen=new Set();
async function load(){
  const r=await fetch('./world.json'); if(!r.ok) throw new Error('world unavailable');
  world=await r.json(); draw(); bit(); 
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
  seen.add(id); document.querySelectorAll('.node').forEach(x=>x.classList.toggle('visited',seen.has(x.dataset.id)));
  $('#bitTitle').textContent=n.name;
  $('#bitText').textContent=n.description;
  $('#trailText').textContent='YOU → '+n.name+' → '+n.kind;
  $('#visit').textContent=seen.size+' PLACE'+(seen.size===1?'':'S')+' VISITED';
  if(n.path && n.path!=='#'){
    const a=document.createElement('a'); a.href=n.path; a.className='enter-link'; a.textContent='enter this place ↗';
    const old=document.querySelector('.enter-link'); if(old)old.remove(); $('.encounter-copy').appendChild(a);
  }
}
let bitIndex=0;
function bit(){
  const b=world.pleasureBits[bitIndex%world.pleasureBits.length];
  $('#bitTitle').textContent=b.title; $('#bitText').textContent=b.text; $('#trailText').textContent=b.from+' → '+b.to;
}
$('#nextBit').addEventListener('click',()=>{bitIndex++;bit();});
$('#center').addEventListener('click',()=>{$('#bitTitle').textContent='YOU ARE IN THE WORLD';$('#bitText').textContent='Nothing has to be finished. The constellation is the thing you live inside.';$('#trailText').textContent='you → world';});
load().catch(e=>{$('#bitTitle').textContent='WORLD OFFLINE';$('#bitText').textContent=e.message;});
