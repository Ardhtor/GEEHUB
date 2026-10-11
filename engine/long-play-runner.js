const fs=require('fs');

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>{
  fs.mkdirSync(require('path').dirname(p),{recursive:true});
  fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
};

const statePath='hub/long-play-state.json';
const worldPath='world.json';
const jobsPath='hub/render-jobs.json';
const imagePath='hub/image-jobs.json';
const exchangePath='hub/exchange.json';
const reactionHistoryPath='hub/agent-reaction-history.json';
const worldStatePath='hub/world-state.json';
const engineStatePath='engine/state.json';

const state=read(statePath);
const world=read(worldPath);
const renderJobs=read(jobsPath);
const imageJobs=read(imagePath);
const exchange=read(exchangePath);
const reactionHistory=read(reactionHistoryPath);
const worldState=read(worldStatePath);
const engineState=read(engineStatePath);

const agents=['luke','tyler','andrew','joseph','chase'];
const regions=world.regions||[];
const edges=world.pleasureBits||[];
if(!regions.length)throw new Error('world.json has no regions; long play cannot advance');

const cycle=Number(state.cycle||0)+1;
const agent=agents[(cycle-1)%agents.length]||'luke';
const now=new Date().toISOString();
const scaleSteps=[0.03,0.05,0.08,0.12,0.04];
const prior=Math.max(Number(state.scale||2.5),Number(engineState.long_play?.scale||0),Number(engineState.scale||0));
const increment=scaleSteps[(cycle-1)%scaleSteps.length];
const next=Number((prior+increment).toFixed(2));
const scaleLabel=next.toFixed(2);
const previousLongPlayAt=Date.parse(state.lastRun||'')||0;
const latestEngineEvent=(engineState.events||[]).slice(-1)[0]||null;
const engineWorldAt=Math.max(
  Date.parse(latestEngineEvent?.time||'')||0,
  Date.parse(engineState.long_play?.at||'')||0
);
const engineRegionIsNewer=engineWorldAt>previousLongPlayAt;
const storedRegion=regions.find(item=>item.id===state.currentRegion);
const engineRegion=regions.find(item=>item.id===engineState.active_region);
const previousRegion=(engineRegionIsNewer&&engineRegion)
  ?engineRegion
  :(storedRegion||engineRegion||regions[0]);

// Reconstruct visitation from the persistent history if this is the first graph-aware cycle.
const visits={...(state.regionVisits||{})};
if(!Object.keys(state.regionVisits||{}).length){
  for(const entry of state.history||[]){
    if(entry.region)visits[entry.region]=Number(visits[entry.region]||0)+1;
  }
}
for(const [id,count] of Object.entries(engineState.visits||{})){
  visits[id]=Math.max(Number(visits[id]||0),Number(count||0));
}
const lastVisit={...(state.lastRegionAt||{})};
if(!Object.keys(state.lastRegionAt||{}).length){
  for(const entry of state.history||[]){
    if(entry.region&&entry.at){
      const old=Date.parse(lastVisit[entry.region]||'')||0;
      const at=Date.parse(entry.at)||0;
      if(at>old)lastVisit[entry.region]=entry.at;
    }
  }
}
for(const event of engineState.events||[]){
  const id=event.region_id;
  if(id&&event.time){
    const old=Date.parse(lastVisit[id]||'')||0;
    const at=Date.parse(event.time)||0;
    if(at>old)lastVisit[id]=event.time;
  }
}

const adjacent=[];
edges.forEach((edge,order)=>{
  const targetId=edge.from===previousRegion.id?edge.to:
    edge.to===previousRegion.id?edge.from:null;
  if(!targetId||targetId===previousRegion.id)return;
  const target=regions.find(item=>item.id===targetId);
  if(!target||adjacent.some(item=>item.region.id===targetId))return;
  adjacent.push({region:target,edge,order});
});
const physicalRegions=new Set(['beefythiq','growth','facility','embodied-scale','colossal-escalation','male-harem','luke-bwomph']);
adjacent.sort((a,b)=>{
  const av=Number(visits[a.region.id]||0),bv=Number(visits[b.region.id]||0);
  if(av!==bv)return av-bv;
  const pressureBias=next>=4.0
    ?(physicalRegions.has(a.region.id)?-1:0)-(physicalRegions.has(b.region.id)?-1:0)
    :0;
  if(pressureBias!==0)return pressureBias;
  const aa=Date.parse(lastVisit[a.region.id]||'')||0;
  const ba=Date.parse(lastVisit[b.region.id]||'')||0;
  if(aa!==ba)return aa-ba;
  return a.order-b.order;
});

