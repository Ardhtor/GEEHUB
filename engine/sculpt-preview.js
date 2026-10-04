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
  const next=document.getElementById('previewNext');
  if(!stage||!mannequin||!part||!scale||!bsculpt||!plus||!deep||!wide||!next)return;

  const sequence=['shoulder-left','chest','arm-left','arm-right','tank','boot-left'];
  let cursor=0,selected=null,sculptMode=false,dragging=false,lastX=0,lastY=0;
  const shape={};

  const ensure=id=>shape[id]||(shape[id]={wide:1,deep:1,tall:1});
  const paint=()=>{
    const s=ensure(selected);
    scale.textContent=`${Math.round(s.wide*100)}W / ${Math.round(s.deep*100)}D / ${Math.round(s.tall*100)}H`;
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

  stage.querySelectorAll('.component-tray button').forEach(b=>b.addEventListener('click',()=>select(b.dataset.part)));
  bsculpt.addEventListener('click',toggle);
  plus.addEventListener('click',()=>sculpt('tall',.08));
  deep.addEventListener('click',()=>sculpt('deep',.12));
  wide.addEventListener('click',()=>sculpt('wide',.12));
  next.addEventListener('click',()=>{select(sequence[cursor%sequence.length]);cursor+=1;});

  stage.addEventListener('pointerdown',e=>{
    if(!sculptMode||!selected)return;
    dragging=true; lastX=e.clientX; lastY=e.clientY; stage.setPointerCapture(e.pointerId);
    mannequin.classList.add('sculpt-dragging');
  });
  stage.addEventListener('pointermove',e=>{
    if(!dragging||!sculptMode||!selected)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
    sculpt('wide',dx*.003); sculpt('deep',-dy*.003);
  });
  const stop=e=>{
    if(!dragging)return; dragging=false; mannequin.classList.remove('sculpt-dragging');
    try{stage.releasePointerCapture(e.pointerId);}catch{}
  };
  stage.addEventListener('pointerup',stop); stage.addEventListener('pointercancel',stop);
  stage.addEventListener('wheel',e=>{
    if(!sculptMode||!selected)return;
    e.preventDefault(); sculpt('tall',e.deltaY<0?.025:-.025);
  },{passive:false});

  select('chest');
})();