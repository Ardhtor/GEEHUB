/* GEEHUB // CONTINUOUS STORY ATLAS
   Location follows the actual story. Atmosphere can change without teleporting the pin.
   When a related route opens, the route is drawn across the still-visible territory.
*/
(() => {
  const KEY = 'geehub-story-atlas-v1';
  const places = [
    {id:'threshold',name:'THE NORTHERN ROAD',x:17,y:67,stage:'NOTICE'},
    {id:'signal',name:'THE SEVENTH WELL',x:31,y:48,stage:'PRESSURE'},
    {id:'door',name:'THE RESERVOIR CITY',x:43,y:72,stage:'SWELL'},
    {id:'map',name:'THE BLUE HALL',x:58,y:36,stage:'EXPANSION'},
    {id:'archive',name:'THE HOUSE OF OPEN SCREENS',x:73,y:57,stage:'COMPARE'},
    {id:'hyper',name:'VEYRTHALIS / DIGITORIUM',x:83,y:27,stage:'HYPER'},
    {id:'hold',name:'THE NEW BASELINE',x:88,y:72,stage:'NEW BASELINE'}
  ];
  let current = 'threshold';
  let routeTarget = null;
  let host = null;
  let routePath = null;
  let routeArrival = null;
  let marker = null;

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify({current,routeTarget:routeTarget?.id||null,at:new Date().toISOString()})); } catch {}
  };
  const findPlace = value => {
    const explicit = String(value || '').toLowerCase().trim();
    return places.find(place => explicit === place.id || explicit.includes(place.name.toLowerCase()) || explicit.includes(place.id)) || null;
  };
  const mapPlaceForRegion = id => {
    try { return window.GEEHUB_WORLD?.mapPlace?.(id) || id || ''; } catch { return id || ''; }
  };

  function render() {
    if (!host) return;
    const place = places.find(item => item.id === current) || places[0];
    const label = host.querySelector('#storyMapLocation');
    const status = host.querySelector('.story-atlas-state');
    if (marker) {
      marker.setAttribute('transform', `translate(${place.x} ${place.y})`);
      marker.setAttribute('aria-label', 'You are here: ' + place.name);
    }
    if (label) label.textContent = place.name;
    if (status) status.textContent = routeTarget && routeTarget.id !== place.id
      ? 'ROUTE OPEN / ' + routeTarget.name
      : 'PASSIVE MAP / LIVE STORY PIN';
    if (routePath && routeArrival) {
      const target = routeTarget && places.find(item => item.id === routeTarget.id);
      const visible = Boolean(target && target.id !== place.id);
      routePath.setAttribute('d', visible
        ? `M ${place.x} ${place.y} Q ${(place.x+target.x)/2} ${Math.max(3,(place.y+target.y)/2-7)} ${target.x} ${target.y}`
        : '');
      routePath.setAttribute('opacity', visible ? '1' : '0');
      routeArrival.setAttribute('transform', visible ? `translate(${target.x} ${target.y})` : 'translate(-20 -20)');
      host.classList.toggle('route-open', visible);
    }
    host.dataset.location = place.id;
    host.dataset.route = routeTarget?.id || '';
  }

  function locate(detail = {}) {
    const found = findPlace(detail.location || detail.place || detail.destination || detail.title);
    const stage = String(detail.stage || detail.stageName || '').toUpperCase();
    const resolved = found || places.find(place => place.stage === stage);
    if (!resolved) return null;
    current = resolved.id;
    // A real change of story location closes an untraversed route. A newly opened route
    // is applied after the location event, so the destination never pulls the pin early.
    routeTarget = null;
    render();
    save();
    document.dispatchEvent(new CustomEvent('geehub:story-location', {detail:{...resolved,at:new Date().toISOString()}}));
    return resolved;
  }

  function setRoute(detail = {}) {
    const found = findPlace(detail.location || detail.place || detail.destination || detail.title);
    if (!found || found.id === current) {
      routeTarget = null;
    } else {
      routeTarget = found;
    }
    render();
    save();
    return routeTarget;
  }

  function clearRoute() {
    routeTarget = null;
    render();
    save();
  }

  function syncRouteFromRuntime() {
    const state = window.GEEHUB_WORLD_AUTONOMY?.state?.();
    if (state?.nextRegion && Number(state.phase) === 3) setRoute({location:mapPlaceForRegion(state.nextRegion)});
    else clearRoute();
  }

  function ensure() {
    host = document.getElementById('storyAtlas');
    if (!host || host.dataset.ready) return;
    host.dataset.ready = 'true';
    const map = host.querySelector('#storyAtlasSvg');
    if (!map) return;
    const NS = 'http://www.w3.org/2000/svg';

    const routeGroup = document.createElementNS(NS,'g');
    routeGroup.id = 'storyMapRoute';
    routeGroup.setAttribute('pointer-events','none');
    routePath = document.createElementNS(NS,'path');
    routePath.setAttribute('fill','none');
    routePath.setAttribute('stroke','#e8d3a1');
    routePath.setAttribute('stroke-width','.7');
    routePath.setAttribute('stroke-linecap','round');
    routePath.setAttribute('stroke-dasharray','1.2 1.7');
    routePath.setAttribute('filter','url(#routeGlow)');
    routePath.setAttribute('opacity','0');
    routeArrival = document.createElementNS(NS,'g');
    routeArrival.id = 'storyMapRouteArrival';
    routeArrival.innerHTML = '<circle r="2.3" fill="#e8d3a1" fill-opacity=".12" stroke="#e8d3a1" stroke-width=".35"/><path d="M-1.1 0H1.1M0 -1.1V1.1" stroke="#e8d3a1" stroke-width=".3"/>';
    routeGroup.appendChild(routePath);
    routeGroup.appendChild(routeArrival);
    map.appendChild(routeGroup);

    marker = document.createElementNS(NS,'g');
    marker.id = 'storyMapPin';
    marker.setAttribute('transform','translate(17 67)');
    marker.innerHTML = '<circle r="3.2" fill="#e8d3a1" opacity=".17"><animate attributeName="r" values="3;7;3" dur="3.8s" repeatCount="indefinite"/></circle><circle r="1.8" fill="#e8d3a1" stroke="#090b0d" stroke-width=".55"/><path d="M0 2.5 L0 8" stroke="#e8d3a1" stroke-width=".6"/>';
    map.appendChild(marker);

    const previous = read();
    if (places.some(place => place.id === previous.current)) current = previous.current;
    if (places.some(place => place.id === previous.routeTarget)) routeTarget = places.find(place => place.id === previous.routeTarget);
    render();

    // Geographic pin responds to geography only. Environmental or morph stages no longer
    // move the story to an unrelated map coordinate.
    document.addEventListener('geehub:story-location', event => {
      const found = places.find(place => place.id === event.detail?.id);
      if (found) {
        current = found.id;
        if (routeTarget?.id === current) routeTarget = null;
        render();
        save();
      }
    });
    document.addEventListener('geehub:world-encounter', event => {
      if (event.detail?.source !== 'restore') clearRoute();
    });
    document.addEventListener('geehub:world-response', event => {
      const detail = event.detail || {};
      if (detail.type === 'ROUTE_OPEN' && detail.to) setRoute({location:mapPlaceForRegion(detail.to)});
    });
    document.addEventListener('geehub:world-autonomy-ready', syncRouteFromRuntime);
    document.addEventListener('geehub:world-response', syncRouteFromRuntime);
    document.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      const text = (button.textContent || '').trim().toLowerCase();
      if (/\b(reset|return to the center|start over)\b/.test(text)) { locate({stage:'NOTICE'}); return; }
      if (/\b(hyper|balloon|expand|growth)\b/.test(text)) locate({stage:'HYPER'});
      else if (/\b(archive|memory|record)\b/.test(text)) locate({stage:'COMPARE'});
      else if (/\b(map|territory|explore)\b/.test(text)) locate({stage:'EXPANSION'});
    });
  }

  window.GEEHUB_STORY_ATLAS = {
    locate,
    setRoute,
    clearRoute,
    current:() => places.find(place => place.id === current),
    route:() => routeTarget ? {...routeTarget} : null,
    places:() => places.map(place => ({...place}))
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure);
  else ensure();
})();