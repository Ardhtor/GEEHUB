import { BASELINE, REGIONS, createGrowthState, createChildState, validateGrowthSequence } from "./core/growth-state.js";

const $ = selector => document.querySelector(selector);
const video = $("#sourceVideo");
const fileInput = $("#sourceFile");
const scrub = $("#scrub");
const state = { sourceUrl:null, sourceName:null, duration:0, baselineFrame:null, states:[], sourceMeta:null };

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
});

function renderStates() {
  $("#stateCount").textContent = `${String(state.states.length).padStart(2,"0")} STATES`;
  $("#stateStrip").innerHTML = state.states.map((s,i)=>`<span class="state-chip ${i===state.states.length-1?"active":""}">${i===0?"BASELINE":`PHASE ${String(i).padStart(2,"0")}`}</span>`).join("");
  $("#timeline").innerHTML = state.states.map((s,i)=>`<div class="timeline-node"><b>${i===0?"BASELINE":`GROWTH ${String(i).padStart(2,"0")}`}</b><span>Height ${s.body.stature.toFixed(2)}×<br>Shoulders ${s.body.shoulderSpan.toFixed(2)}×</span></div>`).join("");
}

document.querySelectorAll("[data-region]").forEach(input => input.addEventListener("input", () => {
  const values = readTargets();
  // When stature rises, length targets are carried forward automatically.
  if (input.dataset.region === "stature") {
    for (const key of ["armLength","thighLength"]) {
      const length = document.querySelector(`[data-region="${key}"]`);
      if (Number(length.value) < Number(input.value)) length.value = input.value;
    }
  }
  if (input.dataset.region === "stature" && Number(document.querySelector('[data-region="torsoLength"]').value) < Number(input.value)*.9) {
    document.querySelector('[data-region="torsoLength"]').value = (Number(input.value)*.9).toFixed(2);
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
    renderStates();
    $("#archiveStatus").textContent = "STATE SAVED";
  } catch(error) {
    $("#archiveStatus").textContent = error.message.toUpperCase();
  }
});

$("#resetState").addEventListener("click", () => setTargets(state.states.at(-1)?.body ?? BASELINE));

$("#exportProject").addEventListener("click", () => {
  const validation = validateGrowthSequence(state.states);
  if (!validation.valid) { $("#archiveStatus").textContent = "VALIDATION FAILED"; return; }
  const project = {
    product:"GEEHUB Growth Video Studio",
    schemaVersion:1,
    createdAt:new Date().toISOString(),
    source:{name:state.sourceName,metadata:state.sourceMeta},
    baselineFrame:state.baselineFrame,
    identityPolicy:{face:"preserve",facialLandmarks:"locked",expression:"preserve",sourceMotion:"preserve"},
    growthStates:state.states,
    validation,
    renderStatus:"not-rendered",
    note:"This manifest stores source and growth targets. It is not a rendered transformation video."
  };
  const blob = new Blob([JSON.stringify(project,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");a.href=url;a.download="geehub-growth-video-project.json";a.click();
  URL.revokeObjectURL(url);
  $("#archiveStatus").textContent = "MANIFEST EXPORTED";
});
