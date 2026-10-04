/* GEEHUB // SENSATION ENGINE
   One world-state beneath the archive.
   remember -> retrieve -> transform -> create -> return -> remember
*/
(() => {
  const KEY = "geehub-sensation-state-v1";
  const now = () => new Date().toISOString();
  const defaults = {
    run: 0,
    focus: "presence",
    pressure: 0.18,
    scale: 1,
    intimacy: 0.62,
    memory: 0.74,
    visual: 0.68,
    unresolved: 0.51,
    last: null,
    traces: []
  };
  const read = () => {
    try { return {...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}")}; }
    catch { return {...defaults}; }
  };
  let state = read();

  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const trace = (type, value, source) => {
    state.traces.unshift({type, value, source, at:now()});
    state.traces = state.traces.slice(0, 24);
  };

  const derive = () => ({
    presence: Math.min(1, .25 + state.memory * .35 + state.intimacy * .25 + state.visual * .15),
    tension: Math.min(1, state.pressure * .65 + state.unresolved * .35),
    scale: state.scale,
    continuity: Math.min(1, state.memory * .55 + (1 - state.unresolved) * .25 + state.intimacy * .2)
  });

  function ensureUI() {
    if (document.querySelector("#sensationKernel")) return;
    const main = document.querySelector(".world");
    if (!main) return;

    const el = document.createElement("section");
    el.id = "sensationKernel";
    el.className = "sensation-kernel";
    el.innerHTML = `
      <div class="kernel-head">
        <div>
          <div class="eyebrow">GEEHUB / SENSATION ENGINE</div>
          <h2>THE WORLD IS ONE THING</h2>
        </div>
        <button id="kernelRun" class="run-button" type="button">RUN WORLD</button>
      </div>
      <div class="kernel-field">
        <div class="kernel-orbit"><span class="kernel-core"></span><i></i><i></i><i></i><i></i></div>
        <div class="kernel-readout">
          <span id="kernelFocus">PRESENCE</span>
          <strong id="kernelState">WAITING</strong>
          <p id="kernelTrace">The archive has not yet decided what the next encounter means.</p>
        </div>
      </div>
      <div class="kernel-states">
        <span data-k="presence">PRESENCE</span>
        <span data-k="memory">MEMORY</span>
        <span data-k="visual">VISION</span>
        <span data-k="intimacy">INTIMACY</span>
        <span data-k="pressure">PRESSURE</span>
        <span data-k="scale">SCALE</span>
      </div>
    `;
    main.insertBefore(el, main.children[1] || null);

    document.querySelector("#kernelRun").addEventListener("click", run);
    el.querySelectorAll("[data-k]").forEach(x => x.addEventListener("click", () => {
      state.focus = x.dataset.k;
      state.unresolved = Math.min(1, state.unresolved + .04);
      trace("focus", state.focus, "user");
      save();
      render("FOCUS CHANGED");
    }));
  }

  function render(label) {
    const d = derive();
    const focus = state.focus.toUpperCase();
    const readout = document.querySelector("#kernelFocus");
    const status = document.querySelector("#kernelState");
    const copy = document.querySelector("#kernelTrace");
    if (!readout || !status || !copy) return;
    readout.textContent = focus;
    status.textContent = label || "CONTINUITY " + Math.round(d.continuity * 100) + "%";
    const last = state.last ? state.last : "nothing has happened yet";
    copy.textContent = "presence " + Math.round(d.presence*100) + "% · tension " + Math.round(d.tension*100) + "% · scale " + Math.round(state.scale*100) + "% · last: " + last;
    document.documentElement.style.setProperty("--sensation-pressure", d.tension.toFixed(3));
    document.documentElement.style.setProperty("--sensation-presence", d.presence.toFixed(3));
    document.documentElement.style.setProperty("--sensation-scale", d.scale.toFixed(3));
  }

  function run() {
    state.run += 1;
    const regions = window.world?.regions || [];
    const candidates = regions.length ? regions : [
      {name:"THE COMPLEX"}, {name:"MALE HAREM"}, {name:"BEEFYTHIQ"}, {name:"DEEP LORE"}, {name:"VEY RTHALIS"}
    ];
    const target = candidates[(state.run - 1) % candidates.length];
    const modes = [
      ["presence","A person is noticed; the room reorganizes around the fact of their being there."],
      ["memory","An older trace becomes relevant to the present instead of remaining archival."],
      ["visual","A record stops behaving like a record and becomes a place."],
      ["intimacy","Adult characters move toward connection; consent and mutual recognition remain part of the world-state."],
      ["pressure","Accumulation changes the environment; the environment answers."],
      ["scale","The body becomes a new measuring instrument without losing identity."]
    ];
    const mode = modes[(state.run - 1) % modes.length];
    state.focus = mode[0];
    state.pressure = Math.min(1, state.pressure + .045);
    state.memory = Math.min(1, state.memory + .018);
    state.intimacy = Math.min(1, state.intimacy + (mode[0] === "intimacy" ? .08 : .012));
    state.visual = Math.min(1, state.visual + (mode[0] === "visual" ? .07 : .018));
    state.scale = Math.min(2.5, state.scale * (mode[0] === "scale" ? 1.08 : 1.015));
    state.unresolved = Math.min(1, state.unresolved + .025);
    state.last = target.name + " // " + mode[0];
    trace(mode[0], target.name, "RUN");
    save();
    render("RUN " + String(state.run).padStart(2,"0"));
    document.body.classList.add("sensation-running");
    setTimeout(() => document.body.classList.remove("sensation-running"), 1200);

    if (window.GEEHUB_ARTIFACTS?.add) {
      window.GEEHUB_ARTIFACTS.add({
        type:"SENSATION",
        title:target.name + " // " + mode[0].toUpperCase(),
        body:mode[1],
        source:"sensation-engine",
        at:now()
      });
    }
    document.dispatchEvent(new CustomEvent("geehub:sensation", {detail:{state:{...state}, target, mode}}));
  }

  window.GEEHUB_SENSATION = {read:() => ({...state}), run, derive, trace};
  document.addEventListener("DOMContentLoaded", () => { ensureUI(); render(); });
})();