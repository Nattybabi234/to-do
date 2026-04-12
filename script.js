const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const filterButtons = document.querySelectorAll(".filters button");
const dueDateInput = document.getElementById("dueDate");
const priorityInput = document.getElementById("priority");

let currentFilter = "all";

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

  const now = new Date().toISOString();

  const task = {
    id: Date.now(),
    text,
    completed: false,
    dueDate,
    priority,
    createdAt: now,
    updatedAt: now
  };

  saveTask(task);
  createTaskElement(task);

  taskInput.value = "";
  if (dueDateInput) dueDateInput.value = "";

  sortTasks();
  filterTasks();
}

// =======================
// UI
// =======================
function createTaskElement(task) {
  const li = document.createElement("li");
  li.dataset.id = task.id;

  if (task.completed) li.classList.add("completed");

  const container = document.createElement("div");

  const top = document.createElement("div");
  top.classList.add("task-main");

  const span = document.createElement("span");
  span.textContent = task.text;

  const priorityTag = document.createElement("strong");
  priorityTag.textContent = task.priority.toUpperCase();
  priorityTag.classList.add(`priority-${task.priority}`);

  top.appendChild(span);
  top.appendChild(priorityTag);

  const meta = document.createElement("div");
  meta.classList.add("task-meta");

  // DUE DATE
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

  // TIMESTAMP
  const time = document.createElement("small");
  time.classList.add("timestamp");
  time.textContent = `Created: ${formatTime(task.createdAt)}`;

  meta.appendChild(date);
  meta.appendChild(time);

  // COMPLETE
  span.addEventListener("click", () => {
    task.completed = !task.completed;
    updateTask(task);
  });

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

  // DELETE
  const deleteBtn = document.createElement("button");
  deleteBtn.innerHTML = "🗑️";

  deleteBtn.addEventListener("click", () => {
    li.remove();
    deleteTask(task.id);
  });

  container.appendChild(top);
  container.appendChild(meta);

  li.appendChild(container);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);

  taskList.appendChild(li);
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

// UPDATE
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

// DELETE
function deleteTask(id) {
  const tasks = getTasks().filter(t => t.id !== id);
  localStorage.setItem("tasks", JSON.stringify(tasks));
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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}