/* GEEHUB / CONTINUOUS MESH RIG
   Reusable procedural 3D anatomy for the video forge. Ellipsoid surfaces and tapered jointed limbs
   share one deformable skeleton; body state is read at render time, not baked into the take. */
(() => {
  if (window.GEEHUB_LUKE_RIG) return;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const KEY='geehub-luke-burgeon-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}').body||{};}catch{return{};}};
  const V=(x,y,z)=>[x,y,z], add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), mul=(a,s)=>a.map(v=>v*s);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], norm=a=>mul(a,1/(Math.hypot(...a)||1));
  function project(p,cx,base,unit,t){
    const yaw=-.16+Math.sin(t*.22)*.035, pitch=.035, cy=Math.cos(yaw),sy=Math.sin(yaw);
    const x=p[0]*cy-p[2]*sy,z=p[0]*sy+p[2]*cy,y=p[1]*Math.cos(pitch)-z*Math.sin(pitch),zz=p[1]*Math.sin(pitch)+z*Math.cos(pitch);
    const persp=1/(1+zz*.018);
    return {x:cx+x*unit*persp,y:base-y*unit*persp,z:zz,scale:persp};
  }
  function ellipsoid(center,radii,material,detail=32){
    const verts=[],faces=[],rings=Math.max(12,Math.floor(detail*.62)),seg=detail;
    for(let r=0;r<=rings;r++){const v=r/rings,phi=Math.PI*v;for(let s=0;s<seg;s++){const u=s/seg*Math.PI*2;verts.push(V(center[0]+Math.cos(u)*Math.sin(phi)*radii[0],center[1]+Math.cos(phi)*radii[1],center[2]+Math.sin(u)*Math.sin(phi)*radii[2]));}}
    for(let r=0;r<rings;r++)for(let s=0;s<seg;s++){const a=r*seg+s,b=r*seg+(s+1)%seg,c=(r+1)*seg+(s+1)%seg,d=(r+1)*seg+s;faces.push([a,b,d],[b,c,d]);}
    return {verts,faces,material};
  }
  function tapered(a,b,rA,rB,material,detail=24){
    const axis=norm(sub(b,a)),ref=Math.abs(axis[1])>.92?V(1,0,0):V(0,1,0),u=norm(cross(axis,ref)),v=norm(cross(axis,u)),verts=[],faces=[],rings=8;
    for(let j=0;j<=rings;j++){const f=j/rings,center=add(a,mul(sub(b,a),f)),radius=rA*(1-f)+rB*f;for(let i=0;i<detail;i++){const ang=i/detail*Math.PI*2,offset=add(mul(u,Math.cos(ang)*radius),mul(v,Math.sin(ang)*radius));verts.push(add(center,offset));}}
    for(let j=0;j<rings;j++)for(let i=0;i<detail;i++){const a0=j*detail+i,b0=j*detail+(i+1)%detail,c=(j+1)*detail+(i+1)%detail,d=(j+1)*detail+i;faces.push([a0,b0,d],[b0,c,d]);}
    return {verts,faces,material};
  }
  function render(ctx,t,options={}){
    const body=read(),W=options.width||1280,H=options.height||720;
    const g=k=>Math.max(1,Number(body[k]||1));
    const sh=clamp(g('shoulders'),1,2.5),ch=clamp(g('chest'),1,2.5),ar=clamp(g('arms'),1,2.5),lg=clamp(g('legs'),1,2.5),ln=clamp(g('length'),1,2.2),pres=clamp(g('presence'),1,2.4);
    const s=1+Math.sin(t*1.65)*.006, unit=111*clamp(1+(pres-1)*.035,1,1.1),cx=options.x||640,base=options.base||625;
    const shoulder=1.05*sh*s,chest=.79*ch*s,arm=.235*ar*s,leg=.31*lg*s,hip=.62*ch*s;
    const height=5.35*ln, top=height*.66, hipY=height*.40, kneeY=height*.20, ankle=.07;
    const parts=[];
    const addPart=(c,r,m,d)=>parts.push(ellipsoid(c,r,m,d));
    const skin='#b98f7d',skinHi='#d0a995',skinShade='#74584f',cloth='#283b48',clothHi='#536a75',shorts='#303940',boot='#151b20';
    // Legs are built as upper/lower tapered sections with shared knee and ankle joints.
    for(const side of [-1,1]){
      const hx=side*.36*hip,kx=side*.39*hip,ax=side*.42*hip;
      const hipP=V(hx,hipY,0),knee=V(kx,kneeY,0),ankleP=V(ax,ankle,0);
      parts.push(tapered(hipP,knee,leg*.70,leg*.48,skin));
      parts.push(tapered(knee,ankleP,leg*.46,leg*.30,skinShade));
      addPart(hipP,V(leg*.68,leg*.70,leg*.55),skin);
      addPart(knee,V(leg*.47,leg*.42,leg*.43),skinHi,20);
      addPart(ankleP,V(leg*.32,leg*.32,leg*.32),skinShade,18);
      addPart(V(ax+.07*side,.035,.14),V(.30,.13,.52),boot,20);
    }
    // Pelvis, abdomen, rib cage, chest and deltoids overlap to keep the silhouette continuous.
    addPart(V(0,hipY+.05,0),V(hip, .48*ch, .48),shorts,28);
    addPart(V(0,top*.60,0),V(.63*ch,.90*ln,.39),skin,28);
    addPart(V(0,top*.82,0),V(chest,.65*ln,.43),skinHi,30);
    addPart(V(0,top*.91,-.015),V(chest*.96,.39,.44),cloth,28);
    for(const side of [-1,1]){
      addPart(V(side*shoulder*.80,top*.91,0),V(.48*shoulder,.43,.42),skinHi,24);
      addPart(V(side*shoulder*.83,top*.91,.035),V(.49*shoulder,.20,.435),clothHi,22);
    }
    // Neck, skull and ears are independent rig pieces, with a single stable head anchor.
    addPart(V(0,top+ .20,0),V(.22,.35,.23),skinShade,20);
    addPart(V(0,top+.67,0),V(.31,.43,.31),skinHi,28);
    for(const side of [-1,1]){
      addPart(V(side*.31,top+.66,0),V(.07,.13,.09),skin,16);
      addPart(V(side*.125,top+.70,.265),V(.052,.025,.018),'#24292c',14);
      addPart(V(side*.125,top+.78,.26),V(.09,.025,.025),skinShade,14);
    }
    // Arms: shoulder, upper arm, elbow, forearm and wrist form a true articulated chain.
    for(const side of [-1,1]){
      const a=V(side*(shoulder+arm*.20),top*.92,0),el=V(side*(shoulder+arm*1.45),top*.59,.015),wr=V(side*(shoulder+arm*1.58),top*.24,.045);
      parts.push(tapered(a,el,arm*.88,arm*.66,skin));
      parts.push(tapered(el,wr,arm*.61,arm*.40,skinShade));
      addPart(a,V(arm*.91,arm*.92,arm*.83),skinHi,22);
      addPart(el,V(arm*.64,arm*.62,arm*.60),skin,18);
      addPart(wr,V(arm*.43,arm*.42,arm*.4),skinHi,18);
      addPart(V(wr[0],wr[1]-.20,.07),V(.16,.22,.12),skin,16);
    }
    const light=norm(V(-.55,.85,1));
    const triangles=[];
    for(const mesh of parts){
      const pts=mesh.verts.map(p=>project(p,cx,base,unit,t));
      for(const f of mesh.faces){
        const a=mesh.verts[f[0]],b=mesh.verts[f[1]],c=mesh.verts[f[2]],n=norm(cross(sub(b,a),sub(c,a)));
        const facing=dot(n,light),z=(pts[f[0]].z+pts[f[1]].z+pts[f[2]].z)/3;
        triangles.push({pts,f,z,material:mesh.material,shade:clamp(.34+Math.max(0,facing)*.66,.25,1)});
      }
    }
    triangles.sort((a,b)=>a.z-b.z);
    for(const tri of triangles){
      const p=tri.pts,f=tri.f,shade=tri.shade;
      const hex=tri.material||skin;
      ctx.beginPath();ctx.moveTo(p[f[0]].x,p[f[0]].y);ctx.lineTo(p[f[1]].x,p[f[1]].y);ctx.lineTo(p[f[2]].x,p[f[2]].y);ctx.closePath();
      // Soft, material-specific lighting; slight tonal separation retains the mesh's volume.
      const raw=parseInt(hex.slice(1),16),rr=(raw>>16)&255,gg=(raw>>8)&255,bb=raw&255,k=.42+.58*shade;ctx.fillStyle='rgb('+Math.round(rr*k)+','+Math.round(gg*k)+','+Math.round(bb*k)+')';ctx.fill();
    }
    // Fine face landmarks and clothing seams sit on top of the mesh rather than replacing it.
    const head=project(V(0,top+.67,.30),cx,base,unit,t),faceScale=head.scale;
    ctx.save();ctx.translate(head.x,head.y);ctx.scale(faceScale,faceScale);
    ctx.fillStyle='#292a2b';ctx.beginPath();ctx.ellipse(-12,0,4,2.5,0,0,Math.PI*2);ctx.ellipse(12,0,4,2.5,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#5a3f39';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,18);ctx.quadraticCurveTo(0,22,8,18);ctx.stroke();ctx.restore();
    // Tank straps and central seam follow the shoulder width and chest depth.
    const L=project(V(-shoulder*.72,top*.96,.42),cx,base,unit,t),R=project(V(shoulder*.72,top*.96,.42),cx,base,unit,t),mid=project(V(0,top*.92,.47),cx,base,unit,t);
    ctx.strokeStyle='rgba(180,207,214,.72)';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(L.x,L.y);ctx.lineTo(mid.x,mid.y+12);ctx.lineTo(R.x,R.y);ctx.stroke();
    ctx.fillStyle='rgba(6,11,15,.68)';ctx.font='14px monospace';ctx.fillText('MESH RIG / 3D SURFACE / JOINT CHAIN',cx-205,base+58);
    return {body:{shoulders:sh,chest:ch,arms:ar,legs:lg,length:ln},meshCount:parts.length,triangleCount:triangles.length};
  }
  window.GEEHUB_LUKE_RIG={render,version:'0.2.0'};
})();