#!/usr/bin/env node
/**
 * GEEHUB live world server.
 * Serves the repository and exposes one bounded model-turn endpoint.
 * Run: OPENAI_API_KEY=... GEEHUB_MODEL=<responses-api-model> node server/geehub-server.mjs
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = process.env.GEEHUB_HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8788);
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.GEEHUB_MODEL || "";
const API_URL = process.env.GEEHUB_RESPONSES_URL || "https://api.openai.com/v1/responses";
const MAX_BODY = 48_000;
const MIME = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".md":"text/markdown; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp"};

const readOptional = async relative => {
  try { return (await readFile(path.join(ROOT, relative), "utf8")).slice(-12_000); }
  catch { return ""; }
};
const readFull = async relative => {
  try { return await readFile(path.join(ROOT, relative), "utf8"); }
  catch { return ""; }
};
const parseJson = (value, fallback={}) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
const send = (res, status, data, type="application/json; charset=utf-8") => {
  res.writeHead(status, {"content-type":type,"cache-control":"no-store","x-content-type-options":"nosniff"});
  res.end(type.startsWith("application/json") ? JSON.stringify(data) : data);
};
const bodyOf = req => new Promise((resolve,reject)=>{
  let raw="", size=0;
  req.on("data",chunk=>{size+=chunk.length;if(size>MAX_BODY){reject(new Error("Request too large"));req.destroy();return;}raw+=chunk;});
  req.on("end",()=>{try{resolve(JSON.parse(raw||"{}"));}catch{reject(new Error("Invalid JSON"));}});
  req.on("error",reject);
});
function safeString(value,max=4000){return typeof value==="string"?value.slice(0,max):"";}

async function generateTurn(input) {
  if(!API_KEY || !MODEL) throw new Error("Configure OPENAI_API_KEY and GEEHUB_MODEL on the server.");
  const [canon,profiles,world,agents,history,exchange,recording] = await Promise.all([
    readOptional("CANON.md"),
    readOptional("engine/voices/voice-profiles.json"),
    readOptional("hub/world-state.json"),
    readOptional("hub/agents.json"),
    readOptional("hub/agent-reaction-history.json")
  ]);
  const context = [
    "CANON\n"+canon,
    "VOICE STARTING POINTS (hypotheses, not rigid templates)\n"+profiles,
    "CURRENT WORLD\n"+world,
    "AGENTS\n"+agents,
    "RECENT CHARACTER HISTORY\n"+history,
    "LIVE SCENE\n"+JSON.stringify(input.scene),
    "RECENT EXCHANGE\n"+JSON.stringify(input.history)
  ].join("\n\n");
  const instructions = `You are the live interlocutor inside GEEHUB. Continue the actual scene as a participant, not as a narrator explaining the system. Write one natural utterance by the preferred_speaker when one is supplied; otherwise choose the participant whose response follows most naturally from the scene. Let their established voice, relationships, immediate surroundings, prior remarks, and current intention shape the line. Characters are adults. Joseph is Joey Prever in this fictional continuity; use the Joey voice hypothesis for participant id joseph. Do not flatten their voices into generic assistant prose. Profanity is permitted when it belongs naturally to the speaker and situation; do not force it. The utterance must respond to the preceding event and may change what happens next. Return only a JSON object with exactly: speaker (string), utterance (string), emotional_tone (string), consequence (string), next_speaker (string). consequence must state a concrete scene/relationship/world change or an empty string. next_speaker must be one of the supplied participants or empty string. Do not invent claims about real people or external actions.`;
  const payload = {model:MODEL,instructions,input:context,max_output_tokens:700,text:{format:{type:"json_object"}}};
  const response = await fetch(API_URL,{method:"POST",headers:{"authorization":"Bearer "+API_KEY,"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(90_000)});
  if(!response.ok) throw new Error("Model service returned HTTP "+response.status+": "+(await response.text()).slice(0,600));
  const data = await response.json();
  let text = data.output_text || (data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
  if(!text) throw new Error("Model returned no text.");
  const result=JSON.parse(text);
  if(!result || typeof result.utterance!=="string" || typeof result.speaker!=="string") throw new Error("Model response did not match the dialogue contract.");
  const allowed=new Set(input.participants);
  if(!allowed.has(result.speaker)) throw new Error("Model selected a speaker outside this scene.");
  if(input.preferredSpeaker && result.speaker!==input.preferredSpeaker) throw new Error("Model did not use the requested next speaker.");
  if(result.next_speaker && !allowed.has(result.next_speaker)) result.next_speaker="";
  return { ...result, generated_at:new Date().toISOString(), model:MODEL };
}

async function inscribeOccurrence(event) {
  const python = process.env.GEEHUB_PYTHON || (process.platform === "win32" ? "python" : "python3");
  return await new Promise((resolve,reject)=>{
    const child=spawn(python,["engine/inscription.py","hub-api"],{cwd:ROOT,stdio:["pipe","pipe","pipe"]});
    let stdout="",stderr="";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data",chunk=>stdout+=chunk);
    child.stderr.on("data",chunk=>stderr+=chunk);
    child.on("error",reject);
    child.on("close",code=>{
      let result; try { result=JSON.parse(stdout); } catch { return reject(new Error(stderr||"Inscription worker returned invalid output.")); }
      if(code!==0 || !result.ok) return reject(new Error(result.error||stderr||"Inscription failed."));
      resolve(result);
    });
    child.stdin.end(JSON.stringify(event));
  });
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,"http://"+req.headers.host);
  if(req.method==="GET" && url.pathname==="/api/geehub/health") return send(res,200,{ok:true,configured:Boolean(API_KEY&&MODEL),model:MODEL||null});
  if(req.method==="POST" && url.pathname==="/api/geehub/inscribe"){
    try{
      const input=await bodyOf(req);
      const event=input.event;
      if(!event || typeof event!=="object" || Array.isArray(event)) return send(res,400,{error:"An event object is required."});
      if(typeof event.id!=="string" || !event.id.trim()) return send(res,400,{error:"A stable event.id is required."});
      if(typeof event.at!=="string" || !Number.isFinite(Date.parse(event.at))) return send(res,400,{error:"A valid event.at timestamp is required."});
      if(typeof event.type!=="string" || !event.type.trim()) return send(res,400,{error:"A typed event.type is required."});
      const result=await inscribeOccurrence(event);
      return send(res,200,result);
    }catch(error){return send(res,error.message==="Invalid JSON"?400:500,{error:error.message||"Inscription failed"});}
  }
  if(req.method==="POST" && url.pathname==="/api/geehub/turn"){
    try{
      const input=await bodyOf(req);
      const participants=Array.isArray(input.participants)?input.participants.filter(x=>typeof x==="string").slice(0,8):[];
      if(!participants.length) return send(res,400,{error:"A scene needs at least one participant."});
      const result=await generateTurn({scene:input.scene||{},history:Array.isArray(input.history)?input.history.slice(-12):[],participants,preferredSpeaker:participants.includes(input.preferredSpeaker)?input.preferredSpeaker:""});
      return send(res,200,result);
    }catch(error){return send(res, error.message==="Invalid JSON"?400:502,{error:error.message||"Generation failed"});}
  }
  if(req.method!=="GET" && req.method!=="HEAD") return send(res,405,{error:"Method not allowed"});
  let relative=decodeURIComponent(url.pathname==="/" ? "/index.html" : url.pathname);
  const target=path.resolve(ROOT,"."+relative);
  if(target!==ROOT && !target.startsWith(ROOT+path.sep)) return send(res,403,{error:"Forbidden"});
  try{
    const info=await stat(target);if(!info.isFile())return send(res,404,{error:"Not found"});
    const data=await readFile(target);res.writeHead(200,{"content-type":MIME[path.extname(target)]||"application/octet-stream","cache-control":"no-cache","x-content-type-options":"nosniff"});
    if(req.method==="HEAD")return res.end();res.end(data);
  }catch{return send(res,404,{error:"Not found"});}
});
server.listen(PORT,HOST,()=>process.stdout.write("GEEHUB live server at http://"+HOST+":"+PORT+"\n"));
