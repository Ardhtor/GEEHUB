const slider=document.querySelector('#slider'),figure=document.querySelector('#figure'),stage=document.querySelector('#stage');
const size=document.querySelector('#size'),state=document.querySelector('#state'),caption=document.querySelector('#caption'),depth=document.querySelector('#depth');
const values={height:document.querySelector('#height'),mass:document.querySelector('#mass'),reach:document.querySelector('#reach'),joints:document.querySelector('#joints'),footprint:document.querySelector('#footprint')};
const historyList=document.querySelector('#historyList');
const storageKey='tractus-size-emulator-states';
let history=[];
try{history=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(history))history=[];}catch{history=[];}

function renderHistory(){
  if(!history.length){historyList.innerHTML='<div class="empty">No saved states yet.</div>';return;}
  historyList.replaceChildren(...history.map((x,i)=>{
    const card=document.createElement('button');card.type='button';card.className='history-card';card.setAttribute('aria-label','Restore '+x.label+' state at '+x.size+' percent');
    const tag=document.createElement('span');tag.textContent='STATE '+String(i+1).padStart(2,'0');
    const value=document.createElement('strong');value.textContent=x.size+'%';
    const label=document.createElement('span');label.textContent=x.label+' · '+x.time;
    card.append(tag,value,label);card.addEventListener('click',()=>{slider.value=String(x.position);render(x.position);caption.textContent='Restored saved '+x.label.toLowerCase()+' state.';});return card;
  }));
}
function render(v,pulse=true){
  const n=Number(v),t=n/100,scale=1+t*3.2,reach=1+t*1.65,joint=1+t*.95;
  figure.style.setProperty('--s',scale);figure.style.setProperty('--reach',reach);figure.style.setProperty('--joint',joint);
  size.textContent=Math.round(100*scale)+'%';depth.textContent='DEPTH '+Math.floor(n/10);
  state.textContent=n<20?'BASELINE':n<50?'MASSIVE':n<80?'COLOSSAL':'ROOM-SCALE';
  caption.textContent=n<20?'The person is continuous.':n<50?'The room is beginning to recalibrate.':n<80?'Architecture is now measuring against the body.':'The body has become a spatial event.';
  values.height.textContent=scale.toFixed(2)+'×';values.mass.textContent=(1+t*6).toFixed(2)+'×';values.reach.textContent=reach.toFixed(2)+'×';values.joints.textContent=joint.toFixed(2)+'×';values.footprint.textContent=(1+t*4.5).toFixed(2)+'×';
  stage.classList.toggle('surge',pulse);if(pulse)setTimeout(()=>stage.classList.remove('surge'),720);
}
slider.addEventListener('input',e=>render(e.target.value));
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{slider.value=Math.min(100,Number(slider.value)+Number(b.dataset.jump));render(slider.value)}));
document.querySelector('#run').addEventListener('click',e=>{
  const button=e.currentTarget;if(button.disabled)return;button.disabled=true;
  let v=Number(slider.value);const timer=setInterval(()=>{v=Math.min(100,v+5);slider.value=v;render(v);if(v>=100){clearInterval(timer);button.disabled=false}},70);
});
document.querySelector('#newBaseline').addEventListener('click',()=>{
  const v=Number(slider.value),now=new Date();
  history.unshift({position:v,size:Math.round(100*(1+v/100*3.2)),label:state.textContent,time:now.toLocaleString()});
  history=history.slice(0,12);
  try{localStorage.setItem(storageKey,JSON.stringify(history));caption.textContent='This state is saved in the continuity archive.';}
  catch{caption.textContent='Storage is unavailable; this state remains visible for this session.';}
  renderHistory();
});
renderHistory();render(0,false);