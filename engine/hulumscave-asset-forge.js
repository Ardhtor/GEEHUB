/* GEEHUB HULUMSCAVE ASSET FORGE */
(() => {
  const DATA={
  "version": 1,
  "purpose": "GEEHUB -> HULUMSCAVE content creation",
  "license_policy": "CC0-only seed library",
  "sources": [
    {"provider":"Poly Haven","license":"CC0","license_url":"https://polyhaven.com/license","homepage":"https://polyhaven.com/","role":"cinematic lighting, photoreal environments, PBR surfaces, natural/industrial world texture"},
    {"provider":"Kenney","license":"CC0","license_url":"https://kenney.nl/support","homepage":"https://kenney.nl/","role":"rapid blocking, modular architecture, vehicles, characters, animation/prototype geometry"}
  ],
  "assets": [
    {"id":"ph-hidden-alley","provider":"Poly Haven","type":"collection","name":"The Hidden Alley","url":"https://polyhaven.com/collections/the-hidden-alley","role":"Hulumscave urban night / forgotten passage"},
    {"id":"ph-pine-forest","provider":"Poly Haven","type":"collection","name":"Pine Forest","url":"https://polyhaven.com/collections/pine-forest","role":"dark forest / transition space"},
    {"id":"ph-smugglers-cove","provider":"Poly Haven","type":"collection","name":"The Smuggler's Cove","url":"https://polyhaven.com/collections/the-smugglers-cove","role":"nautical / cavern / adventure space"},
    {"id":"ph-industrial-hdris","provider":"Poly Haven","type":"catalog","name":"Industrial HDRIs","url":"https://polyhaven.com/hdris?c=industrial","role":"Maya-like industrial lighting beds"},
    {"id":"ph-models","provider":"Poly Haven","type":"catalog","name":"Models","url":"https://polyhaven.com/models","role":"hero props and set dressing"},
    {"id":"kenney-prototype-kit","provider":"Kenney","type":"kit","name":"Prototype Kit","url":"https://kenney.nl/assets/prototype-kit","role":"blocking bodies, buildings, vehicles and animation-ready pieces"},
    {"id":"kenney-city-suburban","provider":"Kenney","type":"kit","name":"City Kit (Suburban)","url":"https://kenney.nl/assets/city-kit-suburban","role":"street geometry / exterior blocking"},
    {"id":"kenney-marble-kit","provider":"Kenney","type":"kit","name":"Marble Kit","url":"https://kenney.nl/assets/marble-kit","role":"graphic geometric motion inserts"},
    {"id":"kenney-development-essentials","provider":"Kenney","type":"kit","name":"Development Essentials","url":"https://kenney.nl/assets/development-essentials","role":"prototype materials and technical surfaces"},
    {"id":"kenney-ui-pack","provider":"Kenney","type":"kit","name":"UI Pack","url":"https://kenney.nl/assets/ui-pack","role":"diegetic CRT/interface overlays and control language"}
  ],
  "recipes": [
    {"id":"hulumscave-night-alley","name":"HULUM'A / NIGHT ALLEY","stack":["ph-hidden-alley","ph-industrial-hdris","ph-models","kenney-city-suburban","kenney-ui-pack"],"output":"60-90 second Maya-2010-feeling micro-scene: arrival -> walk -> pause -> strange machine/UI trace -> departure"},
    {"id":"hulumscave-forest-transition","name":"HULUM'A / FOREST TRANSITION","stack":["ph-pine-forest","ph-industrial-hdris","ph-models","kenney-prototype-kit","kenney-ui-pack"],"output":"quiet body-scale passage: figure enters woods, environment shifts, one object becomes the memory anchor"},
    {"id":"hulumscave-cove-machine","name":"HULUM'A / COVE MACHINE","stack":["ph-smugglers-cove","ph-industrial-hdris","ph-models","kenney-prototype-kit","kenney-marble-kit"],"output":"water + machinery + character movement, built around a single impossible mechanical gesture"}
  ]
};
  const ART=window.GEEHUB_ARTIFACTS;
  const host=document.querySelector('#hulumscaveForge');
  if(!host)return;
  host.innerHTML='<div class="forge-head"><div><div class="eyebrow">HULUMSCAVE / ASSET FORGE</div><h2>COMBINE THE WORLD</h2><p>Online CC0 ingredients become scene recipes, then durable GEEHUB production artifacts.</p></div><div class="forge-count">'+DATA.assets.length+' INGREDIENTS / '+DATA.recipes.length+' SCENES</div></div>'+
    '<div class="forge-sources">'+DATA.sources.map(s=>'<a href="'+s.homepage+'" target="_blank" rel="noreferrer"><strong>'+s.provider+'</strong><small>'+s.license+' // '+s.role+'</small></a>').join('')+'</div>'+
    '<div class="forge-recipes">'+DATA.recipes.map(r=>'<article class="forge-recipe"><div class="eyebrow">SCENE RECIPE</div><h3>'+r.name+'</h3><p>'+r.output+'</p><div class="forge-stack">'+r.stack.map(id=>{const a=DATA.assets.find(x=>x.id===id);return '<a href="'+a.url+'" target="_blank" rel="noreferrer">'+a.name+'</a>';}).join('')+'</div><button type="button" data-recipe="'+r.id+'">BUILD THIS SCENE</button></article>').join('')+'</div>'+
    '<div class="forge-library"><div class="eyebrow">ONLINE INGREDIENTS</div><div class="forge-asset-grid">'+DATA.assets.map(a=>'<a class="forge-asset" href="'+a.url+'" target="_blank" rel="noreferrer"><strong>'+a.name+'</strong><span>'+a.provider+' // '+a.type+'</span><small>'+a.role+'</small></a>').join('')+'</div></div>';
  host.querySelectorAll('[data-recipe]').forEach(btn=>btn.addEventListener('click',()=>{
    const recipe=DATA.recipes.find(r=>r.id===btn.dataset.recipe), stack=recipe.stack.map(id=>DATA.assets.find(a=>a.id===id));
    if(ART)ART.emit({type:'hulumscave-scene',title:recipe.name,body:recipe.output+' Ingredient stack: '+stack.map(a=>a.name).join(' + '),source:'GEEHUB HULUMSCAVE asset forge',lineage:{recipe:recipe.id,assets:stack.map(a=>a.id),providers:[...new Set(stack.map(a=>a.provider))]},canon:'experiment',dreamable:true,quietness:'high'});
    btn.textContent='SCENE QUEUED'; setTimeout(()=>btn.textContent='BUILD THIS SCENE',1400);
    window.dispatchEvent(new CustomEvent('geehub:hulumscave-scene',{detail:{recipe,stack}}));
  });
  window.GEEHUB_HULUMSCAVE=DATA;
})();