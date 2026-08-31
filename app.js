const state={records:[],query:'',type:'',status:'',era:'',adultOnly:false,sort:'year-desc',label:'',creator:''};
const $=s=>document.querySelector(s);

async function load(){
  try{
    const res=await fetch('../data/records.json');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    state.records=await res.json();
    renderAll();
  }catch(err){$('#results').innerHTML=`<p class="error">Could not load the index: ${escapeHtml(err.message)}</p>`}
}
function eraMatch(year,era){
  if(!era)return true;
  if(era==='undated')return !year;
  if(!year)return false;
  const [a,b]=era.split('-').map(Number); return year>=a&&year<=b;
}
function matches(r){
  const q=state.query.trim().toLowerCase();
  const hay=JSON.stringify(r).toLowerCase();
  return (!q||hay.includes(q)) && (!state.type||r.source_type===state.type) && (!state.status||r.status===state.status) && eraMatch(r.year,state.era) && (!state.adultOnly||r.adult===true) && (!state.label||(r.labels||[]).includes(state.label)) && (!state.creator||r.creator===state.creator);
}
function filtered(){
  const rows=state.records.filter(matches);
  rows.sort((a,b)=>{
    if(state.sort==='title-asc')return a.title.localeCompare(b.title);
    if(state.sort==='source')return a.source_type.localeCompare(b.source_type)||a.title.localeCompare(b.title);
    const ay=a.year||0,by=b.year||0; return state.sort==='year-asc'?ay-by:by-ay;
  });
  return rows;
}
function renderAll(){renderStats();renderFacets();renderResults();renderActive()}
function renderStats(){
  const total=state.records.length; const matched=state.records.filter(matches).length;
  const years=state.records.filter(r=>r.year).map(r=>r.year);
  const span=years.length?`${Math.min(...years)}–${Math.max(...years)}`:'—';
  $('#count').textContent=`${matched} of ${total} records`;
  $('#stats').innerHTML=`<div class="stat"><strong>${total}</strong><span>Indexed</span></div><div class="stat"><strong>${new Set(state.records.flatMap(r=>r.labels||[])).size}</strong><span>Labels</span></div><div class="stat"><strong>${span}</strong><span>Date span</span></div>`;
}
function countsBy(key){
  const m=new Map(); state.records.forEach(r=>{const vals=Array.isArray(r[key])?r[key]:[r[key]];vals.filter(Boolean).forEach(v=>m.set(v,(m.get(v)||0)+1))}); return [...m.entries()].sort((a,b)=>b[1]-a[1]);
}
function renderFacetList(id,items,activeKey){$(id).innerHTML=items.slice(0,16).map(([name,count])=>`<div class="facet" data-facet="${escapeAttr(activeKey)}" data-value="${escapeAttr(name)}"><span>${escapeHtml(name)}</span><span>${count}</span></div>`).join('');
  $(id).querySelectorAll('.facet').forEach(el=>el.addEventListener('click',()=>{state[el.dataset.facet]=state[el.dataset.facet]===el.dataset.value?'':el.dataset.value;renderAll()}));
}
function renderFacets(){renderFacetList('#labels',countsBy('labels'),'label');renderFacetList('#creators',countsBy('creator'),'creator')}
function renderActive(){
  const xs=[]; if(state.query)xs.push(`search:${state.query}`); if(state.type)xs.push(`type:${state.type}`); if(state.status)xs.push(`status:${state.status}`); if(state.era)xs.push(`era:${state.era}`); if(state.label)xs.push(`label:${state.label}`); if(state.creator)xs.push(`creator:${state.creator}`); if(state.adultOnly)xs.push('adult metadata');
  $('#activeFilters').innerHTML=xs.map(x=>`<span class="filter-pill">${escapeHtml(x)}</span>`).join('');
}
function renderResults(){
  const rows=filtered();
  $('#results').innerHTML=rows.map(card).join('')||'<p class="empty">No records match the current filters.</p>';
  $('#results').querySelectorAll('[data-label]').forEach(el=>el.addEventListener('click',()=>{state.label=el.dataset.label;renderAll()}));
}
function card(r){
  const badges=[r.year??'undated',r.source_type,r.status,r.adult?'adult metadata':null].filter(Boolean).map(x=>`<span class="badge">${escapeHtml(String(x))}</span>`).join('');
  const archive=r.archive_url?`<a href="${safeUrl(r.archive_url)}" target="_blank" rel="noopener">Archive ↗</a>`:'';
  return `<article class="card"><div class="card-top">${badges}</div><h2>${escapeHtml(r.title)}</h2><p>${escapeHtml(r.description||'')}</p><dl class="grid-meta"><dt>Creator / subject</dt><dd>${escapeHtml(r.creator||'—')}</dd><dt>Provenance</dt><dd>${escapeHtml(r.provenance||'—')}</dd></dl><div class="tags">${(r.labels||[]).map(x=>`<span class="tag" data-label="${escapeAttr(x)}">${escapeHtml(x)}</span>`).join('')}</div><div class="links"><a href="${safeUrl(r.url)}" target="_blank" rel="noopener">Open source ↗</a>${archive}</div><div class="source-note">Status: ${escapeHtml(r.status||'unknown')}. This index records references and metadata; it does not package restricted media.</div></article>`;
}
function safeUrl(url){try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.href:'#'}catch{return '#'}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escapeAttr(s){return escapeHtml(s)}

$('#search').addEventListener('input',e=>{state.query=e.target.value;renderAll()});
$('#clearSearch').addEventListener('click',()=>{state.query='';$('#search').value='';renderAll()});
$('#type').addEventListener('change',e=>{state.type=e.target.value;renderAll()});
$('#status').addEventListener('change',e=>{state.status=e.target.value;renderAll()});
$('#era').addEventListener('change',e=>{state.era=e.target.value;renderAll()});
$('#adultOnly').addEventListener('change',e=>{state.adultOnly=e.target.checked;renderAll()});
$('#sort').addEventListener('change',e=>{state.sort=e.target.value;renderAll()});
load();
