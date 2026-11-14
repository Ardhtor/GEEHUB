const BASE = "https://raw.githubusercontent.com/Ardhtor/GEEHUB/main/";
const STOP = new Set(("the and for with from that this into your you are was were have has had its their them then than about across after before under over onto when where which while every each only still same more most very just also can could would should there here what how why who whose our they his her she him it we us i me my").split(/\s+/));
const RELEVANT = /\b(image|photo|visual|asset|render|reference|character|portrait|body|face|scene|video|frame|model|rig|mesh|texture|costume|clothing|environment|world|atlas|memory|continuity|provenance|archive|generate|create|draw|design|add|save|sync|update|remember|library|canon|chapter|hephaestus|neptune|zeus|god daddy|seth|nick|joey|joseph|kirk|teal titan)\b/i;
const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
const arr = value => Array.isArray(value) ? value : [];
const tokenSet = value => new Set((clean(value).toLowerCase().match(/[a-z0-9][a-z0-9'’-]{2,}/g) || []).filter(t => !STOP.has(t)));
const stable = (prefix, value) => { let h=2166136261; for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);} return prefix+"-"+(h>>>0).toString(16).padStart(8,"0"); };
const sourceUrl = path => "https://github.com/Ardhtor/GEEHUB/blob/main/"+String(path||"").replace(/^\/+/,"");
async function read(path){const response=await fetch(BASE+path,{cache:"no-store"});if(!response.ok)throw new Error(path+" returned HTTP "+response.status);return response.text();}
function jsonl(text){return String(text||"").split(/\r?\n/).filter(Boolean).flatMap(line=>{try{return[JSON.parse(line)]}catch{return[]}});}
function textFromContent(content){
 if(typeof content==="string")return content;
 const values=arr(content?.parts).map(part=>typeof part==="string"?part:part&&typeof part==="object"?(part.text||part.caption||part.transcript||part.content||""):"");
 if(typeof content?.text==="string")values.unshift(content.text);
 return values.filter(x=>typeof x==="string").join("\n").trim();
}
function attachmentList(message){
 const found=[],candidates=[...arr(message?.metadata?.attachments),...arr(message?.content?.attachments),...arr(message?.content?.parts).filter(x=>x&&typeof x==="object")];
 for(const item of candidates){const name=item.file_name||item.filename||item.name||item.title||null;const pointer=item.asset_pointer||item.file_id||item.id||item.url||null;if(name||pointer)found.push({name,pointer,type:item.content_type||item.mime_type||item.type||null});}
 return found;
}
function messagesOf(conversation){
 if(conversation?.mapping&&typeof conversation.mapping==="object")return Object.values(conversation.mapping).map(node=>node?.message).filter(Boolean);
 if(Array.isArray(conversation?.messages))return conversation.messages;
 if(conversation?.message)return[conversation.message];return[];
}
function normaliseMessage(message,conversation,index){
 const role=message?.author?.role||message?.role||"unknown",text=textFromContent(message?.content??message?.text??message?.body);
 const timestamp=message?.create_time||message?.timestamp||message?.created_at||null;
 const id=message?.id||message?.message_id||stable("message",[conversation?.id,timestamp,role,index,text.slice(0,120)].join("|"));
 return{id:String(id),role,timestamp:typeof timestamp==="number"?new Date(timestamp*1000).toISOString():timestamp,text,attachments:attachmentList(message),index};
}
export function parseChatGPTExport(data,filename="ChatGPT export"){
 const conversations=Array.isArray(data)?data:Array.isArray(data?.conversations)?data.conversations:[data],output=[];
 for(const conversation of conversations){
  if(!conversation||typeof conversation!=="object")continue;
  const all=messagesOf(conversation).map((message,index)=>normaliseMessage(message,conversation,index))
   .filter(message=>["user","assistant"].includes(message.role)&&(message.text||message.attachments.length))
   .sort((a,b)=>String(a.timestamp||"").localeCompare(String(b.timestamp||"")));
  if(!all.length)continue;
  output.push({id:String(conversation.id||stable("conversation",[conversation.title,conversation.create_time,filename].join("|"))),
   title:clean(conversation.title)||"Untitled conversation",
   created_at:conversation.create_time?new Date(conversation.create_time*1000).toISOString():null,
   updated_at:conversation.update_time?new Date(conversation.update_time*1000).toISOString():null,
   message_count:all.length,messages:all});
 }
 return output;
}
function addNode(graph,node){const existing=graph.nodes.find(item=>item.id===node.id);if(existing)Object.assign(existing,node);else graph.nodes.push(node);}
function addEdge(graph,edge){const id=edge.id||stable("edge",[edge.from,edge.to,edge.relation].join("|"));const existing=graph.edges.find(item=>item.id===id);if(!existing){graph.edges.push({...edge,id});return;}const priorStatus=existing.status;Object.assign(existing,edge,{id});if((priorStatus==="confirmed"||priorStatus==="rejected")&&edge.status==="suggested")existing.status=priorStatus;}
function assetTokens(node){return tokenSet([node.title,node.name,node.description,node.summary,node.content,node.kind,node.source_path,JSON.stringify(node.lineage||{}),JSON.stringify(node.tags||[])].join(" "));}
function rankCandidates(message,candidates){
 const sourceTokens=tokenSet(message.text);if(!sourceTokens.size)return[];const ranked=[];
 for(const asset of candidates){const target=assetTokens(asset);if(!target.size)continue;const shared=[...sourceTokens].filter(token=>target.has(token));if(shared.length<2 && !(shared.length===1 && shared[0].length>=6 && tokenSet(asset.title||asset.name).has(shared[0])))continue;
  const score=shared.length/Math.sqrt(sourceTokens.size*target.size),titleTokens=tokenSet(asset.title||asset.name),titleHits=shared.filter(token=>titleTokens.has(token)).length;
  const adjusted=Math.min(.99,score+Math.min(.24,titleHits*.1)+(shared.length===1?0.12:0));if(adjusted>=.12)ranked.push({asset,score:adjusted,shared});
 }
 return ranked.sort((a,b)=>b.score-a.score).slice(0,4);
}
function chatNodes(graph,conversations,includeAllMessageText=false){
 for(const conversation of conversations){
  const conversationId="chat-"+stable("c",conversation.id).slice(2);
  addNode(graph,{id:conversationId,type:"conversation",title:conversation.title,source:"ChatGPT export",external_id:conversation.id,
   created_at:conversation.created_at,updated_at:conversation.updated_at,message_count:conversation.message_count,source_file:graph.import_source||null});
  for(const message of conversation.messages){
   const excerpt=clean(message.text).slice(0,520),isSignal=RELEVANT.test(message.text)||message.attachments.length>0;if(!isSignal)continue;
   const messageId="chat-message-"+stable("m",conversation.id+"|"+message.id).slice(2);
   const node={id:messageId,type:"chat-signal",title:conversation.title+" / "+message.role,role:message.role,
    timestamp:message.timestamp,conversation_id:conversationId,external_message_id:message.id,excerpt,
    content_length:message.text.length,attachments:message.attachments,source:"ChatGPT export",
    source_locator:{conversation_id:conversation.id,message_id:message.id,filename:graph.import_source||null}};
   if(includeAllMessageText)node.full_text=message.text;else node._fullText=message.text;
   addNode(graph,node);
   addEdge(graph,{from:conversationId,to:messageId,relation:"contains_message",status:"confirmed",evidence:"Message identity and order from the imported export."});
   const candidates=graph.nodes.filter(n=>["asset","artifact","visual-source","project","world"].includes(n.type));
   for(const match of rankCandidates(message,candidates))addEdge(graph,{from:messageId,to:match.asset.id,relation:"may_inform",status:"suggested",
    confidence:Number(match.score.toFixed(3)),evidence:"Shared terms: "+match.shared.join(", "),shared_terms:match.shared,review_required:true});
   for(const attachment of message.attachments){
    const attachmentId=stable("chat-attachment",messageId+"|"+JSON.stringify(attachment));
    addNode(graph,{id:attachmentId,type:"chat-attachment",title:attachment.name||"Conversation attachment",
     parent_message_id:messageId,availability:"referenced_in_export_not_materialised",attachment,source:"ChatGPT export"});
    addEdge(graph,{from:messageId,to:attachmentId,relation:"contains_attachment",status:"confirmed",evidence:"Attachment metadata was present in the imported message."});
   }
  }
 }
}
function parseAssetIndex(markdown){
 const nodes=[],lines=String(markdown||"").split(/\r?\n/);
 for(let i=0;i<lines.length;i++){const match=lines[i].match(/^###\s+(.+)$/);if(!match)continue;const block=[];
  for(let j=i+1;j<lines.length&&!/^#{1,3}\s+/.test(lines[j]);j++)block.push(lines[j]);
  const body=block.join("\n"),canonical=body.match(/\*\*Canonical asset ID:\*\*\s*[\x60]([^\x60]+)[\x60]/i)?.[1]||null,id=canonical||stable("asset",match[1].toLowerCase());
  nodes.push({id:"asset-"+id,type:"asset",title:match[1].trim(),canonical_asset_id:canonical,summary:clean(body).slice(0,900),
   source_path:"lore/ASSET_INDEX.md",url:sourceUrl("lore/ASSET_INDEX.md"),
   availability:/awaiting|pending|not yet|unverified/i.test(body)?"source_pending":"indexed",source:"GEEHUB asset index"});
 }
 return nodes;
}
export async function loadRepositoryMemory(){
 const paths=["projects.json","hub/exchange.json","engine/activity.jsonl","artifacts/index.json","lore/ASSET_INDEX.md","hub/visual_memory.json","media/HULUMS_CAVE_SOURCE_REGISTER.json","hub/chat_asset_memory.seed.json"];
 const loaded=await Promise.all(paths.map(async path=>({path,text:await read(path)}))),raw=Object.fromEntries(loaded.map(item=>[item.path,item.text]));
 const graph={schema:"geehub.chat-asset-memory.v1",version:1,generated_at:new Date().toISOString(),source_repository:"Ardhtor/GEEHUB",
  import_source:null,privacy:{conversation_text_uploaded:false,note:"Chat exports are parsed in this browser. No conversation content is sent to the repository or a remote service by this bridge."},
  nodes:[],edges:[],sources:paths.map(path=>({path,url:sourceUrl(path),loaded:true}))};
 const projects=JSON.parse(raw["projects.json"]);
 for(const project of projects)addNode(graph,{id:"project-"+project.id,type:"project",title:project.name,name:project.name,description:project.description,
  kind:project.kind,status:project.status,path:project.path||null,url:project.path?sourceUrl(project.path):null,related:project.related||[]});
 const artifacts=JSON.parse(raw["artifacts/index.json"]),artifactList=arr(artifacts.artifacts);
 for(const artifact of artifactList)addNode(graph,{id:"artifact-"+artifact.id,type:"artifact",title:artifact.title||artifact.id,kind:artifact.kind||"artifact",
  description:artifact.content||"",canon:artifact.canon||"unclassified",lineage:artifact.lineage||{},source_path:artifact.lineage?.source||null,
  source:artifact.source||null,media:artifact.media||null,created_at:artifact.created_at||null,availability:artifact.media?"media_reference_present":"record_only"});
 const eventMap=new Map();
 for(const event of [...jsonl(raw["engine/activity.jsonl"]),...arr(JSON.parse(raw["hub/exchange.json"]).events)]){if(!event.id||eventMap.has(event.id))continue;eventMap.set(event.id,event);}
 for(const event of eventMap.values())addNode(graph,{id:"event-"+event.id,type:"event",title:event.title||event.world||event.type||event.id,
  description:event.description||event.action||event.text||event.body||"",timestamp:event.at||event.occurred_at||event.time||null,
  source:event.source||event.inscription_source||null,artifact_id:event.artifact||null,region_id:event.regionId||event.region_id||null,
  relation:event.relation||null,source_path:event.canon_path||null});
 const knownIds=new Set(graph.nodes.map(n=>n.id));
 for(const artifact of artifactList){const eventId=artifact.lineage?.source_event_id||artifact.lineage?.event_id||artifact.source_event_id;
  if(eventId&&eventMap.has(eventId))addEdge(graph,{from:"artifact-"+artifact.id,to:"event-"+eventId,relation:"derived_from_event",status:"confirmed",evidence:"Artifact lineage names this event ID."});
  const sourcePath=artifact.lineage?.source||artifact.source_path;
  if(sourcePath){const pathNode="source-path-"+stable("p",sourcePath).slice(2);if(!knownIds.has(pathNode))addNode(graph,{id:pathNode,type:"source-path",title:sourcePath,path:sourcePath,url:sourceUrl(sourcePath)});
   addEdge(graph,{from:"artifact-"+artifact.id,to:pathNode,relation:"derived_from_source",status:"confirmed",evidence:"Artifact lineage names "+sourcePath+"."});}
 }
 for(const node of parseAssetIndex(raw["lore/ASSET_INDEX.md"]))addNode(graph,node);
 const visual=JSON.parse(raw["hub/visual_memory.json"]);
 for(const item of arr(visual.sequence))addNode(graph,{id:"visual-memory-"+String(item.index).padStart(3,"0"),type:"visual-source",
  title:visual.title+" / "+item.role,description:item.memoryEvent,url:item.assetUrl,role:item.role,availability:"external_asset_reference",
  source_path:"hub/visual_memory.json",source:"GEEHUB visual memory"});
 if(visual.coreGesture)addNode(graph,{id:"visual-memory-core-gesture",type:"visual-source",title:visual.coreGesture.title,
  description:visual.coreGesture.event,url:visual.coreGesture.assetUrl,transformation:visual.coreGesture.transformation,
  availability:"external_asset_reference",source_path:"hub/visual_memory.json",source:"GEEHUB visual memory"});
 const register=JSON.parse(raw["media/HULUMS_CAVE_SOURCE_REGISTER.json"]);
 for(const item of arr(register.records))addNode(graph,{id:"source-"+item.source_id,type:"visual-source",title:item.path.split("/").pop(),
  description:item.role+" · "+item.path,source_path:"media/HULUMS_CAVE_SOURCE_REGISTER.json",dropbox_path:item.path,
  dropbox_file_id:item.dropbox_file_id,availability:item.role==="canonical_original"?"registered_original":"possible_duplicate",source:"Dropbox source register"});
 const seed=JSON.parse(raw["hub/chat_asset_memory.seed.json"]);
 for(const node of arr(seed.nodes))addNode(graph,node);
 for(const edge of arr(seed.edges))addEdge(graph,edge);
 graph.import_source=seed.import_source||null;
 return graph;
}
export function attachChatExport(graph,data,filename="conversations.json",includeAllMessageText=false){
 const conversations=parseChatGPTExport(data,filename);graph.import_source=filename;chatNodes(graph,conversations,includeAllMessageText);
 graph.generated_at=new Date().toISOString();graph.import_summary={filename,conversations:conversations.length,
  messages:conversations.reduce((sum,c)=>sum+c.message_count,0),signals:graph.nodes.filter(n=>n.type==="chat-signal").length,imported_at:graph.generated_at};
 return graph;
}
export function confirmEdge(graph,edgeId,note="Reviewed locally"){
 const edge=graph.edges.find(item=>item.id===edgeId);if(!edge)return false;edge.status="confirmed";edge.review_required=false;
 edge.reviewed_at=new Date().toISOString();edge.review_note=note;edge.reviewed_by="local-user";return true;
}
export function exportMemoryGraph(graph,includeSuggestions=false,includeFullText=false){
 const clone=JSON.parse(JSON.stringify(graph));
 clone.nodes=clone.nodes.map(node=>{if(node._fullText){if(includeFullText)node.full_text=node._fullText;delete node._fullText;}if(!includeFullText)delete node.full_text;return node;});
 clone.edges=clone.edges.filter(edge=>includeSuggestions||edge.status!=="suggested");clone.exported_at=new Date().toISOString();
 clone.privacy={...(clone.privacy||{}),conversation_text_uploaded:false,
  export_note:includeFullText?"Full message text included by explicit user choice.":"Only excerpts and source locators are included; full conversation text is omitted."};
 return clone;
}
export function mergeMemoryGraphs(base,incoming){
 const graph=base||{schema:"geehub.chat-asset-memory.v1",version:1,nodes:[],edges:[],sources:[]};
 for(const node of arr(incoming?.nodes))addNode(graph,node);for(const edge of arr(incoming?.edges))addEdge(graph,edge);
 graph.generated_at=new Date().toISOString();return graph;
}
export function indicators(node,graph){
 const linked=graph.edges.some(edge=>(edge.from===node.id||edge.to===node.id)&&edge.status==="confirmed");
 return{source:!!(node.source||node.source_path||node.source_locator),visual:!!(node.url||node.media||node.visual_kind||node.attachments?.length||node.type==="visual-source"),
  continuity:!!(node.lineage||node.canonical_asset_id||node.related?.length||node.conversation_id),canon:node.canon||node.status||"unclassified",linked};
}
