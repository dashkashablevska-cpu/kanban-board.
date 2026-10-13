console.log("script.js підключено");

// Масив задач Kanban-дошки
const tasks = [
  {
    title: "Підготувати звіт",
    column: "To Do",
    description: "Зібрати дані та оформити звіт за минулий тиждень.",
  },
  {
    title: "Написати листа клієнту",
    column: "To Do",
    description: "Узгодити терміни виконання проєкту.",
  },
  {
    title: "Розробка макета сторінки",
    column: "In Progress",
    description: "Верстка головної сторінки застосунку.",
  },
  {
    title: "Налаштування репозиторію",
    column: "Done",
    description: "Створено проєкт і підключено Git.",
  },
];

// Вибираємо контейнери для трьох колонок
const listContainer = {
  "To Do": document.querySelector("#todo-list"),
  "In Progress": document.querySelector("#inprogress-list"),
  Done: document.querySelector("#done-list"),
};

// Вибираємо елемент для лічильника виконаних задач
const doneCount = document.querySelector("#done-count");

// Перевіряє, чи виконана задача
function isDone(task) {
  return task.column === "Done";
}

// Видаляємо статичні приклади карток із HTML
document
  .querySelectorAll(
    "#todo-list > article, #inprogress-list > article, #done-list > article",
  )
  .forEach((article) => article.remove());

// Створює картки задач і додає їх до відповідних колонок
function renderTasks(tasks) {
  tasks.forEach((task) => {
    const article = document.createElement("article");
    const title = document.createElement("h3");
    const description = document.createElement("p");

    article.classList.add("card");

    title.textContent = task.title;
    description.textContent = task.description;

    article.setAttribute("data-status", task.column);

    if (isDone(task)) {
      article.classList.add("done");
    }

    article.append(title, description);

    const container = listContainer[task.column];

    if (container) {
      container.append(article);
    }
  });
}

// Оновлює кількість виконаних задач у колонці Done
function updateDoneCount(tasks) {
  const count = tasks.filter((task) => isDone(task)).length;

  if (doneCount) {
    doneCount.textContent = `Виконано: ${count}`;
  }
}

// Виводить кількість задач у кожній колонці
function countTasksByStatus(tasks) {
  console.log("To Do:", tasks.filter((task) => task.column === "To Do").length);

  console.log(
    "In Progress:",
    tasks.filter((task) => task.column === "In Progress").length,
  );

  console.log("Done:", tasks.filter((task) => task.column === "Done").length);
}

// Виводить назви виконаних задач
function showDoneTasks(tasks) {
  for (const task of tasks) {
    if (isDone(task)) {
      console.log("Виконано:", task.title);
    }
  }
}

// Відображаємо картки та оновлюємо підсумок
renderTasks(tasks);
updateDoneCount(tasks);
countTasksByStatus(tasks);
showDoneTasks(tasks);

// Перевіряємо роботу функції isDone()
console.log("Чи виконана задача «Налаштування репозиторію»:", isDone(tasks[3]));
