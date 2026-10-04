/* GEEHUB / PERSISTENT WORLD MAP + RECORDING SPACE */
(() => {
  const root=document.querySelector('#recordingSpace');
  if(!root)return;
  const MAP='./hub/spatial-world.json', REC='./hub/recording-space.json';
  const KEY='geehub-recording-packets';
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const local=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const save=a=>localStorage.setItem(KEY,JSON.stringify(a.slice(0,40)));
  Promise.all([
    fetch(MAP+'?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
    fetch('./world.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
    fetch(REC+'?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json())
  ]).then(([map,world,schema])=>{
    const byId=id=>world.regions.find(x=>x.id===id);
    const center=map.regions[0]||{x:50,y:50};
    root.innerHTML=
      '<div class="recording-head"><div><div class="eyebrow">SPATIAL MEMORY / PERSISTENT MAP</div><h2>THE LAY OF THE LAND IS A FILE.</h2><p>The map is stable. Recordings reference it. Image, video, and 3D workers consume the same coordinates instead of rebuilding geography from description.</p></div><div class="recording-status">MAP '+map.regions.length+' / ROUTES '+map.routes.length+'</div></div>'+
      '<div class="recording-body">'+
        '<div class="recording-map" id="recordingMap"><div class="map-grid"></div>'+map.routes.map(([a,b])=>{
          const A=map.regions.find(x=>x.id===a),B=map.regions.find(x=>x.id===b);if(!A||!B)return '';
          return '<i class="map-route" style="left:'+A.x+'%;top:'+A.y+'%;width:'+Math.hypot(B.x-A.x,B.y-A.y)+'%;transform:rotate('+Math.atan2(B.y-A.y,B.x-A.x)*180/Math.PI+'deg)"></i>';
        }).join('')+
        map.regions.map(r=>{
          const w=byId(r.id)||r;
          return '<button class="map-node" data-region="'+esc(r.id)+'" style="left:'+r.x+'%;top:'+r.y+'%" type="button"><b>'+esc(w.name)+'</b><small>'+esc(w.kind)+'</small></button>';
        }).join('')+
        '<div class="map-you" id="mapYou" style="left:'+center.x+'%;top:'+center.y+'%">RECORD</div></div>'+
        '<aside class="recording-controls"><div class="eyebrow">RECORDING SPACE</div><label>PLACE<select id="recordPlace">'+map.regions.map(r=>'<option value="'+esc(r.id)+'">'+esc((byId(r.id)||r).name)+'</option>').join('')+'</select></label><label>SUBJECT<select id="recordAgent"><option value="luke">LUKE</option><option value="tyler">TYLER</option><option value="andrew">ANDREW</option><option value="joseph">JOSEPH</option><option value="chase">CHASE</option></select></label><label>SCALE<input id="recordScale" type="range" min="1" max="4.2" step=".01" value="1"><strong id="recordScaleValue">1.00×</strong></label><label>INTENT<input id="recordIntent" value="SIZE FOCUS / GAMER DAD"></label><div class="record-actions"><button id="recordNow" class="run-button" type="button">RECORD STATE</button><button id="sendImage" type="button">SEND TO IMAGE WORKER</button></div></aside></div>'+
        '<div class="recording-packet"><div><div class="eyebrow">CURRENT PACKET</div><h3 id="packetTitle">NO RECORDING</h3></div><pre id="packetJson">{}</pre></div>'+
        '<div class="recording-memory"><div class="eyebrow">RECORDED STATES</div><div id="recordedList"></div></div>';
    let selected=center,packet=null;
    const place=$('#recordPlace'),agent=$('#recordAgent'),scale=$('#recordScale'),scaleValue=$('#recordScaleValue'),intent=$('#recordIntent');
    const mapEl=$('#recordingMap'),you=$('#mapYou');
    function moveTo(id){
      const p=map.regions.find(x=>x.id===id); if(!p)return;
      selected=p; place.value=id; you.style.left=p.x+'%';you.style.top=p.y+'%';
      root.querySelectorAll('.map-node').forEach(n=>n.classList.toggle('active',n.dataset.region===id));
    }
    root.querySelectorAll('.map-node').forEach(n=>n.addEventListener('click',()=>moveTo(n.dataset.region)));
    place.addEventListener('change',()=>moveTo(place.value));
    scale.addEventListener('input',()=>scaleValue.textContent=Number(scale.value).toFixed(2)+'×');
    function record(){
      const w=byId(selected.id)||selected;
      packet={id:'recording-'+Date.now(),map:map.id,regionId:selected.id,position:{x:selected.x,y:selected.y,z:0},camera:{x:selected.x,y:selected.y,z:1.7,heading:0,pitch:0,fov:50},subject:{agent:agent.value,scale:Number(scale.value)},environment:{occupancy:Number(scale.value),clearance:Number((1/Number(scale.value)).toFixed(3)),dominantMaterials:[],lighting:'world-default',sound:'world-default'},anchors:[{type:'region',id:selected.id,name:w.name}],deltas:[{property:'subject.scale',from:null,to:Number(scale.value)}],intent:intent.value,timestamp:new Date().toISOString(),interpretation:schema.interpretationOrder};
      const all=local();all.unshift(packet);save(all);
      $('#packetTitle').textContent=w.name+' / '+packet.subject.scale.toFixed(2)+'×';
      $('#packetJson').textContent=JSON.stringify(packet,null,2);
      renderRecords();
      window.GEEHUB_INTERACTION?.emit({id:packet.id,at:Date.now(),from:'recording-space',to:'geehub',type:'MEMORY',title:'Recorded '+w.name,body:'Spatial state packet recorded at '+packet.position.x+','+packet.position.y+' for '+agent.value+'.',source:'GEEHUB recording space',artifact:packet.id,live:true});
      return packet;
    }
    function renderRecords(){
      const arr=local();$('#recordedList').innerHTML=arr.length?arr.slice(0,8).map(x=>'<button class="record-card" data-record="'+esc(x.id)+'"><span>'+new Date(x.timestamp).toLocaleTimeString()+'</span><strong>'+esc((byId(x.regionId)||{}).name||x.regionId)+'</strong><small>'+esc(x.subject.agent)+' / '+Number(x.subject.scale).toFixed(2)+'×</small></button>').join(''):'<span>NO RECORDED STATES.</span>';
      root.querySelectorAll('.record-card').forEach(b=>b.addEventListener('click',()=>{const x=arr.find(q=>q.id===b.dataset.record);if(!x)return;packet=x;$('#packetTitle').textContent=(byId(x.regionId)||{}).name+' / '+Number(x.subject.scale).toFixed(2)+'×';$('#packetJson').textContent=JSON.stringify(x,null,2)}));
    }
    $('#recordNow').addEventListener('click',()=>{packet=record()});
    $('#sendImage').addEventListener('click',()=>{
      if(!packet)packet=record();
      const title=(byId(packet.regionId)||{}).name+' / '+packet.intent;
      const prompt='Use canonical GEEHUB map '+map.id+'. Region '+packet.regionId+' at normalized coordinates '+packet.position.x+','+packet.position.y+'. Preserve the recorded environment and anchors. Subject '+packet.subject.agent+' scale '+packet.subject.scale.toFixed(2)+'x. Intent: '+packet.intent+'.';
      window.GEEHUB_IMAGE_WORKER?.build({title,tags:['canonical map','persistent environment',packet.regionId,'adult male',packet.subject.agent,'scale gameplay'],prompt});
      $('#packetTitle').textContent='SENT TO IMAGE WORKER / '+title;
    });
    moveTo(map.regions[0]?.id||'bodylounger'); renderRecords();
  }).catch(()=>{
    root.innerHTML='<div class="recording-offline">PERSISTENT MAP UNAVAILABLE.</div>';
  });
})();