#!/usr/bin/env node
/**
 * GEEHUB live world server.
 * Serves the repository and exposes one bounded model-turn endpoint.
 * Run: OPENAI_API_KEY=... GEEHUB_MODEL=<responses-api-model> node server/geehub-server.mjs
 */
import http from "node:http";
import os from "node:os";
import { spawn } from "node:child_process";
import { readFile, stat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = process.env.GEEHUB_HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8788);
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.GEEHUB_MODEL || "";
const API_URL = process.env.GEEHUB_RESPONSES_URL || "https://api.openai.com/v1/responses";
const MAX_BODY = 48_000;
const PARTICIPANTS = new Set(["luke","tyler","andrew","joseph","chase","teal-titan","marcus","arthur"]);
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
async function generateTurn(input) {
  if(!API_KEY || !MODEL) throw new Error("Configure OPENAI_API_KEY and GEEHUB_MODEL on the server.");
  const [canon,fictionMemory,relationshipCanon,profiles,worldRaw,agents,reactionHistory,history,socialSpace,tealTitanLineage,exchangeRaw,mapRaw] = await Promise.all([
    readOptional("CANON.md"),
    readOptional("docs/FICTION_MEMORY.md"),
    readOptional("novel/RELATIONSHIP_CANON.md"),
    readOptional("engine/voices/voice-profiles.json"),
    readFull("hub/world-state.json"),
    readOptional("hub/agents.json"),
    readOptional("hub/agent-reaction-history.json"),
    readOptional("engine/activity.jsonl"),
    readOptional("hub/social-cyberspace.json"),
    readOptional("research/relationships/TEAL_TITAN_LINEAGE.json"),
    readFull("hub/exchange.json"),
    readFull("hub/spatial-world.json")
  ]);
  const worldState=parseJson(worldRaw);
  const exchangeData=parseJson(exchangeRaw);
  const recentExchange=JSON.stringify({events:(exchangeData.events||[]).slice(0,10)});
  const map=parseJson(mapRaw);
  const recordingRef=String(worldState.activeRecording||"").replace(/^\.\/?/,"");
  const recording=recordingRef && !recordingRef.split("/").includes("..")
    ? await readOptional("hub/"+recordingRef) : "";
  const context = [
    "CANON\n"+canon,
    "FICTION MEMORY\n"+fictionMemory,
    "RELATIONSHIP CANON\n"+relationshipCanon,
    "VOICE STARTING POINTS (hypotheses, not rigid templates)\n"+profiles,
    "CURRENT WORLD STATE\n"+JSON.stringify(worldState),
    "PERSISTENT SPATIAL MAP\n"+JSON.stringify(map),
    "ACTIVE RECORDING\n"+recording,
    "AGENTS\n"+agents,
    "RECENT AGENT REACTION HISTORY\n"+reactionHistory,
    "SOCIAL CYBERSPACE / CONNECTION STATUS\n"+socialSpace,
    "TEAL TITAN LINEAGE / CREATIVE BOUNDARIES\n"+tealTitanLineage,
    "RECENT INSCRIBED ACTIVITY\n"+history,
    "SHARED EXCHANGE LEDGER (newest entries)\n"+recentExchange,
    "LIVE SCENE\n"+JSON.stringify(input.scene),
    "RECENT GENERATED DIALOGUE\n"+JSON.stringify(input.history)
  ].join("\n\n");
  const instructions = `You are the live interlocutor inside GEEHUB. Continue the actual scene as a participant, not as a narrator explaining the system. Write one natural utterance by preferred_speaker when supplied; otherwise choose the participant whose response follows most naturally. Let established voice, relationships, immediate surroundings, prior remarks, current intention, and the actual persistent map shape the line. Characters are fictional adults. Joseph is Joey Prever in this continuity; use the Joey voice hypothesis for participant id joseph. Voices are evolving hypotheses, not rigid templates. Profanity is permitted when natural to the speaker and situation; do not force it. The utterance must respond to the preceding event and may change what happens next. Return only a JSON object with exactly: speaker, utterance, emotional_tone, consequence, next_speaker. All values are strings. consequence must describe a concrete scene, relationship, or world change, or be empty. next_speaker must be one of the supplied participants or empty. Do not claim that an external production job completed unless the scene explicitly contains a verified result.`;
  const payload = {model:MODEL,instructions,input:context,max_output_tokens:700,text:{format:{type:"json_object"}}};
  const response = await fetch(API_URL,{method:"POST",headers:{"authorization":"Bearer "+API_KEY,"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(90_000)});
  if(!response.ok) throw new Error("Model service returned HTTP "+response.status+": "+(await response.text()).slice(0,600));
  const data = await response.json();
  let output = data.output_text || (data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
  if(!output) throw new Error("Model returned no text.");
  const result=JSON.parse(output);
  if(!result || ["speaker","utterance","emotional_tone","consequence","next_speaker"].some(key=>typeof result[key]!=="string")) throw new Error("Model response did not match the dialogue contract.");
  if(result.utterance.length>1800 || result.consequence.length>1200) throw new Error("Model response exceeded the dialogue size limits.");
  const allowed=new Set(input.participants);
  if(!allowed.has(result.speaker)) throw new Error("Model selected a speaker outside this scene.");
  if(input.preferredSpeaker && result.speaker!==input.preferredSpeaker) throw new Error("Model did not use the requested next speaker.");
  if(result.next_speaker && !allowed.has(result.next_speaker)) result.next_speaker="";
  return { ...result, generated_at:new Date().toISOString(), model:MODEL };
}

function continuityEntities(value, prefix="") {
  const found=[];
  const add=(type,item)=>{if(typeof item==="string"&&item.trim())found.push({type,value:item.trim(),key:type+":"+item.trim().toLowerCase()});};
  if(!value||typeof value!=="object")return found;
  for(const key of ["agent","actor","to","from"]){add("person",value[key]);}
  for(const key of ["regionId","previousRegionId","region_id","previous_region_id","region","world"]){add("place",value[key]);}
  for(const key of ["relation","story","chapter"]){add(key,value[key]);}
  for(const key of ["source","inscription_source"]){add("source",value[key]);}
  if(Array.isArray(value.characters))value.characters.forEach(x=>add("person",x));
  if(Array.isArray(value.participants))value.participants.forEach(x=>add("person",x));
  if(Array.isArray(value.anchors))value.anchors.forEach(x=>{if(x?.id)add("place",x.id);if(x?.name)add("place",x.name);if(x?.title)add("relation",x.title);});
  if(value.lineage&&typeof value.lineage==="object")found.push(...continuityEntities(value.lineage,"lineage."));
  if(value.subject&&typeof value.subject==="object")found.push(...continuityEntities(value.subject,"subject."));
  if(value.environment&&typeof value.environment==="object")found.push(...continuityEntities(value.environment,"environment."));
  return found.filter((item,index,array)=>array.findIndex(other=>other.key===item.key)===index);
}
async function buildContinuityIndex(query, requestedLimit=48) {
  const [artifactRaw,exchangeRaw,worldRaw,activityRaw,worldStateRaw,spatialRaw,recordingFiles]=await Promise.all([
    readFull("artifacts/index.json"),readFull("hub/exchange.json"),readFull("world.json"),
    readFull("engine/activity.jsonl"),readFull("hub/world-state.json"),readFull("hub/spatial-world.json"),
    readdir(path.join(ROOT,"hub/recordings")).catch(()=>[])
  ]);
  const artifacts=parseJson(artifactRaw,{artifacts:[]}).artifacts||[];
  const events=parseJson(exchangeRaw,{events:[]}).events||[];
  const world=parseJson(worldRaw,{regions:[]});
  const worldState=parseJson(worldStateRaw,{});
  const spatial=parseJson(spatialRaw,{regions:[],routes:[]});
  const activity=activityRaw.split(/\r?\n/).filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}});
  const nodes=[];
  const add=(kind,item)=>{
    if(!item||typeof item!=="object")return;
    const recordId=String(item.id||item.artifact||kind+"-"+nodes.length);
    const at=item.at||item.occurred_at||item.timestamp||item.created_at||item.time||"";
    const summary=String(item.body||item.content||item.description||item.intent||item.continuity||"").slice(0,520);
    const entities=continuityEntities(item);
    const lineage=item.lineage&&typeof item.lineage==="object"?item.lineage:{};
    const subject=item.subject&&typeof item.subject==="object"?item.subject:{};
    const environment=item.environment&&typeof item.environment==="object"?item.environment:{};
    const details={
      agent:subject.agent||item.agent||item.actor||item.to||lineage.actor||"",
      scale:subject.scale??lineage.scaleBaselineTo??null,
      previousScale:subject.priorScale??lineage.scaleBaselineFrom??null,
      regionId:item.regionId||lineage.regionId||lineage.region_id||"",
      previousRegionId:item.previousRegionId||lineage.previousRegionId||"",
      relation:environment.relation||item.relation||lineage.relation||"",
      deltas:Array.isArray(item.deltas)?item.deltas.slice(0,12):[]
    };
    nodes.push({id:kind+":"+recordId,recordId,kind,type:String(item.type||item.kind||""),title:String(item.title||item.name||item.intent||recordId),at,summary,source:String(lineage.source||item.source||item.inscription_source||item.path||""),canon:String(item.canon||""),continuity:String(item.continuity||item.production_note||item.next_action||""),path:String(item.path||lineage.source||""),entities,details,artifactRef:String(item.artifact||"")});
  };
  artifacts.forEach(item=>add("passage",item));
  events.forEach(item=>add("encounter",item));
  activity.forEach(item=>add("memory",item));
  const recordingData=await Promise.all(recordingFiles.filter(name=>/^[A-Za-z0-9._-]+\.json$/.test(name)).map(async file=>({file,item:parseJson(await readFull("hub/recordings/"+file),null)})));
  for(const {file,item} of recordingData){if(item)add("recording",{...item,title:item.intent||item.id,at:item.timestamp,source:"hub/recordings/"+file,path:"hub/recordings/"+file});}
  (world.regions||[]).forEach(region=>{
    const mapped=(spatial.regions||[]).find(item=>item.id===region.id)||{};
    nodes.push({id:"place:"+region.id,recordId:region.id,kind:"place",title:region.name||region.id,at:"",summary:region.description||"",source:region.path||"",canon:"",continuity:"",path:region.path||"",entities:[{type:"place",value:region.id,key:"place:"+region.id.toLowerCase()},{type:"place",value:region.name||region.id,key:"place:"+(region.name||region.id).toLowerCase()}],details:{regionId:region.id,x:mapped.x??region.x??null,y:mapped.y??region.y??null,kind:region.kind||"",coordinates:mapped.x!=null&&mapped.y!=null?mapped.x+", "+mapped.y:""},artifactRef:""});
  });
  const active=worldState.activeEncounter||{};
  if(active.regionId||worldState.activeRecording){
    nodes.push({id:"state:current-world",recordId:worldState.id||"geehub-current-world-state",kind:"state",title:"CURRENT WORLD STATE",at:worldState.snapshot||"",summary:String(active.intent||worldState.interpretation||"Current world state"),source:"hub/world-state.json",canon:"live",continuity:Array.isArray(active.continuity)?active.continuity.join(" · "):"",path:"hub/world-state.json",entities:continuityEntities({agent:active.subject?.agent,regionId:active.regionId,previousRegionId:active.previousRegionId,relation:active.relation}),details:{agent:active.subject?.agent||"",scale:active.subject?.scale??null,regionId:active.regionId||"",previousRegionId:active.previousRegionId||"",relation:active.relation||"",recording:String(worldState.activeRecording||"")},artifactRef:String(worldState.activeRecording||"").split("/").pop()?.replace(/\.json$/,"")||""});
  }
  const entityNodes=new Map();
  for(const node of nodes){
    for(const entity of node.entities||[]){
      if(!entityNodes.has(entity.key)){
        const kind=entity.type==="person"?"identity":entity.type==="place"?"place":entity.type==="relation"?"relation":"concept";
        entityNodes.set(entity.key,{id:"entity:"+entity.key,recordId:entity.value,kind,title:entity.value,at:"",summary:"Shared "+entity.type+" thread",source:"",canon:"",continuity:"",path:"",entities:[entity],details:{entityType:entity.type},artifactRef:""});
      }
    }
  }
  const entities=[...entityNodes.values()];
  nodes.push(...entities);
  const placeIds=new Set(nodes.filter(node=>node.kind==="place").map(node=>node.recordId));
  const mapRoutes=(spatial.routes||[]).filter(route=>Array.isArray(route)&&route.length===2&&placeIds.has(route[0])&&placeIds.has(route[1]));
  const needle=String(query||"").trim().toLowerCase();
  const limit=Math.min(100,Math.max(8,Number(requestedLimit)||48));
  const matches=needle
    ? nodes.filter(node=>([node.id,node.recordId,node.artifactRef,node.title,node.summary,node.source,node.canon,node.path,node.continuity].join(" ")+" "+(node.entities||[]).map(x=>x.value).join(" ")).toLowerCase().includes(needle))
    : nodes.filter(node=>node.kind==="encounter"||node.kind==="recording"||node.kind==="passage"||node.kind==="state").sort((a,b)=>Date.parse(b.at||0)-Date.parse(a.at||0)).slice(0,16);
  matches.sort((a,b)=>Date.parse(b.at||0)-Date.parse(a.at||0));
  const selected=matches.slice(0,limit);
  const selectedIds=new Set(selected.map(node=>node.id));
  const links=[];
  const nodeById=new Map(nodes.map(node=>[node.id,node]));
  const linkKeys=new Set();
  const addLink=(from,to,label)=>{const key=from+"\u0000"+to;if(from!==to&&!linkKeys.has(key)){linkKeys.add(key);const target=nodeById.get(to);links.push({from,to,targetId:target?.recordId||to,label});}};
  const recordingById=new Map(nodes.filter(node=>node.kind==="recording").map(node=>[node.recordId,node]));
  const eventByArtifact=new Map(events.filter(event=>event.artifact).map(event=>[event.artifact,event]));
  for(const node of selected){
    for(const entity of node.entities||[]){
      const entityNode=entityNodes.get(entity.key);
      if(entityNode)addLink(node.id,entityNode.id,entity.type+": "+entity.value);
    }
    if(node.artifactRef&&recordingById.has(node.artifactRef))addLink(node.id,recordingById.get(node.artifactRef).id,"recorded as");
    if(node.kind==="recording"){
      const event=eventByArtifact.get(node.recordId);
      if(event)addLink(node.id,"encounter:"+event.id,"inscribed as");
      const previous=node.details?.previousRegionId,current=node.details?.regionId;
      if(previous&&placeIds.has(previous))addLink(node.id,"place:"+previous,"from");
      if(current&&placeIds.has(current))addLink(node.id,"place:"+current,"to");
    }
    if(node.kind==="encounter"){
      const event=events.find(item=>item.id===node.recordId);
      if(event?.artifact&&recordingById.has(event.artifact))addLink(node.id,recordingById.get(event.artifact).id,"recorded in");
      if(event?.previousRegionId&&placeIds.has(event.previousRegionId))addLink(node.id,"place:"+event.previousRegionId,"from");
      if(event?.regionId&&placeIds.has(event.regionId))addLink(node.id,"place:"+event.regionId,"to");
    }
    if(node.kind==="state"){
      const activeRecording=String(worldState.activeRecording||"").split("/").pop()?.replace(/\.json$/,"");
      if(activeRecording&&recordingById.has(activeRecording))addLink(node.id,recordingById.get(activeRecording).id,"active recording");
      if(node.details.previousRegionId&&placeIds.has(node.details.previousRegionId))addLink(node.id,"place:"+node.details.previousRegionId,"previous location");
      if(node.details.regionId&&placeIds.has(node.details.regionId))addLink(node.id,"place:"+node.details.regionId,"current location");
    }
  }
  for(const [from,to] of mapRoutes){
    const left="place:"+from,right="place:"+to;
    if(selectedIds.has(left)||selectedIds.has(right)){addLink(left,right,"mapped route");addLink(right,left,"mapped route");}
  }
  const relevantEntityCount=entities.filter(entity=>selected.some(node=>(node.entities||[]).some(item=>item.key===entity.entities[0].key))).length;
  return {
    query:String(query||""),
    totals:{passages:artifacts.length,encounters:events.length,memories:activity.length,recordings:recordingById.size,places:(world.regions||[]).length,relations:entities.filter(node=>node.kind==="relation").length,matches:matches.length,entityThreads:relevantEntityCount,mapRoutes:mapRoutes.length},
    results:selected.map(({artifactRef,...node})=>node),
    links,
    truncated:matches.length>selected.length,
    read_only:true
  };
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
  if(req.method==="GET" && url.pathname==="/api/geehub/system"){
    const memory=process.memoryUsage();
    const activityRaw=await readFull("engine/activity.jsonl");
    const activityLines=activityRaw.split(/\r?\n/).filter(Boolean);
    let latestActivity=null;
    for(let i=activityLines.length-1;i>=0;i--){
      try{latestActivity=JSON.parse(activityLines[i]);break}catch{}
    }
    return send(res,200,{
      ok:true,
      runtime:{name:"GEEHUB",pid:process.pid,platform:process.platform,arch:process.arch,node:process.version,uptime_seconds:Math.floor(process.uptime())},
      process_memory_bytes:{rss:memory.rss,heap_total:memory.heapTotal,heap_used:memory.heapUsed,external:memory.external,array_buffers:memory.arrayBuffers},
      host_memory_bytes:{total:os.totalmem(),free:os.freemem()},
      world_activity:{record_count:activityLines.length,latest:latestActivity?{id:latestActivity.id||null,type:latestActivity.type||null,title:latestActivity.title||null,at:latestActivity.at||latestActivity.occurred_at||null}:null},
      sampled_at:new Date().toISOString()
    });
  }
  if(req.method==="GET" && url.pathname==="/api/geehub/language"){
    const python=process.env.GEEHUB_PYTHON||(process.platform==="win32"?"python":"python3");
    return await new Promise(resolve=>{
      const child=spawn(python,["engine/tractus_language_audit.py"],{cwd:ROOT,stdio:["ignore","pipe","pipe"]});
      let stdout="",stderr="";
      child.stdout.setEncoding("utf8");child.stderr.setEncoding("utf8");
      child.stdout.on("data",chunk=>{stdout+=chunk;if(stdout.length>1_000_000)child.kill();});
      child.stderr.on("data",chunk=>stderr+=chunk);
      child.on("error",error=>resolve(send(res,503,{status:"unavailable",error:error.message})));
      child.on("close",code=>{
        try{const report=JSON.parse(stdout);resolve(send(res,code===0?200:500,report));}
        catch{resolve(send(res,500,{status:"error",error:stderr.slice(0,1200)||"Language audit returned invalid output."}));}
      });
    });
  }
  if(req.method==="GET" && url.pathname==="/api/geehub/continuity"){
    try{
      const query=String(url.searchParams.get("q")||"").slice(0,160);
      const limit=Math.min(100,Math.max(8,Number(url.searchParams.get("limit")||48)));
      return send(res,200,await buildContinuityIndex(query,limit));
    }catch(error){return send(res,500,{error:error.message||"Continuity index unavailable"});}
  }
  if(req.method==="GET" && url.pathname==="/api/geehub/activity"){
    try{
      const limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit")||40)));
      const raw=await readFull("engine/activity.jsonl");
      const events=raw.split(/\r?\n/).filter(Boolean).slice(-limit).reverse().flatMap(line=>{
        try{return [JSON.parse(line)]}catch{return []}
      });
      return send(res,200,{events});
    }catch(error){return send(res,500,{error:error.message||"Activity log unavailable"});}
  }
  if(req.method==="POST" && url.pathname==="/api/geehub/inscribe"){
    try{
      const input=await bodyOf(req);
      const event=input.event;
      if(!event || typeof event!=="object" || Array.isArray(event)) return send(res,400,{error:"An event object is required."});
      if(typeof event.id!=="string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(event.id)) return send(res,400,{error:"A safe stable event.id is required."});
      if(typeof event.at!=="string" || !Number.isFinite(Date.parse(event.at))) return send(res,400,{error:"A valid event.at timestamp is required."});
      if(!["ARRIVAL","NOTICE","ENCOUNTER","OFFER","TRANSFORM","RETURN","MEMORY","UTTERANCE"].includes(event.type)) return send(res,400,{error:"event.type is not in the shared exchange contract."});
      if(typeof event.title!=="string" || typeof event.body!=="string" || event.title.length>2000 || event.body.length>12000) return send(res,400,{error:"Event title/body are required and must stay within the inscription limits."});
      const result=await inscribeOccurrence(event);
      return send(res,200,result);
    }catch(error){return send(res,error.message==="Invalid JSON"?400:500,{error:error.message||"Inscription failed"});}
  }
  if(req.method==="POST" && url.pathname==="/api/geehub/turn"){
    try{
      const input=await bodyOf(req);
      const participants=Array.isArray(input.participants)?[...new Set(input.participants.filter(x=>typeof x==="string"&&PARTICIPANTS.has(x)))].slice(0,8):[];
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
