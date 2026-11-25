/* GEEHUB / ASSISTANT TOUCH
   A real assistant-authored repository change enters the running world as an event.
   The feed is intentionally tiny and replaceable: each new id is one new touch.
*/
(() => {
  const FEED='./hub/assistant-touch.json';
  const SEEN='geehub-assistant-touch-seen';
  const bus=window.GEEHUB_INTERACTION;
  if(!bus)return;

  const seen=()=>{try{return JSON.parse(localStorage.getItem(SEEN)||'[]')}catch{return[]}};
  const remember=id=>{const ids=seen();if(!ids.includes(id))ids.unshift(id);localStorage.setItem(SEEN,JSON.stringify(ids.slice(0,80)));};

  function showHand(event){
    const root=document.querySelector('#sharedInteraction');
    const orbit=root?.querySelector('.interaction-orbit');
    if(!root||!orbit)return;
    root.classList.add('hand-arrives');
    orbit.querySelector('.assistant-hand')?.remove();
    const hand=document.createElement('div');
    hand.className='assistant-hand';
    hand.setAttribute('aria-hidden','true');
    hand.innerHTML='<b></b><i></i><i></i><i></i><i></i><i></i>';
    orbit.appendChild(hand);
    window.setTimeout(()=>{hand.remove();root.classList.remove('hand-arrives');},3600);
    root.dataset.lastTouch=event.id;
  }

  async function check(){
    try{
      const response=await fetch(FEED+'?ts='+Date.now(),{cache:'no-store'});
      if(!response.ok)return;
      const feed=await response.json();
      if(!window.GEEHUB_REACTIONS){window.setTimeout(check,120);return;}
      const events=Array.isArray(feed.events)?feed.events:(feed.id?[feed]:[]);
      for(const event of events.slice(0,8).reverse()){
        if(!event?.id||seen().includes(event.id))continue;
        const payload={
          ...event,
          type:'TRANSFORM',
          from:'assistant',
          to:'geehub',
          source:'ASSISTANT REPOSITORY CHANGE',
          live:true
        };
        bus.emit(payload);
        remember(event.id);
        window.dispatchEvent(new CustomEvent('geehub:assistant-touch',{detail:payload}));
        window.setTimeout(()=>showHand(payload),80);
      }
    }catch{}
  }

  check();
  window.setInterval(check,15000);
  window.GEEHUB_ASSISTANT_TOUCH={refresh:check,seen};
})();
