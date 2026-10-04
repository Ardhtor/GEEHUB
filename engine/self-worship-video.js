/* GEEHUB SELF-WORSHIP VIDEO ENGINE
   Browser-native cinematic video generation.
*/
(() => {
  const root = document.querySelector('#selfWorshipVideo');
  if (!root) return;
  const W=1280,H=720,FPS=30,DURATION=18;
  let running=false,recorder=null,chunks=[],raf=0,started=0;
  root.innerHTML =
    '<div class="sv-stage"><canvas id="svCanvas" width="'+W+'" height="'+H+'" aria-label="Generated self-worship video"></canvas><div class="sv-scan"></div><div class="sv-control"><button id="svRun" class="vision-button" type="button" aria-label="Run video" title="Run video">▶</button><a id="svSave" class="vision-save" hidden aria-label="Open generated video" title="Open generated video">↗</a></div><div class="sv-hud"><span id="svState" aria-hidden="true"></span><span id="svTime" aria-hidden="true"></span></div></div>';

  const canvas=root.querySelector('#svCanvas'),ctx=canvas.getContext('2d');
  const run=root.querySelector('#svRun'),save=root.querySelector('#svSave'),state=root.querySelector('#svState'),time=root.querySelector('#svTime'),scene=root.querySelector('#svScene');
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v);};

  function drawFigure(cx,baseY,scale,alpha,reflection){
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,baseY);ctx.scale(scale,scale);if(reflection)ctx.scale(1,-1);
    const body=ctx.createLinearGradient(-90,-430,90,10);
    body.addColorStop(0,'#eef4f7');body.addColorStop(.28,'#aebbc5');body.addColorStop(.68,'#56636e');body.addColorStop(1,'#1a222a');
    ctx.fillStyle=body;ctx.shadowColor='rgba(190,220,240,.28)';ctx.shadowBlur=32;
    ctx.beginPath();ctx.ellipse(0,-445,48,62,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.roundRect(-22,-392,44,34,12);ctx.fill();
    ctx.beginPath();ctx.moveTo(-95,-350);ctx.quadraticCurveTo(-150,-330,-132,-265);ctx.lineTo(-100,-105);ctx.quadraticCurveTo(-72,-62,0,-52);ctx.quadraticCurveTo(72,-62,100,-105);ctx.lineTo(132,-265);ctx.quadraticCurveTo(150,-330,95,-350);ctx.quadraticCurveTo(55,-380,0,-370);ctx.quadraticCurveTo(-55,-380,-95,-350);ctx.fill();
    ctx.fillRect(-128,-320,42,175);ctx.fillRect(86,-320,42,175);
    ctx.beginPath();ctx.moveTo(-62,-70);ctx.lineTo(-42,0);ctx.lineTo(-10,0);ctx.lineTo(0,-62);ctx.lineTo(10,-62);ctx.lineTo(42,0);ctx.lineTo(62,-70);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(-66,-315,132,8);ctx.restore();
  }

  function drawMirror(x,y,w,h,phase){
    ctx.save();ctx.translate(x,y);ctx.strokeStyle='rgba(210,225,235,.45)';ctx.lineWidth=7;ctx.shadowColor='rgba(70,150,255,.28)';ctx.shadowBlur=26;ctx.strokeRect(-w/2,-h/2,w,h);ctx.shadowBlur=0;
    const g=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);g.addColorStop(0,'rgba(35,58,78,.72)');g.addColorStop(.5,'rgba(7,13,20,.42)');g.addColorStop(1,'rgba(50,75,92,.62)');
    ctx.fillStyle=g;ctx.fillRect(-w/2,-h/2,w,h);const pulse=.5+.5*Math.sin(phase*5);ctx.strokeStyle='rgba(110,190,255,'+(0.16+0.14*pulse)+')';ctx.lineWidth=2;ctx.strokeRect(-w/2+18,-h/2+18,w-36,h-36);ctx.restore();
  }

  function drawFrame(t){
    const p=t/DURATION,pulse=.5+.5*Math.sin(t*1.8);ctx.clearRect(0,0,W,H);
    const bg=ctx.createRadialGradient(W*.5,H*.36,20,W*.5,H*.48,H*.78);bg.addColorStop(0,'#24313d');bg.addColorStop(.4,'#0d141b');bg.addColorStop(1,'#020305');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    for(let i=0;i<32;i++){const x=(i*83.7+(t*11*(i%3+1)))%W,y=(i*47.2+Math.sin(t*.4+i)*38+H*.12)%H;ctx.fillStyle='rgba(210,230,240,'+(0.025+(i%4)*.012)+')';ctx.fillRect(x,y,2,2);}
    const floor=ctx.createLinearGradient(0,H*.62,0,H);floor.addColorStop(0,'rgba(100,125,145,.12)');floor.addColorStop(1,'rgba(0,0,0,.78)');ctx.fillStyle=floor;ctx.fillRect(0,H*.62,W,H*.38);
    ctx.strokeStyle='rgba(130,160,180,.12)';ctx.lineWidth=1;for(let i=0;i<13;i++){const yy=H*.64+i*i*2.7;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(W,yy);ctx.stroke();}
    const ascent=ease((p-.46)/.25),ret=ease((p-.76)/.22),cx=W/2+Math.sin(t*.45)*22*(1-ascent),scale=.72+.42*ascent+Math.sin(t*1.3)*.012;
    drawMirror(W*.23,H*.38,190,420,p);drawMirror(W*.77,H*.38,190,420,p+1.2);
    ctx.save();ctx.globalAlpha=.22+.16*pulse;ctx.fillStyle='#6bbcff';ctx.beginPath();ctx.arc(cx,H*.32,135+22*pulse,0,Math.PI*2);ctx.fill();ctx.restore();
    drawFigure(cx,H*.79,scale,.96,false);drawFigure(cx,H*.79,scale*.98*(1-ret*.18),.11,true);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2+t*.18,r=235+Math.sin(t+i)*18,x=cx+Math.cos(a)*r,y=H*.42+Math.sin(a)*r*.28;ctx.strokeStyle='rgba(150,205,245,.16)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,28+8*pulse,0,Math.PI*2);ctx.stroke();}
    const vign=ctx.createRadialGradient(W/2,H/2,H*.15,W/2,H/2,H*.76);vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.7)');ctx.fillStyle=vign;ctx.fillRect(0,0,W,H);
    const labels=[[0,'APPROACH'],[.20,'THE ROOM TURNS'],[.40,'REFLECTION'],[.58,'ASCENT'],[.78,'THE WORLD REMEMBERS'],[.92,'RETURN']];let label=labels[0][1];labels.forEach(x=>{if(p>=x[0])label=x[1];});scene.textContent=label;
    ctx.fillStyle='rgba(220,232,240,.82)';ctx.font='600 18px "Courier New", monospace';ctx.fillText('GEEHUB / '+label,54,H-42);ctx.fillStyle='rgba(180,200,215,.45)';ctx.font='12px "Courier New", monospace';ctx.fillText('SELF WORSHIP // PRESENCE BECOMES PLACE',54,H-20);
  }

  function stopUI(){running=false;cancelAnimationFrame(raf);run.disabled=false;run.textContent='▶';state.textContent='READY // 18 SEC';}
  function animate(){if(!running)return;const elapsed=(performance.now()-started)/1000,t=Math.min(DURATION,elapsed);drawFrame(t);time.textContent='00:'+String(Math.floor(t)).padStart(2,'0');if(t>=DURATION){if(recorder&&recorder.state==='recording')recorder.stop();return;}raf=requestAnimationFrame(animate);}
  function runVideo(){
    if(running)return;running=true;chunks=[];save.hidden=true;run.disabled=true;run.textContent='●';state.textContent='BUILDING // CANVAS → WEBM';drawFrame(0);
    if(!window.MediaRecorder){state.textContent='PREVIEW ONLY // MEDIARECORDER UNAVAILABLE';started=performance.now();animate();setTimeout(stopUI,(DURATION+.2)*1000);return;}
    const stream=canvas.captureStream(FPS),mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'';
    recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{const blob=new Blob(chunks,{type:'video/webm'}),url=URL.createObjectURL(blob);save.href=url;save.download='geehub-self-worship-rite.webm';save.textContent='↗';save.hidden=false;state.textContent='COMPLETE // WEBM READY';window.GEEHUB_ARTIFACTS?.emit?.({type:'video',title:'SELF WORSHIP // THE RITE OF RETURN',body:'Browser-generated 18-second cinematic self-worship sequence.',source:'engine/self-worship-video.js',lineage:{engine:'self-worship-video',duration:18},canon:'experimental',dreamable:true});stopUI();};
    recorder.start(100);started=performance.now();animate();
  }
  run.addEventListener('click',runVideo);drawFrame(0);
})();