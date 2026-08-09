"use strict";

/* ---------- Storage ---------- */
const PRESETS_KEY = "tabata.presets";
const LAST_KEY = "tabata.lastId";

const DEFAULT_PRESET = {
  name: "",
  countdown: 10,
  workSec: 20,
  reps: 8,
  restSec: 10,
  sets: 1,
  setRestSec: 60,
};

const FIELDS = [
  { key: "countdown",  name: "Start countdown",   sub: "seconds",          min: 0, max: 60,  step: 5 },
  { key: "workSec",    name: "Interval (work)",   sub: "seconds",          min: 1, max: 600, step: 5 },
  { key: "reps",       name: "Intervals / reps",  sub: "per set",          min: 1, max: 100, step: 1 },
  { key: "restSec",    name: "Rest between reps", sub: "seconds",          min: 0, max: 300, step: 5 },
  { key: "sets",       name: "Sets",              sub: "repeat all reps",  min: 1, max: 50,  step: 1 },
  { key: "setRestSec", name: "Rest between sets", sub: "seconds",          min: 0, max: 600, step: 5 },
];

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
let storageOk = true;
function savePresets(list) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
    // Read back to confirm the write actually stuck (some iOS modes silently drop it).
    storageOk = localStorage.getItem(PRESETS_KEY) === JSON.stringify(list);
  } catch (e) {
    storageOk = false;
  }
  if (!storageOk) {
    alert("⚠️ Couldn't save — this browser is blocking site storage.\n\nIn Chrome iOS: Settings ▸ Content Settings ▸ Block Cookies must be OFF, and don't use Incognito. Safari usually works.");
  }
  updateDiag();
}
function newId() {
  return "p" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

let presets = loadPresets();

/* ---------- View switching ---------- */
const views = {
  home: document.getElementById("home"),
  editor: document.getElementById("editor"),
  run: document.getElementById("run"),
};
function show(name) {
  for (const k in views) views[k].classList.toggle("hidden", k !== name);
}

/* ---------- Home ---------- */
const presetList = document.getElementById("presetList");
const emptyHint = document.getElementById("emptyHint");

function fmtTime(s) {
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m${r}s` : `${m}m`;
}
function presetSummary(p) {
  const parts = [`${p.reps}×${fmtTime(p.workSec)} work`];
  if (p.restSec) parts.push(`${fmtTime(p.restSec)} rest`);
  if (p.sets > 1) parts.push(`${p.sets} sets`);
  return parts.join(" · ");
}

function renderHome() {
  presetList.innerHTML = "";
  emptyHint.classList.toggle("hidden", presets.length > 0);
  for (const p of presets) {
    const li = document.createElement("li");
    li.className = "preset-card";

    const play = document.createElement("div");
    play.className = "play";
    play.innerHTML = `<div class="pname"></div><div class="pmeta"></div>`;
    play.querySelector(".pname").textContent = p.name || "Untitled";
    play.querySelector(".pmeta").textContent = presetSummary(p);
    play.addEventListener("click", () => openRun(p));

    const edit = document.createElement("button");
    edit.className = "edit";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openEditor(p));

    li.appendChild(play);
    li.appendChild(edit);
    presetList.appendChild(li);
  }
}

document.getElementById("newBtn").addEventListener("click", () => openEditor(null));

/* ---------- Editor ---------- */
const nameInput = document.getElementById("nameInput");
const steppersEl = document.getElementById("steppers");
const editorTitle = document.getElementById("editorTitle");
const deleteBtn = document.getElementById("deleteBtn");
let editing = null; // preset being edited, or null for new
let draft = null;

function clamp(v, f) {
  return Math.max(f.min, Math.min(f.max, v));
}

function renderSteppers() {
  steppersEl.innerHTML = "";
  for (const f of FIELDS) {
    const row = document.createElement("div");
    row.className = "stepper";
    row.innerHTML = `
      <button type="button" aria-label="decrease">−</button>
      <div class="slabel"><div class="name"></div><div class="sub"></div></div>
      <div class="sval"></div>
      <button type="button" aria-label="increase">＋</button>`;
    row.querySelector(".name").textContent = f.name;
    row.querySelector(".sub").textContent = f.sub;
    const valEl = row.querySelector(".sval");
    const update = () => { valEl.textContent = draft[f.key]; };
    update();

    const [minus, , , plus] = row.children;
    const bump = (dir) => {
      draft[f.key] = clamp(draft[f.key] + dir * f.step, f);
      update();
    };
    holdRepeat(minus, () => bump(-1));
    holdRepeat(plus, () => bump(1));
    steppersEl.appendChild(row);
  }
}

// Tap once; hold to repeat (accelerating).
function holdRepeat(btn, fn) {
  let timer = null;
  let delay = 400;
  const step = () => {
    fn();
    delay = Math.max(60, delay * 0.8);
    timer = setTimeout(step, delay);
  };
  const start = (e) => {
    e.preventDefault();
    fn();
    delay = 400;
    timer = setTimeout(step, delay);
  };
  const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };
  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointerleave", stop);
  btn.addEventListener("pointercancel", stop);
}

function openEditor(preset) {
  editing = preset;
  draft = Object.assign({}, DEFAULT_PRESET, preset || {});
  nameInput.value = preset ? preset.name : "";
  editorTitle.textContent = preset ? "Edit workout" : "New workout";
  deleteBtn.classList.toggle("hidden", !preset);
  renderSteppers();
  show("editor");
}

document.getElementById("editorBack").addEventListener("click", () => {
  renderHome();
  show("home");
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const name = nameInput.value.trim();
  draft.name = name || "Workout";
  if (editing) {
    Object.assign(editing, draft);
  } else {
    editing = Object.assign({ id: newId() }, draft);
    presets.push(editing);
  }
  savePresets(presets);
  renderHome();
  show("home");
});

deleteBtn.addEventListener("click", () => {
  if (!editing) return;
  if (!confirm(`Delete "${editing.name || "Workout"}"?`)) return;
  presets = presets.filter((p) => p.id !== editing.id);
  savePresets(presets);
  renderHome();
  show("home");
});

/* ---------- Audio (Web Audio, generated tones) ---------- */
let audioCtx = null;
let audioReady = false;
function initAudio() {
  // Tell iOS this is playback audio so it isn't gated like a notification.
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch { /* not supported */ }
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  // Kick the context awake with a silent buffer inside the user gesture (iOS unlock).
  if (audioCtx && !audioReady) {
    try {
      const buf = audioCtx.createBuffer(1, 1, 22050);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtx.destination);
      src.start(0);
      audioReady = true;
    } catch { /* ignore */ }
  }
  return audioCtx && audioCtx.state === "running";
}
// Unlock on the very first touch anywhere, so audio is armed before the run screen.
["pointerdown", "touchend", "click"].forEach((ev) =>
  document.addEventListener(ev, () => initAudio(), { once: false, passive: true })
);
function tone(freq, durMs, when = 0, gain = 0.4) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const t0 = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.setValueAtTime(gain, t0 + durMs / 1000 - 0.02);
  g.gain.linearRampToValueAtTime(0, t0 + durMs / 1000);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}
const beepCountdown = () => tone(880, 120);
const beepWork = () => tone(1200, 350);
const beepRest = () => tone(520, 350);
const beepDone = () => { tone(1000, 180, 0); tone(1000, 180, 0.25); tone(1320, 400, 0.5); };

/* ---------- Wake lock ---------- */
let wakeLock = null;
async function acquireWakeLock() {
  try {
    if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
  } catch { /* ignore */ }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && engine && engine.running && !engine.paused) {
    acquireWakeLock();
  }
});

/* ---------- Timeline ---------- */
function buildTimeline(p) {
  const segs = [];
  if (p.countdown > 0) segs.push({ phase: "ready", dur: p.countdown, label: "Get Ready" });
  for (let s = 1; s <= p.sets; s++) {
    for (let r = 1; r <= p.reps; r++) {
      segs.push({ phase: "work", dur: p.workSec, label: "Work", rep: r, set: s });
      if (r < p.reps && p.restSec > 0)
        segs.push({ phase: "rest", dur: p.restSec, label: "Rest", rep: r, set: s });
    }
    if (s < p.sets && p.setRestSec > 0)
      segs.push({ phase: "setrest", dur: p.setRestSec, label: "Set Rest", set: s });
  }
  segs.push({ phase: "done", dur: 0, label: "Done" });
  return segs;
}

/* ---------- Run engine ---------- */
const runStage = document.getElementById("runStage");
const phaseLabel = document.getElementById("phaseLabel");
const bigTime = document.getElementById("bigTime");
const progressEl = document.getElementById("progress");
const nextUpEl = document.getElementById("nextUp");
const pauseBtn = document.getElementById("pauseBtn");

let engine = null;
let current = null; // current preset

function openRun(p) {
  current = p;
  localStorage.setItem(LAST_KEY, p.id);
  initAudio(); // unlock audio on this user gesture
  startEngine(p);
  acquireWakeLock();
  show("run");
}

function startEngine(p) {
  const segs = buildTimeline(p);
  engine = {
    preset: p,
    segs,
    idx: 0,
    endAt: 0,
    remaining: 0,   // ms remaining when paused
    lastSec: -1,
    running: true,
    paused: false,
    tick: null,
  };
  enterSegment(0, true);
  engine.tick = setInterval(loop, 100);
  pauseBtn.textContent = "Pause";
}

function enterSegment(idx, first) {
  const seg = engine.segs[idx];
  engine.idx = idx;
  engine.lastSec = -1;

  runStage.className = "run-stage " + seg.phase;
  phaseLabel.textContent = seg.label;

  if (seg.phase === "done") {
    bigTime.textContent = "✓";
    progressEl.textContent = "Workout complete";
    nextUpEl.textContent = "";
    beepDone();
    finish();
    return;
  }

  // progress text
  const P = engine.preset;
  if (seg.phase === "ready") progressEl.textContent = P.sets > 1 ? `Set 1/${P.sets}` : "Starting…";
  else if (seg.phase === "setrest") progressEl.textContent = `Set ${seg.set}/${P.sets} done`;
  else progressEl.textContent = `Rep ${seg.rep}/${P.reps} · Set ${seg.set}/${P.sets}`;

  // next up
  const nxt = engine.segs[idx + 1];
  nextUpEl.textContent = nxt && nxt.phase !== "done"
    ? `Next: ${nxt.label}${nxt.dur ? " " + nxt.dur + "s" : ""}`
    : (nxt && nxt.phase === "done" ? "Last one!" : "");

  // entry tone (skip on the very first countdown so it isn't jarring)
  if (!first || seg.phase !== "ready") {
    if (seg.phase === "work") beepWork();
    else if (seg.phase === "rest" || seg.phase === "setrest") beepRest();
  }

  engine.endAt = performance.now() + seg.dur * 1000;
  bigTime.textContent = seg.dur;
}

function loop() {
  if (!engine || !engine.running || engine.paused) return;
  const remainMs = engine.endAt - performance.now();
  const secs = Math.max(0, Math.ceil(remainMs / 1000));

  if (secs !== engine.lastSec) {
    engine.lastSec = secs;
    bigTime.textContent = secs;
    if (secs >= 1 && secs <= 3) beepCountdown();
  }

  if (remainMs <= 0) {
    enterSegment(engine.idx + 1, false);
  }
}

function pauseToggle() {
  if (!engine || !engine.running) return;
  if (!engine.paused) {
    engine.paused = true;
    engine.remaining = engine.endAt - performance.now();
    runStage.classList.add("paused");
    pauseBtn.textContent = "Resume";
    releaseWakeLock();
  } else {
    engine.paused = false;
    engine.endAt = performance.now() + engine.remaining;
    runStage.classList.remove("paused");
    pauseBtn.textContent = "Pause";
    initAudio();
    acquireWakeLock();
  }
}

function finish() {
  if (engine) { clearInterval(engine.tick); engine.running = false; }
  releaseWakeLock();
  pauseBtn.textContent = "Done";
}

function stopRun() {
  if (engine) { clearInterval(engine.tick); engine.running = false; }
  releaseWakeLock();
  renderHome();
  show("home");
}

pauseBtn.addEventListener("click", () => {
  if (engine && !engine.running) { stopRun(); return; } // "Done" acts as back
  pauseToggle();
});
document.getElementById("stopBtn").addEventListener("click", stopRun);

/* ---------- Diagnostics (on-device probe) ---------- */
const diagEl = document.getElementById("diag");
function updateDiag() {
  if (!diagEl) return;
  let opens = 0;
  try {
    opens = parseInt(localStorage.getItem("tabata.opens") || "0", 10) || 0;
  } catch { /* blocked */ }
  if (!storageOk) {
    diagEl.textContent = "⚠️ Storage blocked — workouts won't be saved in this browser";
    diagEl.className = "diag bad";
  } else {
    diagEl.textContent = `Storage OK · ${presets.length} saved · opened ${opens}×`;
    diagEl.className = "diag";
  }
}
function bumpOpenCounter() {
  try {
    const n = (parseInt(localStorage.getItem("tabata.opens") || "0", 10) || 0) + 1;
    localStorage.setItem("tabata.opens", String(n));
    storageOk = localStorage.getItem("tabata.opens") === String(n);
  } catch {
    storageOk = false;
  }
}

const testBtn = document.getElementById("testSound");
if (testBtn) {
  testBtn.addEventListener("click", () => {
    const running = initAudio();
    beepWork();
    setTimeout(beepCountdown, 300);
    if (!running) {
      setTimeout(() => {
        if (!audioCtx || audioCtx.state !== "running")
          alert("🔇 Audio is blocked. Check the side ring/silent switch, turn media volume up, or try Safari.");
      }, 200);
    }
  });
}

/* ---------- Boot ---------- */
bumpOpenCounter();
renderHome();
updateDiag();
show("home");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
