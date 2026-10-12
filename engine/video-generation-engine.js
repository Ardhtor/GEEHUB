/* GEEHUB VIDEO FORGE // procedural CGI motion + generated soundtrack
   Browser-native generator. Produces an actual WebM video with synthesized audio. */
(() => {
  if (window.GEEHUB_VIDEO_FORGE) return;
  const $ = (s, root=document) => root.querySelector(s);
  const state = { raf:0, start:0, recorder:null, chunks:[], stream:null, audio:null, nodes:[], running:false };
  const mount = $('#videoRealmPlay') || $('#hulumscaveForge');
  if (!mount) return;
  mount.innerHTML = `
    <section class="gh-video-forge">
      <div class="ghvf-head"><div><div class="eyebrow">GEEHUB / VIDEO ENGINE</div><h2>HULUM'S CAVE — MOTION FORGE</h2><p>Generate a moving CGI scene with an original procedural soundtrack.</p></div><span class="ghvf-live" id="ghvfStatus">ENGINE READY</span></div>
      <div class="ghvf-stage"><canvas id="ghvfCanvas" width="1280" height="720" aria-label="Live procedural CGI preview"></canvas><div class="ghvf-overlay"><span id="ghvfShot">SHOT 01 / INDUSTRIAL ROOM</span><span id="ghvfClock">00:00</span></div></div>
      <div class="ghvf-controls"><label>SCENE<select id="ghvfScene"><option value="bond">Leather / Steel</option><option value="growth">Growth Morph</option><option value="facility">Observation Room</option></select></label><label>DURATION<select id="ghvfDuration"><option value="8">8 seconds</option><option value="12" selected>12 seconds</option><option value="20">20 seconds</option></select></label><label>SOUND<select id="ghvfSound"><option value="industrial">Industrial drone</option><option value="dark">Dark ambient</option><option value="room">Room tone</option></select></label><button id="ghvfPreview" type="button">PREVIEW</button><button id="ghvfRender" class="ghvf-primary" type="button">RENDER VIDEO + SOUND</button></div>
      <div class="ghvf-foot"><span>1280 × 720 / 24 FPS / ORIGINAL SYNTH SOUND</span><a id="ghvfDownload" hidden>save rendered video ↗</a></div>
    </section>`;
  const canvas = $('#ghvfCanvas'), ctx = canvas.getContext('2d');
  const W=canvas.width,H=canvas.height;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  function ellipse(x,y,rx,ry,fill,stroke=null,lw=1){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke();}}
  function poly(points,fill,stroke=null,lw=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke();}}
  function line(points,color,width=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function bg(t){
    const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#11161b');g.addColorStop(.52,'#272521');g.addColorStop(1,'#090d12');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(28,110,154,.17)';ctx.fillRect(0,0,210,H);
    ctx.fillStyle='rgba(223,146,68,.12)';ctx.fillRect(W-340,0,340,H);
    for(let i=0;i<8;i++){const x=80+i*165;line([[x,80],[x+Math.sin(t*.4+i)*8,590]],'rgba(180,190,191,.09)',2);}
    for(let i=0;i<7;i++){const y=110+i*78;line([[0,y],[W,y]],'rgba(180,190,191,.06)',1);}
    poly([[0,540],[W,495],[W,H],[0,H]],'#17191b');
    for(let i=0;i<9;i++){const x=(i*179+Math.sin(t*.3+i)*8)%W;line([[x,545],[x-150,720]],'rgba(186,153,111,.10)',2);}
    ctx.fillStyle='rgba(5,8,11,.52)';ctx.fillRect(0,0,W,52);
    ctx.fillStyle='#a5b4b9';ctx.font='16px monospace';ctx.fillText('GEEHUB / VISUAL MEMORY / TAKE 01',28,32);
  }
  function man(x,y,s,t,variant,scene){
    const breath=Math.sin(t*2.2+variant)*4, grow=scene==='growth'?1+0.16*ease((t%8)/8):1;
    ctx.save();ctx.translate(x,y);ctx.scale(s*grow,s);
    const skin=variant===0?'#777b7a':'#666d70',hi=variant===0?'#a0a09a':'#898f90',shade='#343b3f';
    // legs and boots
    poly([[-36,70],[-4,72],[2,200],[-10,250],[-43,250],[-47,201]],shade);
    poly([[5,72],[39,69],[54,200],[42,250],[12,250],[8,190]],'#30363a');
    poly([[-46,235],[-8,235],[-2,255],[-58,255]],'#090c0e');
    poly([[12,235],[45,235],[67,255],[8,255]],'#090c0e');
    // torso silhouette
    poly([[-52,-64],[-75,-92],[-61,-118],[-26,-135],[0,-125],[29,-137],[65,-116],[76,-87],[51,-61],[43,30],[27,77],[-28,77],[-45,30]],skin,'#20272b',3);
    // chest and abdomen sculpt highlights
    ellipse(-24,-73,28,22,hi);ellipse(25,-73,28,22,hi);
    line([[-1,-98],[-1,-40],[-2,13]],'rgba(20,26,29,.72)',5);
    ellipse(-19,-31,17,13,'#656b6b');ellipse(19,-31,17,13,'#555d60');
    ellipse(-17,1,15,10,'#606767');ellipse(17,1,15,10,'#4b5458');
    // neck/head, same identity through changing size
    poly([[-15,-134],[-13,-155],[13,-155],[16,-133]],skin);
    ellipse(0,-176,25,30,hi,'#343a3c',2);
    ellipse(-8,-181,3,2,'#111719');ellipse(8,-181,3,2,'#111719');
    line([[-8,-164],[0,-160],[8,-164]],'#41484a',2);
    // arms with clear mass
    const swing=Math.sin(t*1.7+variant)*7;
    line([[-55,-102],[-78,-67+breath],[-87+swing,-10],[-82+swing,28]],shade,30);
    line([[-55,-102],[-78,-67+breath],[-87+swing,-10]],skin,24);
    line([[-87+swing,-10],[-82+swing,28]],hi,20);
    line([[55,-102],[77,-70-breath],[88-swing,-13],[83-swing,27]],shade,30);
    line([[55,-102],[77,-70-breath],[88-swing,-13]],skin,24);
    line([[88-swing,-13],[83-swing,27]],hi,20);
    ellipse(-82+swing,35,10,15,skin);ellipse(83-swing,35,10,15,skin);
    if(scene==='bond'&&variant===0){
      // leather wrist cuffs and steel link; costume restraint prop, nonsexual staging
      ctx.fillStyle='#090b0d';ctx.fillRect(-96,15,25,15);ctx.fillRect(70,15,25,15);
      ctx.strokeStyle='#8a8f90';ctx.lineWidth=3;ctx.strokeRect(-96,15,25,15);ctx.strokeRect(70,15,25,15);
      line([[-70,22],[0,44],[70,22]],'#92999b',4);
      ellipse(0,44,5,5,'#c0a778');
    }
    if(scene==='facility'){ctx.fillStyle='rgba(43,137,174,.65)';ctx.fillRect(-50,-117,100,7);}
    // rough tank top / work trousers
    poly([[-50,-111],[-27,-128],[-14,-113],[14,-113],[28,-128],[52,-111],[40,-54],[-39,-54]],'#202a30','#657176',2);
    line([[-31,-100],[-20,-63],[0,-58],[21,-63],[31,-100]],'rgba(154,162,160,.35)',2);
    ctx.restore();
  }
  function draw(t){
    const scene=$('#ghvfScene').value;bg(t);
    // overhead fluorescent panels and floor haze
    for(let i=0;i<3;i++){ctx.fillStyle='rgba(209,177,131,'+(0.05+0.025*Math.sin(t*1.4+i))+')';ctx.fillRect(150+i*410,55,190,8);}
    const haze=ctx.createRadialGradient(660,420,10,660,420,430);haze.addColorStop(0,'rgba(108,132,140,.08)');haze.addColorStop(1,'rgba(5,7,9,0)');ctx.fillStyle=haze;ctx.fillRect(0,60,W,H-60);
    // steel bench / restraint rail
    ctx.fillStyle='#343a3d';ctx.fillRect(230,435,610,20);ctx.fillStyle='#111619';ctx.fillRect(250,455,18,110);ctx.fillRect(805,455,18,110);
    line([[235,442],[840,442]],'#879093',2);
    man(scene==='bond'?500:490,415,1.02,t,0,scene);
    man(scene==='bond'?850:790,408,.91,t,1,scene);
    if(scene==='growth'){
      // retained outline makes the morph legible against a remembered baseline
      ctx.save();ctx.globalAlpha=.17;ctx.setLineDash([8,8]);ctx.strokeStyle='#c4a16c';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(490,280,105,205,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      ctx.fillStyle='#c5a36f';ctx.font='15px monospace';ctx.fillText('PREVIOUS BASELINE RETAINED',36,675);
    }
    if(scene==='bond'){
      ctx.fillStyle='#a6aeb0';ctx.font='14px monospace';ctx.fillText('LEATHER / STEEL / TRUST',36,675);
    } else if(scene==='facility'){
      ctx.fillStyle='#6bb7d1';ctx.font='14px monospace';ctx.fillText('OBSERVATION GLASS / SUBJECT PRESENT',36,675);
      ctx.strokeStyle='rgba(81,157,186,.28)';ctx.lineWidth=5;ctx.strokeRect(90,92,1100,480);
    }
    // camera creep, analog grain, edge falloff
    const vign=ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,760);vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=vign;ctx.fillRect(0,0,W,H);
    for(let i=0;i<180;i++){const x=(i*97+Math.sin(t*3+i)*15)%W,y=(i*53+Math.cos(t*2+i)*11)%H;ctx.fillStyle=i%3?'rgba(210,200,175,.035)':'rgba(0,0,0,.07)';ctx.fillRect(x,y,2,2);}
    ctx.fillStyle='rgba(8,12,16,.75)';ctx.fillRect(0,H-38,W,38);
    ctx.fillStyle='#879399';ctx.font='13px monospace';ctx.fillText('REC ●   CAM 02   24FPS   GEEHUB VIDEO ENGINE',24,H-14);
  }
  function frame(now){if(!state.running)return;const t=(now-state.start)/1000;draw(t);$('#ghvfClock').textContent='00:'+String(Math.floor(t)).padStart(2,'0');state.raf=requestAnimationFrame(frame);}
  function preview(){cancelAnimationFrame(state.raf);state.running=true;state.start=performance.now();$('#ghvfStatus').textContent='PREVIEW / LIVE';frame(state.start);}
  function stopPreview(){state.running=false;cancelAnimationFrame(state.raf);}
  function soundtrack(ctxAudio,duration,mode){
    const master=ctxAudio.createGain();master.gain.value=.24;master.connect(ctxAudio.destination);
    const out=ctxAudio.createMediaStreamDestination();master.connect(out);
    const osc=ctxAudio.createOscillator(), low=ctxAudio.createOscillator(), lfo=ctxAudio.createOscillator(), lfoGain=ctxAudio.createGain();
    osc.type='sawtooth';osc.frequency.value=mode==='dark'?48:mode==='room'?37:54;
    low.type='sine';low.frequency.value=mode==='dark'?41:mode==='room'?28:36;
    lfo.type='sine';lfo.frequency.value=.17;lfoGain.gain.value=mode==='industrial'?10:4;
    lfo.connect(lfoGain);lfoGain.connect(osc.frequency);
    const filter=ctxAudio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=mode==='industrial'?180:110;filter.Q.value=.7;
    const g1=ctxAudio.createGain(),g2=ctxAudio.createGain();g1.gain.value=.07;g2.gain.value=.24;
    osc.connect(filter);filter.connect(g1);g1.connect(master);low.connect(g2);g2.connect(master);
    osc.start();low.start();lfo.start();
    // sparse metal impacts, generated locally
    for(let at=1.8;at<duration;at+=3.4){
      const bell=ctxAudio.createOscillator(),bg=ctxAudio.createGain();bell.type='triangle';bell.frequency.setValueAtTime(480,ctxAudio.currentTime+at);bell.frequency.exponentialRampToValueAtTime(90,ctxAudio.currentTime+at+.42);bg.gain.setValueAtTime(.0001,ctxAudio.currentTime+at);bg.gain.exponentialRampToValueAtTime(.13,ctxAudio.currentTime+at+.012);bg.gain.exponentialRampToValueAtTime(.0001,ctxAudio.currentTime+at+.6);bell.connect(bg);bg.connect(master);bell.start(ctxAudio.currentTime+at);bell.stop(ctxAudio.currentTime+at+.65);
    }
    return {stream:out.stream,stop:()=>{try{osc.stop();low.stop();lfo.stop();}catch{};master.disconnect();}};
  }
  async function render(){
    const duration=Number($('#ghvfDuration').value), mode=$('#ghvfSound').value;
    const canvasStream=canvas.captureStream(24), AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext||!window.MediaRecorder){$('#ghvfStatus').textContent='THIS BROWSER CANNOT RECORD';return;}
    const ac=new AudioContext();await ac.resume();const sound=soundtrack(ac,duration,mode);
    const combined=new MediaStream([...canvasStream.getVideoTracks(),...sound.stream.getAudioTracks()]);
    const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
    if(!mime){$('#ghvfStatus').textContent='WEBM EXPORT UNAVAILABLE';sound.stop();await ac.close();return;}
    state.chunks=[];const rec=new MediaRecorder(combined,{mimeType:mime,videoBitsPerSecond:6500000,audioBitsPerSecond:160000});
    state.recorder=rec;const blobPromise=new Promise((resolve,reject)=>{rec.ondataavailable=e=>{if(e.data.size)state.chunks.push(e.data);};rec.onerror=()=>reject(new Error('Recording failed'));rec.onstop=()=>resolve(new Blob(state.chunks,{type:mime}));});
    stopPreview();state.running=true;state.start=performance.now();frame(state.start);rec.start(250);
    $('#ghvfStatus').textContent='RENDERING / SOUND LIVE';$('#ghvfRender').disabled=true;$('#ghvfDownload').hidden=true;
    await new Promise(r=>setTimeout(r,duration*1000));
    stopPreview();rec.stop();sound.stop();canvasStream.getTracks().forEach(t=>t.stop());combined.getTracks().forEach(t=>t.stop());await ac.close();
    const blob=await blobPromise;const url=URL.createObjectURL(blob);const a=$('#ghvfDownload');a.href=url;a.download='GEEHUB-HulumsCave-'+$('#ghvfScene').value+'-'+new Date().toISOString().slice(0,10)+'.webm';a.hidden=false;
    $('#ghvfStatus').textContent='RENDER COMPLETE / '+(blob.size/1048576).toFixed(1)+' MB';$('#ghvfRender').disabled=false;
    if(window.GEEHUB_ARTIFACTS?.emit){window.GEEHUB_ARTIFACTS.emit({type:'VIDEO',title:'Hulum’s Cave / '+$('#ghvfScene').value,body:'Rendered WebM with generated soundtrack. Save the video file from the forge to archive it.'});}
    window.dispatchEvent(new CustomEvent('geehub:video-rendered',{detail:{name:a.download,size:blob.size,mime}}));
  }
  $('#ghvfPreview').addEventListener('click',preview);
  $('#ghvfRender').addEventListener('click',()=>render().catch(e=>{$('#ghvfStatus').textContent='RENDER FAILED / '+e.message;$('#ghvfRender').disabled=false;}));
  $('#ghvfScene').addEventListener('change',()=>{if(!state.running)draw(0);});
  draw(0);window.GEEHUB_VIDEO_FORGE={preview,render,draw};
})();