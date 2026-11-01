import { BASELINE, REGIONS, createGrowthState, createChildState, validateGrowthSequence } from "./core/growth-state.js";
import { GROWTH_DIRECTOR, directorSession } from "./core/growth-director.js";
import { createCreativeProject, applyCreativeOperation } from "./core/creative-project.js";
import { CapabilityRegistry } from "./core/capability-registry.js";
import { interpretCreativeDirection, compileDirectorPlan } from "./core/director-planner.js";

const $ = selector => document.querySelector(selector);
const video = $("#sourceVideo");
const fileInput = $("#sourceFile");
const scrub = $("#scrub");
const state = { sourceUrl:null, sourceName:null, duration:0, baselineFrame:null, states:[], sourceMeta:null, director:directorSession(), project:null, lastPlan:null };
const capabilities = new CapabilityRegistry();

$("#directorStatus").textContent = GROWTH_DIRECTOR.name.toUpperCase() + " / ACTIVE";

const timecode = seconds => {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${String(m).padStart(2,"0")}:${s.toFixed(2).padStart(5,"0")}`;
};
const readTargets = () => Object.fromEntries(REGIONS.map(key => [key, Number(document.querySelector(`[data-region="${key}"]`).value)]));
const setTargets = values => {
  for (const key of REGIONS) {
    const input = document.querySelector(`[data-region="${key}"]`);
    input.value = values[key];
    document.querySelector(`[data-out="${key}"]`).textContent = `${Number(values[key]).toFixed(2)}×`;
  }
};
const showTime = () => {
  const time = video.currentTime || 0;
  $("#timeReadout").textContent = timecode(time);
  scrub.value = state.duration ? Math.round(time / state.duration * 1000) : 0;
};

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
  state.sourceUrl = URL.createObjectURL(file);
  state.sourceName = file.name;
  state.director = directorSession(file.name);
  state.project = createCreativeProject({ name:file.name.replace(/\.[^.]+$/, "") + " / GEEHUB", source:{ name:file.name, mediaType:file.type, size:file.size, immutable:true } });
  state.lastPlan = null;
  $("#planStatus").textContent = "SOURCE REGISTERED";
  $("#directorPlan").textContent = "Source registered as an immutable project node. Describe the creative changes you want.";
  video.src = state.sourceUrl;
  video.load();
  $("#emptyState").hidden = true;
  $("#sourceStatus").textContent = "SOURCE LOADED";
  $("#videoMeta").textContent = file.name;
  $("#captureFrame").disabled = false;
});

video.addEventListener("loadedmetadata", () => {
  state.duration = video.duration;
  state.sourceMeta = { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
  video.classList.add("ready");
  scrub.disabled = false;
  $("#videoMeta").textContent = `${video.videoWidth} × ${video.videoHeight} / ${timecode(video.duration)}`;
  showTime();
});
video.addEventListener("timeupdate", showTime);
scrub.addEventListener("input", () => {
  if (state.duration) video.currentTime = Number(scrub.value) / 1000 * state.duration;
});

$("#captureFrame").addEventListener("click", () => {
  if (!video.videoWidth) return;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video,0,0);
  state.baselineFrame = canvas.toDataURL("image/jpeg",.92);
  const base = createGrowthState(BASELINE,{id:"baseline",note:"Captured source baseline"});
  state.states = [base];
  setTargets(base.body);
  renderStates();
  $("#exportProject").disabled = false;
  $("#archiveStatus").textContent = "BASELINE CAPTURED";
  $("#sourceStatus").textContent = "BASELINE FRAME LOCKED";
  $("#directorStatus").textContent = "SOURCE LOCKED / CONTINUITY ACTIVE";
});

function renderStates() {
  $("#stateCount").textContent = `${String(state.states.length).padStart(2,"0")} STATES`;
  $("#stateStrip").innerHTML = state.states.map((s,i)=>`<span class="state-chip ${i===state.states.length-1?"active":""}">${i===0?"BASELINE":`PHASE ${String(i).padStart(2,"0")}`}</span>`).join("");
  $("#timeline").innerHTML = state.states.map((s,i)=>`<div class="timeline-node"><b>${i===0?"BASELINE":`GROWTH ${String(i).padStart(2,"0")}`}</b><span>Height ${s.body.stature.toFixed(2)}×<br>Shoulders ${s.body.shoulderSpan.toFixed(2)}×</span></div>`).join("");
}

document.querySelectorAll("[data-region]").forEach(input => input.addEventListener("input", () => {
  if (input.dataset.region === "stature") {
    for (const key of ["armLength","thighLength"]) {
      const length = document.querySelector(`[data-region="${key}"]`);
      if (Number(length.value) < Number(input.value)) length.value = input.value;
    }
    const torso = document.querySelector('[data-region="torsoLength"]');
    if (Number(torso.value) < Number(input.value)*.9) torso.value = (Number(input.value)*.9).toFixed(2);
  }
  for (const key of REGIONS) document.querySelector(`[data-out="${key}"]`).textContent = `${Number(document.querySelector(`[data-region="${key}"]`).value).toFixed(2)}×`;
}));

$("#saveState").addEventListener("click", () => {
  if (!state.states.length) { $("#sourceStatus").textContent = "CAPTURE BASELINE FIRST"; return; }
  try {
    const next = createChildState(state.states[state.states.length-1],readTargets(),{
      id:`phase-${String(state.states.length).padStart(2,"0")}`,
      note:"Approved growth target"
    });
    state.states.push(next);
    state.director.decisions.push({stateId:next.id,decision:"approved-growth-target",timestamp:new Date().toISOString()});
    renderStates();
    $("#archiveStatus").textContent = "STATE SAVED";
  } catch(error) {
    $("#archiveStatus").textContent = error.message.toUpperCase();
  }
});

$("#resetState").addEventListener("click", () => setTargets(state.states.at(-1)?.body ?? BASELINE));

$("#planDirection").addEventListener("click", () => {
  try {
    const direction = interpretCreativeDirection($("#directorPrompt").value);
    const plan = compileDirectorPlan(direction, capabilities);
    state.lastPlan = plan;
    if (state.project) {
      for (const action of direction.actions) {
        const nodeType = action.action.includes("construct-new") ? "asset" : action.action.includes("reshape-edit") ? "shot" : action.action.includes("render") ? "render" : "effect";
        const nodeId = "intent-" + action.id;
        state.project = applyCreativeOperation(state.project, { id:"record-" + action.id, type:"add-node", intent:direction.sourceText, label:"Draft: " + action.action, payload:{node:{id:nodeId,type:nodeType,name:action.action.replaceAll("-"," "),enabled:true,status:"planned",intent:direction.sourceText,requiredCapabilities:plan.missingByAction.find(item=>item.action===action.action)?.missing ?? []}} });
      }
    }
    const missing = plan.capabilityReport.missing;
    $("#planStatus").textContent = plan.canExecute ? "READY TO EXECUTE" : missing.length + " CAPABILITIES NOT CONNECTED";
    const rows = plan.direction.actions.map(action => {
      const gaps = plan.missingByAction.find(item => item.action === action.action)?.missing ?? [];
      return `<div class="plan-action"><b>${action.action.replaceAll("-"," ").toUpperCase()}</b><span>${gaps.length ? "WAITING FOR TOOLS" : "READY"}</span></div>`;
    }).join("");
    $("#directorPlan").innerHTML = `<div class="plan-summary">${plan.direction.actions.length} CREATIVE OPERATIONS / ${plan.direction.constraints.length} CONTINUITY RULES</div><div class="plan-actions">${rows}</div><div class="plan-warning">${missing.length ? "NOT YET EXECUTABLE — " + missing.join(" · ") : "All required capabilities are connected."}</div><div class="plan-constraints">PRESERVE: ${plan.direction.constraints.join(" / ")}</div>`;
  } catch(error) {
    $("#planStatus").textContent = "DIRECTION NEEDS ATTENTION";
    $("#directorPlan").textContent = error.message;
  }
});

$("#exportProject").addEventListener("click", () => {
  const validation = validateGrowthSequence(state.states);
  if (!validation.valid) { $("#archiveStatus").textContent = "VALIDATION FAILED"; return; }
  const project = {
    product:"GEEHUB Growth Video Studio",
    schemaVersion:1,
    createdAt:new Date().toISOString(),
    director:GROWTH_DIRECTOR,
    directorSession:state.director,
    source:{name:state.sourceName,metadata:state.sourceMeta},
    baselineFrame:state.baselineFrame,
    growthStates:state.states,
    creativeProject:state.project,
    directorPlan:state.lastPlan,
    validation,
    renderStatus:"not-rendered",
    note:"Director-authored project manifest. Pixel deformation and temporal rendering require a connected video renderer."
  };
  const blob = new Blob([JSON.stringify(project,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");a.href=url;a.download="geehub-growth-video-project.json";a.click();
  URL.revokeObjectURL(url);
  $("#archiveStatus").textContent = "MANIFEST EXPORTED";
});
