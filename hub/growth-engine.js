(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const STORE = "geehub-growth-passes";
  let projects = [];
  let passes = [];
  let initialized = false;

  function esc(value){
    return String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[ch]);
  }
  function readPasses(){
    try {
      const value = JSON.parse(localStorage.getItem(STORE) || "[]");
      return Array.isArray(value) ? value.filter(x => x && x.id && x.subject_id && x.change) : [];
    } catch { return []; }
  }
  function persist(){
    try {
      localStorage.setItem(STORE, JSON.stringify(passes.slice(0,100)));
      return true;
    } catch {
      setStatus("Browser storage is unavailable or full. Export this pass before leaving.", false);
      return false;
    }
  }
  function setStatus(message, good){
    const node=$("ge-status");
    node.textContent=message;
    node.dataset.state=good ? "good" : "note";
  }
  function populateSubjects(){
    const select=$("ge-subject");
    const sorted=projects.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    select.innerHTML='<option value="">Choose a project or subject…</option>'+sorted.map(p=>
      '<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+esc(p.status||"unclassified")+'</option>'
    ).join("");
    const preferred=sorted.find(p=>p.id==="universal-growth-engine")||sorted.find(p=>p.id==="growth");
    if(preferred) select.value=preferred.id;
  }
  function renderHistory(){
    const host=$("ge-history");
    const recent=passes.slice(0,6);
    $("ge-count").textContent=String(passes.length);
    host.innerHTML=recent.length ? recent.map(p=>
      '<article class="ge-history-item"><div class="ge-history-meta">'+esc(p.status)+' · '+esc(new Date(p.created_at).toLocaleString())+'</div>'+
      '<strong>'+esc(p.subject_name||p.subject_id)+'</strong><p>'+esc(p.change)+'</p>'+
      '<button type="button" class="btn ge-open-pass" data-pass="'+esc(p.id)+'">INSPECT PASS</button></article>'
    ).join("") : '<p class="muted">No growth passes recorded in this browser yet.</p>';
    host.querySelectorAll("[data-pass]").forEach(button=>{
      button.addEventListener("click",()=>{
        const pass=passes.find(x=>x.id===button.dataset.pass);
        if(!pass)return;
        $("ge-preview").hidden=false;
        $("ge-preview").textContent=JSON.stringify(pass,null,2);
        setStatus("Loaded a saved proposal. Its original source and parent state remain unchanged.",true);
      });
    });
  }
  function makePass(){
    const subject=projects.find(p=>p.id===$("ge-subject").value);
    const source=$("ge-source").value.trim();
    const encounter=$("ge-encounter").value.trim();
    const observed=$("ge-observed").value.trim();
    const interpretation=$("ge-interpretation").value.trim();
    const change=$("ge-change").value.trim();
    const nextAction=$("ge-next").value.trim();
    if(!subject || !source || !encounter || !observed || !change || !nextAction){
      setStatus("Choose a subject and complete source, encounter, observation, change, and next action.",false);
      return;
    }
    const createdAt=new Date().toISOString();
    const id="growth-pass-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
    const record={
      id,
      subject_id:subject.id,
      subject_name:subject.name,
      parent_state_id:$("ge-parent").value.trim() || null,
      source_ids:[source],
      encounter,
      observations:[{
        observation_id:"observation-"+id,
        locator:source,
        observed_text:observed
      }],
      research_refs:[],
      hypotheses:interpretation?[{
        statement:interpretation,
        confidence:"unassessed",
        alternatives:[],
        disconfirming_test:null
      }]:[],
      change,
      dimensions:[{
        name:"primary change",
        change_type:"adjust",
        before:null,
        after:change,
        unit:null,
        method:"user-authored bounded growth pass"
      }],
      result_state_id:null,
      review:{
        decision:"pending",
        comparison:"Proposal recorded; no resulting artifact has been reviewed or accepted yet.",
        limitations:["Proposed pass only. A produced result and review are still required."]
      },
      status:"proposed",
      created_at:createdAt,
      next_action:nextAction
    };
    passes=[record,...passes.filter(p=>p.id!==id)].slice(0,100);
    persist();
    $("ge-preview").hidden=false;
    $("ge-preview").textContent=JSON.stringify(record,null,2);
    renderHistory();
    setStatus("Proposal saved in this browser. Attempting inscription into the shared Tractus activity and artifact ledgers…",true);
    inscribe(record);
  }
  async function inscribe(record){
    const body=[
      "Encounter: "+record.encounter,
      "Observed evidence: "+record.observations[0].observed_text,
      record.hypotheses.length ? "Interpretation (unassessed): "+record.hypotheses[0].statement : "Interpretation: none supplied",
      "Proposed change: "+record.change,
      "Parent state: "+(record.parent_state_id||"not specified"),
      "Next action: "+record.next_action,
      "Growth-pass record: "+JSON.stringify(record)
    ].join("\n\n");
    const event={
      id:record.id,
      at:record.created_at,
      type:"OFFER",
      title:"Growth pass proposed — "+record.subject_name,
      body,
      artifact_kind:"growth-pass-proposal",
      source_nodes:[record.subject_id],
      next_action:record.next_action,
      growth_pass:record
    };
    try{
      const response=await fetch("/api/geehub/inscribe",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({event})
      });
      const result=await response.json();
      if(!response.ok || !result.ok) throw new Error(result.error||("HTTP "+response.status));
      setStatus("INSCRIBED · proposal entered the shared activity stream, artifact ledger, and outbox. It remains proposed, not canon.",true);
    }catch(error){
      setStatus("BROWSER-ONLY DRAFT · "+error.message+". Start the existing GEEHUB server to inscribe it into shared memory; export remains available.",false);
    }
  }
  function exportPasses(){
    const blob=new Blob([JSON.stringify({
      schema:"geehub-growth-pass-bundle/v1",
      exported_at:new Date().toISOString(),
      passes
    },null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;link.download="geehub-growth-passes.json";link.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);
    setStatus("Exported "+passes.length+" growth-pass records with their source and inheritance fields.",true);
  }
  function init(records){
    if(initialized || !Array.isArray(records))return;
    initialized=true;
    projects=records;
    passes=readPasses();
    populateSubjects();
    renderHistory();
    $("ge-run").addEventListener("click",makePass);
    $("ge-export").addEventListener("click",exportPasses);
    $("ge-subject").addEventListener("change",()=>{
      const p=projects.find(x=>x.id===$("ge-subject").value);
      if(p) $("ge-subject-meta").textContent=(p.group||p.kind||"project")+" · "+(p.status||"unclassified")+" · "+p.id;
    });
    const selected=projects.find(p=>p.id===$("ge-subject").value);
    if(selected)$("ge-subject-meta").textContent=(selected.group||selected.kind||"project")+" · "+selected.status+" · "+selected.id;
    setStatus("Ready. A proposal preserves its parent state and keeps evidence separate from interpretation.",true);
  }
  window.addEventListener("geehub:projects-loaded",event=>init(event.detail));
  if(Array.isArray(window.GEEHUB_PROJECTS))init(window.GEEHUB_PROJECTS);
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>{if(Array.isArray(window.GEEHUB_PROJECTS))init(window.GEEHUB_PROJECTS);});
  }
})();