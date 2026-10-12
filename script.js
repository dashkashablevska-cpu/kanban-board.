// Перевіряє підключення JavaScript
console.log("script.js підключено");

// Масив задач Kanban-дошки
const tasks = [
  { title: "Підготувати звіт", status: "To Do" },
  { title: "Написати листа клієнту", status: "To Do" },
  { title: "Розробка макета сторінки", status: "In Progress" },
  { title: "Налаштування репозиторію", status: "Done" },
];

// Підраховує кількість задач у кожному статусі
function countTasksByStatus(tasks) {
  let todo = 0;
  let inProgress = 0;
  let done = 0;

  for (const task of tasks) {
    if (task.status === "To Do") {
      todo++;
    } else if (task.status === "In Progress") {
      inProgress++;
    } else if (task.status === "Done") {
      done++;
    }
  }

  console.log("To Do:", todo);
  console.log("In Progress:", inProgress);
  console.log("Done:", done);
}

countTasksByStatus(tasks);

// Виводить назви виконаних задач
function showDoneTasks(tasks) {
  for (const task of tasks) {
    if (task.status === "Done") {
      console.log("Виконано:", task.title);
    }
  }
}

showDoneTasks(tasks);

// Перевіряє, чи задача виконана
const isDone = (task) => task.status === "Done";

console.log("Чи виконана задача «Налаштування репозиторію»:", isDone(tasks[3]));
