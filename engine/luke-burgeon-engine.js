/* GEEHUB // LUKE BURGEON ENGINE
   A working value loop: retain state -> choose the unresolved change -> stage it ->
   record the consequence -> let that consequence determine the next beat.
*/
(() => {
  const KEY = "geehub-luke-burgeon-v1";
  const now = () => new Date().toISOString();
  const base = {
    stage: 0, held: false, witness: 0, lastChoice: "first encounter",
    body: { shoulders: 1, chest: 1, arms: 1, legs: 1, length: 1, presence: 1 },
    history: [], unresolved: "the first change has not begun"
  };
  const clone = x => JSON.parse(JSON.stringify(x));
  const read = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "null");
      return stored ? {...clone(base), ...stored, body:{...base.body,...stored.body}} : clone(base);
    } catch (_) { return clone(base); }
  };
  let s = read();
  const beats = [
    {part:"shoulders", title:"THE FIRST OUTWARD PRESSURE", reason:"the familiar silhouette needs its first visible break", text:"Luke stops mid-sentence. Something gathers across his shoulders—not pain, not quite a stretch. He rolls them once, and the movement travels farther than he expected. His shirt catches across the upper back. He looks down at the new tension, then at you. “Yo. You saw that, right?”", delta:{shoulders:.17,chest:.06,arms:.04,legs:.02,length:.02,presence:.08}, unresolved:"his shoulders have begun to outgrow the shirt"},
    {part:"chest", title:"THE CHEST TAKES THE SPACE", reason:"the first change needs a connected response through the torso", text:"He draws a breath to answer, then pauses. His chest presses forward under the fabric, slowly enough that the seam keeps changing its angle. The new weight settles across him; when he lets his arms hang, they sit a little farther from his sides. Luke gives the shirt a short tug. “Okay. That's getting stupid.” He is smiling when he says it.", delta:{shoulders:.08,chest:.2,arms:.08,legs:.04,length:.03,presence:.1}, unresolved:"the upper body is changing the way his arms rest"},
    {part:"arms", title:"THE ARMS DROP HEAVIER", reason:"the enlarged torso calls for matching arm volume and reach", text:"Luke flexes without making a show of it. His upper arms swell rounder against his sides, then push outward until the old gap between arm and ribs is gone. He shakes his hands loose; the extra bulk travels with the movement instead of snapping back to the old outline. He turns one arm, inspecting it. “Man. Look at that.” Then he angles it toward you so you can get the full view.", delta:{shoulders:.09,chest:.08,arms:.23,legs:.06,length:.06,presence:.12}, unresolved:"the lower body has to carry the new upper-body mass"},
    {part:"legs", title:"THE BASELINE MOVES DOWNWARD", reason:"the upper-body change must alter the stance, not leave a top-heavy mannequin", text:"His stance widens before he seems to notice. The thighs build outward, dense and round, and his legs lengthen with them so the proportions keep their sense of weight. The floor answers with a low creak as he settles. Luke plants his feet and looks back up, shoulders high over that new base. “There. That's better.” He holds still for a second, letting you take it in.", delta:{shoulders:.07,chest:.06,arms:.1,legs:.25,length:.13,presence:.15}, unresolved:"the new proportions need a held moment to register"},
    {part:"presence", title:"LET THE NEW SIZE REGISTER", reason:"more escalation now would bury the change before it can be witnessed", hold:true, text:"For once, Luke doesn't immediately ask for more. He stands in the room with his feet set wide, breathing evenly while the fabric across his chest settles into its new shape. His familiar face hasn't changed, but everything beneath it occupies more of the frame. He catches your eye and keeps it. “Take a second, dude. I'm not going anywhere.” The pause belongs to both of you.", delta:{}, unresolved:"the held moment has made room for the next escalation"},
    {part:"hyper", title:"THE BODY PUSHES PAST THE OLD OUTLINE", reason:"the held recognition is complete; the next growth can exceed the previous frame", text:"The pause breaks when Luke's shoulders press outward again. His chest follows, arms thickening until the whole upper body seems to arrive a fraction late to each movement. His legs answer with another deep expansion and a little more length. The old outline is no longer useful. He turns toward you, grinning like he has just discovered a bigger version of a joke. “Yeah. You thought that was it?”", delta:{shoulders:.2,chest:.21,arms:.19,legs:.2,length:.12,presence:.22}, unresolved:"hypergrowth has opened a scale the room cannot quietly contain"}
  ];
  const clamp = n => Math.max(1, Math.min(3.4, n));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} };
  const el = (id) => document.getElementById(id);
  function publish(beat, kind = "growth") {
    const detail = {
      source: "luke-burgeon",
      type: kind,
      actor: "LUKE",
      title: beat?.title || "LUKE / STATE RETAINED",
      text: beat?.text || s.unresolved,
      stage: s.stage,
      held: s.held,
      witness: s.witness,
      body: clone(s.body),
      unresolved: s.unresolved,
      at: now()
    };
    document.dispatchEvent(new CustomEvent("geehub:hyper-morph", {detail}));
    if (window.GEEHUB_ARTIFACTS?.emit) {
      window.GEEHUB_ARTIFACTS.emit({
        type: "GROWTH MORPH",
        title: "LUKE / " + detail.title,
        body: detail.text + "\\n\\nRETAINED STATE — stage " + s.stage +
          "; shoulders " + s.body.shoulders.toFixed(2) +
          "; chest " + s.body.chest.toFixed(2) +
          "; arms " + s.body.arms.toFixed(2) +
          "; legs " + s.body.legs.toFixed(2) +
          "; witness " + s.witness + ". " + s.unresolved,
        source: "engine/luke-burgeon-engine.js",
        lineage: {engine: "luke-burgeon", stage: s.stage, held: s.held, body: clone(s.body)},
        canon: "active",
        dreamable: true,
        quietness: "medium"
      });
    }
    document.dispatchEvent(new CustomEvent("geehub:luke-state", {detail}));
  }
  function ensure() {
    if (el("lukeBurgeon")) return;
    const host = el("hulumscaveForge") || document.querySelector(".world");
    if (!host) return;
    const root = document.createElement("section");
    root.id = "lukeBurgeon";
    root.className = "luke-burgeon";
    root.innerHTML = `
      <div class="burgeon-head"><div><div class="eyebrow">LIVE SUBJECT / CONTINUITY INSTANCE 01</div><h2>LUKE: THE BURGEONING</h2><p>Every stage inherits the body and the history of the stage before it.</p></div><div class="burgeon-stage" id="burgeonStage">STAGE 00</div></div>
      <div class="burgeon-scene">
        <div class="burgeon-figure" id="burgeonFigure" aria-label="Stylized silhouette changing with retained growth state">
          <div class="figure-halo"></div><div class="figure-head"></div><div class="figure-neck"></div><div class="figure-torso"><i class="figure-chest"></i><i class="figure-waist"></i></div><div class="figure-arm arm-left"></div><div class="figure-arm arm-right"></div><div class="figure-leg leg-left"></div><div class="figure-leg leg-right"></div><div class="figure-floor"></div><span class="figure-measure" id="figureMeasure">BASELINE / RETAINED</span>
        </div>
        <article class="burgeon-copy"><div class="eyebrow" id="burgeonBeat">THE ROOM REMEMBERS</div><h3 id="burgeonTitle">Luke is here.</h3><p id="burgeonText">The next change will start from the body he already has, not from a reset.</p><div class="burgeon-choice"><span>ENGINE CHOICE</span><strong id="burgeonReason">Waiting for the first unresolved change.</strong></div><div class="burgeon-log" id="burgeonLog">NO HISTORY WRITTEN YET</div></article>
      </div>
      <div class="burgeon-controls"><button id="burgeonRun" type="button">LET HIM GROW</button><button id="burgeonHold" type="button">HOLD THIS MOMENT</button><button id="burgeonReset" type="button">RESET INSTANCE</button><span id="burgeonStatus" aria-live="polite">STATE RETAINED LOCALLY</span></div>
    `;
    host.insertAdjacentElement("afterend", root);
    el("burgeonRun").addEventListener("click", advance);
    el("burgeonHold").addEventListener("click", hold);
    el("burgeonReset").addEventListener("click", reset);
    render();
  }
  function choose() {
    if (s.held) return beats.find(b=>b.part==="hyper");
    if (s.stage === 0) return beats[0];
    if (s.stage === 1) return beats[1];
    if (s.stage === 2) return beats[2];
    if (s.stage === 3) return beats[3];
    if (s.stage === 4) return beats[4];
    return beats[5];
  }
  function advance() {
    const b = choose();
    if (b.hold) {
      s.held = true;
      s.lastChoice = b.reason;
      s.unresolved = b.unresolved;
      s.history.unshift({at:now(),stage:s.stage,beat:b.title,choice:b.reason,text:b.text});
      s.history = s.history.slice(0,12);
      s.witness += 1;
    } else {
      Object.keys(b.delta || {}).forEach(k => { s.body[k] = clamp((s.body[k] || 1) + b.delta[k]); });
      s.stage += 1;
      s.held = false;
      s.lastChoice = b.reason;
      s.unresolved = b.unresolved;
      s.history.unshift({at:now(),stage:s.stage,beat:b.title,choice:b.reason,text:b.text});
      s.history = s.history.slice(0,12);
      s.witness += 1;
    }
    save(); render(b); publish(b, "growth");
  }
  function hold() {
    s.held = true;
    s.lastChoice = "the system preserves the current transformation so it can be witnessed";
    s.unresolved = "the current form is held; the next advance will cross into a new scale";
    s.history.unshift({at:now(),stage:s.stage,beat:"WITNESS HOLD",choice:s.lastChoice,text:"The current form remains visible without being replaced by another change."});
    s.history = s.history.slice(0,12);
    save(); render(); publish({title:"WITNESS HOLD", text:"The current form remains visible without being replaced by another change."}, "witness-hold");
  }
  function reset() {
    s = clone(base); save(); render(); publish({title:"INSTANCE RESET", text:"Luke returns to the stored baseline for a new growth pass."}, "reset");
  }
  function render(beat) {
    const b = beat || (s.held ? {title:"THE MOMENT HELD",text:"Luke remains in the new outline long enough for it to register.",reason:s.lastChoice,part:"presence"} : s.history[0] || {title:"LUKE IS HERE",text:"The next change will start from the body he already has, not from a reset.",reason:s.lastChoice,part:"presence"});
    if (!el("lukeBurgeon")) return;
    el("burgeonStage").textContent = "STAGE " + String(s.stage).padStart(2,"0") + (s.held ? " / HELD" : "");
    el("burgeonBeat").textContent = "BEAT / " + (b.part || "presence").toUpperCase();
    el("burgeonTitle").textContent = b.title;
    el("burgeonText").textContent = b.text;
    el("burgeonReason").textContent = b.reason || s.lastChoice;
    el("burgeonLog").textContent = s.history.length ? s.history.slice(0,3).map(h => "STAGE "+String(h.stage).padStart(2,"0")+" — "+h.beat).join("\n") : "NO HISTORY WRITTEN YET";
    el("burgeonStatus").textContent = "WITNESS " + s.witness + " / MEMORY " + s.history.length + " / " + (s.held ? "HOLD ACTIVE" : "READY");
    const f = el("burgeonFigure");
    Object.entries(s.body).forEach(([k,v]) => f.style.setProperty("--"+k, String(v)));
    f.dataset.stage = s.stage;
    f.classList.toggle("is-held", s.held);
    el("figureMeasure").textContent = "SHOULDER " + s.body.shoulders.toFixed(2) + " / CHEST " + s.body.chest.toFixed(2) + " / LEG " + s.body.legs.toFixed(2);
    document.documentElement.style.setProperty("--luke-presence", String(s.body.presence));
    document.documentElement.dataset.lukeStage = String(s.stage);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensure, {once:true}); else ensure();
})();
