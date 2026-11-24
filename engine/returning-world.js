(function(){
  'use strict';
  const KEY='geehub-returning-world-v1';
  const $=s=>document.querySelector(s);
  const prompts=[
    'The afternoon is still open. What shall we get up to?',
    'There is room for a little mischief, a little making, and no need to hurry.',
    'Pick up an old thread or let the day surprise you.',
    'A familiar place can feel different when you return to it.',
    'The best parts of a shared world are often the small things that stay.'
  ];
  const invitations=[
    {id:'cedar-walk',title:'Take the Cedar Walk',place:'Cedar Span',kind:'QUIET COMPANY',line:'A covered timber passage, the grounds beyond it, and enough time to let a conversation find its own pace.'},
    {id:'long-return',title:'Play the Long Return',place:'Twin Grounds',kind:'FRIENDLY COMPETITION',line:'A cooperative route across the grounds. A little showing off is welcome; nobody has to prove anything.'},
    {id:'pavilion',title:'Stay at the Pavilion',place:'Shared Green',kind:'AFTERNOON HANGOUT',line:'Find a seat, watch the grounds, trade stories, and let the afternoon run long.'},
    {id:'show-and-tell',title:'Show Me What You Made',place:'Evermeasure Board',kind:'PLAYFUL DISPLAY',line:'Bring an artifact, a new idea, a ridiculous improvement, or something you are quietly pleased with.'}
  ];
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return {}}}
  function write(s){localStorage.setItem(KEY,JSON.stringify(s))}
  function dateLabel(value){if(!value)return 'FIRST VISIT';const d=new Date(value);return Number.isNaN(d.getTime())?'RETURN VISIT':d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).toUpperCase()}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function render(){
    const root=$('#returningWorld');if(!root)return;
    const state=read(),now=new Date().toISOString(),last=state.lastVisit;
    const count=Number(state.visits||0)+1;
    const prompt=prompts[(count-1)%prompts.length];
    const lastPlan=invitations.find(x=>x.id===state.lastPlan);
    root.innerHTML='<div class="returning-world-main"><div><div class="eyebrow">THE COMMON ROOM / A PLACE TO RETURN TO</div><h2>Good to see you back.</h2><p id="returningWorldPrompt"></p><div class="returning-world-actions"><a class="returning-world-link" href="./hub/common-room.html">ENTER THE COMMON ROOM</a><a class="returning-world-link" href="./novel/chapters/BOOK_II_SPATIAL_ATLAS.md">WANDER THE ATLAS</a></div></div><div class="returning-world-meta" id="returningWorldVisit"></div></div><div class="returning-world-side"><label for="returningWorldNote">LEAVE A LITTLE TRACE</label><textarea id="returningWorldNote" maxlength="500" placeholder="A thought, a joke, a detail worth keeping…"></textarea><div class="returning-world-actions"><button type="button" id="returningWorldSave">KEEP THIS NOTE</button><button type="button" id="returningWorldRecall">SHOW THE LAST NOTE</button></div><div class="returning-world-status" id="returningWorldStatus" aria-live="polite"></div><div class="returning-world-trace" id="returningWorldTrace" hidden></div></div><div class="returning-world-social"><div class="eyebrow">AFTER THE LAST BELL / THE AFTERNOON IS YOURS</div><h3>Where shall we meet?</h3><p class="returning-world-social-intro">Choose the kind of afternoon. The place remembers what you chose.</p><div class="returning-world-invitations" id="returningWorldInvitations"></div><div class="returning-world-last" id="returningWorldLast"></div></div>';
    $('#returningWorldPrompt').textContent=state.nextPrompt||prompt;
    $('#returningWorldVisit').textContent=(last?'LAST HERE / '+dateLabel(last)+' · ':'')+'VISIT '+count;
    $('#returningWorldSave').addEventListener('click',()=>{
      const note=$('#returningWorldNote').value.trim();
      if(!note){$('#returningWorldStatus').textContent='Write a small detail first.';return}
      const s=read();s.notes=Array.isArray(s.notes)?s.notes:[];s.notes.unshift({text:note,at:new Date().toISOString()});s.notes=s.notes.slice(0,20);write(s);
      $('#returningWorldNote').value='';$('#returningWorldStatus').textContent='Kept in this browser. It will be here when you return.';showLatest();
    });
    $('#returningWorldRecall').addEventListener('click',showLatest);
    const inviteHost=$('#returningWorldInvitations');
    inviteHost.innerHTML=invitations.map(x=>'<button type="button" class="returning-world-invitation" data-plan="'+x.id+'"><span class="returning-world-invitation-kind">'+esc(x.kind)+'</span><strong>'+esc(x.title)+'</strong><small>'+esc(x.place)+'</small><span>'+esc(x.line)+'</span></button>').join('');
    inviteHost.querySelectorAll('[data-plan]').forEach(button=>button.addEventListener('click',()=>{
      const plan=invitations.find(x=>x.id===button.dataset.plan);if(!plan)return;
      const s=read();s.lastPlan=plan.id;s.planHistory=Array.isArray(s.planHistory)?s.planHistory:[];s.planHistory.unshift({id:plan.id,at:new Date().toISOString()});s.planHistory=s.planHistory.slice(0,30);write(s);
      inviteHost.querySelectorAll('[data-plan]').forEach(b=>b.classList.toggle('selected',b===button));
      $('#returningWorldLast').textContent='MEET AT '+plan.place.toUpperCase()+' — '+plan.line+' Your choice has been kept in this browser.';
      document.dispatchEvent(new CustomEvent('geehub:book-two-scene-selected',{detail:{...plan,at:new Date().toISOString(),source:'returning-world'}}));
    }));
    if(lastPlan){const b=inviteHost.querySelector('[data-plan="'+lastPlan.id+'"]');if(b)b.classList.add('selected');$('#returningWorldLast').textContent='LAST TIME YOU CHOSE '+lastPlan.title.toUpperCase()+' AT '+lastPlan.place.toUpperCase()+'. You can pick it up again or choose somewhere new.'}
    state.lastVisit=now;state.visits=count;state.nextPrompt=prompts[count%prompts.length];write(state);
    function showLatest(){const s=read(),item=(s.notes||[])[0],box=$('#returningWorldTrace');if(!item){box.hidden=false;box.textContent='No notes saved yet. This space is yours to fill.';return}box.hidden=false;box.textContent=dateLabel(item.at)+'\n'+item.text}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();