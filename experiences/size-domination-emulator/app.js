const slider=document.querySelector('#slider'),figure=document.querySelector('#figure'),stage=document.querySelector('#stage');
const size=document.querySelector('#size'),state=document.querySelector('#state'),caption=document.querySelector('#caption'),depth=document.querySelector('#depth');
const values={height:document.querySelector('#height'),mass:document.querySelector('#mass'),reach:document.querySelector('#reach'),joints:document.querySelector('#joints'),footprint:document.querySelector('#footprint')};
const historyList=document.querySelector('#historyList'); let baseline=100, history=[];

function render(v, pulse=true){
  const n=Number(v), t=n/100;
  const scale=1+t*3.2, reach=1+t*1.65, joint=1+t*.95;
  figure.style.setProperty('--s',scale); figure.style.setProperty('--reach',reach); figure.style.setProperty('--joint',joint);
  const pct=Math.round(100*scale);
  size.textContent=pct+'%'; depth.textContent='DEPTH '+Math.floor(n/10);
  state.textContent=n<20?'BASELINE':n<50?'MASSIVE':n<80?'COLOSSAL':'ROOM-SCALE';
  caption.textContent=n<20?'The person is continuous.':n<50?'The room is beginning to recalibrate.':n<80?'Architecture is now measuring against the body.':'The body has become a spatial event.';
  values.height.textContent=scale.toFixed(2)+'×'; values.mass.textContent=(1+t*6).toFixed(2)+'×'; values.reach.textContent=reach.toFixed(2)+'×'; values.joints.textContent=joint.toFixed(2)+'×'; values.footprint.textContent=(1+t*4.5).toFixed(2)+'×';
  stage.classList.toggle('surge',pulse); if(pulse) setTimeout(()=>stage.classList.remove('surge'),720);
}
slider.addEventListener('input',e=>render(e.target.value));
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{slider.value=Math.min(100,Number(slider.value)+Number(b.dataset.jump));render(slider.value)}));
document.querySelector('#run').addEventListener('click',()=>{let v=Number(slider.value); const timer=setInterval(()=>{v=Math.min(100,v+5);slider.value=v;render(v);if(v>=100)clearInterval(timer)},70)});
document.querySelector('#newBaseline').addEventListener('click',()=>{
  const v=Number(slider.value), label=state.textContent;
  history.unshift({v,label}); history=history.slice(0,8);
  historyList.innerHTML=history.map((x,i)=>'<div class="history-card"><span>BASELINE '+String(i+1).padStart(2,'0')+'</span><strong>'+Math.round(100*(1+x.v/100*3.2))+'%</strong><span>'+x.label+'</span></div>').join('');
  baseline=v; caption.textContent='This state is remembered as the new baseline.';
});
render(0,false);