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
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return {}}}
  function write(s){localStorage.setItem(KEY,JSON.stringify(s))}
  function dateLabel(value){if(!value)return 'FIRST VISIT';const d=new Date(value);return Number.isNaN(d.getTime())?'RETURN VISIT':d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).toUpperCase()}
  function render(){
    const root=$('#returningWorld');if(!root)return;
    const state=read(),now=new Date().toISOString(),last=state.lastVisit;
    const count=Number(state.visits||0)+1;
    const prompt=prompts[(count-1)%prompts.length];
    root.innerHTML='<div class="returning-world-main"><div><div class="eyebrow">THE COMMON ROOM / A PLACE TO RETURN TO</div><h2>Good to see you back.</h2><p id="returningWorldPrompt"></p><div class="returning-world-actions"><a class="returning-world-link" href="./hub/common-room.html">ENTER THE COMMON ROOM</a><a class="returning-world-link" href="./novel/chapters/BOOK_II_SPATIAL_ATLAS.md">WANDER THE ATLAS</a></div></div><div class="returning-world-meta" id="returningWorldVisit"></div></div><div class="returning-world-side"><label for="returningWorldNote">LEAVE A LITTLE TRACE</label><textarea id="returningWorldNote" maxlength="500" placeholder="A thought, a joke, a detail worth keeping…"></textarea><div class="returning-world-actions"><button type="button" id="returningWorldSave">KEEP THIS NOTE</button><button type="button" id="returningWorldRecall">SHOW THE LAST NOTE</button></div><div class="returning-world-status" id="returningWorldStatus" aria-live="polite"></div><div class="returning-world-trace" id="returningWorldTrace" hidden></div></div>';
    $('#returningWorldPrompt').textContent=state.nextPrompt||prompt;
    $('#returningWorldVisit').textContent=(last?'LAST HERE / '+dateLabel(last)+' · ':'')+'VISIT '+count;
    $('#returningWorldSave').addEventListener('click',()=>{
      const note=$('#returningWorldNote').value.trim();
      if(!note){$('#returningWorldStatus').textContent='Write a small detail first.';return}
      const s=read();s.notes=Array.isArray(s.notes)?s.notes:[];s.notes.unshift({text:note,at:new Date().toISOString()});s.notes=s.notes.slice(0,20);write(s);
      $('#returningWorldNote').value='';$('#returningWorldStatus').textContent='Kept in this browser. It will be here when you return.';showLatest();
    });
    $('#returningWorldRecall').addEventListener('click',showLatest);
    state.lastVisit=now;state.visits=count;state.nextPrompt=prompts[count%prompts.length];write(state);
    function showLatest(){const s=read(),item=(s.notes||[])[0],box=$('#returningWorldTrace');if(!item){box.hidden=false;box.textContent='No notes saved yet. This space is yours to fill.';return}box.hidden=false;box.textContent=dateLabel(item.at)+'\n'+item.text}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();