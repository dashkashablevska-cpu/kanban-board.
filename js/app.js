"use strict";

// Практична робота №11, варіант 11
// Kanban-дошка: Vue 3, localStorage, IndexedDB

const API_URL = "https://jsonplaceholder.typicode.com/todos?userId=3";

const DB_NAME = "KanbanDB";
const DB_VERSION = 1;
const STORE_NAME = "cards";

const LOCAL_KEY = "kanbanCards";
const MIGRATION_KEY = "kanbanMigrated";

const COLUMNS = ["todo", "doing", "done"];

let db = null;

// Збереження задач у localStorage
function saveToLocalStorage(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

// Завантаження задач із localStorage
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const items = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(items)) {
      throw new Error("Некоректний формат даних");
    }

    return items.filter(
      (item) =>
        item &&
        (typeof item.id === "number" || typeof item.id === "string") &&
        typeof item.title === "string" &&
        COLUMNS.includes(item.column),
    );
  } catch (error) {
    console.error("Помилка localStorage:", error);
    return [];
  }
}

// Відкриття бази IndexedDB
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

// Додавання задачі в IndexedDB
function addItem(item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");

    tx.objectStore(STORE_NAME).put(item);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Оновлення задачі в IndexedDB
function updateItem(item) {
  return addItem(item);
}

// Отримання всіх задач з IndexedDB
function getAllItems() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();

    let result = [];

    request.onsuccess = () => {
      result = request.result;
    };

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Видалення задачі з IndexedDB
function deleteItem(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");

    tx.objectStore(STORE_NAME).delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Одноразова міграція з localStorage до IndexedDB
async function migrateData() {
  if (localStorage.getItem(MIGRATION_KEY) === "true") {
    return;
  }

  const existing = await getAllItems();
  const localItems = loadFromLocalStorage();

  if (existing.length === 0 && localItems.length > 0) {
    for (const item of localItems) {
      await addItem(item);
    }
  }

  localStorage.setItem(MIGRATION_KEY, "true");
}

// Компонент картки задачі
const TaskCard = {
  props: {
    id: [Number, String],
    title: String,
    column: String,
    disabled: Boolean,
  },

  emits: ["move-next", "edit-task", "delete-task"],

  methods: {
    handleMove() {
      if (!this.disabled && this.column !== "done") {
        this.$emit("move-next", this.id);
      }
    },

    handleEdit() {
      if (!this.disabled) {
        this.$emit("edit-task", this.id);
      }
    },

    handleDelete() {
      if (!this.disabled) {
        this.$emit("delete-task", this.id);
      }
    },
  },

  template: `
    <div class="task-card"
         :class="{ 'done-card': column === 'done' }">

      <p>{{ title }}</p>

      <div class="task-actions">
        <span v-if="column !== 'done'">
          Перемістити →
        </span>

        <span v-else>
          Виконано ✓
        </span>

        <button
          v-if="column !== 'done'"
          type="button"
          @click="handleMove"
          :disabled="disabled"
        >
          →
        </button>

        <button
          type="button"
          class="edit-btn"
          @click="handleEdit"
          :disabled="disabled"
        >
          Редагувати
        </button>

        <button
          type="button"
          class="delete-btn"
          @click="handleDelete"
          :disabled="disabled"
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

  data() {
    return {
      tasks: [],
      newTitle: "",
      newColumn: "todo",

      loading: false,
      errorMessage: "",
      successMessage: "",
    };
  },

  computed: {
    todoTasks() {
      return this.tasks.filter((task) => task.column === "todo");
    },

    doingTasks() {
      return this.tasks.filter((task) => task.column === "doing");
    },

    doneTasks() {
      return this.tasks.filter((task) => task.column === "done");
    },
  },

  methods: {
    // Оновлення списку задач
    async refreshTasks() {
      this.tasks = db ? await getAllItems() : loadFromLocalStorage();
    },

    // Збереження задачі
    async saveTask(task) {
      if (db) {
        await updateItem(task);
      } else {
        const updated = this.tasks.filter((item) => item.id !== task.id);

        updated.push(task);
        saveToLocalStorage(updated);
      }
    },

    // Завантаження задач із API
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
          throw new Error("Некоректний JSON");
        }

        let added = 0;

        for (const item of data) {
          if (
            typeof item.id !== "number" ||
            typeof item.title !== "string" ||
            typeof item.completed !== "boolean"
          ) {
            throw new Error("Некоректні поля API");
          }

          const exists = this.tasks.some((task) => task.id === item.id);

          if (!exists) {
            await this.saveTask({
              id: item.id,
              title: item.title,
              column: item.completed ? "done" : "todo",
            });

            await this.refreshTasks();
            added++;
          }
        }

        this.successMessage = `Завантажено ${added} нових задач з API.`;
      } catch (error) {
        console.error(error);
        this.errorMessage = "Дошку тимчасово не вдалося завантажити";
      } finally {
        this.loading = false;
      }
    },

    // Додавання нової задачі
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

        this.newTitle = "";
        this.newColumn = "todo";
        this.errorMessage = "";
        this.successMessage = "Задачу додано.";
      } catch (error) {
        console.error(error);
        this.errorMessage = "Помилка додавання задачі.";
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
        const updated = {
          ...task,
          column: COLUMNS[index + 1],
        };

        await this.saveTask(updated);
        await this.refreshTasks();

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

    // Ініціалізація бази та обробка помилок
    async initialize() {
      this.loading = true;

      try {
        this.tasks = loadFromLocalStorage();

        db = await openDB();
        await migrateData();
        await this.refreshTasks();
      } catch (error) {
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

      if (this.tasks.length === 0) {
        await this.loadData();
      }
    },
  },

  mounted() {
    this.initialize();
  },
}).mount("#app");
