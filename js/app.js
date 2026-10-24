const tasks = [
  {
    id: 1,
    title: "Підготувати звіт",
    description: "Зібрати дані та оформити звіт за минулий тиждень.",
    column: "todo",
  },
  {
    id: 2,
    title: "Написати листа клієнту",
    description: "Узгодити терміни виконання проєкту.",
    column: "todo",
  },
  {
    id: 3,
    title: "Розробка макета сторінки",
    description: "Верстка головної сторінки застосунку.",
    column: "inprogress",
  },
  {
    id: 4,
    title: "Налаштування репозиторію",
    description: "Створено проєкт і підключено Git.",
    column: "done",
  },
];

const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const columnSelect = document.querySelector("#task-column");
const titleError = document.querySelector("#title-error");

const todoList = document.querySelector("#todo-list");
const inprogressList = document.querySelector("#inprogress-list");
const doneList = document.querySelector("#done-list");
const doneCount = document.querySelector("#done-count");

let nextId = Math.max(...tasks.map((task) => task.id)) + 1;

// Створення HTML-картки задачі
function createTaskCard(task) {
  const card = document.createElement("article");
  card.classList.add("card");
  card.dataset.id = task.id;
  card.tabIndex = 0;
  card.setAttribute("role", "button");

  const title = document.createElement("h3");
  title.textContent = task.title;

  card.append(title);

  if (task.description) {
    const description = document.createElement("p");
    description.textContent = task.description;
    card.append(description);
  }

  if (task.column === "done") {
    card.setAttribute("aria-label", `${task.title}, виконано`);
  } else {
    card.setAttribute(
      "aria-label",
      `${task.title}, перемістити до наступної колонки`,
    );
  }

  return card;
}

// Відображення задач у відповідних колонках
function renderTasks() {
  todoList.innerHTML = "";
  inprogressList.innerHTML = "";
  doneList.innerHTML = "";

  tasks.forEach((task) => {
    const card = createTaskCard(task);

    if (task.column === "todo") {
      todoList.append(card);
    } else if (task.column === "inprogress") {
      inprogressList.append(card);
    } else if (task.column === "done") {
      doneList.append(card);
    }
  });

  const completedTasks = tasks.filter((task) => task.column === "done");

  doneCount.textContent = `Виконано: ${completedTasks.length}`;
}

// Обробник події input: перевірка назви задачі
titleInput.addEventListener("input", () => {
  const title = titleInput.value.trim();

  if (title.length > 0 && title.length < 3) {
    const message = "Назва задачі повинна містити мінімум 3 символи";

    titleInput.setCustomValidity(message);
    titleError.textContent = message;
  } else {
    titleInput.setCustomValidity("");
    titleError.textContent = "";
  }
});

// Обробник події submit: додавання нової задачі
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const column = columnSelect.value;

  if (title.length < 3) {
    const message = "Назва задачі повинна містити мінімум 3 символи";

    titleInput.setCustomValidity(message);
    titleError.textContent = message;
    titleInput.reportValidity();
    return;
  }

  const newTask = {
    id: nextId++,
    title: title,
    description: "",
    column: column,
  };

  tasks.push(newTask);

  renderTasks();

  form.reset();
  titleInput.setCustomValidity("");
  titleError.textContent = "";
});

// Переміщення задачі до наступної колонки
function moveTask(id) {
  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return;
  }

  if (task.column === "todo") {
    task.column = "inprogress";
  } else if (task.column === "inprogress") {
    task.column = "done";
  } else {
    return;
  }

  renderTasks();
}

// Обробник події click: делегування на контейнери
function handleTaskClick(event) {
  const card = event.target.closest(".card");

  if (!card || !event.currentTarget.contains(card)) {
    return;
  }

  const id = Number(card.dataset.id);
  moveTask(id);
}

// Обробник клавіатури для доступності
function handleTaskKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest(".card");

  if (!card || !event.currentTarget.contains(card)) {
    return;
  }

  event.preventDefault();

  const id = Number(card.dataset.id);
  moveTask(id);
}

// Підключення обробників до трьох контейнерів
[todoList, inprogressList, doneList].forEach((list) => {
  list.addEventListener("click", handleTaskClick);
  list.addEventListener("keydown", handleTaskKeydown);
});

// Початковий рендер задач
renderTasks();
