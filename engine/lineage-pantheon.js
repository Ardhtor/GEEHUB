/* GEEHUB Lineage Pantheon — persistent, local-first scene engine.
   RUN creates a new lineage state; GROW advances the shared baseline;
   SHARED INERTIA carries the previous state forward instead of replacing it. */
(() => {
  "use strict";
  const KEY = "geehub.lineage-pantheon.v1";
  const cast = [
    { id: "gee", name: "GEE", order: "The One Who Stays", role: "continuity", line: "Someone has to stay." },
    { id: "luke", name: "LUKE", order: "The Living Baseline", role: "identity-preserving growth", line: "The face remains. The future expands." },
    { id: "swolebeasts", name: "SWOLEBEASTS", order: "The Weight of Becoming", role: "mass / physical presence", line: "A body is a record of what happened to it." },
    { id: "hulum", name: "HULUM'S CAVE", order: "Shared Inertia", role: "motion / temporal memory", line: "Nothing moves alone; every movement leaves a trace." },
    { id: "daddy", name: "DADDY", order: "Chosen, protective presence", role: "care / permission", line: "Power makes room for someone else." },
    { id: "old-gods", name: "THE OLD GODS", order: "Neptune · Odin · Zeus", role: "depth / order / power", line: "The world is larger than any one mechanism." }
  ];
  const read = () => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && Number.isInteger(s.cycle) && Array.isArray(s.events)) return s;
    } catch (_) {}
    return { cycle: 0, scale: 1, inertia: 0, active: "gee", events: [], createdAt: new Date().toISOString() };
  };
  let state = read();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  const mount = () => {
    if (document.getElementById("lineagePantheon")) return;
    const host = document.createElement("section");
    host.id = "lineagePantheon";
    host.setAttribute("aria-labelledby", "lineagePantheonTitle");
    host.style.cssText = "margin:28px 0;padding:clamp(18px,3vw,32px);background:linear-gradient(145deg,#0d1720,#101216 65%,#14202a);border:1px solid #33424e;border-radius:16px;color:#e9f0f5;font:inherit;position:relative;overflow:hidden";
    const encounter = document.querySelector(".encounter");
    const main = document.querySelector("main.world") || document.querySelector("main") || document.body;
    main.insertBefore(host, encounter || main.firstChild);
    render(host);
  };
  function render(host) {
    const active = cast.find(c => c.id === state.active) || cast[0];
    host.innerHTML = `
      <div style="font:11px ui-monospace,monospace;letter-spacing:.18em;color:#85b9d3">GEEHUB / LIVING MYTH / ENGINE ${String(state.cycle).padStart(4,"0")}</div>
      <h2 id="lineagePantheonTitle" style="font-size:clamp(24px,4vw,38px);margin:10px 0 4px;letter-spacing:-.04em">THE LINEAGE THAT REMEMBERS</h2>
      <p style="max-width:720px;color:#b5c2cc;margin:0 0 20px">Swolebeasts supply mass. Hulum's Cave supplies shared motion and temporal residue. Gee preserves continuity; Luke preserves identity through growth. Every run inherits the last state.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
        <button type="button" data-action="run" style="${btn(true)}">RUN LINEAGE</button>
        <button type="button" data-action="grow" style="${btn(false)}">GROW BASELINE</button>
        <button type="button" data-action="inertia" style="${btn(false)}">SHARED INERTIA</button>
        <button type="button" data-action="reset" style="${btn(false)}">RESET EXPERIMENT</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
        ${cast.map(c => `<button type="button" data-person="${c.id}" aria-pressed="${c.id===state.active}" style="text-align:left;padding:15px;min-height:122px;border-radius:10px;border:1px solid ${c.id===state.active?"#7ec5e5":"#303d47"};background:${c.id===state.active?"#1b2c38":"#10171d"};color:#edf5fa;cursor:pointer;font:inherit">
          <span style="font:10px ui-monospace,monospace;letter-spacing:.14em;color:#85b9d3">${esc(c.role.toUpperCase())}</span>
          <strong style="display:block;font-size:18px;margin:7px 0 2px">${esc(c.name)}</strong>
          <span style="display:block;color:#aebdc7;font-size:12px">${esc(c.order)}</span>
        </button>`).join("")}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:14px">
        <div style="padding:13px;border:1px solid #2c3b45;border-radius:9px"><small style="color:#8da6b5">CYCLE</small><strong style="display:block;font-size:24px">${state.cycle}</strong></div>
        <div style="padding:13px;border:1px solid #2c3b45;border-radius:9px"><small style="color:#8da6b5">BASELINE</small><strong style="display:block;font-size:24px">${state.scale.toFixed(1)}×</strong></div>
        <div style="padding:13px;border:1px solid #2c3b45;border-radius:9px"><small style="color:#8da6b5">INERTIA TRACES</small><strong style="display:block;font-size:24px">${state.inertia}</strong></div>
      </div>
      <blockquote style="margin:16px 0 8px;padding:12px 16px;border-left:2px solid #72b9d9;background:#101820;color:#e0edf4"><strong>${esc(active.name)} / ${esc(active.order)}</strong><br>${esc(active.line)}<p style="margin:9px 0 0;color:#9eb0bc;font-size:12px">${esc(state.lastEvent || "The pantheon is assembled. Run the lineage to begin a persistent sequence.")}</p></blockquote>
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:#7f929f;font:11px ui-monospace,monospace"><span>LOCAL STATE · AUTO-SAVED</span><button type="button" data-action="export" style="${btn(false)}">EXPORT STATE JSON</button></div>
    `;
    host.querySelectorAll("[data-action]").forEach(b => b.addEventListener("click", () => act(b.dataset.action)));
    host.querySelectorAll("[data-person]").forEach(b => b.addEventListener("click", () => { state.active=b.dataset.person; save(); render(host); }));
  }
  function btn(primary) {
    return "border:1px solid "+(primary?"#78bddc":"#354651")+";border-radius:7px;padding:10px 13px;background:"+(primary?"#d9f0fa":"#141e25")+";color:"+(primary?"#0c1820":"#dce8ee")+";cursor:pointer;font:11px ui-monospace,monospace;letter-spacing:.06em";
  }
  function act(action) {
    if (action === "reset") {
      state = { cycle:0, scale:1, inertia:0, active:"gee", events:[], createdAt:new Date().toISOString() };
      state.lastEvent = "Experiment reset. Canon and cast remain unchanged; only the local run state was reset.";
    } else if (action === "run") {
      state.cycle += 1;
      state.inertia += 1;
      state.scale = Math.round((state.scale + 0.25) * 100) / 100;
      state.active = ["gee","luke","swolebeasts","hulum","daddy","old-gods"][(state.cycle - 1) % 6];
      state.lastEvent = "Cycle "+state.cycle+": "+state.active+" inherits the previous baseline; identity and earlier traces remain.";
      state.events.push({cycle:state.cycle,action:"run",active:state.active,scale:state.scale,at:new Date().toISOString()});
    } else if (action === "grow") {
      state.cycle += 1;
      state.scale = Math.round((state.scale + 0.5) * 100) / 100;
      state.active = "luke";
      state.lastEvent = "Growth applied to the shared baseline. Form may intensify; recognizable identity is preserved.";
      state.events.push({cycle:state.cycle,action:"grow",active:state.active,scale:state.scale,at:new Date().toISOString()});
    } else if (action === "inertia") {
      state.cycle += 1;
      state.inertia += 1;
      state.active = "hulum";
      state.lastEvent = "Shared Inertia: prior movement becomes residue, the next state begins from it, and no earlier state is discarded.";
      state.events.push({cycle:state.cycle,action:"shared-inertia",active:state.active,scale:state.scale,at:new Date().toISOString()});
    } else if (action === "export") {
      const blob = new Blob([JSON.stringify({schema:"geehub.lineage-pantheon.v1",...state},null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="geehub-lineage-pantheon-state.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); return;
    }
    save();
    const host = document.getElementById("lineagePantheon");
    if (host) render(host);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, {once:true}); else mount();
})();