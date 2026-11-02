(() => {
"use strict";
const $=id=>document.getElementById(id);
const API="http://127.0.0.1:8787";
let mode="text", sourceData=null, activeJob=null, finalBlob=null, finalUrl=null, startAt=0;
const history=[];
function status(message){$("jobStatus").textContent=message;}
function workerState(ok,message){$("workerLight").classList.toggle("online",ok);$("workerStatus").textContent=message;}
function overlay(show,title="BUILDING THE SHOT",message="Preparing generation",progress=5){$("renderOverlay").hidden=!show;$("renderTitle").textContent=title;$("renderMessage").textContent=message;$("renderProgress").style.width=progress+"%";}
async function checkWorker(){try{const r=await fetch(API+"/health",{cache:"no-store"});if(!r.ok)throw new Error("offline");const d=await r.json();workerState(true,d.dropboxConfigured?"LOCAL WORKER / DROPBOX READY":"LOCAL WORKER / LOCAL EXPORT");status("READY · LOCAL GENERATOR CONNECTED");}catch{workerState(false,"LOCAL WORKER OFFLINE");status("START THE LOCAL IMAGINE WORKER TO GENERATE");}}
document.querySelectorAll(".mode").forEach(button=>button.addEventListener("click",()=>{mode=button.dataset.mode;document.querySelectorAll(".mode").forEach(b=>b.classList.toggle("active",b===button));$("imageDrop").hidden=mode!=="image";}));
$("sourceImage").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>8*1024*1024){status("IMAGE TOO LARGE · MAXIMUM 8 MB");e.target.value="";return;}sourceData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});$("sourcePreview").src=sourceData;$("sourcePreview").hidden=false;$("removeImage").hidden=false;document.querySelector(".image-drop-inner").hidden=true;});
$("removeImage").addEventListener("click",()=>{sourceData=null;$("sourceImage").value="";$("sourcePreview").hidden=true;$("removeImage").hidden=true;document.querySelector(".image-drop-inner").hidden=false;});
$("aspect").addEventListener("change",()=>{$("stageMeta").textContent=$("aspect").value+" / 420P / 06 SEC";$("stageScreen").style.aspectRatio=$("aspect").value.replace(":","/");});
function slug(s){return (s||"geehub-imagine").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"geehub-imagine";}
async function generate(){
 const prompt=$("prompt").value.trim();if(!prompt&&!sourceData){status("ADD A SHOT DESCRIPTION OR FIRST FRAME");return;}
 $("generate").disabled=true;$("resultActions").hidden=true;$("stagePlaceholder").hidden=true;$("resultVideo").hidden=true;overlay(true,"STARTING GENERATION","Sending six-second shot request",8);startAt=Date.now();status("SUBMITTING / IMAGINE 1.5 LITE");
 try{
  const payload={prompt,mode,sourceImage:sourceData,aspectRatio:$("aspect").value,duration:6,resolution:"480p",generateAudio:$("audio").checked};
  const response=await fetch(API+"/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Generation request failed");
  activeJob=data.jobId;status("GENERATING / "+activeJob.slice(0,8).toUpperCase());await poll(activeJob);
 }catch(error){overlay(false);$("stagePlaceholder").hidden=false;status(error.message||"GENERATION FAILED");}
 finally{$("generate").disabled=false;}
}
async function poll(id){
 let delay=3500;
 while(true){
  await new Promise(resolve=>setTimeout(resolve,delay));
  const response=await fetch(API+"/jobs/"+encodeURIComponent(id),{cache:"no-store"});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not read generation status");
  const p=Math.min(84,12+(data.progress||0)*.72);
  overlay(true,data.status==="transcoding"?"FINISHING THE 420P MASTER":"GENERATING THE SHOT",data.message||"The model is building motion",p);
  status((data.status||"working").toUpperCase()+" · "+Math.round((Date.now()-startAt)/1000)+" SEC");
  if(data.status==="done"){await showResult(data);return;}
  if(data.status==="failed")throw new Error(data.error||"Video generation failed");
  delay=5000;
 }
}
async function showResult(data){
 overlay(false);finalUrl=API+data.videoPath;const r=await fetch(finalUrl);if(!r.ok)throw new Error("Finished video could not be downloaded");finalBlob=await r.blob();
 $("resultVideo").src=URL.createObjectURL(finalBlob);$("resultVideo").hidden=false;$("stagePlaceholder").hidden=true;
 $("downloadVideo").href=URL.createObjectURL(finalBlob);$("downloadVideo").download=data.filename||"geehub-imagine-420p.mp4";
 $("resultActions").hidden=false;$("jobTime").textContent=((Date.now()-startAt)/1000).toFixed(0)+" SEC";status("READY · 420P MP4 / 6 SECONDS");
 const item={id:data.jobId,title:$("prompt").value.trim().slice(0,68)||"Image animation",filename:data.filename,videoUrl:finalUrl,createdAt:new Date().toISOString(),blob:finalBlob};
 history.unshift(item);renderHistory();
 if(window.GEEHUB_PRODUCTION?.publish){window.GEEHUB_PRODUCTION.publish({id:data.jobId,title:item.title,kind:"video",blob:finalBlob,filename:item.filename,source:"GEEHUB Imagine Engine",lineage:{mode,aspectRatio:$("aspect").value,model:"grok-imagine-video-1.5-lite"},simulation_state:{duration:6,output:"420p",providerRender:"480p",generateAudio:$("audio").checked,prompt:$("prompt").value},canon:"experiment"}).catch(()=>{});}
}
function renderHistory(){$("historyCount").textContent=history.length+" CLIP"+(history.length===1?"":"S");$("historyList").innerHTML="";history.forEach(item=>{const card=document.createElement("button");card.className="history-card";card.type="button";const v=document.createElement("video");v.src=item.videoUrl;v.muted=true;v.preload="metadata";const b=document.createElement("b");b.textContent=item.title||"Untitled";const sm=document.createElement("small");sm.textContent="420P · 00:06";card.append(v,b,sm);card.addEventListener("click",()=>{ $("resultVideo").src=item.videoUrl;$("resultVideo").hidden=false;$("stagePlaceholder").hidden=true;finalBlob=item.blob;finalUrl=item.videoUrl;$("resultActions").hidden=false;$("downloadVideo").href=URL.createObjectURL(item.blob);$("downloadVideo").download=item.filename;});$("historyList").append(card);});}
$("generate").addEventListener("click",generate);
$("newShot").addEventListener("click",()=>{$("prompt").focus();$("resultActions").hidden=true;status("READY FOR ANOTHER SHOT");});
$("saveProduct").addEventListener("click",async()=>{if(!finalBlob)return;try{await window.GEEHUB_PRODUCTION?.publish({id:activeJob||("imagine-save-"+Date.now()),title:$("prompt").value.trim().slice(0,68)||"Imagine video",kind:"video",blob:finalBlob,filename:"geehub-imagine-420p.mp4",source:"GEEHUB Imagine Engine",canon:"experiment",simulation_state:{duration:6,output:"420p",prompt:$("prompt").value}});status("PRODUCT ADDED TO GEEHUB OUTBOX");}catch(e){status("SAVE QUEUED LOCALLY · "+e.message);}});
checkWorker();
})();