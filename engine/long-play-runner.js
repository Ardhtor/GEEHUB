const fs=require('fs');

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');

const statePath='hub/long-play-state.json';
const worldPath='world.json';
const jobsPath='hub/render-jobs.json';
const imagePath='hub/image-jobs.json';
const exchangePath='hub/exchange.json';

const state=read(statePath);
const world=read(worldPath);
const renderJobs=read(jobsPath);
const imageJobs=read(imagePath);
const exchange=read(exchangePath);

const agents=['luke','tyler','andrew','joseph','chase'];
const regions=world.regions||[];
const cycle=Number(state.cycle||0)+1;
const agent=agents[(cycle-1)%agents.length]||'luke';
const region=regions[(cycle-1)%Math.max(1,regions.length)]||{id:'complex',name:'THE COMPLEX',x:55,y:51};
const prior=Number(state.scale||2.5);
const next=Math.min(4.2,Number((prior+[0.03,0.05,0.08,0.12,0.04][(cycle-1)%5]).toFixed(2)));
const now=new Date().toISOString();
const reactionHistoryPath='hub/agent-reaction-history.json';
const reactionHistory=read(reactionHistoryPath);
const reactionTemplates={
  luke:{
    response: next => 'Luke feels the change in the room first. He notices how '+next+' alters the space around him.',
    next:'stay close and see what the new baseline does.'
  },
  tyler:{
    response: next => 'Tyler checks the change against what the world recorded before. He wants the discrepancy to remain legible.',
    next:'compare the new state with the previous measurement.'
  },
  andrew:{
    response: next => 'Andrew treats the change as an opening. He wants to move through it rather than only look at it.',
    next:'turn the new constraint into the next piece of play.'
  },
  joseph:{
    response: next => 'Joseph recognizes the earlier state inside the new one. The change matters because the old version is still remembered.',
    next:'keep one detail that proves the return.'
  },
  chase:{
    response: next => 'Chase watches for the consequence that survives the initial change. He is less interested in spectacle than evidence.',
    next:'record what cannot be unseen now.'
  }
};

const changeSummary= 'the world advances at '+next.toFixed(2)+'× in '+region.name;
reactionHistory.events=Array.isArray(reactionHistory.events)?reactionHistory.events:[];
for(const id of agents){
  const t=reactionTemplates[id];
  reactionHistory.events.unshift({
    id:'reaction-'+String(cycle).padStart(5,'0')+'-'+id,
    at:now,
    agent:id,
    eventId:'scheduled-long-play-'+String(cycle).padStart(5,'0'),
    mood:id==='luke'?'alert':id==='tyler'?'focused':id==='andrew'?'energized':id==='joseph'?'moved':'watchful',
    response:t.response(changeSummary),
    next:t.next,
    inheritedScale:prior,
    observedScale:next,
    regionId:region.id
  });
}
reactionHistory.events=reactionHistory.events.slice(0,500);

const recording={
  id:'scheduled-recording-'+String(cycle).padStart(5,'0'),
  map:'geehub-persistent-spatial-world',
  regionId:region.id,
  position:{x:Number(region.x)||50,y:Number(region.y)||50,z:0},
  camera:{x:Number(region.x)||50,y:Number(region.y)||50,z:1.7,heading:(cycle*23)%360,pitch:0,fov:50},
  subject:{agent,scale:next},
  environment:{occupancy:next,clearance:Number((1/next).toFixed(3)),dominantMaterials:[],lighting:'inherited',sound:'inherited'},
  anchors:[{type:'region',id:region.id,name:region.name}],
  deltas:[{property:'subject.scale',from:prior,to:next}],
  intent:'LONG PLAY / SCHEDULED WORLD',
  lineage:{session:state.id,cycle},
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
  title:region.name+' / LONG PLAY / '+agent.toUpperCase(),
  prompt:'Render the canonical GEEHUB world from recording '+recording.id+'. Preserve region '+region.id+' and inherited geography. Adult male human subject '+agent+' at '+next.toFixed(2)+'x scale. Show accumulated environmental response, camera retreat, clearance, furniture and architecture adapting to scale. This is one frame of a persistent world, not a reset and not a poster.',
  created:now
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
  title:'LONG PLAY / '+region.name+' / '+agent.toUpperCase(),
  body:'Scheduled play inherited the world and advanced scale from '+prior.toFixed(2)+'× to '+next.toFixed(2)+'×. A spatial recording and renderer jobs were created.',
  source:'GEEHUB scheduled runner',
  artifact:recording.id,
  live:true
});
exchange.generated=now;
exchange.events=exchange.events.slice(0,100);

state.cycle=cycle;
state.currentAgent=agent;
state.currentRegion=region.id;
state.scale=next;
state.lastRun=now;
state.history=Array.isArray(state.history)?state.history:[];
state.history.unshift({cycle,agent,region:region.id,scale:next,recording:recording.id,at:now});
state.history=state.history.slice(0,100);

write(reactionHistoryPath,reactionHistory);
write(statePath,state);
write(imagePath,imageJobs);
write(jobsPath,renderJobs);
write(exchangePath,exchange);