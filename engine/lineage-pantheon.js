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
    host.style.cssText = "margin:22px 0;padding:clamp(12px,2vw,22px);background:radial-gradient(ellipse at 50% -20%,#203f52 0%,#10161c 52%,#0a0e12 100%);border:1px solid #314956;border-radius:20px;color:#e9f0f5;font:inherit;position:relative;overflow:hidden;box-shadow:0 24px 70px #0008";
    if (!document.getElementById("lineagePantheonStyles")) {
      const style=document.createElement("style"); style.id="lineagePantheonStyles";
      style.textContent=`
        #lineagePantheon *{box-sizing:border-box}
        #lineagePantheon button{transition:transform .18s ease,border-color .18s ease,background .18s ease}
        #lineagePantheon button:hover{transform:translateY(-2px);border-color:#8ed7f5!important}
        #lineagePantheon button:focus-visible{outline:2px solid #a9e7ff;outline-offset:3px}
        #lineagePantheon .lp-eyebrow{font:10px ui-monospace,monospace;letter-spacing:.2em;color:#8ed7f5;text-transform:uppercase}
        #lineagePantheon .lp-stage{position:relative;isolation:isolate;overflow:hidden;min-height:190px;border:1px solid #3a5c6c;border-radius:14px;background:linear-gradient(180deg,#122d40,#1d3440 55%,#0b171e);margin:14px 0 18px}
        #lineagePantheon .lp-stage:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,transparent 20%,#b4edff0a 48%,transparent 72%);background-size:220% 100%;animation:lp-glide 9s linear infinite}
        #lineagePantheon .lp-stage svg{display:block;width:100%;height:clamp(190px,29vw,300px)}
        #lineagePantheon .lp-stage-label{position:absolute;left:15px;bottom:12px;z-index:2;font:10px ui-monospace,monospace;letter-spacing:.16em;color:#d9f4ff;text-shadow:0 2px 12px #000}
        #lineagePantheon .lp-choice{flex:1 1 155px;min-height:76px;text-align:left;padding:13px 14px!important;border-radius:10px!important;border:1px solid #3a5361!important;background:linear-gradient(145deg,#1a2a35,#10181e)!important;color:#edf7fc!important;font:inherit!important;letter-spacing:0!important}
        #lineagePantheon .lp-choice small{display:block;color:#85b9d3;font:10px ui-monospace,monospace;letter-spacing:.12em;margin-bottom:7px}
        #lineagePantheon .lp-choice strong{font-size:13px;line-height:1.35;font-weight:600}
        #lineagePantheon .lp-choice[aria-pressed=true]{border-color:#9bdef7!important;background:linear-gradient(145deg,#24475a,#14232c)!important;box-shadow:inset 0 0 0 1px #8ed7f533,0 0 22px #4cbbec13}
        #lineagePantheon .lp-progress{display:flex;gap:5px;align-items:center}
        #lineagePantheon .lp-progress i{height:3px;flex:1;border-radius:4px;background:#34444d}
        #lineagePantheon .lp-progress i.on{background:#8ed7f5;box-shadow:0 0 10px #8ed7f566}
        @keyframes lp-glide{from{background-position:120% 0}to{background-position:-120% 0}}
        @media(prefers-reduced-motion:reduce){#lineagePantheon .lp-stage:after{animation:none}#lineagePantheon button{transition:none}}
      `; document.head.appendChild(style);
    }
    const encounter = document.querySelector(".encounter");
    const main = document.querySelector("main.world") || document.querySelector("main") || document.body;
    const header = main.querySelector(".top");
    if (header && header.parentNode === main) header.insertAdjacentElement("afterend", host);
    else main.insertBefore(host, encounter || main.firstChild);
    render(host);
  };
  function render(host) {
    const active = cast.find(c => c.id === state.active) || cast[0];
    host.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin:0 0 17px;padding:9px 0 13px;border-bottom:1px solid #304550">
        <svg viewBox="0 0 42 42" width="34" height="34" aria-hidden="true" style="flex:0 0 auto"><circle cx="21" cy="21" r="17" fill="none" stroke="#426779"/><circle cx="21" cy="21" r="10" fill="none" stroke="#8ed7f5" stroke-opacity=".55"/><path d="M3 21H39M21 3V39" stroke="#8ed7f5" stroke-width="1"/><circle cx="21" cy="21" r="3" fill="#d9f7ff"/><path d="M21 0V7M21 35V42M0 21H7M35 21H42" stroke="#d9f7ff" stroke-width="1.5"/></svg>
        <div style="min-width:0;flex:1"><div style="font:10px ui-monospace,monospace;letter-spacing:.2em;color:#a7e8ff">PRIME MERIDIAN / 00°</div><div style="font:10px ui-monospace,monospace;letter-spacing:.12em;color:#7895a5;margin-top:4px">FORM AS FUNCTION · ORIGIN AXIS</div></div>
        <div style="font:10px ui-monospace,monospace;color:#85b9d3;white-space:nowrap">ENGINE ${String(state.cycle).padStart(4,"0")}</div>
      </div>
      <h2 id="lineagePantheonTitle" style="font-size:clamp(24px,4vw,38px);margin:10px 0 4px;letter-spacing:-.04em">THE LINEAGE THAT REMEMBERS</h2>
      <p style="max-width:720px;color:#b5c2cc;margin:0 0 20px">Swolebeasts supply mass. Hulum's Cave supplies shared motion and temporal residue. Gee preserves continuity; Luke preserves identity through growth. Every run inherits the last state.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
        <button type="button" data-action="run" style="${btn(true)}">RUN LINEAGE</button>
        <button type="button" data-action="grow" style="${btn(false)}">GROW BASELINE</button>
        <button type="button" data-action="inertia" style="${btn(false)}">SHARED INERTIA</button>
        <button type="button" data-action="reset" style="${btn(false)}">RESET EXPERIMENT</button>
      </div>
      <article style="margin:0 0 20px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:4px 2px 0">
          <span class="lp-eyebrow">A GEEHUB STORY / CHOOSE WHAT HAPPENS</span>
          <span style="font:10px ui-monospace,monospace;color:#8299a7">${String((state.currentScene||0)+1).padStart(2,"0")} — 05</span>
        </div>
        <div class="lp-stage" aria-label="Atmospheric illustration of the current encounter">
          ${sceneArtwork(state.currentScene||0)}
          <div class="lp-stage-label">${esc((scenes[state.currentScene||0]||scenes[0]).place.toUpperCase())}</div>
        </div>
        <div class="lp-progress" aria-hidden="true">${scenes.map((_,i)=>`<i class="${i===(state.currentScene||0)?"on":""}"></i>`).join("")}</div>
        <div style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(230px,.85fr);gap:clamp(14px,3vw,30px);align-items:start;margin-top:16px">
          <div>
            <div class="lp-eyebrow">ENCOUNTER ${String((state.currentScene||0)+1).padStart(2,"0")}</div>
            <h3 style="font-size:clamp(25px,4vw,42px);line-height:1.02;letter-spacing:-.045em;margin:9px 0 13px;font-weight:650">${esc((scenes[state.currentScene||0]||scenes[0]).title)}</h3>
            <p style="line-height:1.75;color:#c4d3dc;margin:0;max-width:620px;font-size:14px">${esc((scenes[state.currentScene||0]||scenes[0]).setup)}</p>
            ${state.sceneOutcome ? `<div style="margin-top:16px;padding:14px 16px;border-left:2px solid #8ed7f5;background:linear-gradient(90deg,#19303c,#111920);border-radius:0 9px 9px 0;line-height:1.7;color:#e0f1f8"><div class="lp-eyebrow" style="margin-bottom:7px">THE WORLD RESPONDS</div>${esc(state.sceneOutcome)}</div>` : ""}
          </div>
          <div>
            <div class="lp-eyebrow" style="margin-bottom:10px">YOUR MOVE</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">${(scenes[state.currentScene||0]||scenes[0]).choices.map((c,i)=>`<button type="button" class="lp-choice" data-choice="${i}" aria-pressed="${state.selectedChoice===i}"><small>OPTION 0${i+1}</small><strong>${esc(c[0])}</strong></button>`).join("")}</div>
            <button type="button" data-action="next-scene" style="${btn(true)};width:100%;margin-top:10px;padding:13px 15px;font-size:11px">CONTINUE THE STORY <span style="float:right">↗</span></button>
            <p style="font-size:11px;color:#8296a3;line-height:1.6;margin:10px 2px 0">Every choice leaves a trace. The next scene inherits what happened here.</p>
          </div>
        </div>
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
  function sceneArtwork(index) {
    const palettes=[
      ["#122e42","#507f91","#b0e5ee"],["#10283b","#315f78","#9bd7f2"],["#142735","#426e83","#d4f4ff"],["#30283c","#81617d","#f3c9ad"],["#071d2c","#25617a","#8de2f7"]
    ];
    const p=palettes[index%palettes.length];
    const stars=Array.from({length:24},(_,i)=>{const x=(i*73+19)%997,y=(i*37+13)%115;return `<circle cx="${x}" cy="${y}" r="${i%5===0?1.7:.8}" fill="#d9f5ff" opacity="${i%4===0?.85:.38}"/>`;}).join("");
    const scene=index%5;
    const skyline=scene===0
      ? '<path d="M0 154 L0 126 70 126 70 94 110 94 110 133 165 133 165 109 203 109 203 154Z" fill="#152a35"/><path d="M740 154 L740 112 782 112 782 83 820 83 820 120 870 120 870 95 920 95 920 154Z" fill="#142b38"/>'
      : scene===1
      ? '<path d="M0 160V110L65 80 120 115 170 70 240 125 300 95V160Z" fill="#142b39"/><path d="M690 160V120L760 78 815 110 880 62 997 115V160Z" fill="#142b39"/>'
      : scene===2
      ? '<path d="M0 160V100H50V60H90V100H130V76H165V160ZM780 160V95H830V55H870V95H920V72H960V160Z" fill="#142a37"/>'
      : scene===3
      ? '<path d="M0 160V118H55V88H105V118H160V75H205V160ZM770 160V115H820V70H865V115H915V90H970V160Z" fill="#392c3c"/>'
      : '<path d="M0 160V130L95 100 180 130 280 78 350 130V160ZM650 160V126L740 80 820 125 900 96 997 135V160Z" fill="#102b39"/>';
    const figures=[{x:430,h:65,w:25},{x:475,h:91,w:33},{x:525,h:76,w:27}].map((f,i)=>`<g transform="translate(${f.x} ${157-f.h})" fill="${i===1?p[2]:p[1]}" opacity="${i===1?.94:.72}"><circle cx="0" cy="-8" r="8"/><path d="M-10 2 Q0 -3 10 2 L${f.w/2} ${f.h*.56} L${f.w*.36} ${f.h*.62} L${f.w*.25} ${f.h*.36} L${f.w*.32} ${f.h} L4 ${f.h} L0 ${f.h*.68} L-4 ${f.h} L-${f.w*.32} ${f.h} L-${f.w*.25} ${f.h*.36} L-${f.w*.36} ${f.h*.62} L-${f.w/2} ${f.h*.56}Z"/></g>`).join("");
    const bridge=scene===0||scene===3?'<path d="M0 171 Q240 145 498 173 T997 164 L997 192 Q740 181 498 192 T0 192Z" fill="#4a7382"/><path d="M0 173 Q240 147 498 175 T997 166" fill="none" stroke="#c0eff7" stroke-width="2" opacity=".8"/>':'';
    const special=scene===0?'<circle cx="810" cy="150" r="17" fill="#c9d4b2"/><path d="M798 141L789 131 803 136 812 133 824 139 821 151 811 158 800 154Z" fill="#c9d4b2"/><path d="M799 158L797 171M815 158L820 170" stroke="#c9d4b2" stroke-width="5"/>':scene===1?'<rect x="760" y="109" width="100" height="49" rx="3" fill="#213b49" stroke="#83b6ca"/><path d="M775 110V95H844V110" fill="none" stroke="#83b6ca" stroke-width="3"/>':scene===2?'<circle cx="810" cy="69" r="26" fill="none" stroke="#b8e8f4" stroke-width="2"/><path d="M795 69H825M810 54V84" stroke="#b8e8f4" opacity=".6"/>':scene===3?'<circle cx="805" cy="61" r="31" fill="#f0c9ad" opacity=".8"/><path d="M784 64Q805 31 826 64" fill="none" stroke="#fff0d9" stroke-width="4"/>':'<path d="M770 55L810 31 850 55 810 79Z" fill="none" stroke="#8de2f7" stroke-width="2"/><path d="M770 55V100L810 124 850 100V55M810 79V124" fill="none" stroke="#8de2f7" stroke-width="1.5" opacity=".7"/>';
    return `<svg viewBox="0 0 997 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Stylized ${esc(scenes[scene].place)} landscape"><defs><linearGradient id="lpSky${scene}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}" stop-opacity=".4"/></linearGradient><radialGradient id="lpGlow${scene}"><stop stop-color="${p[2]}" stop-opacity=".28"/><stop offset="1" stop-color="${p[2]}" stop-opacity="0"/></radialGradient></defs><rect width="997" height="220" fill="url(#lpSky${scene})"/><ellipse cx="500" cy="80" rx="370" ry="160" fill="url(#lpGlow${scene})"/>${stars}${skyline}<path d="M0 166 Q190 145 370 169 T700 164 T997 160V220H0Z" fill="#0b1a22" opacity=".9"/>${bridge}${special}${figures}<path d="M0 205Q250 190 500 205T997 201" stroke="${p[2]}" opacity=".25" fill="none"/><path d="M20 18H55M20 18V34M977 18H942M977 18V34" stroke="${p[2]}" stroke-width="1.2" opacity=".65"/></svg>`;
  }
  function chooseScene(choiceIndex) {
    const scene = scenes[state.currentScene || 0];
    const choice = scene && scene.choices[choiceIndex];
    if (!choice) return;
    state.sceneOutcome = choice[1];
    state.selectedChoice = choiceIndex;
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
      state.selectedChoice = null;
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