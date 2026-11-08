/* GEEHUB / LIVE INTERLOCUTOR
   Each generated utterance is applied to the shared scene before the next turn.
   Requires the local/server deployment described in server/README.md.
*/
(() => {
  const bus=window.GEEHUB_INTERACTION;
  if(!bus)return;
  const KEY="geehub-live-interlocutor-v1";
  const people=["teal-titan","joey","marcus","arthur"];
  const names={"teal-titan":"Teal Titan",joey:"Joey",marcus:"Marcus",arthur:"Arthur",luke:"Luke",tyler:"Tyler",andrew:"Andrew",joseph:"Joseph",chase:"Chase"};
  let restored={};try{restored=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}
  const state={busy:false,history:Array.isArray(restored.history)?restored.history.slice(-12):[],scene:restored.scene||{location:"The common room",event:"The men have gathered."},participants:Array.isArray(restored.participants)?restored.participants: [...people],lastSpeaker:restored.lastSpeaker||null,nextSpeaker:restored.nextSpeaker||null};
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let root;
  function mount(){
    const anchor=document.querySelector("#agentReactions")||document.querySelector("#sharedInteraction");
    if(!anchor)return;
    root=document.createElement("section");root.id="liveInterlocutor";root.className="live-interlocutor";
    root.innerHTML='<div class="live-interlocutor-head"><div><div class="eyebrow">GEEHUB / LIVE CONVERSATION</div><h2>THE ROOM CONTINUES</h2></div><span id="liveInterlocutorStatus">READY</span></div><div id="liveInterlocutorStream" aria-live="polite"><p>The next line will belong to the scene, not to a fixed reaction table.</p></div><button id="liveInterlocutorNext" type="button">CONTINUE THE CONVERSATION</button>';
    anchor.after(root);
    root.querySelector("#liveInterlocutorNext").addEventListener("click",()=>nextTurn());
  }
  function renderLine(item){
    const stream=root?.querySelector("#liveInterlocutorStream");if(!stream)return;
    const article=document.createElement("article");article.className="live-line";
    article.innerHTML='<strong>'+esc(names[item.speaker]||item.speaker)+'</strong><p>'+esc(item.utterance)+'</p><small>'+esc(item.emotional_tone||"")+'</small>';
    stream.append(article);
  }
  async function nextTurn(){
    if(state.busy||!root)return;
    state.busy=true;const button=root.querySelector("#liveInterlocutorNext"),status=root.querySelector("#liveInterlocutorStatus");
    button.disabled=true;status.textContent="IN THE SCENE";
    try{
      const response=await fetch("/api/geehub/turn",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scene:state.scene,history:state.history,participants:state.participants,preferredSpeaker:state.nextSpeaker})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"The live model is unavailable.");
      const item={speaker:result.speaker,utterance:result.utterance,emotional_tone:result.emotional_tone||"",consequence:result.consequence||"",at:result.generated_at};
      state.history.push(item);state.history=state.history.slice(-12);state.lastSpeaker=item.speaker;state.nextSpeaker=result.next_speaker||null;
      state.scene.event=item.consequence||item.utterance;
      state.scene.lastUtterance=item.utterance;
      renderLine(item);
      bus.emit({id:"dialogue-"+Date.now(),type:"UTTERANCE",from:item.speaker,to:result.next_speaker||"room",title:(names[item.speaker]||item.speaker)+" speaks",body:item.utterance,consequence:item.consequence,source:"live model",live:true});
      status.textContent="TURN "+state.history.length;
    }catch(error){status.textContent="MODEL OFFLINE";const stream=root.querySelector("#liveInterlocutorStream");const p=document.createElement("p");p.className="live-error";p.textContent=error.message;stream.append(p);}
    finally{state.busy=false;button.disabled=false;}
  }
  bus.on(event=>{
    if(!event||!["ENCOUNTER","OFFER","TRANSFORM","RETURN","MEMORY"].includes(event.type))return;
    state.scene={...state.scene,event:event.body||event.title||event.type,source:event.source||"GEEHUB"};
    if(Array.isArray(event.participants)&&event.participants.length)state.participants=event.participants.filter(id=>names[id]);
    if(root)root.querySelector("#liveInterlocutorStatus").textContent="NEW ENCOUNTER";
    nextTurn();
  });
  document.addEventListener("DOMContentLoaded",mount);
  window.GEEHUB_LIVE_INTERLOCUTOR={next:nextTurn,state:()=>JSON.parse(JSON.stringify(state))};
})();
