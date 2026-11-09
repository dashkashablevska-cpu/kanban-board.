const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Локальні задачі
const tasks = [
  { id: 1, title: "Вивчити Node.js", column: "done" },
  { id: 2, title: "Створити Express сервер", column: "done" },
  { id: 3, title: "Налаштувати API", column: "doing" },
  { id: 4, title: "Підключити fetch", column: "todo" },
  { id: 5, title: "Перевірити HTTP-запити", column: "todo" },
  { id: 6, title: "Перевірити помилку 404", column: "todo" },
  { id: 7, title: "Перевірити SPA", column: "todo" },
  { id: 8, title: "Перевірити IndexedDB", column: "todo" },
  { id: 9, title: "Зробити скриншоти", column: "todo" },
  { id: 10, title: "Оформити звіт", column: "todo" },
];

// Роздача статичних файлів
app.use(express.static(path.join(__dirname, "public")));

// Отримання списку задач
app.get("/api/tasks", (req, res) => {
  res.status(200).json(tasks);
});

// Отримання задачі за ID
app.get("/api/tasks/:id", (req, res) => {
  const task = tasks.find((item) => String(item.id) === req.params.id);

  if (!task) {
    return res.status(404).json({
      error: "Задачу не знайдено",
    });
  }

  res.status(200).json(task);
});

// Обробка невідомих API-маршрутів
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "Ресурс не знайдено",
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});
