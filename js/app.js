"use strict";

// Практична робота №10, варіант 11
// Обрано Vue 3, оскільки він забезпечує реактивне
// оновлення Kanban-дошки без ручної роботи з DOM.
// API: https://jsonplaceholder.typicode.com/todos?userId=3

const API_URL = "https://jsonplaceholder.typicode.com/todos?userId=3";

// Компонент TaskCard
// Отримує id, title, column через props.
// Клік по картці викликає подію move-next.

const TaskCard = {
  props: {
    id: Number,
    title: String,
    column: String,
  },

  emits: ["move-next", "delete-task"],

  methods: {
    handleMove() {
      if (this.column !== "done") {
        this.$emit("move-next", this.id);
      }
    },

    handleDelete() {
      this.$emit("delete-task", this.id);
    },
  },

  template: `
        <div
            class="task-card"
            :class="{ 'done-card': column === 'done' }"
            @click="handleMove"
        >
            <p>{{ title }}</p>

            <div class="task-actions">
                <span v-if="column !== 'done'">
                    Натисніть на картку →
                </span>

                <span v-else>
                    Виконано ✓
                </span>

                <button
                    type="button"
                    class="delete-btn"
                    @click.stop="handleDelete"
                >
                    Видалити
                </button>
            </div>
        </div>
    `,
};

// Головний Vue-застосунок
Vue.createApp({
  components: {
    TaskCard,
  },

  // Реактивний стан
  data() {
    return {
      tasks: [],
      nextLocalId: 1000,

      newTitle: "",
      newColumn: "todo",

      loading: false,
      errorMessage: "",
      successMessage: "",
    };
  },

  // Автоматично обчислювані списки
  computed: {
    todoTasks() {
      return this.tasks.filter((task) => task.column === "todo");
    },

    progressTasks() {
      return this.tasks.filter((task) => task.column === "progress");
    },

    doneTasks() {
      return this.tasks.filter((task) => task.column === "done");
    },
  },

  methods: {
    // Завантаження задач із JSONPlaceholder
    async loadData() {
      if (this.loading) return;

      this.loading = true;
      this.errorMessage = "";
      this.successMessage = "";

      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`HTTP-помилка: ${response.status}`);
        }

        const data = await response.json();

        console.log("Дані API:", data);

        if (!Array.isArray(data)) {
          throw new Error("Некоректний формат JSON");
        }

        const valid = data.every(
          (item) =>
            typeof item.id === "number" &&
            typeof item.title === "string" &&
            typeof item.completed === "boolean",
        );

        if (!valid) {
          throw new Error("Некоректні поля API");
        }

        // Перетворення JSON на задачі Kanban
        const apiTasks = data.map((item) => ({
          id: item.id,
          title: item.title,
          column: item.completed ? "done" : "todo",
          source: "api",
        }));

        const localTasks = this.tasks.filter((task) => task.source === "local");

        // Оновлення реактивного масиву
        this.tasks = [...apiTasks, ...localTasks];

        this.successMessage = `Завантажено ${apiTasks.length} задач з API.`;
      } catch (error) {
        this.errorMessage = "Дошку тимчасово не вдалося завантажити";

        console.error("Помилка:", error);
      } finally {
        this.loading = false;
      }
    },

    // Додавання власної задачі
    addTask() {
      this.errorMessage = "";
      this.successMessage = "";

      const title = this.newTitle.trim();

      if (title.length < 3) {
        this.errorMessage = "Назва повинна містити мінімум 3 символи.";
        return;
      }

      this.tasks.push({
        id: this.nextLocalId++,
        title: title,
        column: this.newColumn,
        source: "local",
      });

      this.newTitle = "";
      this.newColumn = "todo";

      this.successMessage = "Задачу додано.";
    },

    // Подія варіанта 11: moveNext(id)
    // To Do → In Progress → Done
    moveNext(id) {
      const task = this.tasks.find((item) => item.id === id);

      if (!task) return;

      if (task.column === "todo") {
        task.column = "progress";
      } else if (task.column === "progress") {
        task.column = "done";
      }

      // Vue автоматично оновлює інтерфейс.
      // Виклик renderList() більше не потрібний.
    },

    // Видалення задачі
    deleteTask(id) {
      this.tasks = this.tasks.filter((task) => task.id !== id);
    },
  },

  // Початкове завантаження
  mounted() {
    this.loadData();
  },
}).mount("#app");

// Ручну функцію renderList() з практикуму №7
// замінено компонентом TaskCard та директивою v-for.
// querySelector, createElement і innerHTML не використовуються.
