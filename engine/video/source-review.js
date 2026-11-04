(() => {
"use strict";
const $=id=>document.getElementById(id);
const video=$("sourceVideo");
let sourceFile=null,sourceUrl=null,report=null,frames=[];
const checkpoints=[0.02,0.2,0.38,0.56,0.74,0.94];
const fmt=n=>{const m=Math.floor(n/60),s=n%60;return String(m).padStart(2,"0")+":"+s.toFixed(2).padStart(5,"0");};
function meta(label,value){const el=document.createElement("div");el.className="meta";const s=document.createElement("small");s.textContent=label;const b=document.createElement("b");b.textContent=value;el.append(s,b);return el;}
$("projectId").value=new URLSearchParams(location.search).get("project")||"teal-titan-golds-on-5th";
$("sourceFile").addEventListener("change",()=>{
 const file=$("sourceFile").files?.[0];if(!file)return;
 sourceFile=file;if(sourceUrl)URL.revokeObjectURL(sourceUrl);
 sourceUrl=URL.createObjectURL(file);video.src=sourceUrl;video.load();
 $("reviewArea").hidden=false;
});
video.addEventListener("loadedmetadata",async()=>{
 const f=sourceFile;if(!f)return;
 const box=$("metadata");box.replaceChildren();
 [["FILE",f.name],["SIZE",(f.size/1048576).toFixed(2)+" MB"],["DURATION",fmt(video.duration)],["DIMENSIONS",video.videoWidth+" × "+video.videoHeight],["TYPE",f.type||"unknown"],["MODIFIED",new Date(f.lastModified).toLocaleString()],["PROJECT",$("projectId").value||"unassigned"],["SOURCE PATH",$("dropboxPath").value||"not entered"]].forEach(([a,b])=>box.append(meta(a,b)));
 await capture();
});
function seek(time){return new Promise((resolve,reject)=>{
 const done=()=>{video.removeEventListener("seeked",done);video.removeEventListener("error",fail);resolve();};
 const fail=()=>{video.removeEventListener("seeked",done);video.removeEventListener("error",fail);reject(new Error("Could not decode a selected frame."));};
 video.addEventListener("seeked",done,{once:true});video.addEventListener("error",fail,{once:true});
 video.currentTime=time;
 if(Math.abs(video.currentTime-time)<0.015&&!video.seeking)done();
 });}
async function capture(){
 if(!sourceFile||!Number.isFinite(video.duration)||video.duration<=0)return;
 const previous=video.currentTime;const wrap=$("frames");wrap.replaceChildren();frames=[];
 for(let i=0;i<checkpoints.length;i++){
  const time=Math.min(video.duration*.98,Math.max(0,video.duration*checkpoints[i]));
  try{
   await seek(time);
   const canvas=document.createElement("canvas");const w=480,h=Math.round(480*video.videoHeight/video.videoWidth);canvas.width=w;canvas.height=h;
   canvas.getContext("2d").drawImage(video,0,0,w,h);
   const data=canvas.toDataURL("image/jpeg",.78);
   const frame={index:i+1,time_seconds:Number(time.toFixed(3)),timecode:fmt(time),thumbnail_data_url:data};
   frames.push(frame);
   const card=document.createElement("button");card.type="button";card.className="frame";
   const img=document.createElement("img");img.src=data;img.alt="Source frame "+(i+1);
   const name=document.createElement("b");name.textContent="FRAME "+String(i+1).padStart(2,"0");
   const stamp=document.createElement("small");stamp.textContent=frame.timecode+" / "+frame.time_seconds.toFixed(3)+" SEC";
   card.append(img,name,stamp);card.addEventListener("click",()=>{video.currentTime=frame.time_seconds;video.play().catch(()=>{});});
   wrap.append(card);
  }catch(e){const note=document.createElement("div");note.className="meta";note.textContent="Frame "+(i+1)+" could not be decoded.";wrap.append(note);}
 }
 video.currentTime=previous;
 report=buildReport();
}
function buildReport(){
 if(!sourceFile)return null;
 return {
  schema:"geehub.source-review.v1",
  project_id:$("projectId").value.trim()||null,
  source:{filename:sourceFile.name,dropbox_path:$("dropboxPath").value.trim()||null,size_bytes:sourceFile.size,mime_type:sourceFile.type||null,last_modified:new Date(sourceFile.lastModified).toISOString(),duration_seconds:Number(video.duration.toFixed(3)),width:video.videoWidth,height:video.videoHeight,sha256:null,original_modified:false},
  review:{method:"browser-local-video-contact-sheet",frames_sampled:frames.length,frames:frames.map(({thumbnail_data_url,...rest})=>({...rest,thumbnail_data_url}))},
  limitations:["The browser file picker does not reveal the absolute local path; enter the Dropbox path manually if needed.","No SHA-256 is calculated by this browser-only review pass.","This tool samples frames and does not identify people or infer identity.","The original file is not uploaded, moved, renamed or modified."],
  next_step:"Select the matching source, record its Dropbox path, then stage a verified working copy for GEEHUB source analysis."
 };
}
$("captureFrames").addEventListener("click",capture);
$("downloadReport").addEventListener("click",()=>{
 report=buildReport();if(!report)return;
 const blob=new Blob([JSON.stringify(report,null,2)+"\n"],{type:"application/json"});
 const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=($("projectId").value||"geehub")+".source-review.json";a.click();URL.revokeObjectURL(url);
});
$("copyReport").addEventListener("click",async()=>{
 report=buildReport();if(!report)return;
 try{await navigator.clipboard.writeText(JSON.stringify(report,null,2));$("copyReport").textContent="COPIED";}catch{$("copyReport").textContent="CLIPBOARD UNAVAILABLE";}
});
window.addEventListener("beforeunload",()=>{if(sourceUrl)URL.revokeObjectURL(sourceUrl);});
})();