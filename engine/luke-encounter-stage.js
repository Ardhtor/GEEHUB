/* GEEHUB / LUKE ENCOUNTER STAGE
   Persistent character state -> shaded spatial figure -> responsive room -> WebM take. */
(() => {
  if (window.GEEHUB_LUKE_STAGE) return;
  const KEY="geehub-luke-burgeon-v1";
  const $=id=>document.getElementById(id);
  const mount=()=> $("lukeBurgeon");
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch{return{};}};
  let current=read(), from=JSON.parse(JSON.stringify(current.body||{})), target=JSON.parse(JSON.stringify(current.body||{}));
  let started=performance.now(), raf=0, recorder=null, chunks=[];
  const base={shoulders:1,chest:1,arms:1,legs:1,length:1,presence:1};
  const val=(k)=>Math.max(1,Number(target[k]||base[k]));
  function install(){
    const host=mount(); if(!host||$("lukeEncounterStage"))return;
    const section=document.createElement("section");section.id="lukeEncounterStage";section.className="luke-encounter-stage";
    section.innerHTML='<div class="les-head"><div><div class="eyebrow">LIVE ENCOUNTER / MAYA CAMERA 01</div><h2>LUKE / THE ROOM MAKES SPACE</h2><p>One continuous character state. The room, camera, and movement respond to his inherited proportions.</p></div><div id="lesState" class="les-state">INSTANCE CONNECTED</div></div><div class="les-view"><canvas id="lesCanvas" width="1280" height="720"></canvas><div class="les-hud"><span id="lesShot">CAM 01 / FULL BODY</span><span id="lesScale">BASELINE 01</span></div></div><div class="les-controls"><button id="lesRun">RUN NEXT ENCOUNTER</button><button id="lesRender">RENDER WEBM TAKE</button><span id="lesStatus">LIVE / STATE LINKED</span><a id="lesDownload" hidden>save take</a></div>';
    host.insertAdjacentElement("afterend",section);
    $("lesRun").onclick=()=>{const b=$("burgeonRun");if(b)b.click();};
    $("lesRender").onclick=render;
    window.addEventListener("geehub:luke-state",e=>adopt(e.detail));
    document.addEventListener("geehub:luke-state",e=>adopt(e.detail));
    window.addEventListener("storage",e=>{if(e.key===KEY)adopt(read());});
    draw(); loop();
  }
  function adopt(next){current=next||read();from={...base,...(target||{})};target={...base,...(current.body||{})};started=performance.now();$("lesState").textContent="STATE "+String(current.stage||0).padStart(2,"0")+" / INHERITED";$("lesScale").textContent="SCALE "+Math.max(...Object.values(target).map(Number)).toFixed(2)+"×";}
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function ell(c,x,y,rx,ry,light,dark){const g=c.createRadialGradient(x-rx*.32,y-ry*.4,2,x,y,Math.max(rx,ry)*1.15);g.addColorStop(0,light);g.addColorStop(.58,light);g.addColorStop(1,dark);c.fillStyle=g;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function limb(c,a,b,r1,r2,light,dark){const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy),ang=Math.atan2(dy,dx);c.save();c.translate(a.x,a.y);c.rotate(ang);const g=c.createLinearGradient(0,-r1,0,r1);g.addColorStop(0,light);g.addColorStop(.55,light);g.addColorStop(1,dark);c.fillStyle=g;c.beginPath();c.moveTo(0,-r1);c.bezierCurveTo(L*.3,-r1*1.12,L*.7,-r2*1.1,L,-r2);c.lineTo(L,r2);c.bezierCurveTo(L*.7,r2*1.1,L*.3,r1*1.12,0,r1);c.closePath();c.fill();ell(c,0,0,r1,r1,light,dark);ell(c,L,0,r2,r2,light,dark);c.restore();}
  function draw(){
    const c=$("lesCanvas")?.getContext("2d");if(!c)return;
    const W=1280,H=720,t=(performance.now()-started)/1000,blend=1-Math.exp(-t*1.7);
    const body={};Object.keys(base).forEach(k=>body[k]=(Number(from[k]||base[k])*(1-blend)+val(k)*blend));
    const scale=Math.max(...Object.values(body)),room=clamp(1+(scale-1)*.19,1,3.2);
    const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#07121c");bg.addColorStop(.55,"#1a2a35");bg.addColorStop(1,"#05090e");c.fillStyle=bg;c.fillRect(0,0,W,H);
    // deep perspective room, fluorescent ceiling, reflective floor
    c.fillStyle="rgba(49,166,207,.12)";c.fillRect(0,0,150,H);c.fillRect(W-150,0,150,H);
    c.strokeStyle="rgba(129,190,205,.16)";c.lineWidth=2;
    for(let i=0;i<=10;i++){const x=i*W/10;c.beginPath();c.moveTo(640+(x-640)*.12,270);c.lineTo(x,H);c.stroke();}
    for(let i=0;i<8;i++){const y=285+i*i*7;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
    c.fillStyle="#101a20";c.beginPath();c.moveTo(0,260);c.lineTo(W,260);c.lineTo(W,H);c.lineTo(0,H);c.fill();
    for(let i=0;i<4;i++){c.fillStyle="rgba(112,213,245,.22)";c.fillRect(230+i*275,70,170,8);}
    if(window.GEEHUB_LUKE_RIG){window.GEEHUB_LUKE_RIG.render(c,t,{width:W,height:H,x:640,base:615});}else{
    const cx=640, floor=625, h=clamp(300+body.length*44,344,610), torsoW=clamp(72+body.shoulders*30,100,250), chestW=clamp(60+body.chest*26,86,220), legW=clamp(23+body.legs*11,34,105), armW=clamp(18+body.arms*10,28,94), headY=floor-h-20, torsoTop=headY+100, torsoBottom=floor-h*.43;
    const cam=clamp(1+(scale-1)*.025,1,1.23);c.save();c.translate(cx,floor);c.scale(cam,cam);c.translate(-cx,-floor);
    // shadow and legs with knee/calf articulation
    ell(c,cx,floor+8,torsoW*1.3,18,"rgba(77,137,158,.35)","rgba(0,0,0,.05)");
    const hipY=torsoBottom-4, kneeY=floor-(h*.22), ankleY=floor-12, spread=torsoW*.34;
    limb(c,{x:cx-spread,y:hipY},{x:cx-spread*1.08,y:kneeY},legW*1.15,legW*.88,"#b9a79a","#514b4a");
    limb(c,{x:cx-spread*1.08,y:kneeY},{x:cx-spread*1.12,y:ankleY},legW*.78,legW*.55,"#9c8c82","#37383b");
    limb(c,{x:cx+spread,y:hipY},{x:cx+spread*1.08,y:kneeY},legW*1.15,legW*.88,"#b9a79a","#514b4a");
    limb(c,{x:cx+spread*1.08,y:kneeY},{x:cx+spread*1.12,y:ankleY},legW*.78,legW*.55,"#9c8c82","#37383b");
    ell(c,cx-spread*1.12,floor-5,legW*.9,13,"#35383b","#111519");ell(c,cx+spread*1.12,floor-5,legW*.9,13,"#35383b","#111519");
    // torso, chest, deltoids, neck and head
    ell(c,cx,torsoBottom-18,torsoW*.68,(torsoBottom-torsoTop)*.5,"#c3b0a1","#504b4b");
    ell(c,cx,torsoTop+48,chestW,55,"#d0bcae","#62544f");
    ell(c,cx-torsoW*.62,torsoTop+12,torsoW*.43,torsoW*.34,"#cbb7a8","#554b49");ell(c,cx+torsoW*.62,torsoTop+12,torsoW*.43,torsoW*.34,"#cbb7a8","#554b49");
    ell(c,cx,torsoTop+120,torsoW*.39,70,"#aa998e","#494749");
    c.fillStyle="#a58e82";c.fillRect(cx-20,torsoTop-30,40,45);ell(c,cx,headY+25,30,39,"#d4bfae","#66534d");
    // arms: shoulder -> elbow -> wrist; round volume and visible joints
    const shoulderY=torsoTop+20, elbowY=torsoTop+130, wristY=torsoBottom-8, shoulderX=torsoW*.88;
    for(const side of [-1,1]){const sx=cx+side*shoulderX,ex=cx+side*(shoulderX+armW*1.2),wx=cx+side*(shoulderX+armW*1.35);limb(c,{x:sx,y:shoulderY},{x:ex,y:elbowY},armW*1.15,armW*.88,"#cbb7a8","#554b49");limb(c,{x:ex,y:elbowY},{x:wx,y:wristY},armW*.78,armW*.58,"#b6a294","#514947");ell(c,wx,wristY+14,15,22,"#c5b09f","#544b48");}
    // fabric follows the changed chest and shoulder line
    c.fillStyle="#263b48";c.beginPath();c.moveTo(cx-torsoW*.7,torsoTop+4);c.quadraticCurveTo(cx,torsoTop-28,cx+torsoW*.7,torsoTop+4);c.lineTo(cx+torsoW*.55,torsoBottom-10);c.quadraticCurveTo(cx,torsoBottom+5,cx-torsoW*.55,torsoBottom-10);c.closePath();c.fill();
    c.strokeStyle="rgba(205,225,230,.48)";c.lineWidth=3;c.beginPath();c.moveTo(cx-torsoW*.35,torsoTop+5);c.lineTo(cx,torsoTop+35);c.lineTo(cx+torsoW*.35,torsoTop+5);c.stroke();
    c.restore();
    }
    // camera metadata and subtle CRT grain
    c.fillStyle="rgba(0,0,0,.55)";c.fillRect(0,0,W,42);c.fillStyle="#a8c5d0";c.font="16px monospace";c.fillText("GEEHUB / LUKE ENCOUNTER / PERSISTENT CGI TAKE",26,27);
    c.fillStyle="rgba(0,0,0,.62)";c.fillRect(0,H-38,W,38);c.fillStyle="#a8c5d0";c.fillText("CAM 01   24 FPS   ROOM ADAPTATION "+room.toFixed(2)+"x   BODY "+scale.toFixed(2)+"x",26,H-14);
    for(let i=0;i<100;i++){const x=(i*131+Math.sin(t*2+i)*20)%W,y=(i*71+Math.cos(t+i)*12)%H;c.fillStyle="rgba(220,235,235,.035)";c.fillRect(x,y,2,2);}
  }
  function loop(){draw();raf=requestAnimationFrame(loop);}
  async function render(){
    const canvas=$("lesCanvas"),status=$("lesStatus"),button=$("lesRender");
    if(!canvas.captureStream||!window.MediaRecorder){status.textContent="WEBM RECORDING NOT SUPPORTED";return;}
    button.disabled=true;status.textContent="RECORDING / 12 SECOND TAKE";chunks=[];
    const stream=canvas.captureStream(24),mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(x=>MediaRecorder.isTypeSupported(x));
    if(!mime){status.textContent="WEBM CODEC UNAVAILABLE";button.disabled=false;return;}
    recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:7000000});
    const done=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));});
    recorder.start(250);await new Promise(r=>setTimeout(r,12000));recorder.stop();stream.getTracks().forEach(t=>t.stop());const blob=await done;
    const url=URL.createObjectURL(blob),a=$("lesDownload");a.href=url;a.download="GEEHUB-Luke-Encounter-"+new Date().toISOString().slice(0,10)+".webm";a.hidden=false;
    status.textContent="TAKE COMPLETE / "+(blob.size/1048576).toFixed(1)+" MB";button.disabled=false;
    window.dispatchEvent(new CustomEvent("geehub:video-rendered",{detail:{name:a.download,size:blob.size,mime,source:"luke-encounter-stage"}}));
    if(window.GEEHUB_ARTIFACTS?.emit)window.GEEHUB_ARTIFACTS.emit({type:"VIDEO",title:"Luke / Persistent Encounter Take",body:"A 12-second WebM take rendered from Luke's inherited body state and responsive room.",source:"engine/luke-encounter-stage.js",canon:"experiment",dreamable:true});
  }
  window.GEEHUB_LUKE_STAGE={draw,render,adopt};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();