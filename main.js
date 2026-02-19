// Roulette To-Do 🎰
// Minimal, stored locally using localStorage 💾

const STORAGE_KEY = "roulette_tasks_v1";

let tasks = loadTasks(); // array of task objects
let currentTaskId = null;
let timerId = null;
let timerEndMs = null;
let hideDone = false;

// ---------- DOM ----------
const el = (id) => document.getElementById(id);

// Screens
const screenChoose = el("screenChoose");
const screenTasks = el("screenTasks");

// Choose screen controls
const locationSelect = el("locationSelect");
const quick15 = el("quick15");
const quick30 = el("quick30");
const quick60 = el("quick60");
const quickCustom = el("quickCustom");
const customWrap = el("customWrap");
const customMinutes = el("customMinutes");
const customGo = el("customGo");
const viewTasksBtn = el("viewTasksBtn");
const backToChooseBtn = el("backToChooseBtn");

// Shared current task UI (on Choose screen)
const currentTaskBox = el("currentTaskBox");
const doneBtn = el("doneBtn");
const skipBtn = el("skipBtn");
const timerLine = el("timerLine");

// Tasks screen controls
const taskName = el("taskName");
const taskDuration = el("taskDuration");
const taskLocation = el("taskLocation");
const taskGroup = el("taskGroup");
const addTaskBtn = el("addTaskBtn");
const addMsg = el("addMsg");

const taskList = el("taskList");
const clearDoneBtn = el("clearDoneBtn");
const wipeAllBtn = el("wipeAllBtn");

const csvFile = el("csvFile");
const importCsvBtn = el("importCsvBtn");
const csvMsg = el("csvMsg");

