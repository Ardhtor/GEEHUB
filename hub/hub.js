const $=s=>document.querySelector(s);
let projects=[];let filter='all';let query='';

/*
  BUILD NOTE: GEEHUB is meant to be used, not merely read. The jammer therefore
  favors immediate, concrete prompts over a form-heavy planning workflow.
  The prompts below are intentionally broad enough to collide with many kinds
  of projects while remaining actionable. They are a user-facing expression
  of the build narrative: discover -> synthesize -> build -> test -> expand.
*/
const jammerLines=[
  ['Beefythiq','BODY is a high-girth attractor. Give it a new direction: form, motion, presence, scale.'],
  ['Growth Canvas','Start with a seed. Change one rule. Watch the whole picture become something else.'],
  ['Blender Stand','Take the strange idea out of language and give it mass, lighting, surfaces, and a camera.'],
  ['The Complex','Put two unrelated projects in the same room. See what contaminates what.'],
  ['Muscle Myth','Make a symbol first. Then ask what kind of world would need that symbol.'],
  ['Discovery Engine','Search for the thing you almost meant. The near miss is often the useful part.'],
  ['BodyLounger Research Archive','Follow the oldest surviving breadcrumb. The archive is a trail of transformations, not a museum.'],
  ['BIG BRUTEFORCE','Push the rule until it breaks. Then keep the interesting break.']
];
const bodyLines=[
  'BODY is the current visual anchor: proportion, silhouette, weight, posture, surface, presence.',
  'Zoom closer. Then step back. Keep the detail that changes how the whole figure reads.',
  'Treat anatomy as a design language: structure creates gesture, gesture creates character, character creates story.',
  'Turn the body into a scene: lighting, scale, clothing, environment, and camera all become part of the form.'
];
const verbs=['infects','argues with','renders','escapes into','rebuilds','haunts','tests','collides with'];

async function load(){
  try{projects=await fetch('./projects.json').then(r=>r.json());render();jamRandom()}
  catch(err){$('#results').innerHTML='<div class="empty">Could not load the constellation.</div>'}
}
function matches(p){const q=query.trim().toLowerCase();return(!q||JSON.stringify(p).toLowerCase().includes(q))&&(filter==='all'||filter===p.status||filter===p.group)}
function render(){
  const rows=projects.filter(matches);
  $('#stats').innerHTML=`<div><b>${projects.length}</b><span>projects</span></div><div><b>${projects.filter(p=>p.status==='active').length}</b><span>active</span></div><div><b>${projects.filter(p=>p.status==='incubating').length}</b><span>incubating</span></div>`;
  const groups=[...new Set(projects.map(p=>p.group))];
  $('#groups').innerHTML=groups.map(g=>`<button data-group="${esc(g)}">${esc(g)}</button>`).join('');
  $('#groups').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.group;syncButtons();render();jamForGroup(filter)});
  $('#results').innerHTML=rows.map(card).join('')||'<div class="empty">Nothing here yet.</div>';
}
function card(p){
  const cls=`dot ${p.status}`;
  return `<article class="card"><div class="top"><span class="${cls}"></span><span class="status">${esc(p.status)}</span><span class="group">${esc(p.group)}</span></div><h2>${esc(p.name)}</h2><p>${esc(p.summary)}</p><div class="tags">${(p.tags||[]).map(t=>`<span>#${esc(t)}</span>`).join('')}</div>${p.path&&p.path!=='#'?`<a href="${p.path}">Open ↗</a>`:'<span class="future">repo / workspace not split yet</span>'}</article>`;
}
function jamRandom(){
  const candidates=projects.filter(p=>p.group!=='archive');
  const a=candidates[Math.floor(Math.random()*candidates.length)]||projects[0];
  const others=candidates.filter(p=>p.id!==a?.id && p.group!==a?.group);
  const b=others[Math.floor(Math.random()*others.length)]||a;
  if(!a)return;
  const verb=verbs[Math.floor(Math.random()*verbs.length)];
  const action=`${a.name} ${verb} ${b?.name||'an unfinished idea'}. Make one small artifact where both have to obey the same rule.`;
  $('#jamText').textContent=action;
  $('#jamMeta').textContent=`Collision: ${a.name} × ${b?.name||'unknown'} · The next step should be something you can actually make.`;
  $('#jamActions').innerHTML=`<button id="jamFocus" type="button">OPEN ${esc(a.name.toUpperCase())}</button><button id="jamAgain" type="button">AGAIN</button>`;
  $('#jamAgain').onclick=jamRandom;
  $('#jamFocus').onclick=()=>focusProject(a);
}
function jamForGroup(g){
  const candidates=projects.filter(p=>p.group===g);
  if(!candidates.length)return jamRandom();
  const p=candidates[Math.floor(Math.random()*candidates.length)];
  $('#jamText').textContent=jammerLines.find(([name])=>name.toLowerCase().includes(String(p.name).split(' ')[0].toLowerCase()))?.[1]||`${p.name}: make the smallest interesting artifact you can imagine.`;
  $('#jamMeta').textContent=`Focus: ${p.name} · Follow the thread instead of planning the whole thing.`;
  $('#jamActions').innerHTML=`<button id="jamFocus" type="button">OPEN ${esc(p.name.toUpperCase())}</button><button id="jamAgain" type="button">AGAIN</button>`;
  $('#jamAgain').onclick=jamRandom;
  $('#jamFocus').onclick=()=>focusProject(p);
}
function bodyFocus(){
  const line=bodyLines[Math.floor(Math.random()*bodyLines.length)];
  $('#jamText').textContent=line;
  $('#jamMeta').textContent='FOCUS: BODY · Keep attention on form, proportion, presence, and visual consequence.';
  query='body';$('#search').value='body';filter='all';syncButtons();render();
}
function focusProject(p){
  query=p.name;$('#search').value=p.name;filter='all';syncButtons();render();
  document.querySelector('.results')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function esc(s){return String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function syncButtons(){document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter))}
$('#search').oninput=e=>{query=e.target.value;render()};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;syncButtons();render();jamForGroup(filter)});
$('#surprise').onclick=()=>{filter='all';syncButtons();render();jamRandom();window.scrollTo({top:0,behavior:'smooth'})};
$('#bodyFocus').onclick=()=>bodyFocus();
load();
