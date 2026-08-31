const $=s=>document.querySelector(s);
let projects=[];let filter='all';let query='';
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
  'BODY is the current obsession: proportion, silhouette, weight, posture, surface, presence.',
  'Zoom closer. Then step back. The useful detail is the one that changes the whole figure.',
  'Treat anatomy as a design language: structure creates gesture, gesture creates character, character creates story.',
  'Turn the body into a scene: lighting, scale, clothing, environment, and camera all become part of the form.'
];
async function load(){try{projects=await fetch('./projects.json').then(r=>r.json());render();jamRandom()}catch(err){$('#results').innerHTML='<div class="empty">Could not load the constellation.</div>'}}
function matches(p){const q=query.trim().toLowerCase();return(!q||JSON.stringify(p).toLowerCase().includes(q))&&(filter==='all'||filter===p.status||filter===p.group)}
function render(){const rows=projects.filter(matches);$('#stats').innerHTML=`<div><b>${projects.length}</b><span>projects</span></div><div><b>${projects.filter(p=>p.status==='active').length}</b><span>active</span></div><div><b>${projects.filter(p=>p.status==='incubating').length}</b><span>incubating</span></div>`;const groups=[...new Set(projects.map(p=>p.group))];$('#groups').innerHTML=groups.map(g=>`<button data-group="${esc(g)}">${esc(g)}</button>`).join('');$('#groups').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.group;syncButtons();render();jamForGroup(filter)});$('#results').innerHTML=rows.map(card).join('')||'<div class="empty">Nothing here yet.</div>'}
function card(p){const cls=`dot ${p.status}`;return `<article class="card"><div class="top"><span class="${cls}"></span><span class="status">${esc(p.status)}</span><span class="group">${esc(p.group)}</span></div><h2>${esc(p.name)}</h2><p>${esc(p.summary)}</p><div class="tags">${p.tags.map(t=>`<span>#${esc(t)}</span>`).join('')}</div>${p.path&&p.path!=='#'?`<a href="${p.path}">Open ↗</a>`:'<span class="future">repo / workspace not split yet</span>'}</article>`}
function jamRandom(){const x=jammerLines[Math.floor(Math.random()*jammerLines.length)];$('#jamText').textContent=x[1];$('#jamMeta').textContent=`Focus: ${x[0]} · Now make one unreasonable connection.`}
function jamForGroup(g){const x=jammerLines.find(([name])=>name.toLowerCase().includes(g));if(x){$('#jamText').textContent=x[1];$('#jamMeta').textContent=`Focus: ${x[0]} · Follow the thread.`}else jamRandom()}
function bodyFocus(){const line=bodyLines[Math.floor(Math.random()*bodyLines.length)];$('#jamText').textContent=line;$('#jamMeta').textContent='FOCUS: BODY · Keep the attention on form, proportion, presence, and visual consequence.';const body=projects.find(p=>p.id==='complex'||p.id==='growth-canvas'||p.id==='beefythiq');if(body){query='body';$('#search').value='body';render()}}
function esc(s){return String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function syncButtons(){document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter))}
$('#search').oninput=e=>{query=e.target.value;render()};document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;syncButtons();render();jamForGroup(filter)});$('#surprise').onclick=()=>{filter='all';syncButtons();render();jamRandom();window.scrollTo({top:document.body.scrollHeight*0.15,behavior:'smooth'})};$('#bodyFocus').onclick=()=>bodyFocus();
load();