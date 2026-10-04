/* GEEHUB / SOCIAL CYBERSPACE
   External social platforms are doors, not the world itself.
   This surface can draft, queue, and observe locally; live posting occurs only through an authenticated adapter.
*/
(() => {
  const root=document.querySelector('#socialCyberspace');
  if(!root)return;
  const state={manifest:null,queue:null,active:'instagram'};
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const platformNames={instagram:'INSTAGRAM',facebook:'FACEBOOK',tiktok:'TIKTOK',youtube:'YOUTUBE'};

  function render(){
    if(!state.manifest||!state.queue)return;
    const platforms=state.manifest.platforms||{};
    const agents=state.manifest.agents||{};
    const recent=state.queue.recent||[];
    root.innerHTML=
      '<div class="social-head"><div><div class="eyebrow">CYBERSPACE / SOCIAL</div><h2>THE CORPUS ACTS OUTWARD.</h2><p>Instagram, Facebook, TikTok, and YouTube become external doors. The corpus can prepare media and responses here; authenticated adapters carry them outward and bring signals home.</p></div><div class="social-count">'+recent.length+' QUEUED</div></div>'+
      '<div class="social-platforms">'+Object.keys(platforms).map(k=>{
        const p=platforms[k];
        return '<button class="social-platform '+(state.active===k?'active':'')+'" data-platform="'+k+'" type="button"><span>'+platformNames[k]+'</span><strong>'+esc(p.status).toUpperCase()+'</strong><small>'+esc((p.capabilities||[]).join(' · '))+'</small></button>';
      }).join('')+'</div>'+
      '<div class="social-stage"><div class="social-stream"><div class="eyebrow">CORPUS / OUTBOUND SIGNAL</div>'+recent.map(x=>'<article class="social-post"><span>'+esc(x.agent)+' / '+platformNames[x.platform]+'</span><strong>'+esc(x.title)+'</strong><p>'+esc(x.body)+'</p><small>'+esc(x.status)+'</small></article>').join('')+'</div>'+
      '<aside class="social-agents"><div class="eyebrow">FIVE PRESENCES</div>'+Object.entries(agents).map(([id,a])=>'<button class="social-agent" data-agent="'+id+'" type="button"><strong>'+esc(a.persona)+'</strong><span>'+esc(a.stance)+'</span><small>'+esc((a.channels||[]).map(c=>platformNames[c]).join(' · '))+'</small></button>').join('')+'</aside></div>'+
      '<div class="social-detail" id="socialDetail">Select a platform or presence. The corpus remains the source; social media is its exterior.</div>';
    root.querySelectorAll('[data-platform]').forEach(b=>b.addEventListener('click',()=>{
      state.active=b.dataset.platform;
      const p=platforms[state.active];
      root.querySelector('#socialDetail').textContent=platformNames[state.active]+' / '+String(p.status).toUpperCase()+' / '+(p.note||'');
      root.querySelectorAll('.social-platform').forEach(x=>x.classList.toggle('active',x.dataset.platform===state.active));
    }));
    root.querySelectorAll('[data-agent]').forEach(b=>b.addEventListener('click',()=>{
      const a=agents[b.dataset.agent];
      root.querySelector('#socialDetail').textContent=a.persona+' / '+a.stance+' / CHANNELS: '+(a.channels||[]).map(c=>platformNames[c]).join(' · ');
    }));
  }

  async function load(){
    try{
      const [m,q]=await Promise.all([
        fetch('./hub/social-cyberspace.json?ts='+Date.now(),{cache:'no-store'}),
        fetch('./hub/social-queue.json?ts='+Date.now(),{cache:'no-store'})
      ]);
      if(!m.ok||!q.ok)throw new Error('social');
      state.manifest=await m.json();state.queue=await q.json();render();
    }catch{root.innerHTML='<div class="interaction-empty">SOCIAL CYBERSPACE OFFLINE.</div>';}
  }

  window.addEventListener('geehub:interaction',e=>{
    const event=e.detail||{};
    if(['ARRIVAL','ENCOUNTER','OFFER','TRANSFORM','RETURN','MEMORY'].includes(event.type)){
      const platform=state.manifest?.agents?.[event.from]?.channels?.[0]||'instagram';
      root.dataset.lastEvent=event.id||'';
      const detail=document.querySelector('#socialDetail');
      if(detail)detail.textContent='CORPUS SIGNAL: '+(event.title||event.type)+' → SOCIAL DRAFT / '+platformNames[platform];
    }
  });
  load();
  setInterval(load,20000);
})();