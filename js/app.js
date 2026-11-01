"use strict";

// Практична робота №9, варіант 11
// API: https://jsonplaceholder.typicode.com/todos?userId=3

const API_URL = "https://jsonplaceholder.typicode.com/todos?userId=3";

let tasks = [];
let nextLocalId = 1000;

const refreshBtn = document.querySelector("#refreshBtn");
const loading = document.querySelector("#loading");
const errorMessage = document.querySelector("#errorMessage");
const successMessage = document.querySelector("#successMessage");

const taskForm = document.querySelector("#taskForm");
const taskTitle = document.querySelector("#taskTitle");
const taskColumn = document.querySelector("#taskColumn");

const board = document.querySelector(".board");

const columns = {
  todo: document.querySelector("#todoList"),
  progress: document.querySelector("#progressList"),
  done: document.querySelector("#doneList"),
};

const columnOrder = ["todo", "progress", "done"];

// Стан завантаження
function showLoading(isLoading) {
  loading.hidden = !isLoading;
  refreshBtn.disabled = isLoading;
}

// Повідомлення
function clearMessages() {
  errorMessage.hidden = true;
  successMessage.hidden = true;
  errorMessage.textContent = "";
  successMessage.textContent = "";
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.hidden = false;
}

// Створення кнопки для картки
function createButton(text, action, id) {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = text;
  button.dataset.action = action;
  button.dataset.id = id;

  if (action === "delete") {
    button.classList.add("delete-btn");
  }

  return button;
}

// Створення картки задачі
function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";

  const title = document.createElement("p");
  title.textContent = task.title;

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const index = columnOrder.indexOf(task.column);

  if (index > 0) {
    actions.appendChild(createButton("← Назад", "left", task.id));
  }

  if (index < columnOrder.length - 1) {
    actions.appendChild(createButton("Далі →", "right", task.id));
  }

  actions.appendChild(createButton("Видалити", "delete", task.id));

  card.appendChild(title);
  card.appendChild(actions);

  return card;
}

// Виведення списку задач у DOM
function renderList() {
  Object.values(columns).forEach((column) => {
    column.replaceChildren();
  });

  const counts = {
    todo: 0,
    progress: 0,
    done: 0,
  };

  tasks.forEach((task) => {
    const column = columns[task.column];

    if (column) {
      column.appendChild(createTaskCard(task));
      counts[task.column]++;
    }
  });

  document.querySelector("#todoCount").textContent = counts.todo;

  document.querySelector("#progressCount").textContent = counts.progress;

  document.querySelector("#doneCount").textContent = counts.done;
}

// Отримання задач із JSONPlaceholder API
// https://jsonplaceholder.typicode.com/todos?userId=3
async function loadData() {
  showLoading(true);
  clearMessages();

  try {
    // HTTP-запит
    const response = await fetch(API_URL);

    // Перевірка HTTP-статусу
    if (!response.ok) {
      throw new Error(`Помилка HTTP: ${response.status}`);
    }

    // Отримання JSON
    const data = await response.json();

    console.log("Дані API:", data);

    if (!Array.isArray(data)) {
      throw new Error("Некоректна відповідь API");
    }

    if (
      !data.every(
        (item) =>
          typeof item.title === "string" && typeof item.completed === "boolean",
      )
    ) {
      throw new Error("Некоректні поля API");
    }

    // Перетворення задач для Kanban-дошки
    const apiTasks = data.map((item, index) => ({
      id: index + 1,
      title: item.title,
      column: item.completed ? "done" : "todo",
      source: "api",
    }));

    // Збереження власних задач
    const localTasks = tasks.filter((task) => task.source === "local");

    tasks = [...apiTasks, ...localTasks];

    // Виведення в DOM
    renderList();

    showSuccess(`Завантажено ${apiTasks.length} задач з API.`);
  } catch (error) {
    showError("Дошку тимчасово не вдалося завантажити");

    console.error("Помилка:", error);
  } finally {
    showLoading(false);
  }
}

// Додавання власної задачі
taskForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearMessages();

  const title = taskTitle.value.trim();
  const column = taskColumn.value;

  if (title.length < 3) {
    showError("Назва повинна містити мінімум 3 символи.");
    return;
  }

  if (!columns[column]) {
    showError("Некоректна колонка.");
    return;
  }

  const newTask = {
    id: nextLocalId++,
    title: title,
    column: column,
    source: "local",
  };

  tasks.push(newTask);

  renderList();
  taskForm.reset();

  showSuccess("Задачу додано.");
});

// Переміщення та видалення задач
board.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  const index = columnOrder.indexOf(task.column);

  if (action === "left" && index > 0) {
    task.column = columnOrder[index - 1];
  }

  if (action === "right" && index < 2) {
    task.column = columnOrder[index + 1];
  }

  if (action === "delete") {
    tasks = tasks.filter((item) => item.id !== id);
  }

  renderList();
});

// Кнопка оновлення
refreshBtn.addEventListener("click", loadData);

// Початкове завантаження
loadData();
