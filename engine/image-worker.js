/* GEEHUB / IMAGE WORKER
   RUN -> IMAGE JOB -> VISUAL ENGINE -> IMAGE MEMORY.
   Default adapter: AUTOMATIC1111-compatible local API.
*/
(() => {
  const CONFIG = {
  "version": 1,
  "id": "geehub-image-worker",
  "purpose": "Turn an open IMAGE need into a concrete generation job and resolve the result back into GEEHUB.",
  "adapter": "automatic1111",
  "endpoint": "http://127.0.0.1:7860",
  "api": "/sdapi/v1/txt2img",
  "output": "data-url",
  "defaultEncounter": {
    "title": "SIZE FOCUS / GAMER DAD",
    "tags": [
      "adult male",
      "gamer dad",
      "large muscular body",
      "scale gameplay",
      "room response",
      "handsome",
      "human continuity",
      "immersive game scene"
    ]
  },
  "rule": "RUN creates the job first. Generation is attempted when the configured visual engine is reachable. A returned image becomes a memory artifact."
};
  const host = document.querySelector('#imageWorker');
  const ART = window.GEEHUB_ARTIFACTS;
  if(!host) return;

  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const JOBKEY='geehub-image-jobs';
  const state={running:false,last:null};

  function readJobs(){ try{return JSON.parse(localStorage.getItem(JOBKEY)||'[]')}catch{return []} }
  function saveJobs(j){ localStorage.setItem(JOBKEY,JSON.stringify(j.slice(0,20))); }

  function promptFor(title, tags){
    return [
      'Immersive fictional game-world scene.',
      'Adult male gamer dad, human, handsome and very large muscular build.',
      'The subject remains continuous while scale changes are visible through the room and objects around him.',
      'Size is the gameplay mechanic: body scale, reach, footprint, camera distance, furniture and architecture respond together.',
      'Early-2000s computer-gaming atmosphere, CRT glow, dark wood, industrial details, tactile materials, subtle strange-world feeling.',
      'Direct in-world scene, not a poster, not an infographic.',
      String(title || CONFIG.defaultEncounter.title)+'.',
      (tags||CONFIG.defaultEncounter.tags).join(', ')+'.'
    ].join(' ');
  }

  function render(){
    const jobs=readJobs();
    host.innerHTML=
      '<div class="image-worker-head"><div><div class="eyebrow">VISUAL SYNTHESIS / IMAGE WORKER</div><h2>THE PROGRAM BUILDS THE IMAGE.</h2><p>RUN turns the current visual lack into a generation job. The local visual engine answers; the returned image becomes memory.</p></div><div class="image-worker-status">'+(state.running?'BUILDING IMAGE':'READY / '+jobs.length+' JOBS')+'</div></div>'+
      '<div class="image-worker-console">'+
        '<label>ENCOUNTER<input id="imageEncounter" value="'+esc(state.last?.title||CONFIG.defaultEncounter.title)+'"></label>'+
        '<label>ENGINE<input id="imageEndpoint" value="'+esc(localStorage.getItem('geehub-image-endpoint')||CONFIG.endpoint)+'"></label>'+
        '<button id="buildImage" class="run-button" type="button">BUILD IMAGE</button>'+
      '</div>'+
      '<div id="imageResult" class="image-result">'+(state.last?.html||'<span>NO IMAGE RETURNED YET.</span>')+'</div>';
    const btn=host.querySelector('#buildImage');
    btn.addEventListener('click',()=>build());
  }

  function queueJob(title, prompt){
    const job={id:'image-job-'+Date.now(),at:Date.now(),type:'IMAGE',status:'QUEUED',title,prompt,adapter:CONFIG.adapter,endpoint:localStorage.getItem('geehub-image-endpoint')||CONFIG.endpoint};
    const jobs=readJobs(); jobs.unshift(job); saveJobs(jobs);
    window.GEEHUB_INTERACTION?.emit({id:job.id,at:job.at,from:'geehub',to:'visual-synthesis',type:'OFFER',title:'IMAGE JOB / '+title,body:'The program created a concrete image-generation job and sent it to the visual-synthesis territory.',source:'GEEHUB image worker',live:true});
    return job;
  }

  async function build(detail){
    if(state.running)return;
    state.running=true;
    render();
    const title=detail?.title || host.querySelector('#imageEncounter')?.value || CONFIG.defaultEncounter.title;
    const tags=detail?.tags || CONFIG.defaultEncounter.tags;
    const endpoint=(host.querySelector('#imageEndpoint')?.value || CONFIG.endpoint).replace(/\/$/,'');
    localStorage.setItem('geehub-image-endpoint',endpoint);
    const prompt=detail?.prompt || promptFor(title,tags);
    const job=queueJob(title,prompt);
    const result=host.querySelector('#imageResult');
    if(result) result.innerHTML='<span>JOB CREATED / CONTACTING VISUAL ENGINE…</span>';

    try{
      const r=await fetch(endpoint+CONFIG.api,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          prompt,
          negative_prompt:'nudity, explicit sexual content, fetishized anatomy, poster, infographic, text-heavy image, deformed hands, extra limbs',
          steps:28,
          cfg_scale:7,
          width:1024,
          height:1024,
          sampler_name:'Euler a'
        })
      });
      if(!r.ok) throw new Error('HTTP '+r.status);
      const data=await r.json();
      const b64=Array.isArray(data.images)?data.images[0]:null;
      if(!b64) throw new Error('NO IMAGE RETURNED');
      const src=b64.startsWith('data:')?b64:'data:image/png;base64,'+b64;
      job.status='RETURNED'; job.returnedAt=Date.now(); job.image=src;
      const jobs=readJobs(); const idx=jobs.findIndex(x=>x.id===job.id); if(idx>=0)jobs[idx]=job; saveJobs(jobs);
      state.last={title,html:'<img class="image-worker-image" src="'+src+'" alt="'+esc(title)+'"><div class="image-worker-return">RETURNED / '+esc(title)+'</div>'};
      ART?.emit?.({type:'image',title:'IMAGE / '+title,body:'A concrete visual artifact returned from the visual-synthesis engine.',source:'GEEHUB image worker',lineage:{job:job.id,adapter:CONFIG.adapter,engine:endpoint,encounter:title},canon:'unclassified',dreamable:true,quietness:'high',media:src});
      window.GEEHUB_INTERACTION?.emit({id:'return-'+job.id,at:Date.now(),from:'visual-synthesis',to:'geehub',type:'RETURN',title:'IMAGE RETURN / '+title,body:'A concrete image returned from the visual-synthesis engine and entered memory.',source:'GEEHUB image worker',artifact:job.id,live:true});
    }catch(err){
      job.status='WAITING_FOR_ENGINE'; job.error=String(err.message||err);
      const jobs=readJobs(); const idx=jobs.findIndex(x=>x.id===job.id); if(idx>=0)jobs[idx]=job; saveJobs(jobs);
      state.last={title,html:'<div class="image-worker-offline"><strong>JOB KEPT.</strong><span>'+esc(job.status)+' // '+esc(job.error)+'</span><small>Start an Automatic1111-compatible image API at the configured endpoint; rerun the job to resolve it.</small></div>'};
    }
    state.running=false;
    render();
  }

  window.GEEHUB_IMAGE_WORKER={build,queueJob,promptFor,config:CONFIG};
  render();
})();