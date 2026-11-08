"use strict";

// Практична робота №13, варіант 11
// SPA з hash-based маршрутизацією

const API_URL = "https://jsonplaceholder.typicode.com/todos?userId=3";

const DB_NAME = "KanbanDB";
const DB_VERSION = 1;
const STORE_NAME = "cards";

const LOCAL_KEY = "kanbanCards";
const MIGRATION_KEY = "kanbanMigrated";

const COLUMNS = ["todo", "doing", "done"];

let db = null;

// Робота з localStorage
function loadFromLocalStorage() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Помилка localStorage:", error);
    return [];
  }
}

function saveToLocalStorage(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

// Відкриття IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("База заблокована"));
  });
}

// CRUD-операції IndexedDB
function putItem(item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function getAllItems() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();

    let items = [];

    request.onsuccess = () => {
      items = request.result;
    };

    tx.oncomplete = () => resolve(items);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function deleteItem(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Одноразова міграція localStorage до IndexedDB
async function migrateData() {
  if (localStorage.getItem(MIGRATION_KEY) === "true") {
    return;
  }

  const existing = await getAllItems();
  const localItems = loadFromLocalStorage();

  if (existing.length === 0) {
    for (const item of localItems) {
      await putItem(item);
    }
  }

  localStorage.setItem(MIGRATION_KEY, "true");
}

// Крок 3. Таблиця маршрутів SPA
const routes = [
  { path: "/", view: "home" },
  { path: "/column/:column", view: "column" },
  { path: "/card/:id", view: "card" },
];

// Крок 4. Пошук маршруту та отримання параметрів
function matchRoute(path) {
  const pathParts = path.split("/").filter(Boolean);

  for (const route of routes) {
    const routeParts = route.path.split("/").filter(Boolean);

    if (routeParts.length !== pathParts.length) {
      continue;
    }

    const params = {};

    const matches = routeParts.every((part, index) => {
      if (part.startsWith(":")) {
        params[part.slice(1)] = pathParts[index];
        return true;
      }

      return part === pathParts[index];
    });

    if (matches) {
      return {
        view: route.view,
        params,
      };
    }
  }

  return null;
}

// Крок 6. Клієнтська навігація
function navigate(path) {
  const hash = "#" + path;

  if (location.hash === hash) {
    window.dispatchEvent(new Event("hashchange"));
  } else {
    location.hash = hash;
  }
}

// Повторно використовуваний компонент картки
const TaskCard = {
  props: {
    task: {
      type: Object,
      required: true,
    },
    disabled: Boolean,
  },

  emits: ["move-next", "edit-task", "delete-task"],

  template: `
    <article
      class="task-card"
      :class="{ 'done-card': task.column === 'done' }"
    >
      <p>
        <a
          class="card-title-link"
          :href="'#/card/' + encodeURIComponent(task.id)"
          data-link
        >
          {{ task.title }}
        </a>
      </p>

      <div class="task-actions">
        <a
          class="detail-btn"
          :href="'#/card/' + encodeURIComponent(task.id)"
          data-link
        >
          Деталі
        </a>

        <button
          v-if="task.column !== 'done'"
          type="button"
          :disabled="disabled"
          @click="$emit('move-next', task.id)"
        >
          →
        </button>

        <button
          class="edit-btn"
          type="button"
          :disabled="disabled"
          @click="$emit('edit-task', task.id)"
        >
          Редагувати
        </button>

        <button
          class="delete-btn"
          type="button"
          :disabled="disabled"
          @click="$emit('delete-task', task.id)"
        >
          Видалити
        </button>
      </div>
    </article>
  `,
};

// Головний Vue-застосунок
Vue.createApp({
  components: {
    TaskCard,
  },

  data() {
    return {
      tasks: [],
      columns: [
        { id: "todo", title: "To Do" },
        { id: "doing", title: "In Progress" },
        { id: "done", title: "Done" },
      ],

      newTitle: "",
      newColumn: "todo",

      loading: false,
      errorMessage: "",
      successMessage: "",

      currentPath: "/",
      currentView: "home",
      routeParams: {},

      highlightedColumn: "",
      highlightTimeout: null,
    };
  },

  computed: {
    doneTasks() {
      return this.tasks.filter((task) => task.column === "done");
    },

    progressPercent() {
      if (this.tasks.length === 0) return 0;

      return Math.round((this.doneTasks.length / this.tasks.length) * 100);
    },

    // Пошук конкретної задачі за параметром :id
    selectedTask() {
      if (this.currentView !== "card") return null;

      return (
        this.tasks.find((task) => String(task.id) === this.routeParams.id) ||
        null
      );
    },
  },

  methods: {
    tasksByColumn(column) {
      return this.tasks.filter((task) => task.column === column);
    },

    columnTitle(column) {
      const item = this.columns.find((entry) => entry.id === column);

      return item ? item.title : column;
    },

    // Крок 5. View-функції для різних сторінок
    renderHome() {
      this.currentView = "home";
      this.routeParams = {};
    },

    renderColumn(params) {
      if (!COLUMNS.includes(params.column)) {
        this.renderNotFound();
        return;
      }

      this.currentView = "column";
      this.routeParams = params;
    },

    renderCard(params) {
      this.currentView = "card";
      this.routeParams = params;
    },

    renderNotFound() {
      this.currentView = "notFound";
      this.routeParams = {};
    },

    // Кроки 5, 7, 9. Відображення поточного маршруту
    renderRoute() {
      let path;

      try {
        path = decodeURI(location.hash.slice(1) || "/");
      } catch (error) {
        this.renderNotFound();
        return;
      }

      this.currentPath = path;

      const match = matchRoute(path);

      if (!match) {
        this.renderNotFound();
        return;
      }

      const views = {
        home: () => this.renderHome(),
        column: () => this.renderColumn(match.params),
        card: () => this.renderCard(match.params),
      };

      views[match.view]();
    },

    // Перехоплення внутрішніх посилань
    handleNavigation(event) {
      const link = event.target.closest("a[data-link]");

      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();

      const href = link.getAttribute("href");
      if (href && href.startsWith("#/")) {
        navigate(href.slice(1));
      }
    },

    // Зчитування актуальних задач
    async refreshTasks() {
      this.tasks = db ? await getAllItems() : loadFromLocalStorage();
    },

    // Збереження задачі в IndexedDB або localStorage
    async saveTask(task) {
      if (db) {
        await putItem(task);
      } else {
        const items = this.tasks.filter((item) => item.id !== task.id);

        items.push(task);
        saveToLocalStorage(items);
      }
    },

    // Підсвічування колонки з практичної №12
    highlightColumn(column) {
      clearTimeout(this.highlightTimeout);

      this.highlightedColumn = "";

      this.$nextTick(() => {
        this.highlightedColumn = column;

        this.highlightTimeout = setTimeout(() => {
          this.highlightedColumn = "";
        }, 800);
      });
    },

    handleVisibilityChange() {
      document.body.classList.toggle("page-inactive", document.hidden);
    },

    // Завантаження задач із JSONPlaceholder
    async loadData() {
      if (this.loading) return;

      this.loading = true;
      this.errorMessage = "";
      this.successMessage = "";

      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Некоректні дані API");
        }

        let added = 0;

        for (const item of data) {
          if (
            typeof item.id !== "number" ||
            typeof item.title !== "string" ||
            typeof item.completed !== "boolean"
          ) {
            throw new Error("Некоректні поля задачі");
          }

          if (!this.tasks.some((task) => task.id === item.id)) {
            const task = {
              id: item.id,
              title: item.title,
              column: item.completed ? "done" : "todo",
            };

            await this.saveTask(task);
            await this.refreshTasks();
            added++;
          }
        }

        this.successMessage = `Завантажено ${added} нових задач з API.`;
      } catch (error) {
        console.error(error);
        this.errorMessage = "Дошку тимчасово не вдалося завантажити.";
      } finally {
        this.loading = false;
      }
    },

    // Додавання задачі
    async addTask() {
      if (this.loading) return;

      const title = this.newTitle.trim();

      if (title.length < 3) {
        this.errorMessage = "Назва повинна містити мінімум 3 символи.";
        return;
      }

      this.loading = true;

      try {
        const task = {
          id: crypto.randomUUID(),
          title,
          column: this.newColumn,
        };

        await this.saveTask(task);
        await this.refreshTasks();

        this.highlightColumn(task.column);

        this.newTitle = "";
        this.newColumn = "todo";

        this.errorMessage = "";
        this.successMessage = "Задачу додано.";
      } catch (error) {
        console.error(error);
        this.errorMessage = "Помилка додавання.";
      } finally {
        this.loading = false;
      }
    },

    // Переміщення задачі
    async moveNext(id) {
      if (this.loading) return;

      const task = this.tasks.find((item) => item.id === id);

      if (!task) return;

      const index = COLUMNS.indexOf(task.column);

      if (index < 0 || index >= COLUMNS.length - 1) {
        return;
      }

      this.loading = true;

      try {
        const nextColumn = COLUMNS[index + 1];

        await this.saveTask({
          ...task,
          column: nextColumn,
        });

        await this.refreshTasks();
        this.highlightColumn(nextColumn);

        this.errorMessage = "";
        this.successMessage = "Задачу переміщено.";
      } catch (error) {
        console.error(error);
        this.errorMessage = "Помилка переміщення.";
      } finally {
        this.loading = false;
      }
    },

    // Редагування задачі
    async editTask(id) {
      if (this.loading) return;

      const task = this.tasks.find((item) => item.id === id);

      if (!task) return;

      const value = prompt("Нова назва задачі:", task.title);

      if (value === null) return;

      const title = value.trim();

      if (title.length < 3) {
        this.errorMessage = "Назва повинна містити мінімум 3 символи.";
        return;
      }

      this.loading = true;

      try {
        await this.saveTask({ ...task, title });
        await this.refreshTasks();

        this.errorMessage = "";
        this.successMessage = "Задачу оновлено.";
      } catch (error) {
        console.error(error);
        this.errorMessage = "Помилка редагування.";
      } finally {
        this.loading = false;
      }
    },

    // Видалення задачі
    async deleteTask(id) {
      if (this.loading) return;

      this.loading = true;

      try {
        if (db) {
          await deleteItem(id);
        } else {
          saveToLocalStorage(this.tasks.filter((task) => task.id !== id));
        }

        await this.refreshTasks();

        this.errorMessage = "";
        this.successMessage = "Задачу видалено.";
      } catch (error) {
        console.error(error);
        this.errorMessage = "Помилка видалення.";
      } finally {
        this.loading = false;
      }
    },

    // Ініціалізація сховища даних
    async initialize() {
      this.loading = true;
      let failed = false;

      try {
        this.tasks = loadFromLocalStorage();

        db = await openDB();

        await migrateData();
        await this.refreshTasks();
      } catch (error) {
        failed = true;
        console.error("Помилка IndexedDB:", error);

        if (db) {
          db.close();
          db = null;
        }

        this.tasks = loadFromLocalStorage();
        this.errorMessage =
          "IndexedDB недоступна. Використовується localStorage.";
      } finally {
        this.loading = false;
      }

      if (!failed && this.tasks.length === 0) {
        await this.loadData();
      }
    },
  },

  // Запуск SPA та підключення обробників
  mounted() {
    this.renderRoute();

    window.addEventListener("hashchange", this.renderRoute);

    document.addEventListener("click", this.handleNavigation);

    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.handleVisibilityChange();
    this.initialize();
  },

  // Очищення обробників і таймерів
  beforeUnmount() {
    clearTimeout(this.highlightTimeout);

    window.removeEventListener("hashchange", this.renderRoute);

    document.removeEventListener("click", this.handleNavigation);

    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );

    document.body.classList.remove("page-inactive");

    if (db) {
      db.close();
      db = null;
    }
  },
}).mount("#app");
