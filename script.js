const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const filterButtons = document.querySelectorAll(".filters button");
const dueDateInput = document.getElementById("dueDate");
const priorityInput = document.getElementById("priority");

let currentFilter = "all";
let undoCache = null;
let undoTimeout = null;

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
  filterTasks();
});

// =======================
// EVENTS
// =======================
addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    filterTasks();
  });
});

// =======================
// ADD TASK
// =======================
function addTask() {
  const text = taskInput.value.trim();
  const dueDate = dueDateInput?.value || "";
  const priority = priorityInput?.value || "low";

  if (!text) return;

  const task = {
    id: Date.now(),
    text,
    completed: false,
    dueDate,
    priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveTask(task);
  createTaskElement(task);

  taskInput.value = "";
  if (dueDateInput) dueDateInput.value = "";

  sortTasks();
  filterTasks();
}

// =======================
// CREATE TASK UI
// =======================
function createTaskElement(task) {
  const li = document.createElement("li");
  li.dataset.id = task.id;

  if (task.completed) li.classList.add("completed");

  // SWIPE BACKGROUND
  const deleteBg = document.createElement("div");
  deleteBg.classList.add("swipe-delete-bg");
  deleteBg.innerHTML = "🗑️";

  // CONTENT WRAPPER
  const content = document.createElement("div");
  content.classList.add("task-content");

  const top = document.createElement("div");
  top.classList.add("task-main");

  const span = document.createElement("span");
  span.textContent = task.text;

  const priorityTag = document.createElement("strong");
  priorityTag.textContent = task.priority.toUpperCase();
  priorityTag.classList.add(`priority-${task.priority}`);

  const completeBtn = document.createElement("button");
  completeBtn.innerHTML = task.completed ? "☑️" : "✔️";

  completeBtn.addEventListener("click", () => {
    task.completed = !task.completed;
    updateTask(task);
  });

  top.appendChild(span);
  top.appendChild(priorityTag);

  const meta = document.createElement("div");
  meta.classList.add("task-meta");

  const date = document.createElement("small");
  date.classList.add("due-date");

  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const today = new Date();

    due.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const diff = (due - today) / (1000 * 60 * 60 * 24);

    date.textContent = `Due: ${due.toLocaleDateString()}`;

    if (diff < 0 && !task.completed) li.classList.add("overdue");
    else if (diff === 0) li.classList.add("due-today");
    else if (diff <= 2) li.classList.add("due-soon");
  }

  const time = document.createElement("small");
  time.classList.add("timestamp");
  time.textContent = `Created: ${formatTime(task.createdAt)}`;

  meta.appendChild(date);
  meta.appendChild(time);

  content.appendChild(top);
  content.appendChild(meta);

  // EDIT
  const editBtn = document.createElement("button");
  editBtn.innerHTML = "✏️";

  editBtn.addEventListener("click", () => {
    const newText = prompt("Edit task:", task.text);

    if (newText?.trim()) {
      task.text = newText.trim();
      task.updatedAt = new Date().toISOString();
      updateTask(task);
    }
  });

  // DELETE (manual button fallback)
  const deleteBtn = document.createElement("button");
  deleteBtn.innerHTML = "🗑️";

  deleteBtn.addEventListener("click", () => {
    triggerUndoDelete(task);
    li.remove();
  });

  // SWIPE DELETE
  let startX = 0;
  let currentX = 0;
  let isSwiping = false;

  content.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    isSwiping = true;
  });

  content.addEventListener("touchmove", (e) => {
    if (!isSwiping) return;

    currentX = e.touches[0].clientX;
    const diff = currentX - startX;

    if (diff < 0) {
      content.style.transform = `translateX(${diff}px)`;
    }
  });

  content.addEventListener("touchend", () => {
    isSwiping = false;

    const diff = currentX - startX;

    if (diff < -80) {
      triggerUndoDelete(task);

      li.style.transition = "0.2s";
      li.style.transform = "translateX(-100%)";
      li.style.opacity = "0";

      setTimeout(() => li.remove(), 200);
    } else {
      content.style.transform = "translateX(0)";
    }
  });

  li.appendChild(deleteBg);
  li.appendChild(content);
  li.appendChild(completeBtn);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);

  taskList.appendChild(li);
}

// =======================
// UNDO SYSTEM
// =======================
function triggerUndoDelete(task) {
  undoCache = task;

  removeTask(task.id);

  showUndoToast();

  clearTimeout(undoTimeout);

  undoTimeout = setTimeout(() => {
    undoCache = null;
    hideUndoToast();
  }, 5000);
}

function undoDelete() {
  if (!undoCache) return;

  saveTask(undoCache);
  createTaskElement(undoCache);

  undoCache = null;
  hideUndoToast();
}

// =======================
// TOAST UI
// =======================
function showUndoToast() {
  let toast = document.getElementById("undoToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "undoToast";
    toast.innerHTML = `
      Task deleted
      <button id="undoBtn">Undo</button>
    `;
    document.body.appendChild(toast);

    document.getElementById("undoBtn").addEventListener("click", undoDelete);
  }

  toast.classList.add("show");
}

function hideUndoToast() {
  const toast = document.getElementById("undoToast");
  if (toast) toast.classList.remove("show");
}

// =======================
// STORAGE
// =======================
function saveTask(task) {
  const tasks = getTasks();
  tasks.push(task);
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function getTasks() {
  return JSON.parse(localStorage.getItem("tasks")) || [];
}

function loadTasks() {
  getTasks().forEach(createTaskElement);
}

function removeTask(id) {
  const tasks = getTasks().filter(t => t.id !== id);
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// =======================
// UPDATE
// =======================
function updateTask(updatedTask) {
  const tasks = getTasks().map(t =>
    t.id === updatedTask.id ? updatedTask : t
  );

  localStorage.setItem("tasks", JSON.stringify(tasks));

  taskList.innerHTML = "";
  loadTasks();
  sortTasks();
  filterTasks();
}

// =======================
// FILTER
// =======================
function filterTasks() {
  document.querySelectorAll("#taskList li").forEach(li => {
    const isCompleted = li.classList.contains("completed");

    if (currentFilter === "all") li.style.display = "flex";
    else if (currentFilter === "active") li.style.display = isCompleted ? "none" : "flex";
    else li.style.display = isCompleted ? "flex" : "none";
  });
}

// =======================
// SORT
// =======================
function sortTasks() {
  const tasks = Array.from(taskList.children);

  tasks.sort((a, b) => {
    const getScore = (el) => {
      const text = el.querySelector(".due-date")?.textContent;

      if (!text) return 9999;

      const date = new Date(text.replace("Due: ", ""));
      const today = new Date();

      date.setHours(0,0,0,0);
      today.setHours(0,0,0,0);

      const diff = (date - today) / (1000 * 60 * 60 * 24);

      if (diff < 0) return -3;
      if (diff === 0) return -2;
      if (diff <= 2) return -1;
      return diff;
    };

    return getScore(a) - getScore(b);
  });

  tasks.forEach(t => taskList.appendChild(t));
}

// =======================
// TIME
// =======================
function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString();
}
