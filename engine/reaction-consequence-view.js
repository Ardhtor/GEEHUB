(() => {
  const root=document.querySelector('#reactionConsequence');
  const bus=window.GEEHUB_REACTION_CONSEQUENCE;
  if(!root||!bus)return;
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function render(){
    const s=bus.state();
    const chain=s.chain||[];
    root.innerHTML='<div class="reaction-consequence-head"><div class="eyebrow">REACTION / CONSEQUENCE</div><h2>ONE CHANGE, THEN THE NEXT MOVE.</h2><p>The character layer feeds back into the world cycle.</p></div><div class="reaction-chain">'+chain.map(x=>'<div><b>'+esc(x.agent.toUpperCase())+'</b><span>'+esc(x.input.toUpperCase())+' → '+esc(x.output.toUpperCase())+'</span></div>').join('')+'</div><div class="reaction-consequence-active">NEXT ACTIVE LANE / '+esc((s.active||'WAITING').toUpperCase())+' / '+esc(s.intent||'NO INTENT')+'</div>';
  }
  window.addEventListener('geehub:reaction-consequence',render);
  render();
})();