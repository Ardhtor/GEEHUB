/* GEEHUB / COMMAND COUNCIL
   Every command passes through the five named minds before its original action runs.
   The minds interpret; they do not seize ownership of the command.
*/
(() => {
  const agents = {
    luke:{name:'LUKE',lens:'PRESENCE'},
    tyler:{name:'TYLER',lens:'MEASUREMENT'},
    andrew:{name:'ANDREW',lens:'ACTION'},
    joseph:{name:'JOSEPH',lens:'MEMORY'},
    chase:{name:'CHASE',lens:'OBSERVATION'}
  };
  const key='geehub-command-council';
  let busy=false;

  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const labelFor=el => {
    if(!el)return 'UNNAMED COMMAND';
    return String(el.getAttribute('aria-label')||el.textContent||el.value||el.id||el.name||'command')
      .replace(/\s+/g,' ').trim().slice(0,120).toUpperCase();
  };
  const thought=(id,command)=>{
    const l=agents[id].lens;
    if(l==='PRESENCE') return 'What changes in the room when this happens?';
    if(l==='MEASUREMENT') return 'What state does this command change, and what remains measurable?';
    if(l==='ACTION') return 'What becomes possible once the command is carried out?';
    if(l==='MEMORY') return 'What should remain from this action after it is finished?';
    return 'What is actually happening here before we call it anything else?';
  };

  function ensurePanel(){
    let root=document.querySelector('#commandCouncil');
    if(!root){
      root=document.createElement('div');
      root.id='commandCouncil';
      document.body.appendChild(root);
    }
    return root;
  }

  function save(record){
    let history=[];
    try{history=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
    history.unshift(record);
    localStorage.setItem(key,JSON.stringify(history.slice(0,40)));
  }

  async function passThrough(el){
    if(busy)return;
    busy=true;
    const command=labelFor(el);
    const root=ensurePanel();
    const list=Object.entries(agents);
    root.innerHTML=
      '<div class="command-council-panel"><div class="command-council-head"><strong>COMMAND / FIVE MINDS FIRST</strong><span>LISTENING</span></div>'+
      '<div class="command-council-command">&gt; '+esc(command)+'</div>'+
      '<div class="command-minds">'+list.map(([id,a])=>'<div class="command-mind"><b>'+a.name+'</b><span>'+esc(thought(id,command))+'</span></div>').join('')+'</div>'+
      '<div class="command-council-foot">LUKE / TYLER / ANDREW / JOSEPH / CHASE → ACTION</div></div>';
    root.classList.add('active');

    const start=Date.now();
    await new Promise(resolve=>setTimeout(resolve,650));
    const record={id:'council-'+start,at:start,command,agents:Object.fromEntries(list.map(([id,a])=>[id,{name:a.name,lens:a.lens,thought:thought(id,command)}])),result:'forwarded'};
    save(record);
    window.GEEHUB_INTERACTION?.emit({
      id:record.id,at:start,from:'council',to:'geehub',type:'NOTICE',
      title:'Five minds reviewed '+command,
      body:'The command passed through Luke, Tyler, Andrew, Joseph, and Chase before execution.',
      source:'command council',live:true
    });

    root.innerHTML='<div class="command-council-panel"><div class="command-council-head"><strong>COMMAND / CLEARED</strong><span>ACTING</span></div><div class="command-council-command">&gt; '+esc(command)+'</div><div class="command-council-foot">THE FIVE HAVE SEEN IT. THE COMMAND PROCEEDS.</div></div>';
    const bypass='data-geehub-council-bypass';
    el.setAttribute(bypass,'1');
    try{
      if(el.tagName==='BUTTON') el.click();
      else if(typeof el.click==='function') el.click();
      else el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    }finally{
      setTimeout(()=>el.removeAttribute(bypass),0);
    }
    setTimeout(()=>root.classList.remove('active'),520);
    busy=false;
  }

  document.addEventListener('click',event=>{
    if(busy)return;
    const el=event.target.closest?.('button, a, [role="button"], input[type="submit"], input[type="button"]');
    if(!el || el.hasAttribute('data-geehub-council-bypass') || el.closest('#commandCouncil'))return;
    if(el.matches('a[href^="http"],a[target="_blank"]')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    passThrough(el);
  },true);
})();