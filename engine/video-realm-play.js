/* GEEHUB VIDEO REALM — PLAY MODE
   Multiple adult men inhabit the same generated temporal space.
   Non-explicit: movement, interaction, scale, gesture, environment.
*/
(() => {
  const root = document.querySelector('#videoRealmPlay');
  if (!root) return;

  const W=1280,H=720,FPS=30,DURATION=20;
  let running=false, previewing=true, rec=null, chunks=[], raf=0, start=0;

  root.innerHTML =
    '<div class="vr-stage"><canvas id="vrCanvas" width="'+W+'" height="'+H+'" aria-label="Generated video realm"></canvas><div class="vr-control"><button id="vrRun" class="vision-button" type="button" aria-label="Run realm" title="Run realm">▶</button></div><div class="vr-hud"><span id="vrState" aria-hidden="true"></span><span id="vrTime" aria-hidden="true"></span></div></div>';

  const c=root.querySelector('#vrCanvas'),x=c.getContext('2d'),run=root.querySelector('#vrRun'),state=root.querySelector('#vrState'),time=root.querySelector('#vrTime');
  const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};

  function man(px,py,s,phase,turn=0){
    const bob=Math.sin(phase*2.3)*5;
    x.save();x.translate(px,py+bob);x.scale(s,s);x.rotate(turn);
    const g=x.createLinearGradient(-45,-250,45,20);g.addColorStop(0,'#f0f3f5');g.addColorStop(.45,'#99a7b1');g.addColorStop(1,'#263038');
    x.fillStyle=g;x.shadowColor='rgba(180,220,245,.18)';x.shadowBlur=22;
    x.beginPath();x.ellipse(0,-265,34,44,0,0,Math.PI*2);x.fill();
    x.beginPath();x.roundRect(-17,-224,34,27,9);x.fill();
    x.beginPath();x.moveTo(-58,-200);x.quadraticCurveTo(-82,-180,-72,-135);x.lineTo(-56,-64);x.quadraticCurveTo(-40,-39,0,-35);x.quadraticCurveTo(40,-39,56,-64);x.lineTo(72,-135);x.quadraticCurveTo(82,-180,58,-200);x.quadraticCurveTo(30,-220,0,-215);x.quadraticCurveTo(-30,-220,-58,-200);x.fill();
    x.fillRect(-68,-182,24,112);x.fillRect(44,-182,24,112);
    x.beginPath();x.moveTo(-40,-53);x.lineTo(-31,30);x.lineTo(-7,30);x.lineTo(0,-45);x.lineTo(7,-45);x.lineTo(31,30);x.lineTo(40,-53);x.closePath();x.fill();
    x.shadowBlur=0;x.restore();
  }

  function pillar(px){
    x.fillStyle='rgba(150,175,195,.12)';x.fillRect(px,145,70,420);
    x.fillRect(px-12,132,94,18);x.fillRect(px-10,565,90,16);
  }

  function frame(t){
    const p=t/DURATION;
    x.clearRect(0,0,W,H);
    const bg=x.createRadialGradient(W*.5,H*.33,10,W*.5,H*.5,H*.9);
    bg.addColorStop(0,'#293944');bg.addColorStop(.42,'#0d151b');bg.addColorStop(1,'#010203');
    x.fillStyle=bg;x.fillRect(0,0,W,H);
    for(let i=0;i<42;i++){
      const px=(i*67+t*(7+i%5))%W, py=(i*39+Math.sin(t*.35+i)*45)%H;
      x.fillStyle='rgba(220,235,245,'+(0.025+(i%3)*.012)+')';x.fillRect(px,py,2,2);
    }
    pillar(95);pillar(1115);
    x.strokeStyle='rgba(130,165,190,.17)';x.lineWidth=2;
    for(let i=0;i<8;i++){let yy=410+i*i*6;x.beginPath();x.moveTo(80,yy);x.lineTo(1200,yy);x.stroke();}

    const a=ease((p-.02)/.12), play=ease((p-.26)/.28), settle=ease((p-.73)/.2);
    const m1x=lerp(-100,430,a)+Math.sin(t*.9)*24;
    const m2x=lerp(1380,735,a)+Math.sin(t*1.1+1)*22;
    const m3x=lerp(620,1010,a)+Math.sin(t*.7+2)*30;

    man(m1x,H*.77,.95, t, Math.sin(t*.8)*.025);
    man(m2x,H*.78,1.06,t+1.4, -Math.sin(t*.75+.6)*.025);
    man(m3x,H*.79,.82,t+2.3, Math.cos(t*.65)*.03);

    // Shared play: figures orbit, gesture, and cross paths.
    if(play>.05){
      const q=(t-5.2)*.85;
      const cx=640+Math.sin(q)*180, cy=H*.48+Math.cos(q*1.3)*48;
      x.strokeStyle='rgba(120,195,245,'+(0.10+0.14*(1-settle))+')';x.lineWidth=3;
      x.beginPath();x.arc(cx,cy,52+15*Math.sin(t*2),0,Math.PI*2);x.stroke();
      for(let i=0;i<5;i++){const aa=t*.8+i*1.256;const px=cx+Math.cos(aa)*105,py=cy+Math.sin(aa)*28;x.beginPath();x.arc(px,py,8,0,Math.PI*2);x.stroke();}
    }

    // Light follows whoever is moving.
    x.save();x.globalAlpha=.12+.08*play;x.fillStyle='#7ec6f6';
    x.beginPath();x.ellipse(640,H*.44,300+90*Math.sin(t),155,0,0,Math.PI*2);x.fill();x.restore();

    const vign=x.createRadialGradient(W/2,H/2,H*.15,W/2,H/2,H*.78);
    vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.68)');x.fillStyle=vign;x.fillRect(0,0,W,H);

    const labels=[[0,'ARRIVAL'],[.18,'NOTICE'],[.34,'PLAY'],[.58,'CROSSING'],[.76,'TOGETHER'],[.92,'REST']];
    let label=labels[0][1];labels.forEach(v=>{if(p>=v[0])label=v[1];});
    const overlay=root.querySelector('.vr-beat'); if(overlay) overlay.textContent=label;
  }
  function lerp(a,b,t){return a+(b-a)*t;}
  function tick(){
    if(!running && !previewing)return;
    const elapsed=(performance.now()-start)/1000;
    const t=running?Math.min(DURATION,elapsed):elapsed%DURATION;
    frame(t);
    time.textContent='00:'+String(Math.floor(t)).padStart(2,'0');
    if(running && t>=DURATION){if(rec&&rec.state==='recording')rec.stop();return;}
    raf=requestAnimationFrame(tick);
  }
  run.onclick=()=>{
    if(running)return;running=true;chunks=[];run.disabled=true;run.textContent='●';state.textContent='BUILDING // VIDEO REALM';
    if(!window.MediaRecorder){start=performance.now();tick();setTimeout(()=>{running=false;run.disabled=false;run.textContent='▶';state.textContent='PREVIEW COMPLETE';},(DURATION+.2)*1000);return;}
    const stream=c.captureStream(FPS),mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(v=>MediaRecorder.isTypeSupported(v))||'';
    rec=new MediaRecorder(stream,mime?{mimeType:mime}:{});rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    rec.onstop=()=>{const url=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));const a=document.createElement('a');a.href=url;a.download='geehub-men-in-the-realm.webm';a.textContent='↗';a.className='sv-save';root.querySelector('.vr-control').appendChild(a);state.textContent='COMPLETE // WEBM READY';running=false;run.disabled=false;run.textContent='RUN REALM';};
    rec.start(100);start=performance.now();tick();
  };
  const pulse = root.querySelector('.vr-beat'); if(pulse) pulse.textContent='MEMORY REALM';
  // The realm is alive when the panel opens. RUN turns the live memory into a recorded video.
  start=performance.now();
  requestAnimationFrame(tick);
})();