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
  const scenes = [
    { title:"THE COW HAS RETURNED", place:"Lumbridge bridge · late afternoon", setup:"The cow that defeated the bronze-sword adventurer has followed him back. It is now wearing a stolen helmet. Gee studies it with professional seriousness. Snake quietly checks whether the helmet counts as body armour.", choices:[["Ask Gee to negotiate","Gee crouches to eye level. “We can settle this peacefully.” The cow chews his sleeve. Gee grows another inch. “That is not a no.”"],["Let Gumshoe investigate","Gumshoe takes out a notebook. The cow eats the corner. “Aha!” he says. “Motive: hunger. Means: mouth. Opportunity: the entire afternoon.”"],["Call the gods as witnesses","Zeus declares the cow guilty. Odin asks for evidence. Neptune points out that the helmet is technically maritime property. The cow walks away with the helmet."]]},
    { title:"SOLID SNAKE'S THREAT ASSESSMENT", place:"Castle wall · blue hour", setup:"Snake has found a suspiciously ordinary training room. Inside, three Swolebeasts are trying to move a sofa through a doorway. The sofa is winning. Hulum's Cave's cold-blue glow flickers whenever anyone says “turn it sideways.”", choices:[["Help move the sofa","Daddy takes one end. Gee takes the other. The doorway gets wider by an amount nobody can explain. Snake writes down: “Do not underestimate furniture.”"],["Ask Snake for a plan","“First,” Snake says, “we identify the objective.” A Swolebeast lifts the sofa over the building. Snake pauses. “Objective has changed.”"],["Let Hulum's Cave intervene","The room repeats the last three seconds, each loop leaving a blue afterimage. On the fourth pass, the sofa is already in the next room. Everyone pretends this was the plan."]]},
    { title:"THE GODS DISCOVER A GYM", place:"The old training hall · electric light", setup:"Zeus has challenged the Swolebeasts to a contest of strength. Odin insists on fair rules. Neptune has flooded one corner by accident. Daddy is setting out towels while Gee tries to explain that the equipment belongs to everyone.", choices:[["Let Zeus go first","Zeus lifts the barbell. It rises magnificently—then keeps rising, carried by a Hulum's Cave inertia loop. Zeus watches it disappear through a skylight. “I meant to do that.”"],["Give Odin the rulebook","Odin reads every rule, adds three footnotes, and declares the contest a test of character. The Swolebeasts win by helping Zeus retrieve the barbell."],["Ask Daddy to coach","Daddy demonstrates a calm, controlled lift. The room falls quiet. Even Zeus adjusts his stance. “Well,” he says, “that was annoyingly good.”"]]},
    { title:"DADDY ARRIVES", place:"The bridge · warm evening", setup:"The boys have gathered to compare their latest growth. Luke is taller again, but his face is unmistakably his own. Gee grows whenever you settle close to him. Daddy arrives carrying enough sandwiches for a small expedition.", choices:[["Sit with Gee","Gee's shoulders broaden and his posture settles into an easy, monumental calm. “You can stay as long as you like,” he says. Daddy hands you a sandwich like this was the obvious next step."],["Ask Luke what changed","Luke considers his reflection in the river. “Mostly the proportions,” he says. “I still feel like me.” The boys nod; one immediately asks if he can try the same thing."],["Invite everyone to eat","The gods, the boys, the detective, and the soldier sit along the bridge. Zeus tries to claim the last sandwich. Gumshoe produces a receipt. Somehow, the receipt wins."]]},
    { title:"THE SHARED-INERTIA INCIDENT", place:"Hulum's Cave · midnight render", setup:"A camera move has escaped its scene and is now following everyone through Lumbridge. It gives the Swolebeasts a heroic low angle, makes Snake look even more suspicious, and keeps framing Gee like the main character of a story he refuses to star in.", choices:[["Follow the camera","The camera leads everyone to a room that was not there yesterday. Inside are saved versions of earlier scenes, still warm with movement. Hulum's Cave labels the room: MEMORY."],["Let Gee take the lead","Gee walks toward the lens. The camera backs up, then backs through a wall. A new passage appears. “Useful,” Gee says. “We should keep that.”"],["Let the boys improvise","The boys turn the runaway camera into a ridiculous group portrait. The frame keeps widening to fit them all. The final image includes the castle, the river, and one extremely judgmental cow."]]}
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
      <article style="margin:0 0 18px;padding:clamp(16px,3vw,24px);border:1px solid #426071;border-radius:12px;background:radial-gradient(ellipse at 80% 0%,#203b4c 0%,#111a21 60%)">
        <div style="font:10px ui-monospace,monospace;letter-spacing:.16em;color:#8ed7f5">PLAYABLE ENCOUNTER / ${esc((scenes[state.currentScene || 0] || scenes[0]).place)}</div>
        <h3 style="font-size:clamp(22px,3vw,30px);margin:8px 0">${esc((scenes[state.currentScene || 0] || scenes[0]).title)}</h3>
        <p style="line-height:1.65;color:#d2dfe7;margin:0 0 16px">${esc((scenes[state.currentScene || 0] || scenes[0]).setup)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${(scenes[state.currentScene || 0] || scenes[0]).choices.map((c,i)=>`<button type="button" data-choice="${i}" style="${btn(false)}">${esc(c[0])}</button>`).join("")}
          <button type="button" data-action="next-scene" style="${btn(true)}">NEXT ENCOUNTER →</button>
        </div>
        ${state.sceneOutcome ? `<p style="margin:16px 0 0;padding:13px;border-left:2px solid #8ed7f5;background:#0c141a;line-height:1.65">${esc(state.sceneOutcome)}</p>` : ""}
      </article>
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
    host.querySelectorAll("[data-choice]").forEach(b => b.addEventListener("click", () => chooseScene(Number(b.dataset.choice))));
    host.querySelectorAll("[data-person]").forEach(b => b.addEventListener("click", () => { state.active=b.dataset.person; save(); render(host); }));
  }
  function chooseScene(choiceIndex) {
    const scene = scenes[state.currentScene || 0];
    const choice = scene && scene.choices[choiceIndex];
    if (!choice) return;
    state.sceneOutcome = choice[1];
    state.lastEvent = scene.title + " — " + choice[0];
    state.cycle += 1;
    state.inertia += 1;
    state.events.push({cycle:state.cycle,action:"scene-choice",scene:scene.title,choice:choice[0],outcome:choice[1],at:new Date().toISOString()});
    try {
      const art = window.GEEHUB_ARTIFACTS;
      if (art && typeof art.emit === "function") art.emit({type:"playable-encounter",title:scene.title+" / "+choice[0],body:scene.setup+" "+choice[1],source:"GEEHUB Lineage Pantheon",lineage:{scene:scene.title,choice:choice[0],cycle:state.cycle},canon:"experiment",dreamable:true,quietness:"high"});
    } catch (_) {}
    save();
    const host=document.getElementById("lineagePantheon");
    if(host) render(host);
  }
  function btn(primary) {
    return "border:1px solid "+(primary?"#78bddc":"#354651")+";border-radius:7px;padding:10px 13px;background:"+(primary?"#d9f0fa":"#141e25")+";color:"+(primary?"#0c1820":"#dce8ee")+";cursor:pointer;font:11px ui-monospace,monospace;letter-spacing:.06em";
  }
  function act(action) {
    if (action === "next-scene") {
      state.currentScene = ((state.currentScene || 0) + 1) % scenes.length;
      state.sceneOutcome = "";
      state.lastEvent = "Next encounter loaded: " + scenes[state.currentScene].title;
    } else if (action === "reset") {
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