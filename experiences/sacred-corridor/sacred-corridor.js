(()=>{
const canvas=document.getElementById('corridor'),ctx=canvas.getContext('2d');
const rooms=[
{title:'THE HOUSE IS QUIET',copy:'Daylight rests on the stone. Somewhere beyond the walls, water moves.',presence:'A man is awake further down the passage.',name:'THE BUILDER',desc:'He has been here long enough to know which floorboards speak.',traits:'PATIENT · OBSERVANT · PRACTICAL',doors:['THE TRAINING ROOM','THE LIBRARY','THE WORKSHOP']},
{title:'THE TRAINING ROOM',copy:'The air is warmer here. Leather, chalk and old timber hold the morning.',presence:'Luke is finishing his first set. He is not in a hurry.',name:'LUKE',desc:'Stage four. Broad through the chest, steady on his feet, unmistakably himself. His growth has no prescribed final stage.',traits:'COMPOSED · POWERFUL · STILL GROWING',doors:['THE WATER COURT','THE BUILDER’S TABLE','BACK TO THE CORRIDOR']},
{title:'THE LIBRARY',copy:'Tall shelves, green-shaded lamps, books left open where thought stopped.',presence:'A scholar has marked the margin of a difficult page.',name:'THE SCHOLAR-ENGINEER',desc:'He follows an idea until it touches something that can be built, measured or disproved.',traits:'PRECISE · CURIOUS · SELF-CORRECTING',doors:['THE OBSERVATION GALLERY','THE WORKSHOP','BACK TO THE CORRIDOR']},
{title:'THE WORKSHOP',copy:'Tools lie in their places. A half-built mechanism ticks as it cools.',presence:'Two men are comparing measurements without raising their voices.',name:'THE CRAFTSMAN',desc:'He understands leverage through use. He can explain a difficult movement by showing it once.',traits:'SKILLED · GROUNDED · COMPETITIVE',doors:['THE TRAINING ROOM','THE LIBRARY','BACK TO THE CORRIDOR']},
{title:'THE WATER COURT',copy:'A narrow channel carries daylight through the stone. The house opens to the trees.',presence:'The men have begun to gather, one at a time.',name:'THE WANDERER',desc:'He brings news from beyond the estate and remembers the people who told it.',traits:'ADAPTABLE · INDEPENDENT · ATTENTIVE'}
];
let room=0,t=0,w=0,h=0,raf=0,visit=Number(sessionStorage.getItem('corridorVisit')||0)+1;sessionStorage.setItem('corridorVisit',visit);
const $=id=>document.getElementById(id);
function resize(){const dpr=Math.min(devicePixelRatio||1,2),r=canvas.getBoundingClientRect();w=r.width;h=r.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function draw(){
t+=.006;const W=w,H=h,cx=W*.51,cy=H*.42,pulse=Math.sin(t)*1.4;
ctx.clearRect(0,0,W,H);
const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#25251d');bg.addColorStop(.48,'#373327');bg.addColorStop(1,'#11120f');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
const light=ctx.createRadialGradient(cx,cy,5,cx,cy,W*.55);light.addColorStop(0,'#c4aa7040');light.addColorStop(1,'#17171000');ctx.fillStyle=light;ctx.fillRect(0,0,W,H);
poly([[0,0],[W,0],[cx+W*.11,cy-H*.12],[cx-W*.11,cy-H*.12]],'#211f18');
poly([[0,H],[W,H],[cx+W*.11,cy-H*.12],[cx-W*.11,cy-H*.12]],'#403a2b');
poly([[0,0],[cx-W*.11,cy-H*.12],[cx-W*.11,cy+H*.03],[0,H]],'#29271f');
poly([[W,0],[cx+W*.11,cy-H*.12],[cx+W*.11,cy+H*.03],[W,H]],'#24231c');
const van=cy-H*.12;
for(let i=0;i<7;i++){let f=(i+1)/8,x=W*(i/6);ctx.strokeStyle='#a18e6330';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(cx+(x-cx)*.1,van);ctx.stroke()}
for(let i=0;i<6;i++){let y=H*(i/6);ctx.strokeStyle='#b4a27a22';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cx+(0-cx)*(y/H),van+(y-van)*.02);ctx.lineTo(W,y);ctx.stroke()}
for(let i=0;i<9;i++){const z=(i+1)/10,yy=van+(H-van)*z,spread=(W*.1)+(W*.4*z);ctx.strokeStyle='#c4b38a'+(i%2?'18':'28');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-spread,yy);ctx.lineTo(cx+spread,yy);ctx.stroke()}
for(let side of [-1,1]){for(let i=0;i<3;i++){let d=.22+i*.23,yy=van+(H-van)*d,ww=W*(.035+d*.1),hh=H*(.12+d*.18),xx=cx+side*(W*.11+d*W*.39);ctx.fillStyle='#11130f';ctx.fillRect(xx-ww/2,yy-hh/2,ww,hh);ctx.strokeStyle='#9c875b88';ctx.strokeRect(xx-ww/2,yy-hh/2,ww,hh);ctx.fillStyle='#c6a66a18';ctx.fillRect(xx-ww*.35,yy-hh*.42,ww*.7,hh*.84)}}
for(let i=0;i<8;i++){const z=(i+1)/9,yy=van+(H-van)*z;ctx.fillStyle='#c8b27a12';ctx.fillRect(cx-W*z*.48,yy-2,W*z*.96,4)}
// Distant adult male figure: a calm, readable silhouette, not a character replacement.
const scale=.6+room*.025,base=H*.79,head=H*.055*scale,bw=W*.045*scale;
ctx.save();ctx.translate(cx,base+pulse);ctx.fillStyle='#11120f';ctx.shadowColor='#d1b77a55';ctx.shadowBlur=18;
ctx.beginPath();ctx.ellipse(0,-head*3.6,bw*1.15,head*1.2,0,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.moveTo(-bw*.8,-head*2.8);ctx.quadraticCurveTo(-bw*2.4,-head*2.5,-bw*2.7,-head*.6);ctx.lineTo(-bw*2.2,0);ctx.lineTo(bw*2.2,0);ctx.lineTo(bw*2.7,-head*.6);ctx.quadraticCurveTo(bw*2.4,-head*2.5,bw*.8,-head*2.8);ctx.closePath();ctx.fill();
ctx.fillRect(-bw*1.5,-head*.4,bw*.9,head*2.4);ctx.fillRect(bw*.6,-head*.4,bw*.9,head*2.4);ctx.restore();
for(let i=0;i<22;i++){let x=(Math.sin(i*91.7+t*.6)*.5+.5)*W,y=(Math.sin(i*17.3+t*.3)*.5+.5)*H;ctx.fillStyle='#e8d8ae'+(i%2?'18':'26');ctx.fillRect(x,y,1.2,1.2)}
raf=requestAnimationFrame(draw)}
function render(){const r=rooms[room];$('room-index').textContent='THRESHOLD / '+String(room+1).padStart(2,'0');$('room-title').textContent=r.title;$('room-copy').textContent=r.copy;$('presence-copy').textContent=r.presence;$('man-name').textContent=r.name;$('man-description').textContent=r.desc;$('man-traits').textContent=r.traits;$('record').textContent='VISIT '+String(visit).padStart(2,'0')+' / '+(room?'A NEW ROOM HAS BEEN ENTERED':'NO RECORDS DISTURBED');$('doors').innerHTML='';(r.doors||[]).forEach((d,i)=>{const b=document.createElement('button');b.className='door';b.textContent=d;b.addEventListener('click',()=>{if(d.startsWith('BACK'))room=0;else if(d.includes('TRAINING'))room=1;else if(d.includes('LIBRARY')||d.includes('OBSERVATION'))room=2;else if(d.includes('WORKSHOP')||d.includes('BUILDER'))room=3;else room=4;render()});$('doors').appendChild(b)})}
$('advance').addEventListener('click',()=>{room=Math.min(room+1,rooms.length-1);render()});
$('listen').addEventListener('click',()=>{$('room-copy').textContent=room===0?'A soft footstep. Then the old house settles again.':rooms[room].copy+' The room answers with its own quiet sounds.';$('clock').textContent='LISTENING / '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});
$('clock').textContent='VISIT '+String(visit).padStart(2,'0');$('record').textContent='VISIT '+String(visit).padStart(2,'0')+' / NO RECORDS DISTURBED';
window.addEventListener('resize',resize);resize();render();draw();
})();