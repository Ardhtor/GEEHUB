(() => {
  const stage=document.getElementById('sculptPreview')?.querySelector('.sculpt-preview-stage');
  const canvas=document.getElementById('miniWorldCanvas');
  if(!stage||!canvas)return;
  const ctx=canvas.getContext('2d'); if(!ctx)return;

  const state=JSON.parse(localStorage.getItem('geehub-native-world')||'null')||{
    pressure:.14, room:1, adaptation:0, witness:0, memory:0, weather:.1, event:'ARRIVAL'
  };
  let w=0,h=0,dpr=1,t0=performance.now();
  let pulse=0;

  const save=()=>localStorage.setItem('geehub-native-world',JSON.stringify(state));
  const resize=()=>{
    const r=stage.getBoundingClientRect(); dpr=Math.min(devicePixelRatio||1,2);
    w=r.width;h=r.height;canvas.width=Math.max(1,Math.floor(w*dpr));canvas.height=Math.max(1,Math.floor(h*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
  };

  function worldEvent(detail){
    state.event=detail; state.memory++;
    const readout=document.getElementById('miniMeshReadout');
    if(readout) readout.textContent='WORLD EVENT // '+detail+' // MEMORY '+String(state.memory).padStart(3,'0');
    pulse=1;
    save();
    window.dispatchEvent(new CustomEvent('geehub:world-event',{detail:{...state}}));
  }

  function react(detail){
    const before=state.pressure;
    state.pressure=Math.min(2.4,Math.max(.1,state.pressure+detail.pressure));
    state.room=Math.max(.52,Math.min(1.8,state.room+detail.room));
    state.adaptation=Math.min(8,state.adaptation+detail.adaptation);
    state.witness=Math.min(8,state.witness+detail.witness);
    state.weather=Math.min(1.5,Math.max(.02,state.weather+detail.weather));
    const threshold=Math.floor(state.pressure*3);
    const previous=Math.floor(before*3);
    if(threshold>previous){
      const events=[
        'THE FLOOR YIELDS',
        'THE THRESHOLD RE-MEASURES',
        'THE ROOM LEARNS',
        'THE WITNESS MOVES',
        'A NEW ROUTE OPENS',
        'THE OLD SCALE REMAINS AS MEMORY'
      ];
      worldEvent(events[(threshold-1)%events.length]);
    }else save();
  }

  window.addEventListener('geehub:sculpt-change',e=>react(e.detail||{}));

  function project(x,y,z,rot){
    const cr=Math.cos(rot),sr=Math.sin(rot);
    const xx=x*cr-z*sr,zz=x*sr+z*cr;
    const f=Math.min(w,h)*.11, persp=1/(1+zz*.045);
    return {x:w/2+xx*f*persp,y:h*.6-y*f*persp,z:zz};
  }

  function poly(points,fill,stroke='rgba(160,175,188,.18)'){
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.stroke();
  }

  function render(now){
    const t=(now-t0)/1000;
    ctx.clearRect(0,0,w,h);
    const g=ctx.createRadialGradient(w*.5,h*.42,10,w*.5,h*.62,Math.max(w,h)*.7);
    g.addColorStop(0,'#17222a');g.addColorStop(.45,'#0b1117');g.addColorStop(1,'#030507');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);

    const room=state.room, rot=Math.sin(t*.05)*.08, floorY=-2.45;
    const floor=[
      project(-7,floorY,-3,rot),project(7,floorY,-3,rot),
      project(7,floorY,3,rot),project(-7,floorY,3,rot)
    ];
    poly(floor,'rgba(27,35,42,.7)','rgba(140,155,168,.18)');

    for(let i=-6;i<=6;i++){
      const a=project(i*.9,floorY,-3,rot),b=project(i*.9,floorY,3,rot);
      ctx.strokeStyle='rgba(170,184,195,.055)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    for(let i=0;i<7;i++){
      const y=floorY+i*.45;const a=project(-7,y*.05-2.5,-3+i*.4,rot),b=project(7,y*.05-2.5,-3+i*.4,rot);
      ctx.strokeStyle='rgba(170,184,195,.045)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }

    const wallX=4.4*room;
    const leftTop=project(-wallX,3,-1.8,rot), leftBot=project(-wallX,floorY,-1.8,rot);
    const rightTop=project(wallX,3,-1.8,rot), rightBot=project(wallX,floorY,-1.8,rot);
    poly([leftTop,rightTop,rightBot,leftBot],'rgba(21,28,34,.72)','rgba(135,150,163,.15)');

    const doorW=1.4/Math.max(.65,room);
    const d1=project(-doorW,2.5,-1.7,rot),d2=project(doorW,2.5,-1.7,rot),d3=project(doorW,floorY,-1.7,rot),d4=project(-doorW,floorY,-1.7,rot);
    poly([d1,d2,d3,d4],'rgba(4,7,10,.92)','rgba(178,190,200,.22)');

    const pillarCount=4+Math.floor(state.adaptation/2);
    for(let i=0;i<pillarCount;i++){
      const x=-3.7+(i/(pillarCount-1))*7.4;
      const top=project(x,2.3,-.8,rot),bot=project(x,floorY,-.8,rot);
      ctx.strokeStyle='rgba(154,171,184,.18)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(bot.x,bot.y);ctx.stroke();
      ctx.lineWidth=1;
    }

    const witnessX=-2.8, witnessY=-1.2;
    const wp=project(witnessX,witnessY,-.25,rot);
    ctx.fillStyle='rgba(188,202,211,.42)';
    ctx.beginPath();ctx.arc(wp.x,wp.y-13,7,0,Math.PI*2);ctx.fill();ctx.fillRect(wp.x-6,wp.y-7,12,22);
    ctx.strokeStyle='rgba(210,220,228,.15)';ctx.beginPath();ctx.arc(wp.x,wp.y-6,25+state.witness*3,0,Math.PI*2);ctx.stroke();

    const pulseR=40+state.pressure*46;
    ctx.strokeStyle='rgba(188,210,224,'+(0.08+pulse*.16)+')';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(w*.5,h*.62,pulseR+pulse*35,0,Math.PI*2);ctx.stroke();

    if(state.weather>.2){
      for(let i=0;i<22;i++){
        const x=(i*71+t*8)%w,y=(i*37+t*(6+state.weather*10))%h;
        ctx.fillStyle='rgba(180,200,214,'+(0.02+state.weather*.025)+')';ctx.fillRect(x,y,1,1);
      }
    }
    pulse*=.93;
    requestAnimationFrame(render);
  }

  window.addEventListener('resize',resize);
  resize(); requestAnimationFrame(render);
  save();
})();