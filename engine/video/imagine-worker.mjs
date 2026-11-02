#!/usr/bin/env node
// GEEHUB Imagine local worker. Requires Node 20+, FFmpeg on PATH, and XAI_API_KEY.
import http from "node:http";
import https from "node:https";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const PORT=Number(process.env.GEEHUB_IMAGINE_PORT||8787);
const API_KEY=process.env.XAI_API_KEY;
const ROOT=path.resolve(process.env.GEEHUB_DROPBOX_DIR||path.join(process.cwd(),"dropbox-output"));
const jobs=new Map();
const mime={"mp4":"video/mp4","json":"application/json"};
function send(res,code,data,type="application/json"){res.writeHead(code,{"Content-Type":type,"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"no-store"});res.end(type==="application/json"?JSON.stringify(data):data);}
function body(req){return new Promise((resolve,reject)=>{let s="",n=0;req.on("data",c=>{n+=c.length;if(n>12*1024*1024){reject(new Error("Request too large"));req.destroy();}else s+=c;});req.on("end",()=>{try{resolve(JSON.parse(s||"{}"));}catch{reject(new Error("Invalid JSON"));}});req.on("error",reject);});}
function slug(s){return String(s||"geehub-imagine").normalize("NFKD").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"geehub-imagine";}
async function requestXai(url,options={}){const r=await fetch(url,{...options,headers:{Authorization:"Bearer "+API_KEY,"Content-Type":"application/json",...(options.headers||{})}});const text=await r.text();let data;try{data=JSON.parse(text);}catch{data={error:text.slice(0,1000)};}if(!r.ok)throw new Error(data.error?.message||data.message||"xAI API returned "+r.status);return data;}
async function download(url,dest){await new Promise((resolve,reject)=>{const file=fs.open(dest,"w").then(async f=>{const response=await fetch(url);if(!response.ok)throw new Error("Could not download generated video: "+response.status);const buffer=Buffer.from(await response.arrayBuffer());await f.writeFile(buffer);await f.close();resolve();}).catch(reject);});}
function ffmpeg(input,output,aspect){const [aw,ah]=aspect.split(":").map(Number);let width=746,height=420;if(aw/ah<1){width=420;height=746;}if(aw===1&&ah===1){width=420;height=420;}if(aw===4&&ah===3){width=560;height=420;}const vf=`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`;return new Promise((resolve,reject)=>{const p=spawn("ffmpeg",["-y","-i",input,"-vf",vf,"-r","24","-c:v","libx264","-preset","veryfast","-crf","23","-c:a","aac","-b:a","96k","-movflags","+faststart",output],{stdio:["ignore","ignore","pipe"]});let err="";p.stderr.on("data",d=>err+=d.toString());p.on("error",reject);p.on("close",code=>code===0?resolve():reject(new Error("FFmpeg failed: "+err.slice(-1200))));});}
async function runJob(job,payload){
 try{
  job.status="generating";job.message="The model is creating motion and sound";
  const model="grok-imagine-video-1.5-lite";
  const request={model,prompt:payload.prompt||"Animate the supplied image with natural continuous movement",duration:6,aspect_ratio:payload.aspectRatio||"16:9",resolution:"480p",generate_audio:payload.generateAudio!==false};
  if(payload.mode==="image"&&payload.sourceImage){request.image={url:payload.sourceImage};}
  const started=await requestXai("https://api.x.ai/v1/videos/generations",{method:"POST",body:JSON.stringify(request)});
  job.providerRequestId=started.request_id;
  if(!job.providerRequestId)throw new Error("xAI did not return a request ID");
  let result;
  for(let i=0;i<180;i++){
   await new Promise(r=>setTimeout(r,4000));
   result=await requestXai("https://api.x.ai/v1/videos/"+encodeURIComponent(job.providerRequestId),{method:"GET"});
   if(result.status==="done")break;
   if(result.status==="failed")throw new Error(result.error?.message||"Provider generation failed");
   job.progress=Math.min(90,Math.round((i+1)/180*100));job.message="Generating frames and sound · "+(i+1)*4+" sec";
  }
  if(result?.status!=="done"||!result.video?.url)throw new Error("Generation timed out after 12 minutes");
  job.status="transcoding";job.message="Downloading source and making 420p MP4";
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),"geehub-imagine-"));
  const source=path.join(temp,"provider-480p.mp4"),out=path.join(temp,"master-420p.mp4");
  await download(result.video.url,source);
  await ffmpeg(source,out,payload.aspectRatio||"16:9");
  const date=new Date(),year=String(date.getUTCFullYear()),id=job.id;
  const title=slug(payload.prompt?.slice(0,52)||"image-animation");
  const folder=path.join(ROOT,"Creations","Video",year,title+"__"+id);
  await fs.mkdir(folder,{recursive:true});
  const filename=title+"-420p-6s.mp4",dest=path.join(folder,filename);
  await fs.copyFile(out,dest);
  const manifest={schema:"geehub.artifact/1",id,title:payload.prompt?.slice(0,240)||"Image animation",kind:"video",source:"GEEHUB Imagine Engine / "+model,created_at:job.createdAt,stored_at:new Date().toISOString(),duration_seconds:6,provider_resolution:"480p",output_resolution:"420p",aspect_ratio:payload.aspectRatio||"16:9",audio:payload.generateAudio!==false,provider_request_id:job.providerRequestId,prompt:payload.prompt,mode:payload.mode||"text",file:filename};
  await fs.writeFile(path.join(folder,"manifest.json"),JSON.stringify(manifest,null,2));
  job.status="done";job.progress=100;job.message="420p master ready";job.videoPath="/files/"+encodeURIComponent(id);job.filename=filename;job.filePath=dest;job.manifest=manifest;job.aspectRatio=payload.aspectRatio||"16:9";
  await fs.rm(temp,{recursive:true,force:true});
 }catch(e){job.status="failed";job.error=e.message;job.message="Generation stopped";}
}
const server=http.createServer(async(req,res)=>{
 if(req.method==="OPTIONS"){send(res,204,"");return;}
 const url=new URL(req.url,"http://127.0.0.1:"+PORT);
 try{
  if(req.method==="GET"&&url.pathname==="/health"){send(res,200,{ok:true,model:"grok-imagine-video-1.5-lite",duration:6,providerResolution:"480p",outputResolution:"420p",dropboxConfigured:!!process.env.GEEHUB_DROPBOX_DIR});return;}
  if(req.method==="POST"&&url.pathname==="/generate"){
   if(!API_KEY){send(res,503,{error:"Set XAI_API_KEY in your environment before starting the worker."});return;}
   const data=await body(req);if(!String(data.prompt||"").trim()&&!data.sourceImage){send(res,400,{error:"A prompt or first-frame image is required."});return;}
   if(data.sourceImage&&(!/^data:image\/(png|jpeg|webp);base64,/.test(data.sourceImage)||data.sourceImage.length>11*1024*1024)){send(res,400,{error:"Unsupported image or image exceeds 8 MB."});return;}
   const id=crypto.randomUUID(),job={id,status:"queued",progress:0,message:"Queued",createdAt:new Date().toISOString()};
   jobs.set(id,job);runJob(job,data);send(res,202,{jobId:id});return;
  }
  const jm=url.pathname.match(/^\/jobs\/([a-f0-9-]+)$/i);
  if(req.method==="GET"&&jm){const j=jobs.get(jm[1]);if(!j){send(res,404,{error:"Job not found"});return;}send(res,200,{jobId:j.id,status:j.status,progress:j.progress||0,message:j.message,error:j.error,videoPath:j.videoPath,filename:j.filename,aspectRatio:j.aspectRatio});return;}
  const fm=url.pathname.match(/^\/files\/([a-f0-9-]+)$/i);
  if(req.method==="GET"&&fm){const j=jobs.get(fm[1]);if(!j||j.status!=="done"){send(res,404,{error:"Video not found"});return;}const stream=(await import("node:fs")).createReadStream(j.filePath);res.writeHead(200,{"Content-Type":"video/mp4","Access-Control-Allow-Origin":"*","Content-Length":(await fs.stat(j.filePath)).size});stream.pipe(res);return;}
  send(res,404,{error:"Not found"});
 }catch(e){send(res,500,{error:e.message||"Worker error"});}
});
server.listen(PORT,"127.0.0.1",()=>console.log("GEEHUB Imagine worker listening on http://127.0.0.1:"+PORT+"\nOutput folder: "+ROOT));
