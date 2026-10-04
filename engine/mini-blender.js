(() => {
  const root=document.getElementById('sculptPreview');
  const stage=root?.querySelector('.sculpt-preview-stage');
  const canvas=document.getElementById('miniBlenderCanvas');
  if(!stage||!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;

  const ui={
    mode:document.getElementById('miniMode'),
    poly:document.getElementById('miniPoly'),
    readout:document.getElementById('miniMeshReadout'),
    bsculpt:document.getElementById('bsculpt'),
    plus:document.getElementById('previewPlus'),
    deep:document.getElementById('previewDeep'),
    wide:document.getElementById('previewWide'),
    hours:document.getElementById('previewHours'),
    bigger:document.getElementById('previewBigger'),
    giga:document.getElementById('previewGiga'),
    next:document.getElementById('previewNext'),
    part:document.getElementById('previewPart'),
    scale:document.getElementById('previewScale')
  };

  const parts={
    head:{label:'HEAD',kind:'BODY',p:[0,4.25,0],s:[.93,.93,.93]},
    neck:{label:'NECK',kind:'BODY',p:[0,3.18,0],s:[.45,.5,.45]},
    shoulderL:{label:'SHOULDER L',kind:'BODY',p:[-1.02,2.72,0],s:[.88,.55,.72]},
    shoulderR:{label:'SHOULDER R',kind:'BODY',p:[1.02,2.72,0],s:[.88,.55,.72]},
    chest:{label:'CHEST',kind:'BODY',p:[0,2.02,0],s:[1.42,1.05,.82]},
    pelvis:{label:'PELVIS',kind:'BODY',p:[0,.62,0],s:[1.12,.58,.78]},
    armL:{label:'ARM L',kind:'BODY',p:[-1.72,1.72,0],s:[.43,1.35,.46]},
    armR:{label:'ARM R',kind:'BODY',p:[1.72,1.72,0],s:[.43,1.35,.46]},
    foreL:{label:'FOREARM L',kind:'BODY',p:[-1.83,.22,0],s:[.37,1.08,.4]},
    foreR:{label:'FOREARM R',kind:'BODY',p:[1.83,.22,0],s:[.37,1.08,.4]},
    legL:{label:'LEG L',kind:'BODY',p:[-.64,-.96,0],s:[.55,1.52,.57]},
    legR:{label:'LEG R',kind:'BODY',p:[.64,-.96,0],s:[.55,1.52,.57]},
    calfL:{label:'CALF L',kind:'BODY',p:[-.67,-2.63,0],s:[.45,1.12,.48]},
    calfR:{label:'CALF R',kind:'BODY',p:[.67,-2.63,0],s:[.45,1.12,.48]},
    tank:{label:'TANK',kind:'CLOTHING',p:[0,1.95,.09],s:[1.48,1.22,.86]},
    shorts:{label:'SHORTS',kind:'CLOTHING',p:[0,.22,.1],s:[1.17,.52,.82]}
  };

  const selectMap={
    'shoulder-left':'shoulderL','chest':'chest','arm-left':'armL','arm-right':'armR','tank':'tank','boot-left':'shorts'
  };
  let selected='chest', mode=false, dragging=false, lastX=0,lastY=0, rotY=-.35, rotX=.12, zoom=1.05, figureScale=1.16, cursor=0;
  const dims={};
  Object.keys(parts).forEach(k=>dims[k]={wide:1,deep:1,tall:1});

  const colors={body:[205,212,218],cloth:[70,78,87],edge:[74,82,91],hi:[239,243,246]};
  const rad=v=>v*Math.PI/180;

  function resize(){
    const r=stage.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.floor(r.width*d)); canvas.height=Math.max(1,Math.floor(r.height*d));
    canvas.style.width=r.width+'px'; canvas.style.height=r.height+'px';
    ctx.setTransform(d,0,0,d,0,0);
  }

  function transform(p){
    let [x,y,z]=p;
    const cy=Math.cos(rotY),sy=Math.sin(rotY);
    let x1=x*cy-z*sy,z1=x*sy+z*cy;
    const cx=Math.cos(rotX),sx=Math.sin(rotX);
    let y1=y*cx-z1*sx,z2=y*sx+z1*cx;
    const f=Math.min(canvas.clientWidth,canvas.clientHeight)*.105*zoom;
    const persp=1/(1+z2*.055);
    return {x:canvas.clientWidth/2+x1*f*persp,y:canvas.clientHeight*.57-y1*f*persp,z:z2,scale:persp};
  }

  function ellipsoid(key){
    const q=parts[key],d=dims[key], seg=18,rings=10, verts=[],faces=[];
    const sx=q.s[0]*d.wide*figureScale, sy=q.s[1]*d.tall*figureScale, sz=q.s[2]*d.deep*figureScale;
    for(let r=0;r<=rings;r++){
      const v=r/rings,phi=Math.PI*v;
      for(let s=0;s<seg;s++){
        const u=s/seg*2*Math.PI;
        verts.push([q.p[0]+Math.cos(u)*Math.sin(phi)*sx,q.p[1]+Math.cos(phi)*sy,q.p[2]+Math.sin(u)*Math.sin(phi)*sz]);
      }
    }
    for(let r=0;r<rings;r++)for(let s=0;s<seg;s++){
      const a=r*seg+s,b=r*seg+(s+1)%seg,c=(r+1)*seg+(s+1)%seg,dv=(r+1)*seg+s;
      faces.push([a,b,c],[a,c,dv]);
    }
    return {verts,faces,kind:q.kind};
  }

  function drawMesh(mesh,key){
    const pts=mesh.verts.map(transform), tris=[];
    const light=[-.45,.75,1.0];
    mesh.faces.forEach(f=>{
      const a=mesh.verts[f[0]],b=mesh.verts[f[1]],c=mesh.verts[f[2]];
      const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
      const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      const nl=Math.hypot(...n)||1, nd=(n[0]*light[0]+n[1]*light[1]+n[2]*light[2])/nl/Math.hypot(...light);
      const z=(pts[f[0]].z+pts[f[1]].z+pts[f[2]].z)/3;
      tris.push({f,nd,z});
    });
    tris.sort((a,b)=>a.z-b.z);
    const col=mesh.kind==='CLOTHING'?colors.cloth:colors.body;
    tris.forEach(t=>{
      const shade=Math.max(.18,Math.min(1,(t.nd+.7)/1.7));
      const r=Math.round(col[0]*shade),g=Math.round(col[1]*shade),b=Math.round(col[2]*shade);
      ctx.beginPath(); ctx.moveTo(pts[t.f[0]].x,pts[t.f[0]].y);ctx.lineTo(pts[t.f[1]].x,pts[t.f[1]].y);ctx.lineTo(pts[t.f[2]].x,pts[t.f[2]].y);ctx.closePath();
      ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fill();
      if(mode && key===selected){
        ctx.strokeStyle='rgba(235,242,247,.34)';ctx.lineWidth=.45;ctx.stroke();
      }
    });
  }

  function drawFace(){
    const h=transform(parts.head.p), scale=Math.max(.55,h.scale);
    ctx.save();
    ctx.translate(h.x,h.y);
    ctx.rotate(rotY*.16);
    ctx.fillStyle='rgba(34,40,46,.92)';
    ctx.beginPath();ctx.ellipse(-15*scale,-5*scale,6*scale,3*scale,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(15*scale,-5*scale,6*scale,3*scale,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(42,48,54,.9)';ctx.lineWidth=2*scale;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-18*scale,-16*scale);ctx.lineTo(-7*scale,-18*scale);ctx.moveTo(8*scale,-18*scale);ctx.lineTo(20*scale,-21*scale);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-12*scale,20*scale);ctx.quadraticCurveTo(3*scale,27*scale,18*scale,18*scale);ctx.stroke();
    ctx.restore();
  }

  function render(){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    ctx.clearRect(0,0,w,h);
    const bg=ctx.createRadialGradient(w*.5,h*.37,10,w*.5,h*.57,Math.max(w,h)*.7);
    bg.addColorStop(0,'#252d35');bg.addColorStop(.42,'#10161c');bg.addColorStop(1,'#030507');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(210,220,228,.055)';ctx.lineWidth=1;
    for(let i=-12;i<=12;i++){const y=h*.78+i*24;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y+Math.abs(i)*12);ctx.stroke();}
    for(let i=-14;i<=14;i++){ctx.beginPath();ctx.moveTo(w*.5+i*48,h);ctx.lineTo(w*.5+i*22,h*.72);ctx.stroke();}
    const keys=Object.keys(parts).sort((a,b)=>{
      const za=parts[a].p[2],zb=parts[b].p[2];return za-zb;
    });
    keys.forEach(k=>drawMesh(ellipsoid(k),k));
    drawFace();

    if(mode&&selected){
      const q=parts[selected],d=dims[selected],p=transform(q.p);
      const rr=Math.max(28,42*(d.wide+d.deep+d.tall)/3*p.scale);
      ctx.save();ctx.strokeStyle='rgba(232,240,246,.65)';ctx.setLineDash([5,5]);ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(p.x,p.y,rr,rr*.55,rotY*.18,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    ui.poly.textContent='MESH '+(Object.keys(parts).length*360)+' / '+(mode?'SCULPT':'OBJECT');
    const d=dims[selected];
    ui.scale.textContent=`${Math.round(d.wide*100)}W / ${Math.round(d.deep*100)}D / ${Math.round(d.tall*100)}H`;
    ui.readout.textContent=mode?`BSCULPT // ${parts[selected].label} // DRAG XY / WHEEL H`:`OBJECT MODE // ${parts[selected].label} SELECTED`;
    requestAnimationFrame(render);
  }

  function select(id){
    selected=id; const c=parts[id];
    stage.querySelectorAll('.component-tray button').forEach(b=>b.classList.toggle('selected',selectMap[b.dataset.part]===id));
    ui.part.textContent=c.label;
  }

  function adjust(axis,amt){
    const d=dims[selected]; d[axis]=Math.max(.72,Math.min(2.5,d[axis]+amt));
  }

  ui.bsculpt.addEventListener('click',()=>{
    mode=!mode;
    ui.bsculpt.textContent=mode?'BSCULPT ACTIVE':'BSCULPT';
    ui.bsculpt.setAttribute('aria-pressed',String(mode));
    ui.mode.textContent=mode?'SCULPT MODE':'OBJECT MODE';
    stage.classList.toggle('bsculpt-active',mode);
    canvas.style.cursor=mode?'crosshair':'grab';
  });
  stage.querySelectorAll('.component-tray button').forEach(b=>b.addEventListener('click',()=>select(selectMap[b.dataset.part]||'chest')));
  ui.plus.addEventListener('click',()=>adjust('tall',.08));
  ui.deep.addEventListener('click',()=>adjust('deep',.12));
  ui.wide.addEventListener('click',()=>adjust('wide',.12));
  ui.next.addEventListener('click',()=>{const order=['shoulderL','shoulderR','chest','pelvis','armL','armR','foreL','foreR','legL','legR','calfL','calfR','tank','shorts'];select(order[cursor%order.length]);cursor++;});
  ui.bigger.addEventListener('click',()=>{
    figureScale=Math.min(1.75,figureScale+.12);
    Object.values(dims).forEach(d=>{d.wide=Math.min(2.5,d.wide+.06);d.deep=Math.min(2.5,d.deep+.06);d.tall=Math.min(2.5,d.tall+.05);});
    ui.part.textContent='WHOLE FIGURE / BIGGER';
  });
  ui.giga.addEventListener('click',()=>{
    mode=true; ui.bsculpt.textContent='BSCULPT / GIGA';ui.bsculpt.setAttribute('aria-pressed','true');ui.mode.textContent='GIGA SCULPT';
    figureScale=Math.min(2.05,figureScale+.26);
    Object.values(dims).forEach(d=>{d.wide=Math.min(2.5,d.wide+.18);d.deep=Math.min(2.5,d.deep+.16);d.tall=Math.min(2.5,d.tall+.12);});
    stage.classList.add('bsculpt-active','giga-mode');
    ui.part.textContent='GIGA / WHOLE SCULPT';
  });
  ui.hours.addEventListener('click',()=>{
    mode=true;ui.mode.textContent='SCULPT MODE / LONG SESSION';
    for(let i=0;i<360;i++){
      const d=dims[selected],p=i%90;
      d.wide=Math.max(.72,Math.min(2.5,d.wide+(p<54?.0021:-.0008)));
      d.deep=Math.max(.72,Math.min(2.5,d.deep+(p%44<28?.0018:-.00065)));
      d.tall=Math.max(.72,Math.min(2.5,d.tall+(p%70<43?.0013:-.0004)));
    }
    ui.part.textContent=parts[selected].label+' / HOURS OF SCULPT';
  });

  let down=false;
  canvas.addEventListener('pointerdown',e=>{
    down=true;lastX=e.clientX;lastY=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!down)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
    if(mode&&selected){adjust('wide',dx*.004);adjust('deep',-dy*.0032);}
    else{rotY+=dx*.008;rotX=Math.max(-.75,Math.min(.75,rotX+dy*.005));}
  });
  const stop=e=>{if(!down)return;down=false;canvas.classList.remove('dragging');try{canvas.releasePointerCapture(e.pointerId)}catch{}};
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(mode&&selected)adjust('tall',e.deltaY<0?.025:-.025);else zoom=Math.max(.72,Math.min(1.45,zoom+(e.deltaY<0?.04:-.04)));},{passive:false});
  window.addEventListener('resize',resize);
  resize();select('chest');render();
})();