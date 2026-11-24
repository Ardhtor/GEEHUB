/* GEEHUB / BOOK II STORY-ENVIRONMENT BRIDGE.
   Places are rendered from sourced Book II geography. Story actions alter local scene state.
   Experimental additions never become canon automatically.
*/
(() => {
'use strict';
const KEY='geehub-book-two-environment-v1', ROOT='bookTwoEnvironment';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=()=>new Date().toISOString();
const scenes={
'cedar-walk':{
 title:'The Cedar Span',location:'Twin Grounds / Covered Walk',chapter:'BOOK II · CHAPTER VII',source:'./novel/chapters/BOOK_II_CHAPTER_VII_THE_CONTEST_THAT_NEVER_ENDS.md',kind:'cedar',
 intro:'The covered timber passage joins the two grounds across the central fold. Resting bays interrupt the walk; open viewing slots reveal the different contours beyond. Joseph’s oak bench has been made to sit steadily here, with room for two.',
 actions:[
  ['bench','Sit at the oak bench','bench','HOLD','The oak bench sits squarely against its marker. Its wide seat makes room without asking either person to crowd the other. The passage carries on around this small pause.','story'],
  ['vista','Look through the viewing slots','vista','COMPARE','The eastern ground appears at a different angle from the western approach. The view is useful, but it is not a survey: the two accounts remain distinct until they are measured.','world'],
  ['walk','Continue across the span','crossing','EXPANSION','The timber passage opens toward the eastern hollow. The route remains a covered connection, not a shortcut that erases the difference between the two grounds.','world']
 ]},
'long-return':{
 title:'The Long Return',location:'Twin Grounds / Recreation Route',chapter:'BOOK II · CHAPTERS VI–VII',source:'./novel/chapters/BOOK_II_CHAPTER_VI_THE_GAME_BETWEEN_THE_HOUSES.md',kind:'course',
 intro:'The cooperative route starts at the western marker, crosses the Cedar Span, curves around the eastern hollow, and returns through the broad sheltered passage. The shallow arch sends a rolling ball back toward the central field. A player can take the shorter line, stop at a recovery point, or join midway.',
 actions:[
  ['route','Walk the first full route','route','EXPANSION','The route is taken in sequence: western marker, Cedar Span, eastern hollow, broad sheltered return. The map records the path walked; it does not invent distances or fixed coordinates.','world'],
  ['ball','Try the return arch','ball','SWELL','The ball runs beneath the shallow arch and returns toward the central field. A new variation can begin from this observed path, rather than replacing the earlier one.','people'],
  ['recovery','Pause at the recovery point','recovery','HOLD','The recovery bench remains part of the course. Stopping is one of the designed ways to play; the route stays open for another attempt.','story']
 ]},
'pavilion':{
 title:'The Open Pavilion',location:'Shared Green / Evermeasure Board',chapter:'BOOK II · CHAPTER VIII',source:'./novel/chapters/BOOK_II_CHAPTER_VIII_A_DAY_IN_THE_OPEN_PAVILION.md',kind:'pavilion',
 intro:'The pavilion stands open on three sides. Under its deep timber roof, the Evermeasure Board keeps current marks, earlier records, methods, and the next challenge visible together. The common table and playing field remain close enough for the gathering to move naturally between work and rest.',
 actions:[
  ['board','Read the Evermeasure Board','board','COMPARE','The Board preserves the current mark beside the previous one and leaves room for the next challenge. A new standard extends the history; it does not erase the work that came before.','archive'],
  ['frame','Inspect the display frame','frame','NOTICE','The removable display frame is checked before it is moved. Its route toward the Cedar Span is judged by actual clearance and a clean passage, not by an estimate of how heavy it feels.','making'],
  ['table','Stay for lunch','table','HOLD','Warm bread, roasted peppers, white beans with herbs, grilled tomatoes, and eggs make their way to the long table. The contest can wait while everyone eats.','people']
 ]},
'show-and-tell':{
 title:'The Evermeasure Exhibition',location:'Open Pavilion / Display Wall',chapter:'BOOK II · CHAPTER VII',source:'./novel/chapters/BOOK_II_CHAPTER_VII_THE_CONTEST_THAT_NEVER_ENDS.md',kind:'exhibition',
 intro:'A contribution can be a clever route, a well-made object, a physical demonstration, a joke, a design, or a small improvement nobody else noticed. The exhibition records methods and variations as well as results. Nothing entered here becomes canon automatically.',
 actions:[
  ['board','Review the existing exhibition','board','COMPARE','Earlier entries remain visible beside later work. The wall is an evolving record, not a ranking of the men or a final verdict.','archive'],
  ['frame','Make room for a new contribution','exhibit','SWELL','The display wall opens a fresh space. A new contribution can sit beside earlier work without displacing it.','making']
 ]}
};
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}};
const write=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}};
function localScene(s,id){s.scenes=s.scenes&&typeof s.scenes==='object'?s.scenes:{};return s.scenes[id]||(s.scenes[id]={moment:'arrival',history:[],exhibits:[]})}
function host(){
 let h=document.getElementById(ROOT);
 if(!h){const anchor=document.getElementById('returningWorld');if(!anchor)return null;h=document.createElement('section');h.id=ROOT;h.className='book-two-environment';h.hidden=true;h.setAttribute('aria-label','Book II story environment');anchor.insertAdjacentElement('afterend',h)}
 return h;
}
function stageArt(id){
 return '<div class="scene-sky"></div><div class="scene-horizon"></div><div class="scene-ground"></div><div class="scene-trees"><i></i><i></i><i></i><i></i></div><div class="scene-walk"><i></i><i></i><i></i></div><div class="scene-bench"><i></i><b></b></div><div class="scene-arch"></div><div class="scene-ball"></div><div class="scene-pavilion"><i></i><b></b><em></em></div><div class="scene-board"><strong>EVERMEASURE</strong><span>CURRENT / PREVIOUS / NEXT</span><i></i></div><div class="scene-table"><i></i><b></b></div><div class="scene-light"></div><div class="scene-caption"><span>BOOK II / LOCAL ENVIRONMENT</span><strong id="bookTwoSceneCaption">The place takes shape around the story.</strong></div>';
}
function render(id,scroll=true){
 const cfg=scenes[id],h=host();if(!cfg||!h)return;
 const s=read(),ls=localScene(s,id),history=(ls.history||[]).slice(0,3),exhibits=(ls.exhibits||[]).slice(0,8);
 s.lastScene=id;s.lastOpened=time();write(s);h.hidden=false;h.dataset.scene=id;h.dataset.moment=ls.moment||'arrival';
 h.innerHTML='<header class="b2-head"><div><div class="eyebrow">STORY / ENVIRONMENT / '+esc(cfg.chapter)+'</div><h2>'+esc(cfg.title)+'</h2><p>'+esc(cfg.location)+'</p></div><div class="b2-controls"><span>SCENE STATE / '+esc((ls.moment||'arrival').toUpperCase())+'</span><button type="button" id="b2Close">CLOSE SCENE</button></div></header>'+
 '<div class="b2-stage" data-scene="'+esc(id)+'" data-moment="'+esc(ls.moment||'arrival')+'">'+stageArt(id)+'</div>'+
 '<div class="b2-body"><div><div class="eyebrow">THE STORY HAS A PLACE HERE</div><p class="b2-prose" id="b2Prose">'+esc(ls.lastText||cfg.intro)+'</p><div class="b2-source">SOURCE / '+esc(cfg.chapter)+' · <a href="'+esc(cfg.source)+'">OPEN CHAPTER</a> · <a href="./novel/chapters/BOOK_II_SPATIAL_ATLAS.md">LOCAL SPATIAL ATLAS</a></div></div><div class="b2-actions"><div class="eyebrow">DO SOMETHING IN THE SCENE</div>'+cfg.actions.map(a=>'<button type="button" data-action="'+esc(a[0])+'"><span>'+esc(a[1])+'</span><small>'+esc(a[2].toUpperCase())+'</small></button>').join('')+'</div></div>'+
 (id==='show-and-tell'?'<div class="b2-compose"><label for="b2Text">ADD A CONTRIBUTION TO THE EXPERIMENTAL EXHIBITION</label><textarea id="b2Text" maxlength="500" placeholder="A design, demonstration, detail, or new challenge…"></textarea><button type="button" id="b2Pin">PIN CONTRIBUTION</button><span id="b2Status" aria-live="polite"></span></div>':'')+
 '<div class="b2-memory"><div><div class="eyebrow">WHAT THIS PLACE REMEMBERS</div><strong>'+(history.length?esc(history[0].title):'No story action recorded yet')+'</strong><p>'+(history.length?esc(history[0].text):'The scene changes when something happens in it. Earlier states remain available.')+'</p></div><div class="b2-exhibits">'+(exhibits.map(x=>'<div><small>EXPERIMENTAL / '+esc(new Date(x.at).toLocaleDateString())+'</small><span>'+esc(x.text)+'</span></div>').join(''))+'</div></div>';
 $('#b2Close',h).addEventListener('click',()=>{h.hidden=true});
 h.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>act(id,b.dataset.action)));
 const pin=$('#b2Pin',h);if(pin)pin.addEventListener('click',()=>pinContribution(id));
 if(scroll)h.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
}
function act(id,actionId){
 const cfg=scenes[id],a=cfg?.actions.find(x=>x[0]===actionId);if(!a)return;
 const s=read(),ls=localScene(s,id),at=time(),item={id:id+'-'+actionId+'-'+Date.now(),title:a[1],text:a[4],moment:a[2],at};
 ls.moment=a[2];ls.lastText=a[4];ls.history.unshift(item);ls.history=ls.history.slice(0,24);s.scenes[id]=ls;s.lastScene=id;s.lastEvent=item;write(s);render(id,false);
 const recipient=({world:'luke',making:'tyler',people:'andrew',story:'joseph',archive:'chase'})[a[5]]||'joseph';
 const event={id:item.id,type:'ENCOUNTER',category:a[5],from:'you',to:recipient,title:cfg.title+' / '+a[1],body:a[4],source:'book-two-story-environment',live:true,at};
 if(window.GEEHUB_INTERACTION?.emit)window.GEEHUB_INTERACTION.emit(event);else document.dispatchEvent(new CustomEvent('geehub:interaction',{detail:event}));
 document.dispatchEvent(new CustomEvent('geehub:book-two-scene-event',{detail:{...item,scene:id,location:cfg.location}}));
 window.GEEHUB_ENVIRONMENT?.transition(a[3],a[4]);
}
function pinContribution(id){
 const h=host(),field=$('#b2Text',h),status=$('#b2Status',h),text=field?.value.trim()||'';
 if(!text){if(status)status.textContent='Add a few words before pinning.';return}
 const s=read(),ls=localScene(s,id),at=time(),item={id:'exhibit-'+Date.now(),text,at,canon:'experimental',source:'user'};
 ls.exhibits.unshift(item);ls.exhibits=ls.exhibits.slice(0,20);ls.moment='exhibit';ls.lastText='A new contribution has been pinned to the experimental exhibition. It remains separate from established canon until deliberately adopted.';
 ls.history.unshift({id:item.id,title:'A new contribution joins the exhibition',text:ls.lastText,at});ls.history=ls.history.slice(0,24);s.scenes[id]=ls;s.lastScene=id;s.lastEvent=item;write(s);
 window.GEEHUB_ARTIFACTS?.emit?.({type:'EXPERIMENTAL STORY EXHIBIT',title:'EVERMEASURE / '+text.slice(0,64),body:text,source:'book-two-story-environment',canon:'experimental',lineage:'Book II / Evermeasure Exhibition'});
 const event={id:item.id,type:'ENCOUNTER',category:'making',from:'you',to:'tyler',title:'A contribution joins the Evermeasure Exhibition',body:text,source:'book-two-story-environment',live:true,at};
 if(window.GEEHUB_INTERACTION?.emit)window.GEEHUB_INTERACTION.emit(event);else document.dispatchEvent(new CustomEvent('geehub:interaction',{detail:event}));
 render(id,false);
}
document.addEventListener('geehub:book-two-scene-selected',e=>{if(scenes[e.detail?.id])render(e.detail.id)});
const prior=read();if(scenes[prior.lastScene])render(prior.lastScene,false);
window.GEEHUB_BOOK_TWO_ENVIRONMENT={open:id=>render(id),act,pinContribution,scenes:()=>Object.keys(scenes)};
})();