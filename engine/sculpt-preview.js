(() => {
  const root=document.getElementById('sculptPreview');
  const stage=root?.querySelector('.sculpt-preview-stage');
  const mannequin=document.getElementById('sculptMannequin');
  const part=document.getElementById('previewPart');
  const scale=document.getElementById('previewScale');
  const bsculpt=document.getElementById('bsculpt');
  const plus=document.getElementById('previewPlus');
  const deep=document.getElementById('previewDeep');
  const wide=document.getElementById('previewWide');
  const hours=document.getElementById('previewHours');
  const bigger=document.getElementById('previewBigger');
  const giga=document.getElementById('previewGiga');
  const next=document.getElementById('previewNext');
  if(!stage||!mannequin||!part||!scale||!bsculpt||!plus||!deep||!wide||!hours||!bigger||!giga||!next)return;

  const sequence=['shoulder-left','chest','arm-left','arm-right','tank','boot-left'];
  let cursor=0,selected=null,sculptMode=false,dragging=false,lastX=0,lastY=0;
  let figureScale=1.15;
  const shape={}, sessions=[];

  const ensure=id=>shape[id]||(shape[id]={wide:1.15,deep:1.12,tall:1.08});

  const paint=()=>{
    const s=ensure(selected);
    scale.textContent=`${Math.round(s.wide*100)}W / ${Math.round(s.deep*100)}D / ${Math.round(s.tall*100)}H`;
    mannequin.style.transform=`translate(-50%,-50%) rotateY(-7deg) scale(${figureScale})`;
    mannequin.classList.remove('sculpt-pulse'); void mannequin.offsetWidth; mannequin.classList.add('sculpt-pulse');
  };

  const select=id=>{
    selected=id; ensure(id);
    stage.className='sculpt-preview-stage part-'+id+(sculptMode?' bsculpt-active':'');
    stage.querySelectorAll('.component-tray button').forEach(b=>b.classList.toggle('selected',b.dataset.part===id));
    part.textContent=id.replaceAll('-',' ').toUpperCase();
    paint();
  };

  const sculpt=(axis,amount)=>{
    if(!selected)return;
    const s=ensure(selected);
    s[axis]=Math.max(.75,Math.min(2.25,s[axis]+amount));
    paint();
  };

  const toggle=()=>{
    sculptMode=!sculptMode;
    bsculpt.textContent=sculptMode?'BSCULPT ACTIVE':'BSCULPT';
    bsculpt.setAttribute('aria-pressed',String(sculptMode));
    stage.classList.toggle('bsculpt-active',sculptMode);
    stage.style.cursor=sculptMode?'crosshair':'default';
  };

  const simulateHours=()=>{
    if(!selected) select(sequence[0]);
    sculptMode=true;
    bsculpt.textContent='BSCULPT / LONG SESSION';
    bsculpt.setAttribute('aria-pressed','true');
    stage.classList.add('bsculpt-active','long-session');
    const hoursRepresented=6;
    const passes=720;
    const s=ensure(selected);
    const start={...s};
    for(let i=0;i<passes;i++){
      const phase=i%120;
      const broad=phase<70?.0019:-.0007;
      const depth=phase%45<30?.0015:-.00055;
      const tall=phase%80<50?.0011:-.00035;
      s.wide=Math.max(.75,Math.min(2.25,s.wide+broad));
      s.deep=Math.max(.75,Math.min(2.25,s.deep+depth));
      s.tall=Math.max(.75,Math.min(2.25,s.tall+tall));
    }
    sessions.unshift({
      component:selected,
      representedHours:hoursRepresented,
      passes,
      start,
      end:{...s},
      timestamp:new Date().toISOString()
    });
    sessions.splice(8);
    paint();
    part.textContent=selected.replaceAll('-',' ').toUpperCase()+' / 6-HOUR SESSION';
    window.setTimeout(()=>stage.classList.remove('long-session'),1200);
  };

  stage.querySelectorAll('.component-tray button').forEach(b=>b.addEventListener('click',()=>select(b.dataset.part)));
  bsculpt.addEventListener('click',toggle);
  plus.addEventListener('click',()=>sculpt('tall',.08));
  deep.addEventListener('click',()=>sculpt('deep',.12));
  wide.addEventListener('click',()=>sculpt('wide',.12));
  hours.addEventListener('click',simulateHours);
  bigger.addEventListener('click',()=>{
    figureScale=Math.min(2.5,figureScale+0.18);
    Object.keys(shape).forEach(id=>{shape[id].wide=Math.min(2.25,shape[id].wide+0.06);shape[id].deep=Math.min(2.25,shape[id].deep+0.06);shape[id].tall=Math.min(2.25,shape[id].tall+0.05);});
    paint();
    part.textContent='WHOLE FIGURE / BIGGER';
  });
  giga.addEventListener('click',()=>{
    sculptMode=true;
    bsculpt.textContent='BSCULPT / GIGA';
    bsculpt.setAttribute('aria-pressed','true');
    stage.classList.add('bsculpt-active','giga-mode');
    figureScale=Math.min(2.5,figureScale+0.48);
    sequence.forEach(id=>{
      const s=ensure(id);
      s.wide=Math.min(2.25,s.wide+0.28);
      s.deep=Math.min(2.25,s.deep+0.24);
      s.tall=Math.min(2.25,s.tall+0.18);
    });
    paint();
    part.textContent='GIGA / WHOLE SCULPT';
  });
  next.addEventListener('click',()=>{select(sequence[cursor%sequence.length]);cursor+=1;});

  stage.addEventListener('pointerdown',e=>{
    if(!sculptMode||!selected)return;
    dragging=true; lastX=e.clientX; lastY=e.clientY; stage.setPointerCapture(e.pointerId); mannequin.classList.add('sculpt-dragging');
  });
  stage.addEventListener('pointermove',e=>{
    if(!dragging||!sculptMode||!selected)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
    sculpt('wide',dx*.003); sculpt('deep',-dy*.003);
  });
  const stop=e=>{if(!dragging)return;dragging=false;mannequin.classList.remove('sculpt-dragging');try{stage.releasePointerCapture(e.pointerId);}catch{}};
  stage.addEventListener('pointerup',stop); stage.addEventListener('pointercancel',stop);
  stage.addEventListener('wheel',e=>{if(!sculptMode||!selected)return;e.preventDefault();sculpt('tall',e.deltaY<0?.025:-.025);},{passive:false});

  select('chest');
})();