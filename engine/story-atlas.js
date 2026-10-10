/* GEEHUB // PASSIVE STORY ATLAS
   The entire territory stays visible while the story changes. A single pin follows the current narrative state.
*/
(() => {
  const KEY = 'geehub-story-atlas-v1';
  const places = [
    {id:'threshold',name:'THE BLACK WINDOW',x:17,y:67,stage:'NOTICE'},
    {id:'signal',name:'THE SIGNAL CHAMBER',x:31,y:48,stage:'PRESSURE'},
    {id:'door',name:'THE OPENING',x:43,y:72,stage:'SWELL'},
    {id:'map',name:'THE UNFINISHED TERRITORY',x:58,y:36,stage:'EXPANSION'},
    {id:'archive',name:'THE LIVING ARCHIVE',x:73,y:57,stage:'COMPARE'},
    {id:'hyper',name:'HYPER / EXPANSION FIELD',x:83,y:27,stage:'HYPER'},
    {id:'hold',name:'THE NEW BASELINE',x:88,y:72,stage:'NEW BASELINE'}
  ];
  let current = 'threshold';
  let host;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({current,at:new Date().toISOString()})); } catch {} };
  function render() {
    if (!host) return;
    const p = places.find(item => item.id === current) || places[0];
    const pin = host.querySelector('#storyMapPin');
    const label = host.querySelector('#storyMapLocation');
    if (pin) { pin.setAttribute('transform', `translate(${p.x} ${p.y})`); pin.setAttribute('aria-label', 'You are here: ' + p.name); }
    if (label) label.textContent = p.name;
    host.dataset.location = p.id;
  }
  function locate(detail = {}) {
    const explicit = String(detail.location || detail.place || detail.destination || detail.title || '').toLowerCase();
    let found = places.find(p => explicit.includes(p.id) || explicit.includes(p.name.toLowerCase()));
    if (!found) {
      const stage = String(detail.stage || detail.stageName || '').toUpperCase();
      found = places.find(p => p.stage === stage);
    }
    if (!found) {
      const prior = places.findIndex(p => p.id === current);
      found = places[Math.min(places.length - 1, Math.max(0, prior + 1))];
    }
    current = found.id;
    render();
    save();
    if (window.GEEHUB_ENVIRONMENT?.transition && detail.echo !== false) {
      const stage = found.stage;
      window.GEEHUB_ENVIRONMENT.transition(stage, 'The story pin arrives at ' + found.name + '.');
    }
    document.dispatchEvent(new CustomEvent('geehub:story-location',{detail:{...found,at:new Date().toISOString()}}));
  }
  function ensure() {
    host = document.getElementById('storyAtlas');
    if (!host || host.dataset.ready) return;
    host.dataset.ready = 'true';
    const map = host.querySelector('#storyAtlasSvg');
    const NS = 'http://www.w3.org/2000/svg';
    const markerGroup = document.createElementNS(NS,'g');
    markerGroup.id = 'storyMapPin';
    markerGroup.setAttribute('transform','translate(17 67)');
    markerGroup.innerHTML = '<circle r="3.2" fill="#e8d3a1" opacity=".17"><animate attributeName="r" values="3;7;3" dur="3.8s" repeatCount="indefinite"/></circle><circle r="1.8" fill="#e8d3a1" stroke="#090b0d" stroke-width=".55"/><path d="M0 2.5 L0 8" stroke="#e8d3a1" stroke-width=".6"/>';
    map.appendChild(markerGroup);
    const previous = read();
    if (places.some(p => p.id === previous.current)) current = previous.current;
    render();
    document.addEventListener('geehub:world-history', e => locate(e.detail || {}));
    document.addEventListener('geehub:environmental-transition', e => {
      const stage = String(e.detail?.stage || '').toUpperCase();
      const found = places.find(p => p.stage === stage);
      if (found) { current = found.id; render(); save(); }
    });
    document.addEventListener('geehub:story-location', e => {
      const found = places.find(p => p.id === e.detail?.id);
      if (found) { current = found.id; render(); save(); }
    });
    document.addEventListener('click', e => {
      const button = e.target.closest('button');
      if (!button) return;
      const text = (button.textContent || '').trim().toLowerCase();
      if (/\b(reset|return to the center|start over)\b/.test(text)) { current = 'threshold'; render(); save(); return; }
      if (/\b(hyper|balloon|expand|growth)\b/.test(text)) locate({stage:'HYPER'});
      else if (/\b(archive|memory|record)\b/.test(text)) locate({stage:'COMPARE'});
      else if (/\b(map|territory|explore)\b/.test(text)) locate({stage:'EXPANSION'});
    });
  }
  window.GEEHUB_STORY_ATLAS = {locate, current:() => places.find(p => p.id === current), places:() => places.map(p => ({...p}))};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure); else ensure();
})();