const $=s=>document.querySelector(s);
let projects=[];let filter='all';let query='';
async function load(){projects=await fetch('./projects.json').then(r=>r.json());render();}
function matches(p){const q=query.trim().toLowerCase();return(!q||JSON.stringify(p).toLowerCase().includes(q))&&(filter==='all'||p.status===filter||p.group===filter)}
function render(){const rows=projects.filter(matches);$('#stats').innerHTML=`<div><b>${projects.length}</b><span>projects</span></div><div><b>${projects.filter(p=>p.status==='active').length}</b><span>active</span></div><div><b>${projects.filter(p=>p.group==='god').length}</b><span>god layer</span></div>`;const groups=[...new Set(projects.map(p=>p.group))];$('#groups').innerHTML=groups.map(g=>`<button data-group="${esc(g)}">${esc(g)}</button>`).join('');$('#groups').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.group;syncButtons();render()});$('#results').innerHTML=rows.map(card).join('')||'<div class="empty">Nothing here yet.</div>'}
function card(p){const cls=`dot ${p.status}`;return `<article class="card"><div class="top"><span class="${cls}"></span><span class="status">${esc(p.status)}</span><span class="group">${esc(p.group)}</span></div><h2>${esc(p.name)}</h2><p>${esc(p.summary)}</p><div class="tags">${p.tags.map(t=>`<span>#${esc(t)}</span>`).join('')}</div>${p.path&&p.path!=='#'?`<a href="${p.path}">Open ↗</a>`:'<span class="future">repo / workspace not split yet</span>'}</article>`}
function esc(s){return String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function syncButtons(){document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter))}
$('#search').oninput=e=>{query=e.target.value;render()};document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;syncButtons();render()});
load();