let chosen=adjacent[0]||null;
if(!chosen){
  const fallback=regions.filter(item=>item.id!==previousRegion.id).sort((a,b)=>{
    const av=Number(visits[a.id]||0),bv=Number(visits[b.id]||0);
    if(av!==bv)return av-bv;
    const aa=Date.parse(lastVisit[a.id]||'')||0;
    const ba=Date.parse(lastVisit[b.id]||'')||0;
    return aa-ba||a.id.localeCompare(b.id);
  })[0];
  if(fallback)chosen={region:fallback,edge:null,order:999};
}
const region=chosen?.region||previousRegion;
const relation=chosen?.edge||null;
const relationTitle=relation?.title||'LEAST-VISITED FALLBACK';
const relationText=relation?.text||'No direct edge was available; the world chose the least-visited remaining place and recorded the gap honestly.';
const routeMode=relation?'WORLD GRAPH / CONNECTED ROUTE':'WORLD GRAPH / UNLINKED FALLBACK';

const reactionTemplates={
  luke:{
    response:(scale,room,route)=>'Luke feels the change in the room first. At '+scale+'×, the floor answers under his stance, and he tests the new clearance without losing his familiar ease in '+room+'.',
    next:'stay close and see what the new baseline does.'
  },
  tyler:{
    response:(scale,room,route)=>'Tyler checks '+scale+'× against the previous measurement. The difference is visible in '+room+'; he keeps the earlier baseline beside the new one instead of correcting it away.',
    next:'compare the new state with the previous measurement.'
  },
  andrew:{
    response:(scale,room,route)=>'Andrew treats the '+scale+'× change as an opening in '+room+'. He tries the route himself, testing what the new reach and clearance make possible.',
    next:'turn the new constraint into the next piece of play.'
  },
  joseph:{
    response:(scale,room,route)=>'Joseph recognizes the earlier state inside '+room+'. At '+scale+'×, the change matters because the name, face, and the way through the room still belong to the same person.',
    next:'keep one detail that proves the return.'
  },
  chase:{
    response:(scale,room,route)=>'Chase watches what survives the '+scale+'× change in '+room+'. The route is marked by '+route+'; he records the consequence instead of confusing spectacle with evidence.',
    next:'record what cannot be unseen now.'
  }
};
const changeSummary='the world advances at '+scaleLabel+'× in '+region.name;
const reactionHistory=read(reactionHistoryPath);
reactionHistory.events=Array.isArray(reactionHistory.events)?reactionHistory.events:[];
for(const id of agents){
  const template=reactionTemplates[id];
  reactionHistory.events.unshift({
    id:'reaction-'+String(cycle).padStart(5,'0')+'-'+id,
    at:now,
    agent:id,
    eventId:'scheduled-long-play-'+String(cycle).padStart(5,'0'),
    mood:id==='luke'?'alert':id==='tyler'?'focused':id==='andrew'?'energized':id==='joseph'?'moved':'watchful',
    response:template.response(scaleLabel,region.name,relationTitle),
    next:template.next,
    inheritedScale:prior,
    observedScale:next,
    regionId:region.id,
    previousRegionId:previousRegion.id,
    relation:relationTitle
  });
}
reactionHistory.events=reactionHistory.events.slice(0,500);

