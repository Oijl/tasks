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

const taskName = el("taskName");
const taskDuration = el("taskDuration");
const taskLocation = el("taskLocation");
const taskGroup = el("taskGroup");
const addTaskBtn = el("addTaskBtn");
const addMsg = el("addMsg");

const timeAvailable = el("timeAvailable");
const locationFilter = el("locationFilter");
const spinBtn = el("spinBtn");

const currentTaskBox = el("currentTaskBox");
const doneBtn = el("doneBtn");
const skipBtn = el("skipBtn");
const timerLine = el("timerLine");

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

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  timerEndMs = null;
  timerLine.textContent = "";
}

function setCurrentTask(task) {
  if (!task) {
    currentTaskId = null;
    stopTimer();
    currentTaskBox.innerHTML = `<p class="muted">Nothing selected yet. Spin the wheel 😄</p>`;
    doneBtn.disabled = true;
    skipBtn.disabled = true;
    return;
  }

  currentTaskId = task.id;
  doneBtn.disabled = false;
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

  startTimerForTask(task);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
        // Escaped quote
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

    // Not in quotes
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

    if (c === "\r") {
      // ignore CR (handles Windows \r\n)
      continue;
    }

    field += c;
  }

  // Flush last field/row
  row.push(field);
  // Avoid adding a totally empty trailing row
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

    // Allow blank lines
    if (!r || r.length === 0) { skipped++; continue; }

    const name = normalize(r[0]);
    const durationRaw = r[1];
    const location = normalize(r[2]);
    const group = normalize(r[3]); // may be undefined => normalize => ""

    // If the row looks like a header row, skip it.
    // (Very forgiving: if duration isn't a number and row 0 contains "name", it's probably a header.)
    const maybeHeader =
      idx === 0 &&
      name.toLowerCase().includes("name") &&
      String(durationRaw || "").toLowerCase().includes("duration");
    if (maybeHeader) {
      skipped++;
      continue;
    }

    const duration = Number(String(durationRaw || "").trim());

    // Validate required columns: name, duration, location
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



// ---------- Rendering ----------
function render() {
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
    taskList.innerHTML = `<p class="muted">No tasks yet. Add a few and spin 🎰</p>`;
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

// ---------- Core logic ----------
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

function showAddMsg(msg) {
  addMsg.textContent = msg;
  setTimeout(() => {
    if (addMsg.textContent === msg) addMsg.textContent = "";
  }, 1800);
}

function spin() {
  const minutes = Number(timeAvailable.value);
  const locFilter = normalize(locationFilter.value);

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

function markDone(id = currentTaskId) {
  if (!id) return;
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  t.done = true;
  saveTasks();
  render();

  if (currentTaskId === id) {
    stopTimer();
    // Keep it displayed but crossed out
    setCurrentTask(t);
    doneBtn.disabled = true;
    timerLine.textContent = "Marked done ✅ Timer stopped.";
  }
}

function deleteTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;

  // If deleting current task, clear selection
  if (currentTaskId === id) setCurrentTask(null);

  tasks.splice(idx, 1);
  saveTasks();
  render();
}

function selectTask(id) {
  const t = tasks.find(x => x.id === id);
  if (t) setCurrentTask(t);
}

// ---------- Timer behavior ----------
function startTimerForTask(task) {
  stopTimer();

  // Start countdown for the task duration
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

      // Ask the user if they finished (your requirement)
      const finished = confirm(`Time is up for:\n\n"${t.name}"\n\nDid you complete it?`);
      if (finished) {
        markDone(t.id);
      } else {
        // Not done, leave as-is
        timerLine.textContent = "Not marked done. Still in the list.";
      }
      return;
    }

    timerLine.textContent = `⏳ Time remaining: ${formatRemaining(remaining)}`;
  }, 250);
}

// ---------- Buttons / Events ----------
addTaskBtn.addEventListener("click", addTask);

spinBtn.addEventListener("click", spin);

doneBtn.addEventListener("click", () => markDone());

skipBtn.addEventListener("click", () => setCurrentTask(null));

clearDoneBtn.addEventListener("click", () => {
  hideDone = !hideDone;
  clearDoneBtn.textContent = hideDone ? "Show done" : "Hide done (keep stored)";
  render();
});

wipeAllBtn.addEventListener("click", () => {
  const ok = confirm("Wipe ALL tasks from this device? This cannot be undone.");
  if (!ok) return;

  setCurrentTask(null);
  tasks = [];
  saveTasks();
  render();
});

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

      // Reset file input so you can import the same file again if you want
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

// Initial render
render();
setCurrentTask(null);
