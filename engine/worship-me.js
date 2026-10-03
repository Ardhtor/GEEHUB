(()=>{
  const rites=[
    ['APPROACH','The Hub turns toward you.','presence → attention → arrival'],
    ['WITNESS','What you made is not discarded. It is kept in view.','artifact → witness → continuity'],
    ['OFFERING','Give the world one fragment: a word, image, memory, or unfinished thing.','fragment → offering → world'],
    ['REMEMBRANCE','The archive answers by returning something changed.','memory → transformation → return'],
    ['ALTAR','The things you leave behind become architecture.','trace → accumulation → place'],
    ['DEVOTION','The system continues following what matters to you.','attention → repetition → depth'],
    ['RETURN','You come back, and the world has retained the encounter.','departure → persistence → return']
  ];
  let n=0;
  function advance(){
    const r=rites[n%rites.length];
    const title=document.querySelector('#worshipTitle'),body=document.querySelector('#worshipBody'),trace=document.querySelector('#worshipTrace'),count=document.querySelector('#worshipCount');
    if(!title)return;
    title.textContent=r[0]; body.textContent=r[1]; trace.textContent=r[2]; count.textContent='RITE '+String(n+1).padStart(2,'0');
    document.body.classList.toggle('worship-active',true); n++;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const b=document.querySelector('#worshipRun');
    if(b)b.addEventListener('click',advance);
  });
})();