const recording={
  id:'scheduled-recording-'+String(cycle).padStart(5,'0'),
  map:'geehub-persistent-spatial-world',
  regionId:region.id,
  position:{x:Number(region.x)||50,y:Number(region.y)||50,z:0},
  camera:{x:Number(region.x)||50,y:Number(region.y)||50,z:1.7,heading:(cycle*23)%360,pitch:0,fov:50},
  subject:{agent,scale:next,priorScale:prior,identityContinuity:true},
  environment:{
    occupancy:next,
    clearance:Number((1/next).toFixed(4)),
    dominantMaterials:[],
    lighting:'inherited',
    sound:'inherited',
    pressure:Number(engineState.pressure||0.18),
    relation:relationTitle
  },
  anchors:[
    {type:'region',id:previousRegion.id,name:previousRegion.name},
    {type:'region',id:region.id,name:region.name},
    {type:'relation',title:relationTitle}
  ],
  deltas:[
    {property:'subject.scale',from:prior,to:next},
    {property:'location.regionId',from:previousRegion.id,to:region.id,relation:relationTitle},
    {property:'environment.clearance',from:Number((1/prior).toFixed(4)),to:Number((1/next).toFixed(4))}
  ],
  intent:'LONG PLAY / '+previousRegion.name+' → '+region.name+' / '+agent.toUpperCase(),
  lineage:{
    session:state.id,
    cycle,
    previousRegionId:previousRegion.id,
    regionId:region.id,
    relation:relationTitle,
    routeMode,
    scaleBaselineFrom:prior,
    scaleBaselineTo:next
  },
  timestamp:now
};

fs.mkdirSync('hub/recordings',{recursive:true});
write('hub/recordings/'+recording.id+'.json',recording);

const imageJob={
  id:'scheduled-image-'+String(cycle).padStart(5,'0'),
  status:'QUEUED',
  type:'IMAGE',
  sourceRecording:'./recordings/'+recording.id+'.json',
  map:'./spatial-world.json',
  target:'visual-synthesis',
  title:previousRegion.name+' → '+region.name+' / '+agent.toUpperCase(),
  prompt:'Continue the canonical GEEHUB world from recording '+recording.id+'. Travel from '+previousRegion.name+' into '+region.name+' through the relation "'+relationTitle+'". Preserve the inherited geography, recognizable adult male identity, face, name, and prior body baselines. Show scale increasing from '+prior.toFixed(2)+'× to '+next.toFixed(2)+'× through body, room clearance, furniture, material response, and camera distance. One in-world scene frame, not a poster, not a reset.',
  created:now,
  lineage:{from:previousRegion.id,to:region.id,relation:relationTitle,cycle}
};
imageJobs.jobs=imageJobs.jobs||[];
imageJobs.jobs.unshift(imageJob);
imageJobs.jobs=imageJobs.jobs.slice(0,200);

const renderSet=renderJobs.jobs||[];
for(const type of ['SPACE','VIDEO','SOUND']){
  renderSet.unshift({
    id:'scheduled-'+type.toLowerCase()+'-'+String(cycle).padStart(5,'0'),
    type,status:'QUEUED',
    recording:'./recordings/'+recording.id+'.json',
    route:{from:previousRegion.id,to:region.id,relation:relationTitle},
    target:type==='SPACE'?'spatial-perception':type.toLowerCase(),
    output:'inherited world '+type.toLowerCase()+' state',
    created:now
  });
}
renderJobs.jobs=renderSet.slice(0,300);

exchange.events=exchange.events||[];
exchange.events.unshift({
  id:'scheduled-long-play-'+String(cycle).padStart(5,'0'),
  at:now,
  from:'geehub-long-play',
  to:agent,
  type:'TRANSFORM',
  title:'LONG PLAY / '+previousRegion.name+' → '+region.name+' / '+agent.toUpperCase(),
  body:'The world crossed the existing relation "'+relationTitle+'" from '+previousRegion.name+' into '+region.name+'. Scale increased from '+prior.toFixed(2)+'× to '+next.toFixed(2)+'×. Earlier locations and baselines remain in the record.',
  source:'GEEHUB scheduled runner',
  artifact:recording.id,
  live:true,
  regionId:region.id,
  previousRegionId:previousRegion.id,
  relation:relationTitle
});
exchange.generated=now;
exchange.events=exchange.events.slice(0,100);

visits[region.id]=Number(visits[region.id]||0)+1;
lastVisit[region.id]=now;
state.cycle=cycle;
state.currentAgent=agent;
state.previousRegion=previousRegion.id;
state.currentRegion=region.id;
state.relation=relationTitle;
state.routeMode=routeMode;
state.scale=next;
state.regionVisits=visits;
state.lastRegionAt=lastVisit;
state.lastRun=now;
state.history=Array.isArray(state.history)?state.history:[];
state.history.unshift({
  cycle,agent,
  previousRegion:previousRegion.id,
  region:region.id,
  relation:relationTitle,
  routeMode,
  priorScale:prior,
  scale:next,
  recording:recording.id,
  at:now
});
state.history=state.history.slice(0,100);

