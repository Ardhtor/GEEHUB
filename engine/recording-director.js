/* GEEHUB / SPATIAL RECORDING DIRECTOR
   One map. Many moments. Same world.
*/
(() => {
  const root=document.querySelector('#recordingDirector');
  if(!root)return;
  const MAP='./hub/spatial-world.json';
  const QUEUE='./hub/image-jobs.json';
  const KEY='geehub-director-keyframes';
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const save=v=>localStorage.setItem(KEY,JSON.stringify(v.slice(0,48)));

  fetch(MAP+'?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(map=>{
    root.innerHTML=
      '<div class="director-head"><div><div class="eyebrow">RECORDING DIRECTOR / SPATIAL TIMELINE</div><h2>ONE WORLD / MANY MOMENTS</h2><p>Click the land to place the next camera state. The same map, anchors, and character state can then produce a sequence.</p></div><div id="directorCount">0 KEYFRAMES</div></div>'+
      '<div class="director-body"><div class="director-map" id="directorMap"><div class="director-grid"></div>'+
        map.regions.map(r=>{
          const name=(window.world?.regions||[]).find(x=>x.id===r.id)?.name||r.id;
          return '<button class="director-node" data-region="'+esc(r.id)+'" style="left:'+r.x+'%;top:'+r.y+'%" type="button"><b>'+esc(name)+'</b></button>';
        }).join('')+
      '</div><aside class="director-side"><label>SUBJECT<select id="directorAgent"><option value="luke">LUKE</option><option value="tyler">TYLER</option><option value="andrew">ANDREW</option><option value="joseph">JOSEPH</option><option value="chase">CHASE</option></select></label><label>SCALE<input id="directorScale" type="range" min="1" max="4.2" step=".01" value="2.5"><strong id="directorScaleValue">2.50×</strong></label><label>TIME / SEC<input id="directorTime" type="number" min="0" step=".1" value="0"></label><label>INTENT<input id="directorIntent" value="SIZE FOCUS / GAMER DAD"></label><button id="directorAdd" class="run-button" type="button">ADD KEYFRAME</button><button id="directorBuild" type="button">BUILD IMAGE SEQUENCE</button><button id="directorClear" type="button">CLEAR TIMELINE</button></aside></div>'+
      '<div class="director-timeline"><div class="eyebrow">TIMELINE</div><div id="directorFrames"></div></div>';
    let selected=map.regions[0],frames=read();
    const scale=root.querySelector('#directorScale'),scaleVal=root.querySelector('#directorScaleValue');
    scale.addEventListener('input',()=>scaleVal.textContent=Number(scale.value).toFixed(2)+'×');
    root.querySelectorAll('.director-node').forEach(btn=>btn.addEventListener('click',()=>{
      selected=map.regions.find(r=>r.id===btn.dataset.region)||selected;
      root.querySelectorAll('.director-node').forEach(x=>x.classList.toggle('active',x===btn));
    }));
    function render(){
      root.querySelector('#directorCount').textContent=frames.length+' KEYFRAMES';
      root.querySelector('#directorFrames').innerHTML=frames.length
       ? frames.sort((a,b)=>a.t-b.t).map((f,i)=>'<button class="director-frame" data-i="'+i+'" type="button"><span>'+Number(f.t).toFixed(1)+'s</span><strong>'+esc(f.regionId)+'</strong><small>'+esc(f.subject.agent)+' / '+Number(f.subject.scale).toFixed(2)+'×</small></button>').join('')
       : '<span>NO TIMELINE YET.</span>';
    }
    root.querySelector('#directorAdd').addEventListener('click',()=>{
      const t=Number(root.querySelector('#directorTime').value)||0;
      frames.push({t,regionId:selected.id,position:{x:selected.x,y:selected.y,z:0},camera:{x:selected.x,y:selected.y,z:1.7,heading:0,pitch:0,fov:50},subject:{agent:root.querySelector('#directorAgent').value,scale:Number(scale.value)},environment:{occupancy:Number(scale.value),clearance:Number((1/Number(scale.value)).toFixed(3))},deltas:[],intent:root.querySelector('#directorIntent').value});
      save(frames);render();
    });
    root.querySelector('#directorClear').addEventListener('click',()=>{frames=[];save(frames);render()});
    root.querySelector('#directorBuild').addEventListener('click',()=>{
      if(!frames.length)return;
      const base='GEEHUB TIMELINE / '+root.querySelector('#directorIntent').value;
      const existing=JSON.parse(localStorage.getItem('geehub-image-jobs')||'[]');
      frames.sort((a,b)=>a.t-b.t).forEach((f,i)=>{
        const id='timeline-image-'+Date.now()+'-'+i;
        const prompt='Render keyframe '+i+' at '+Number(f.t).toFixed(1)+' seconds from canonical GEEHUB map geehub-persistent-spatial-world. Region '+f.regionId+' at '+f.position.x+','+f.position.y+'. Camera '+JSON.stringify(f.camera)+'. Subject '+f.subject.agent+' scale '+Number(f.subject.scale).toFixed(2)+'x. Environment occupancy '+f.environment.occupancy+'. Preserve the persistent geography and continuity of the recording. Intent: '+f.intent+'. Direct immersive in-world scene.';
        existing.unshift({id,status:'QUEUED',type:'IMAGE',timeline:true,keyframe:i,time:f.t,recording:'recording-timeline-local',map:'./hub/spatial-world.json',regionId:f.regionId,prompt,output:{expected:'image',memoryPath:'/GEEHUB/corpus/images/'}});
      });
      localStorage.setItem('geehub-image-jobs',JSON.stringify(existing.slice(0,60)));
      window.GEEHUB_INTERACTION?.emit({id:'timeline-build-'+Date.now(),at:Date.now(),from:'recording-director',to:'visual-synthesis',type:'OFFER',title:'IMAGE SEQUENCE / '+base,body:frames.length+' canonical keyframes were sent to the visual synthesis queue.',source:'recording director',live:true});
      const btn=root.querySelector('#directorBuild');btn.textContent='SEQUENCE QUEUED';setTimeout(()=>btn.textContent='BUILD IMAGE SEQUENCE',1500);
    });
    render();
  }).catch(()=>{root.textContent='RECORDING DIRECTOR OFFLINE.'});
})();