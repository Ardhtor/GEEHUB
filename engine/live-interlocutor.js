/* GEEHUB / LIVE INTERLOCUTOR
   Model dialogue enters the shared event bus, is inscribed, and becomes a production artifact.
*/
(() => {
  const bus=window.GEEHUB_INTERACTION;
  if(!bus)return;
  const KEY="geehub-live-interlocutor-v1";
  const participants=["luke","tyler","andrew","joseph","chase","teal-titan","marcus","arthur"];
  const names={"luke":"Luke","tyler":"Tyler","andrew":"Andrew","joseph":"Joey","teal-titan":"Teal Titan","marcus":"Marcus","arthur":"Arthur"};
  let restored={};
  try{restored=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}
  const state={
    busy:false,
    history:Array.isArray(restored.history)?restored.history.slice(-12):[],
    scene:restored.scene||{event:"The men have gathered."},
    participants:[...new Set([...participants,...(Array.isArray(restored.participants)?restored.participants:[])])],
    lastSpeaker:restored.lastSpeaker||null,
    nextSpeaker:restored.nextSpeaker||null
  };
  let root=null;
  const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function saveSession(){
    try{localStorage.setItem(KEY,JSON.stringify({history:state.history,scene:state.scene,participants:state.participants,lastSpeaker:state.lastSpeaker,nextSpeaker:state.nextSpeaker}));}catch{}
  }
  function setStatus(value){
    const node=root?.querySelector("#liveInterlocutorStatus");
    if(node)node.textContent=value;
  }
  function renderLine(item){
    const stream=root?.querySelector("#liveInterlocutorStream");
    if(!stream)return;
    const article=document.createElement("article");
    article.className="live-line";
    const speaker=document.createElement("strong");
    speaker.textContent=names[item.speaker]||item.speaker;
    const line=document.createElement("p");
    line.textContent=item.utterance;
    const meta=document.createElement("small");
    meta.textContent=[item.emotional_tone,item.inscription==="durable"?"INSCRIBED":item.inscription==="local-only"?"LOCAL COPY":""].filter(Boolean).join(" / ");
    article.append(speaker,line,meta);
    stream.append(article);
  }
  function mount(){
    const anchor=document.querySelector("#agentReactions")||document.querySelector("#sharedInteraction");
    if(!anchor)return;
    root=document.createElement("section");
    root.id="liveInterlocutor";
    root.className="live-interlocutor";
    root.innerHTML='<div class="live-interlocutor-head"><div><div class="eyebrow">GEEHUB / LIVE CONVERSATION</div><h2>THE ROOM CONTINUES</h2></div><span id="liveInterlocutorStatus">READY</span></div><div id="liveInterlocutorStream" aria-live="polite"></div><button id="liveInterlocutorNext" type="button">CONTINUE THE CONVERSATION</button>';
    anchor.after(root);
    root.querySelector("#liveInterlocutorNext").addEventListener("click",()=>nextTurn());
    state.history.forEach(renderLine);
    void checkHealth();
    if(!state.history.length){
      const intro=document.createElement("p");
      intro.textContent="The next line will belong to the scene, not to a fixed reaction table.";
      root.querySelector("#liveInterlocutorStream").append(intro);
    }
  }
  async function inscribe(item,result){
    const event={
      id:"dialogue-"+Date.now()+"-"+item.speaker,
      at:item.at||new Date().toISOString(),
      type:"UTTERANCE",
      artifact_kind:"dialogue",
      from:item.speaker,
      to:result.next_speaker||"room",
      title:(names[item.speaker]||item.speaker)+" speaks",
      body:item.utterance,
      utterance:item.utterance,
      emotional_tone:item.emotional_tone,
      consequence:item.consequence,
      source:"GEEHUB live model",
      live:true,
      scene:state.scene
    };
    item.eventId=event.id;
    saveSession();
    bus.emit(event);
    try{
      const response=await fetch("/api/geehub/inscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event})});
      const receipt=await response.json();
      if(!response.ok||!receipt.ok)throw new Error(receipt.error||"Inscription failed");
      item.inscription="durable";
      const artifact=window.GEEHUB_ARTIFACTS?.emit?.({
        type:"dialogue",
        title:event.title,
        body:event.body,
        source:"GEEHUB live model",
        lineage:{event_id:event.id,speaker:item.speaker,scene:state.scene},
        canon:"unclassified",
        dreamable:true,
        quietness:"high"
      });
      if(artifact)window.dispatchEvent(new CustomEvent("geehub:artifact-created",{detail:artifact}));
      setStatus("INSCRIBED / TURN "+state.history.length);
    }catch(error){
      item.inscription="local-only";
      setStatus("LOCAL ONLY / "+error.message);
    }
    saveSession();
    const last=root?.querySelector(".live-line:last-child small");
    if(last)last.textContent=[item.emotional_tone,item.inscription==="durable"?"INSCRIBED":"LOCAL COPY"].filter(Boolean).join(" / ");
  }
  async function nextTurn(){
    if(state.busy||!root)return;
    state.busy=true;
    const button=root.querySelector("#liveInterlocutorNext");
    button.disabled=true;
    setStatus("IN THE SCENE");
    try{
      const response=await fetch("/api/geehub/turn",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({scene:state.scene,history:state.history,participants:state.participants,preferredSpeaker:state.nextSpeaker})
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"The live model is unavailable.");
      const item={
        speaker:result.speaker,
        utterance:result.utterance,
        emotional_tone:result.emotional_tone||"",
        consequence:result.consequence||"",
        at:result.generated_at||new Date().toISOString(),
        inscription:"pending"
      };
      state.history.push(item);
      state.history=state.history.slice(-12);
      state.lastSpeaker=item.speaker;
      state.nextSpeaker=result.next_speaker||null;
      state.scene={...state.scene,event:item.consequence||item.utterance,lastUtterance:item.utterance};
      saveSession();
      renderLine(item);
      setStatus("TURN "+state.history.length+" / INSCRIBING");
      void inscribe(item,result);
    }catch(error){
      setStatus("MODEL OFFLINE");
      const message=document.createElement("p");
      message.className="live-error";
      message.textContent=error.message;
      root.querySelector("#liveInterlocutorStream").append(message);
    }finally{
      state.busy=false;
      button.disabled=false;
    }
  }
  bus.on(event=>{
    if(!event)return;
    if(event.type==="UTTERANCE"){
      if(event.inscription_source!=="hub-api"||state.history.some(item=>item.eventId===event.id))return;
      const item={eventId:event.id,speaker:event.from,utterance:event.utterance||event.body||"",emotional_tone:event.emotional_tone||"",consequence:event.consequence||"",at:event.at,inscription:"durable"};
      state.history.push(item);state.history=state.history.slice(-12);
      state.lastSpeaker=item.speaker;
      state.nextSpeaker=names[event.to]?event.to:null;
      state.scene={...state.scene,event:item.consequence||item.utterance,lastUtterance:item.utterance};
      saveSession();renderLine(item);
      setStatus("REMOTE TURN / RECEIVED");
      if(state.nextSpeaker)void nextTurn();
      return;
    }
    if(!["NOTICE","ENCOUNTER","OFFER","TRANSFORM","RETURN","MEMORY"].includes(event.type))return;
    state.scene={...state.scene,event:event.body||event.title||event.type,source:event.source||"GEEHUB",regionId:event.regionId||state.scene.regionId};
    if(Array.isArray(event.participants)&&event.participants.length)state.participants=event.participants.filter(id=>names[id]);
    if(names[event.to])state.nextSpeaker=event.to;
    saveSession();
    setStatus("NEW ENCOUNTER");
    void nextTurn();
  });
  async function checkHealth(){
    try{
      const response=await fetch("/api/geehub/health",{cache:"no-store"});
      if(!response.ok)throw new Error("Local runtime unavailable");
      const health=await response.json();
      setStatus(health.configured?"MODEL READY / "+(health.model||"CONNECTED"):"SERVER READY / MODEL NOT CONFIGURED");
    }catch{setStatus("LOCAL RUNTIME NOT CONNECTED");}
  }
  async function seedWorldScene(){
    if(restored.scene)return;
    try{
      const response=await fetch("./hub/world-state.json?ts="+Date.now(),{cache:"no-store"});
      if(!response.ok)return;
      const world=await response.json();
      const encounter=world.activeEncounter||{};
      state.scene={...state.scene,location:encounter.regionName||"The common room",activeEncounter:encounter,intent:encounter.intent||"",continuity:encounter.continuity||[],latestDelta:encounter.delta||[],recording:world.activeRecording||null};
      saveSession();
    }catch{}
  }
  document.addEventListener("DOMContentLoaded",()=>{mount();void seedWorldScene();});
  window.GEEHUB_LIVE_INTERLOCUTOR={next:nextTurn,state:()=>JSON.parse(JSON.stringify(state))};
})();