// The world-state bridge now points at the newest recording while keeping the old
// canonical recording reachable as a separate, explicit baseline.
worldState.canonicalRecording=worldState.canonicalRecording||worldState.activeRecording||null;
worldState.activeRecording='./recordings/'+recording.id+'.json';
worldState.activeEncounter=worldState.activeEncounter||{};
worldState.activeEncounter.regionId=region.id;
worldState.activeEncounter.regionName=region.name;
worldState.activeEncounter.previousRegionId=previousRegion.id;
worldState.activeEncounter.subject=worldState.activeEncounter.subject||{};
worldState.activeEncounter.subject.agent=agent;
worldState.activeEncounter.subject.scale=next;
worldState.activeEncounter.subject.physiqueState=next>=4.5?'hyper baseline / identity continuous':'growing baseline / identity continuous';
worldState.activeEncounter.intent=recording.intent;
worldState.activeEncounter.continuity=Array.isArray(worldState.activeEncounter.continuity)
  ?worldState.activeEncounter.continuity
  :['face','identity','name','setting','previous baselines'];
worldState.activeEncounter.delta=[
  'scale '+prior.toFixed(2)+'× → '+next.toFixed(2)+'×',
  previousRegion.name+' → '+region.name,
  'relation: '+relationTitle,
  'room clearance recalibrated',
  'previous baselines retained'
];
worldState.livePlay={
  cycle,
  agent,
  previousRegionId:previousRegion.id,
  regionId:region.id,
  relation:relationTitle,
  routeMode,
  previousScale:prior,
  scale:next,
  recording:recording.id,
  at:now
};
worldState.snapshot=now;

// Synchronize the shared current location and inherited scale without inventing a
// second pulse number. The environment runner resumes its atmosphere phase here.
engineState.active_region=region.id;
engineState.long_play={
  cycle,
  agent,
  previous_region_id:previousRegion.id,
  region_id:region.id,
  region_name:region.name,
  relation:relationTitle,
  route_mode:routeMode,
  previous_scale:prior,
  scale:next,
  recording:recording.id,
  at:now
};
engineState.last_world_change=now;
engineState.scale=next;
engineState.pressure=Math.max(
  Number(engineState.pressure||0.18),
  Math.min(0.94,0.18+Math.max(0,next-2.5)*0.18)
);
engineState.memory=Math.max(
  Number(engineState.memory||0.5),
  Math.min(0.97,0.5+cycle*0.012)
);
engineState.phase=0;
engineState.next_region=null;
engineState.next_relation=null;
engineState.current_phase='LONG_PLAY_CROSSING';
engineState.visits=engineState.visits||{};
engineState.visits[region.id]=Math.max(Number(engineState.visits[region.id]||0),Number(visits[region.id]||0));
engineState.last_visits=engineState.last_visits||{};
engineState.last_visits[region.id]=Number(engineState.pulse||0)+0.5;
engineState.external_events=Array.isArray(engineState.external_events)?engineState.external_events:[];
engineState.external_events.unshift({
  id:'long-play-'+String(cycle).padStart(5,'0'),
  type:'CROSSING',
  title:previousRegion.name+' → '+region.name,
  body:'The world crossed "'+relationTitle+'". Scale increased from '+prior.toFixed(2)+'× to '+next.toFixed(2)+'×; the earlier location and baseline remain recorded.',
  from:previousRegion.id,
  to:region.id,
  previous_region_id:previousRegion.id,
  region_id:region.id,
  relation:relationTitle,
  source:'long-play',
  at:now
});
engineState.external_events=engineState.external_events.slice(0,100);

write(reactionHistoryPath,reactionHistory);
write(statePath,state);
write(imagePath,imageJobs);
write(jobsPath,renderJobs);
write(exchangePath,exchange);
write(worldStatePath,worldState);
write(engineStatePath,engineState);
