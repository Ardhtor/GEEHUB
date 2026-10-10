/* GEEHUB // AUTONOMOUS WORLD
   The world is governed by retained state and relationships, not random event rolls.
   Time changes atmosphere; visits change memory; known relations open routes; a route
   becomes movement only after the world has had time to register it.
*/
(() => {
  const KEY = 'geehub-autonomous-world-v1';
  const TICK_MS = 14000;
  const FAST_TICK_MS = 6200;
  const FIRST_TICK_MS = 7600;
  const MAX_HISTORY = 80;
  let timer = null;
  let booted = false;

  const now = () => new Date().toISOString();
  const stamp = () => Date.now();
  const defaults = () => ({
    version: 1,
    currentRegion: null,
    nextRegion: null,
    phase: 0,
    visits: {},
    lastVisits: {},
    sequence: 0,
    pressure: 0.18,
    memory: 0.5,
    runMode: false,
    startedAt: now(),
    lastEvent: null,
    history: []
  });
  const read = () => {
    try { return {...defaults(), ...(JSON.parse(localStorage.getItem(KEY) || '{}'))}; }
    catch { return defaults(); }
  };
  let state = read();
  state.runMode = false;

  const cues = {
    bodylounger: [
      'The cursor rests over an old archive page. A row of saved images reflects in the black monitor bezel, and the fan draws a dry thread of dust past the keyboard. A second page opens in the background without replacing the first; the archive is keeping both views.',
      'A date on the oldest record becomes legible as the screen warms. Nothing in the image moves, but the browser title changes to the name of a related creator. The new record has appeared through a link already present in the archive.'
    ],
    beefythiq: [
      'The floor gives a low answer when the man shifts his stance. The seams across his shoulders settle into a new line, and his arms hang a little farther from his ribs. A chair remains where it was; the distance between chair and body now means something different.',
      'The room keeps the earlier outline in its measurements. A doorway that fitted yesterday sits close against the man’s shoulder today, and the mirror shows his familiar face above a broader chest. No one announces the change; the architecture has already recorded it.'
    ],
    'male-harem': [
      'Late light travels through the high windows and catches the worn edges of the gym benches. One man has left a shirt over a chair back; another turns toward the doorway when he hears the heavy, even rhythm of familiar footsteps. Conversation continues without anyone needing to explain why they looked up.',
      'The kitchen door stays open. Two men stand close enough that their shoulders touch while they disagree about what to eat, and one reaches around the other for a mug. The gesture has the easy precision of a household that has learned its own distances.'
    ],
    growth: [
      'The blue hall grows brighter at the edges, leaving the center in a deep, cool shadow. The silhouette on the far wall keeps its familiar head and posture while the shoulders broaden around them. The bench and wall markings remain still, so the change can be read against something that remembers the earlier size.',
      'Fabric shifts across the upper back as the man rolls his shoulders and lets his arms fall loose again. The room’s old proportions are still visible in a ghost line on the floor; the new stance rests beyond it without erasing it.'
    ],
    complex: [
      'A corridor smells faintly of cedar and warm electronics. A mug has left a pale ring on the windowsill, and late sun rests on a patch of floor where a doorway used to cast a narrower shadow. The hall is quiet, but a new passage has appeared beyond the turning.',
      'The new passage contains no sign or grand entrance, just worn boards and an ordinary lamp. Its light falls back into the room that came before it. The Complex has extended a route while leaving the first room intact.'
    ],
    facility: [
      'The facility’s ventilation hum settles into a lower register. Blue light crosses the observation glass, showing the technician’s reflection over the broad figure behind it. The man’s hands remain relaxed on the counter; the instruments adjust around the width of his shoulders.',
      'A rail near the doorway has been moved outward by one measured increment. The change is small, practical, and permanent. The old measurement remains in the record beside the new one.'
    ],
    veyrthalis: [
      'Fog threads between the amber trunks and softens the stone base of the Digitorium. High in the dark glass, blue windows brighten one after another. Water drips from a carved ledge onto the steps, and the Procession waits on its bridge as though listening to a sound too far away to identify.',
      'A bell sounds once through the mist. No one appears at the tower door, but a light comes on in a higher window and stays there. The path from the forest to the Digitorium is still visible beneath the wet leaves.'
    ],
    'muscle-myth': [
      'Amber light gathers along the shoulder and upper arm of the carved figure in the recessed arch. The rest of the hall stays cool, its resin-dark beams reflecting a dull shine where hands have passed for generations. Dust moves slowly through the narrow band of light.',
      'One of the men near the arch looks back toward the entrance when footsteps cross the stone. He does not bow or announce a revelation; he shifts his chair to make room beside him.'
    ],
    discovery: [
      'The rain changes direction across the open ground. A loose sign turns twice against its post, and the road darkens in a narrow band where water has gathered between the ruts. The amber tree line remains distant; a faint bell comes from beyond it.',
      'The fog has moved closer to the road, revealing wet branches and a second track just inside the trees. No traveler is visible, yet one set of prints has appeared where the mud was smooth before. The road still leads north.'
    ],
    'embodied-scale': [
      'A hand slides along the doorframe as the man turns sideways to pass. His face is unchanged, his expression familiar, but his shoulder now comes close enough to the wood to leave a line of reflected light along the sleeve.',
      'The chair makes a short scrape when it is pulled away from the wall. It has not become heavier; the movement simply requires a different reach and a wider turn. The room keeps these small negotiations alongside the measurements.'
    ],
    'colossal-escalation': [
      'The camera’s view retreats from the doorway to the building beyond it, keeping the man’s face visible as the roofline enters frame. The first threshold remains in view at the bottom of the image, a small but accurate memory of the scale where the sequence began.',
      'Cloud moves behind the upper floors while the man turns with the same unhurried gesture he used beside the first doorway. The building has become the measure now; the earlier room remains legible inside the scene as a remembered scale.'
    ],
    'kingdom-land': [
      'Water crosses the pale stone in a narrow line, turning the lichen darker where it clings to the rock. A ridge appears beyond the plateau as the weather thins, but its far slope remains hidden under low cloud. The road marks are still visible in the grit.',
      'The cloud lifts enough to reveal a second drainage channel and an older track cut along the ridge. They meet at a shallow basin. The land has exposed a route that was already inside its shape.'
    ],
    'deep-lore': [
      'A narrow scratch on the wall resolves into several marks made at different times. Dust sits in the baseboard groove, and a small object remains beneath the shelf where someone left it. The room offers no explanation; the repeated mark is simply easier to see in this light.',
      'The old phrase appears again in a different hand. One word has changed, but the spacing and the final mark are familiar. The archive keeps both lines instead of correcting one into the other.'
    ],
    'luke-bwomph': [
      'Luke stands in the familiar bar-gym light, mirrors clouded at their edges and chalk pressed into the rubber floor. His face remains his own. His shoulders now fill more of the tank top, his chest changes the cloth’s fall, and his legs make his stance broader when he turns toward the mirror.',
      'He rolls his arms loose at his sides, tests the turn between the bench and the rack, and gives the reflection the same little nod as before. The next baseline has arrived in his movement, not in a replacement of who he is.'
    ]
  };

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }
  function currentWorld() {
    return window.GEEHUB_WORLD && window.GEEHUB_WORLD.getWorld ? window.GEEHUB_WORLD.getWorld() : null;
  }
  function region(id) {
    return currentWorld()?.regions?.find(item => item.id === id) || null;
  }
  function setStatus(text) {
    const status = document.getElementById('worldAutonomyState');
    if (status) status.textContent = text;
    const command = document.getElementById('gameCommand');
    if (command) command.textContent = text;
  }
  function quietAppend(speaker, paragraph) {
    const el = document.getElementById('gameNarrative');
    if (!el || !paragraph) return;
    const update = () => { el.textContent = (el.textContent || '').trimEnd() + '\n\n' + speaker + '\n\n' + paragraph; };
    if (window.GEEHUB_SCREEN_PUNCTURE?.quietNarrativeUpdate) {
      window.GEEHUB_SCREEN_PUNCTURE.quietNarrativeUpdate(update);
    } else update();
  }
  function record(type, title, body, from = state.currentRegion, to = null, artifact = true) {
    if (type === 'MEMORY') state.memory = Math.min(1, Number(state.memory || 0.5) + 0.035);
    if (type === 'ROUTE_OPEN') { state.memory = Math.min(1, Number(state.memory || 0.5) + 0.04); state.pressure = Math.min(1, Number(state.pressure || 0.18) + 0.04); }
    state.sequence = Number(state.sequence || 0) + 1;
    const event = {
      id: 'world-' + state.sequence,
      type,
      title,
      body,
      from,
      to,
      phase: state.phase,
      at: now(),
      elapsedMs: Math.max(0, stamp() - Date.parse(state.startedAt || now()))
    };
    state.lastEvent = event;
    state.history = [event, ...(state.history || [])].slice(0, MAX_HISTORY);
    persist();
    document.dispatchEvent(new CustomEvent('geehub:world-response', {detail:event}));
    if (artifact && window.GEEHUB_ARTIFACTS?.emit) {
      try {
        window.GEEHUB_ARTIFACTS.emit({
          type: 'WORLD RESPONSE',
          title,
          body,
          source: 'world-autonomy',
          canon: 'experimental',
          lineage: {region:from, target:to, phase:state.phase, rule:type},
          dreamable: true,
          quietness: 'high'
        });
      } catch (_) {}
    }
    const interactionType = type === 'MEMORY' ? 'MEMORY'
      : type === 'ROUTE_OPEN' ? 'ENCOUNTER'
      : type === 'CROSSING' ? 'RETURN'
      : type === 'INPUT_RESPONSE' ? 'TRANSFORM'
      : type === 'ATMOSPHERE' ? 'NOTICE'
      : 'WORLD_RESPONSE';
    const interaction = {
      id:event.id,
      type:interactionType,
      title,
      text:body,
      from:from || 'world',
      to:to || from || 'world',
      source:'world-autonomy',
      live:true,
      at:stamp()
    };
    if (window.GEEHUB_INTERACTION?.emit) {
      try { window.GEEHUB_INTERACTION.emit(interaction); } catch (_) {}
    }
    document.dispatchEvent(new CustomEvent('geehub:interaction', {detail:interaction}));
    return event;
  }
  function setPressure(kind, detail = {}) {
    const before = Number(state.pressure || 0.18);
    const delta = kind === 'geehub:hyper-morph' ? 0.22
      : kind === 'geehub:sensation' && /pressure|scale|visual/i.test(String(detail.mode || '')) ? 0.14
      : kind === 'geehub:sensation' && /hold|memory|presence/i.test(String(detail.mode || '')) ? -0.08
      : kind === 'geehub:interaction' ? 0.06 : 0.04;
    state.pressure = Math.max(0.12, Math.min(1, before + delta));
    state.memory = Math.max(0.2, Math.min(1, Number(state.memory || 0.5) + 0.035));
    persist();
    return {before, after:state.pressure, delta};
  }
  function neighbors(id) {
    const world = currentWorld();
    if (!world || !Array.isArray(world.pleasureBits)) return [];
    const found = [];
    world.pleasureBits.forEach((edge, index) => {
      const next = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
      if (!next || next === id || !region(next)) return;
      const existing = found.find(item => item.id === next);
      const candidate = {id:next, edge, order:index};
      if (!existing) found.push(candidate);
      else if (index < existing.order) Object.assign(existing, candidate);
    });
    found.sort((a,b) => {
      const av = Number(state.visits[a.id] || 0), bv = Number(state.visits[b.id] || 0);
      if (av !== bv) return av-bv;
      const routeBias = id => {
        const physical = ['growth','beefythiq','embodied-scale','colossal-escalation','luke-bwomph'];
        const memoryPlaces = ['bodylounger','deep-lore','discovery','veyrthalis','kingdom-land'];
        let score = 0;
        if (Number(state.pressure || 0) >= 0.62 && physical.includes(id)) score -= 2;
        if (Number(state.memory || 0) >= 0.68 && memoryPlaces.includes(id)) score -= 1.25;
        return score;
      };
      const bias = routeBias(a.id)-routeBias(b.id);
      if (bias !== 0) return bias;
      const al = Number(state.lastVisits[a.id] || 0), bl = Number(state.lastVisits[b.id] || 0);
      if (al !== bl) return al-bl;
      return a.order-b.order;
    });
    return found;
  }
  function chooseNext(id) {
    const connected = neighbors(id);
    if (connected.length) return connected[0];
    const world = currentWorld();
    if (!world?.regions?.length) return null;
    const candidates = world.regions.filter(item => item.id !== id).sort((a,b) => {
      const av = Number(state.visits[a.id] || 0), bv = Number(state.visits[b.id] || 0);
      if (av !== bv) return av-bv;
      const al = Number(state.lastVisits[a.id] || 0), bl = Number(state.lastVisits[b.id] || 0);
      if (al !== bl) return al-bl;
      return a.id.localeCompare(b.id);
    });
    return candidates.length ? {id:candidates[0].id, edge:{title:'THE NEXT UNVISITED PLACE',text:'The world opens the least-visited available destination without discarding this one.'}, order:999} : null;
  }
  function renderProgress(phaseName) {
    const el = document.getElementById('gameRunState');
    if (el) el.textContent = phaseName;
    setStatus(phaseName);
  }
  function activeCue(index) {
    const cuesForRegion = cues[state.currentRegion] || cues.discovery;
    return cuesForRegion[index % cuesForRegion.length];
  }
  function schedule(delay = (state.runMode ? FAST_TICK_MS : TICK_MS)) {
    clearTimeout(timer);
    if (document.hidden) return;
    timer = setTimeout(tick, Math.max(500, delay));
  }
  function tick() {
    timer = null;
    if (document.hidden) return;
    const current = region(state.currentRegion);
    if (!current) {
      schedule(2000);
      return;
    }

    if (state.phase === 0) {
      const paragraph = activeCue(0);
      state.phase = 1;
      quietAppend('SETH / THE ENVIRONMENT MOVES', paragraph);
      renderProgress('WORLD / CONDITIONS SHIFT');
      record('ATMOSPHERE', 'THE ENVIRONMENT MOVES // ' + current.name, paragraph, current.id, current.id);
      schedule();
      return;
    }

    if (state.phase === 1) {
      const paragraph = activeCue(1);
      state.phase = 2;
      quietAppend('NICK / A DETAIL RETURNS', paragraph);
      state.pressure = Math.min(1, Number(state.pressure || 0.18) + 0.06);
      renderProgress('WORLD / MEMORY DEEPENS');
      record('MEMORY', 'A DETAIL RETURNS // ' + current.name, paragraph, current.id, current.id);
      schedule();
      return;
    }

    if (state.phase === 2) {
      const next = chooseNext(current.id);
      if (!next) {
        quietAppend('SETH / THE WORLD HOLDS', 'Nothing is sufficiently related to justify a new crossing yet. The road, the room, and the current pin remain as they are. The world keeps the open state without manufacturing a destination.');
        state.phase = 0;
        renderProgress('WORLD / HOLDING THE OPEN STATE');
        record('HOLD', 'NO JUSTIFIED ROUTE YET', 'The current location remains active because the relation graph offers no next step.', current.id, null);
        schedule();
        return;
      }
      state.nextRegion = next.id;
      state.phase = 3;
      const dest = region(next.id);
      const relation = next.edge?.title || 'A RELATION IN THE WORLD';
      const description = next.edge?.text || 'The current place has begun to point toward another place.';
      const paragraph = 'A line becomes visible between ' + current.name + ' and ' + (dest?.name || next.id) + '. The archive names the relation "' + relation + '". ' + description + ' The current place remains visible on the map; the route is open, but nobody has crossed it yet.';
      quietAppend('NICK / A ROUTE FORMS', paragraph);
      renderProgress('WORLD / ROUTE OPEN // ' + (dest?.name || next.id).toUpperCase());
      record('ROUTE_OPEN', relation, paragraph, current.id, next.id);
      schedule();
      return;
    }

    if (state.phase === 3) {
      const target = state.nextRegion;
      const dest = region(target);
      if (!dest || target === current.id) {
        state.phase = 0;
        state.nextRegion = null;
        persist();
        schedule(2500);
        return;
      }
      const routeBody = 'The route that opened between ' + current.name + ' and ' + dest.name + ' has remained present across the interval. The world now crosses it, carrying the previous location into the record rather than replacing it.';
      record('CROSSING', 'THE WORLD CROSSES ITS OWN ROUTE', routeBody, current.id, dest.id);
      state.pressure = Math.max(0.12, Number(state.pressure || 0.18) - 0.12);
      state.nextRegion = null;
      persist();
      if (window.GEEHUB_WORLD?.enter) {
        window.GEEHUB_WORLD.enter(dest.id, {source:'autonomous'});
      } else {
        state.phase = 0;
        schedule(2000);
      }
      return;
    }
    state.phase = 0;
    persist();
    schedule();
  }
  function onEncounter(event) {
    const detail = event.detail || {};
    if (!detail.id || !region(detail.id)) return;
    const previous = state.currentRegion;
    state.currentRegion = detail.id;
    state.visits[detail.id] = Number(state.visits[detail.id] || 0) + (detail.source === 'restore' ? 0 : 1);
    if (detail.source !== 'restore') state.lastVisits[detail.id] = stamp();
    state.nextRegion = null;
    state.phase = 0;
    if (detail.source !== 'restore') {
      const response = detail.exception || 'ARRIVAL';
      const body = response === 'RETURN'
        ? 'The earlier visit remains stored beneath this return.'
        : response === 'ECHO'
        ? 'The same place has been entered twice without a crossing. Its second appearance is an echo.'
        : response === 'RESONANCE'
        ? 'An existing relation connects this place to the previous one; that relation survives the transition.'
        : response === 'DRIFT'
        ? 'No direct edge connects the previous and current places. The gap is kept visible.'
        : 'A first arrival creates a new point in the world history.';
      record('ARRIVAL', detail.name || detail.id, body, previous, detail.id);
    }
    if (detail.source !== 'autonomous' && detail.source !== 'restore') {
      state.lastHumanActionAt = stamp();
    }
    persist();
    renderProgress(detail.source === 'autonomous' ? 'WORLD / CROSSING COMPLETE' : 'WORLD / ARRIVAL RECORDED');
    schedule(detail.source === 'world-start' ? FIRST_TICK_MS : (state.runMode ? FAST_TICK_MS : TICK_MS));
  }
  function externalResponse(eventName, detail = {}) {
    const source = detail.source || detail.type || eventName;
    if (source === 'world-autonomy' || detail.source === 'world-autonomy') return;
    const delta = setPressure(eventName, detail);
    const current = region(state.currentRegion);
    const line = eventName === 'geehub:hyper-morph'
      ? 'A change in bodily scale has entered the world state. The current place responds by preserving the former baseline and increasing the pressure toward a new one.'
      : eventName === 'geehub:sensation'
      ? 'A sensation has altered the balance of attention. The room shifts its emphasis without discarding its previous atmosphere.'
      : 'An interaction has entered the shared history. The world updates its memory and changes the conditions for what can happen next.';
    if (current) quietAppend('SETH / THE WORLD RESPONDS', line);
    state.phase = Math.min(2, Number(state.phase || 0) + 1);
    renderProgress('WORLD / PRESSURE ' + Math.round(state.pressure * 100) + '%');
    record('INPUT_RESPONSE', 'WORLD RESPONDS TO ' + String(source).toUpperCase(), line + ' Pressure ' + Math.round(delta.before*100) + '% → ' + Math.round(delta.after*100) + '%.', state.currentRegion, null);
    schedule(state.runMode ? FAST_TICK_MS : 9000);
  }
  function setRunMode(active) {
    state.runMode = Boolean(active);
    persist();
    renderProgress(state.runMode ? 'WORLD / FAST CYCLE' : 'WORLD / SELF-GOVERNING');
    schedule(state.runMode ? 600 : TICK_MS);
  }
  function boot() {
    if (booted) return;
    const api = window.GEEHUB_WORLD;
    const world = api?.getWorld?.();
    if (!api || !world?.regions?.length) {
      setTimeout(boot, 250);
      return;
    }
    booted = true;
    document.addEventListener('geehub:world-encounter', onEncounter);
    document.addEventListener('geehub:sensation', e => externalResponse('geehub:sensation', e.detail || {}));
    document.addEventListener('geehub:hyper-morph', e => externalResponse('geehub:hyper-morph', e.detail || {}));
    document.addEventListener('geehub:interaction', e => externalResponse('geehub:interaction', e.detail || {}));
    document.addEventListener('click', e => {
      if (e.target.closest('#runWorld')) return;
      if (e.target.closest('button, a, input, select, textarea')) {
        state.lastHumanActionAt = stamp();
        state.nextRegion = null;
        state.phase = 0;
        persist();
        schedule(state.runMode ? FAST_TICK_MS : TICK_MS);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearTimeout(timer);
      else schedule(1800);
    });
    const savedId = api.currentId?.();
    const savedState = state.currentRegion;
    state.runMode = false;
    if (savedId && region(savedId)) {
      state.currentRegion = savedId;
      if (savedState !== savedId) { state.phase = 0; state.nextRegion = null; }
      const mapPlace = api.mapPlace?.(savedId) || region(savedId)?.name || savedId;
      window.GEEHUB_STORY_ATLAS?.locate({location:mapPlace});
      const narrative = document.getElementById('gameNarrative');
      if (narrative && /PRESS RUN TO ENTER THE WORLD|SETH \/ FIRST SIGHT/.test(narrative.textContent)) {
        api.enter(savedId, {source:'restore'});
      }
      state.visits[savedId] = Number(state.visits[savedId] || 0);
      persist();
      renderProgress('WORLD / MEMORY RESTORED');
    } else {
      state.currentRegion = null;
      state.phase = 0;
      state.nextRegion = null;
      persist();
      api.enter('discovery', {source:'world-start'});
    }
    schedule(FIRST_TICK_MS);
    window.GEEHUB_WORLD_AUTONOMY = {setRunMode, state:() => ({...state, history:[...(state.history||[])]}), tick:() => tick(), schedule:delay => schedule(delay)};
    document.dispatchEvent(new CustomEvent('geehub:world-autonomy-ready', {detail:{currentRegion:state.currentRegion, at:now()}}));
  }

  if (document.readyState === 'complete') setTimeout(boot, 300);
  else window.addEventListener('load', () => setTimeout(boot, 300), {once:true});
})();