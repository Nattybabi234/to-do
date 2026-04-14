const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const filterButtons = document.querySelectorAll(".filters button");
const priorityInput = document.getElementById("priority");

let currentFilter = "all";

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
  filterTasks();
  requestNotificationPermission();
  startDueDateChecker();
});

// =======================
// NOTIFICATIONS
// =======================
function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function startDueDateChecker() {
  checkDueTasks();
  setInterval(checkDueTasks, 60000);
}

function sendNotification(title, message) {
  if (Notification.permission !== "granted") return;

  new Notification(title, {
    body: message,
    icon: "icon.png"
  });
}

function checkDueTasks() {
  const tasks = getTasks();
  const now = new Date();

  tasks.forEach(task => {
    if (!task.dueDate || task.completed) return;

    const due = new Date(`${task.dueDate}T${task.dueTime || "00:00"}`);

    const diff = due - now;
    const day = 1000 * 60 * 60 * 24;

    if (diff < 0) {
      sendNotification("Overdue Task", `"${task.text}" is overdue`);
    } else if (diff < day) {
      sendNotification("Due Soon", `"${task.text}" is due soon`);
    }
  });
}

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
  const taskDate = document.getElementById("taskDate");
  const taskTime = document.getElementById("taskTime");

  const text = taskInput.value.trim();

  if (!text) return;

  const task = {
    id: Date.now(),
    text,
    dueDate: taskDate.value,
    dueTime: taskTime.value,
    priority: priorityInput.value,
    completed: false,
    createdAt: new Date().toISOString()
  };

  saveTask(task);

  taskInput.value = "";
  taskDate.value = "";
  taskTime.value = "";

  taskList.innerHTML = "";
  loadTasks();
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

  const content = document.createElement("div");
  content.classList.add("task-content");

  const top = document.createElement("div");
  top.classList.add("task-main");

  const span = document.createElement("span");
  span.textContent = task.text;

  const priority = document.createElement("strong");
  priority.textContent = task.priority.toUpperCase();
  priority.classList.add(`priority-${task.priority}`);

  top.appendChild(span);
  top.appendChild(priority);

  // =======================
  // META (DATE + COUNTDOWN)
  // =======================
  const meta = document.createElement("div");
  meta.classList.add("task-meta");

  const due = document.createElement("small");
  const countdown = document.createElement("small");

  if (task.dueDate || task.dueTime) {
    let text = "⏰ ";

    if (task.dueDate) text += task.dueDate;
    if (task.dueTime) text += ` at ${task.dueTime}`;

    due.textContent = text;

    const updateCountdown = () => {
      const t = getTimeLeft(task);
      countdown.textContent = t ? `⏳ ${t}` : "";
    };

    updateCountdown();
    setInterval(updateCountdown, 60000);
  }

  meta.appendChild(due);
  meta.appendChild(countdown);

  content.appendChild(top);
  content.appendChild(meta);

  // =======================
  // BUTTONS (UNCHANGED)
  // =======================
  const completeBtn = document.createElement("button");
  completeBtn.textContent = task.completed ? "☑️" : "✔️";

  completeBtn.addEventListener("click", () => {
    task.completed = !task.completed;
    updateTask(task);
  });

  const editBtn = document.createElement("button");
  editBtn.textContent = "✏️";

  editBtn.addEventListener("click", () => {
    const newText = prompt("Edit task:", task.text);
    if (newText?.trim()) {
      task.text = newText.trim();
      updateTask(task);
    }
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️";

  deleteBtn.addEventListener("click", () => {
    deleteTaskWithUndo(task);
    li.remove();
  });

  li.appendChild(content);
  li.appendChild(completeBtn);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);

  taskList.appendChild(li);

  // =======================
  // SWIPE (UNCHANGED)
  // =======================
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
      deleteTaskWithUndo(task);

      li.style.transition = "0.2s";
      li.style.transform = "translateX(-100%)";
      li.style.opacity = "0";

      setTimeout(() => li.remove(), 200);
    } else {
      content.style.transform = "translateX(0)";
    }
  });
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
function updateTask(updated) {
  const tasks = getTasks().map(t =>
    t.id === updated.id ? updated : t
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
    const getDate = (el) => {
      const text = el.querySelector("small")?.textContent;
      const match = text?.match(/\d{4}-\d{2}-\d{2}/);
      if (!match) return 999999;
      return new Date(match[0]).getTime();
    };

    return getDate(a) - getDate(b);
  });

  tasks.forEach(t => taskList.appendChild(t));
}

// =======================
// TIME HELPERS
// =======================
function getTimeLeft(task) {
  if (!task.dueDate) return null;

  const due = new Date(`${task.dueDate}T${task.dueTime || "00:00"}`);
  const now = new Date();

  const diff = due - now;

  if (diff <= 0) return "Overdue";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `Due in ${hours}h ${mins}m`;
  return `Due in ${mins}m`;
}

// =======================
// UNDO (MINIMAL KEEP)
// =======================
function deleteTaskWithUndo(task) {
  removeTask(task.id);
}

// =======================
// SERVICE WORKER
// =======================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}
