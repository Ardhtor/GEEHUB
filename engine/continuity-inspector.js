(()=>{"use strict";
const root=document.getElementById("continuityInspector");if(!root)return;
const form=root.querySelector("#continuitySearch"),input=root.querySelector("#continuityQuery"),results=root.querySelector(".continuity-results"),summary=root.querySelector(".continuity-summary"),state=root.querySelector(".continuity-state");
const esc=value=>String(value??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const date=value=>{if(!value)return"DATE UNRECORDED";const d=new Date(value);return Number.isNaN(d.getTime())?"DATE UNRECORDED":d.toLocaleString()};
const kindLabel={passage:"WRITTEN PASSAGE",encounter:"ENCOUNTER",recording:"RECORDING",memory:"WORLD MEMORY",place:"PLACE"};
let activeQuery="";
async function trace(query){
 activeQuery=query;
 state.dataset.state="loading";state.textContent="TRACING / "+(query||"RECENT");
 results.innerHTML='<div class="continuity-empty">Following the records…</div>';
 try{
  const response=await fetch("/api/geehub/continuity?q="+encodeURIComponent(query)+"&limit=72",{cache:"no-store",headers:{accept:"application/json"}});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Continuity index unavailable");
  const totals=data.totals||{};
  summary.textContent=(totals.matches||0)+" MATCHES · "+(totals.passages||0)+" PASSAGES · "+(totals.encounters||0)+" ENCOUNTERS · "+(totals.recordings||0)+" RECORDINGS · "+(totals.memories||0)+" MEMORIES · "+(totals.places||0)+" PLACES";
  if(!data.results?.length){results.innerHTML='<div class="continuity-empty">No matching records. Try a person, place, relation, or stable artifact ID.</div>';state.dataset.state="empty";state.textContent="NO MATCH";return}
  const nodes=new Map(data.results.map(node=>[node.id,node]));
  const edges=new Map();for(const edge of data.links||[]){if(!edges.has(edge.from))edges.set(edge.from,[]);edges.get(edge.from).push(edge)}
  results.replaceChildren();
  for(const node of data.results){
   const article=document.createElement("article");article.className="continuity-record";article.dataset.kind=node.kind;
   const top=document.createElement("div");top.className="continuity-record-top";
   const kind=document.createElement("span");kind.className="continuity-kind";kind.textContent=kindLabel[node.kind]||String(node.kind||"RECORD").toUpperCase();
   const time=document.createElement("time");time.textContent=date(node.at);top.append(kind,time);
   const title=document.createElement("h3");title.textContent=node.title||node.id;
   const id=document.createElement("code");id.textContent=node.recordId||node.id;
   article.append(top,title,id);
   if(node.summary){const body=document.createElement("p");body.className="continuity-body";body.textContent=node.summary;article.append(body)}
   if(node.canon){const canon=document.createElement("span");canon.className="continuity-canon";canon.textContent="CANON / "+node.canon.toUpperCase();article.append(canon)}
   if(node.entities?.length){const tags=document.createElement("div");tags.className="continuity-entities";for(const entity of node.entities.slice(0,9)){const tag=document.createElement("span");tag.textContent=String(entity.type||"LINK").toUpperCase()+" / "+entity.value;tags.append(tag)}article.append(tags)}
   if(node.source||node.path){const safePath=Boolean(node.path&&!node.path.startsWith("/")&&!node.path.split("/").includes("..")&&!node.path.startsWith("http:")&&!node.path.startsWith("https:"));const source=document.createElement(safePath?"a":"div");source.className="continuity-source";source.textContent="SOURCE / "+(node.path||node.source);if(safePath){source.href="./"+node.path;source.target="_blank";source.rel="noopener noreferrer"}article.append(source)}
   const related=edges.get(node.id)||[];
   if(related.length){const nav=document.createElement("div");nav.className="continuity-links";for(const edge of related.slice(0,8)){const peer=nodes.get(edge.to);const button=document.createElement("button");button.type="button";button.dataset.trace=edge.targetId||edge.to;button.textContent=edge.label+" → "+(peer?.title||edge.to);nav.append(button)}article.append(nav)}
   results.append(article);
  }
  if(data.truncated){const note=document.createElement("div");note.className="continuity-truncated";note.textContent="Showing the first "+data.results.length+" records. Refine the search to follow a narrower thread.";results.append(note)}
  state.dataset.state="live";state.textContent="LINEAGE / "+data.results.length+" RECORDS";
 }catch(error){summary.textContent="The local continuity service did not return a usable index.";results.innerHTML='<div class="continuity-empty">'+esc(error.message||error)+'</div>';state.dataset.state="error";state.textContent="INDEX / UNAVAILABLE"}
}
form.addEventListener("submit",event=>{event.preventDefault();trace(input.value.trim())});
results.addEventListener("click",event=>{const button=event.target.closest("button[data-trace]");if(!button)return;input.value=button.dataset.trace;trace(button.dataset.trace)});
trace("");
})();