// ---------- Helpers ----------
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function normalize(s) {
  return (s || "").trim();
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function minutesToMs(min) {
  return min * 60 * 1000;
}

function formatRemaining(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- Navigation ----------
function showChooseScreen() {
  screenChoose.classList.remove("hidden");
  screenChoose.setAttribute("aria-hidden", "false");

  screenTasks.classList.add("hidden");
  screenTasks.setAttribute("aria-hidden", "true");
}

function showTasksScreen() {
  screenTasks.classList.remove("hidden");
  screenTasks.setAttribute("aria-hidden", "false");

  screenChoose.classList.add("hidden");
  screenChoose.setAttribute("aria-hidden", "true");
}

// ---------- Timer behavior ----------
function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  timerEndMs = null;
  timerLine.textContent = "";
}

function startTimerForTask(task) {
  stopTimer();

  timerEndMs = Date.now() + minutesToMs(task.duration);

  timerId = setInterval(() => {
    const t = tasks.find(x => x.id === currentTaskId);
    if (!t) {
      stopTimer();
      return;
    }

    const remaining = timerEndMs - Date.now();

    if (t.done) {
      stopTimer();
      timerLine.textContent = "Done ✅";
      return;
    }

    if (remaining <= 0) {
      stopTimer();
      timerLine.textContent = "⏰ Time is up.";

      const finished = confirm(`Time is up for:\n\n"${t.name}"\n\nDid you complete it?`);
      if (finished) {
        markDone(t.id);
      } else {
        timerLine.textContent = "Not marked done. Still in the list.";
      }
      return;
    }

    timerLine.textContent = `⏳ Time remaining: ${formatRemaining(remaining)}`;
  }, 250);
}

// ---------- Current task display ----------
function setCurrentTask(task) {
  if (!task) {
    currentTaskId = null;
    stopTimer();
    currentTaskBox.innerHTML = `<p class="muted">Nothing selected yet. Pick a time and spin 😄</p>`;
    doneBtn.disabled = true;
    skipBtn.disabled = true;
    return;
  }

  currentTaskId = task.id;
  doneBtn.disabled = !!task.done;
  skipBtn.disabled = false;

  currentTaskBox.innerHTML = `
    <div class="${task.done ? "done" : ""}">
      <div class="itemName">${escapeHtml(task.name)}</div>
      <div class="itemMeta">
        <span class="pill">⏱ ${task.duration} min</span>
        <span class="pill">📍 ${escapeHtml(task.location)}</span>
        ${task.group ? `<span class="pill">🧩 ${escapeHtml(task.group)}</span>` : ""}
      </div>
    </div>
  `;

  if (!task.done) startTimerForTask(task);
  else {
    stopTimer();
    timerLine.textContent = "Marked done ✅";
  }
}

// ---------- Location dropdown ----------
function uniqueLocationsFromTasks() {
  const set = new Set();
  for (const t of tasks) {
    const loc = normalize(t.location);
    if (loc) set.add(loc);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function refreshLocationDropdown() {
  const prev = locationSelect.value;

  const locations = uniqueLocationsFromTasks();

  locationSelect.innerHTML = `<option value="">(no location selected)</option>`;
  for (const loc of locations) {
    const opt = document.createElement("option");
    opt.value = loc;
    opt.textContent = loc;
    locationSelect.appendChild(opt);
  }

  // Restore previous selection if still valid
  if (prev && locations.some(l => l.toLowerCase() === prev.toLowerCase())) {
    // Keep exact value match if possible
    const exact = locations.find(l => l === prev);
    locationSelect.value = exact || prev;
  } else {
    locationSelect.value = "";
  }
}

// ---------- Rendering ----------
function render() {
  refreshLocationDropdown();

  const visible = hideDone ? tasks.filter(t => !t.done) : tasks;

  // Group by long-term group name (including "No group")
  const groups = new Map();
  for (const t of visible) {
    const key = t.group ? `🧩 ${t.group}` : "No group";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  taskList.innerHTML = "";

  if (visible.length === 0) {
    taskList.innerHTML = `<p class="muted">No tasks yet. Add a few, then go spin 🎰</p>`;
    return;
  }

  for (const [groupName, groupTasks] of groups.entries()) {
    const groupHeader = document.createElement("div");
    groupHeader.className = "item";
    groupHeader.innerHTML = `
      <div class="itemTop">
        <div class="itemName">${escapeHtml(groupName)}</div>
        <span class="badge">${groupTasks.length} task(s)</span>
      </div>
    `;
    taskList.appendChild(groupHeader);

    for (const t of groupTasks) {
      const item = document.createElement("div");
      item.className = "item";

      item.innerHTML = `
        <div class="itemTop">
          <div class="itemName ${t.done ? "done" : ""}">${escapeHtml(t.name)}</div>
          <span class="badge">${t.done ? "Done ✅" : "Active"}</span>
        </div>
        <div class="itemMeta">
          <span class="pill">⏱ ${t.duration} min</span>
          <span class="pill">📍 ${escapeHtml(t.location)}</span>
          ${t.group ? `<span class="pill">🧩 ${escapeHtml(t.group)}</span>` : ""}
        </div>
        <div class="row">
          <button class="good" data-action="done" data-id="${t.id}" ${t.done ? "disabled" : ""}>Mark done</button>
          <button class="ghost" data-action="select" data-id="${t.id}">Select</button>
          <button class="danger" data-action="delete" data-id="${t.id}">Delete</button>
        </div>
      `;

      taskList.appendChild(item);
    }
  }
}

// ---------- Add task ----------
function showAddMsg(msg) {
  addMsg.textContent = msg;
  setTimeout(() => {
    if (addMsg.textContent === msg) addMsg.textContent = "";
  }, 1800);
}

function addTask() {
  const name = normalize(taskName.value);
  const duration = Number(taskDuration.value);
  const location = normalize(taskLocation.value);
  const group = normalize(taskGroup.value);

  if (!name) return showAddMsg("Need a task name 🙂");
  if (!Number.isFinite(duration) || duration <= 0) return showAddMsg("Need a valid duration (minutes) 🙂");
  if (!location) return showAddMsg("Need a location 🙂");

  const t = {
    id: uid(),
    name,
    duration: Math.floor(duration),
    location,
    group: group || null,
    done: false,
    createdAt: Date.now()
  };

  tasks.push(t);
  saveTasks();
  render();

  taskName.value = "";
  taskDuration.value = "";
  taskLocation.value = "";
  taskGroup.value = "";

  showAddMsg("Task added ✅");
}

// ---------- Spin logic (triggered by quick buttons) ----------
function spinWithMinutes(minutes) {
  const locFilter = normalize(locationSelect.value);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    setCurrentTask(null);
    currentTaskBox.innerHTML = `<p class="muted">Type how many minutes you have 🙂</p>`;
    return;
  }

  const eligible = tasks.filter(t => {
    if (t.done) return false;
    if (t.duration > minutes) return false;
    if (locFilter) return t.location.toLowerCase() === locFilter.toLowerCase();
    return true;
  });

  if (eligible.length === 0) {
    setCurrentTask(null);
    currentTaskBox.innerHTML = `<p class="muted">No tasks fit ${minutes} minutes${locFilter ? ` at "${escapeHtml(locFilter)}"` : ""} 😭</p>`;
    return;
  }

  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  setCurrentTask(chosen);
}

// ---------- Done / delete / select ----------
function markDone(id = currentTaskId) {
  if (!id) return;
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  t.done = true;
  saveTasks();
  render();

  if (currentTaskId === id) {
    stopTimer();
    setCurrentTask(t);
    doneBtn.disabled = true;
    timerLine.textContent = "Marked done ✅ Timer stopped.";
  }
}

function deleteTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;

  if (currentTaskId === id) setCurrentTask(null);

  tasks.splice(idx, 1);
  saveTasks();
  render();
}

function selectTask(id) {
  const t = tasks.find(x => x.id === id);
  if (t) {
    setCurrentTask(t);
    // Tiny UX bonus: selecting in Tasks screen immediately shows it,
    // and you can still hit "Back to choose" to see it bigger.
  }
}

// ---------- CSV import ----------
function showCsvMsg(msg) {
  csvMsg.textContent = msg;
  setTimeout(() => {
    if (csvMsg.textContent === msg) csvMsg.textContent = "";
  }, 2400);
}

/**
 * Basic CSV parser that supports:
 * - commas
 * - quoted fields (double quotes)
 * - escaped quotes inside quoted fields ("")
 * - newlines inside quoted fields
 *
 * Returns: array of rows, each row is array of strings
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    if (c === "\r") continue;

    field += c;
  }

  row.push(field);
  const isAllEmpty = row.every(cell => String(cell).trim() === "");
  if (!isAllEmpty) rows.push(row);

  return rows;
}

function importTasksFromCsvText(text) {
  const rows = parseCsv(text);

  let added = 0;
  let skipped = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];

    if (!r || r.length === 0) { skipped++; continue; }

    const name = normalize(r[0]);
    const durationRaw = r[1];
    const location = normalize(r[2]);
    const group = normalize(r[3]);

    const maybeHeader =
      idx === 0 &&
      name.toLowerCase().includes("name") &&
      String(durationRaw || "").toLowerCase().includes("duration");
    if (maybeHeader) {
      skipped++;
      continue;
    }

    const duration = Number(String(durationRaw || "").trim());

    if (!name) { skipped++; continue; }
    if (!Number.isFinite(duration) || duration <= 0) { skipped++; continue; }
    if (!location) { skipped++; continue; }

    const t = {
      id: uid(),
      name,
      duration: Math.floor(duration),
      location,
      group: group || null,
      done: false,
      createdAt: Date.now()
    };

    tasks.push(t);
    added++;
  }

  if (added > 0) {
    saveTasks();
    render();
  }

  return { added, skipped, total: rows.length };
}

// ---------- Events ----------
// Navigation
viewTasksBtn.addEventListener("click", () => showTasksScreen());
backToChooseBtn.addEventListener("click", () => showChooseScreen());

// Quick spins
quick15.addEventListener("click", () => spinWithMinutes(15));
quick30.addEventListener("click", () => spinWithMinutes(30));
quick60.addEventListener("click", () => spinWithMinutes(60));

quickCustom.addEventListener("click", () => {
  const isHidden = customWrap.classList.contains("hidden");
  customWrap.classList.toggle("hidden", !isHidden);
  customWrap.setAttribute("aria-hidden", String(!isHidden ? true : false));

  if (isHidden) {
    customMinutes.focus();
  }
});

customGo.addEventListener("click", () => {
  const minutes = Number(customMinutes.value);
  spinWithMinutes(minutes);
});

// Nice: Enter key in custom minutes triggers spin
customMinutes.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    customGo.click();
  }
});

// Current task actions
doneBtn.addEventListener("click", () => markDone());
skipBtn.addEventListener("click", () => setCurrentTask(null));

// Task add
addTaskBtn.addEventListener("click", addTask);

// Hide/show done
clearDoneBtn.addEventListener("click", () => {
  hideDone = !hideDone;
  clearDoneBtn.textContent = hideDone ? "Show done" : "Hide done (keep stored)";
  render();
});

// Wipe all
wipeAllBtn.addEventListener("click", () => {
  const ok = confirm("Wipe ALL tasks from this device? This cannot be undone.");
  if (!ok) return;

  setCurrentTask(null);
  tasks = [];
  saveTasks();
  render();
});

// CSV import
importCsvBtn.addEventListener("click", () => {
  const file = csvFile.files && csvFile.files[0];
  if (!file) {
    showCsvMsg("Pick a .csv file first 🙂");
    return;
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    showCsvMsg("That file doesn’t look like a .csv 😅");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const { added, skipped } = importTasksFromCsvText(text);

      if (added === 0) {
        showCsvMsg(`Imported 0 tasks. Skipped ${skipped}. (Check format)`);
      } else {
        showCsvMsg(`Imported ${added} task(s)! Skipped ${skipped}. ✅`);
      }

      csvFile.value = "";
    } catch (err) {
      console.error(err);
      showCsvMsg("CSV import failed 😭 Check the console for details.");
    }
  };
  reader.onerror = () => showCsvMsg("Couldn’t read that file 😭");

  reader.readAsText(file);
});

// Click handling inside the list (event delegation)
taskList.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "done") markDone(id);
  if (action === "delete") deleteTask(id);
  if (action === "select") selectTask(id);
});

// ---------- Initial boot ----------
render();
setCurrentTask(null);
showChooseScreen();
