const STORAGE_KEY = "prompt_keeper_items";

let prompts = [];
let editingId = null;
let deleteConfirmId = null;

const openFormBtn = document.getElementById("openFormBtn");
const formBox = document.getElementById("formBox");
const entryType = document.getElementById("entryType");
const promptTitle = document.getElementById("promptTitle");
const promptText = document.getElementById("promptText");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const promptList = document.getElementById("promptList");
const notice = document.getElementById("notice");
const totalCount = document.getElementById("totalCount");
const promptCount = document.getElementById("promptCount");
const noteCount = document.getElementById("noteCount");

openFormBtn.addEventListener("click", () => {
  openForm();
});

cancelBtn.addEventListener("click", () => {
  closeForm();
});

saveBtn.addEventListener("click", async () => {
  const type = entryType.value;
  const title = promptTitle.value.trim();
  const text = promptText.value.trim();

  if (!title || !text) {
    showNotice("Заполни название и текст.");
    return;
  }

  if (editingId) {
    prompts = prompts.map(item =>
      item.id === editingId
        ? { ...item, type, title, text, updatedAt: Date.now() }
        : item
    );
    showNotice("Запись обновлена.");
  } else {
    prompts.unshift({
      id: createId(),
      type,
      title,
      text,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    showNotice("Запись добавлена.");
  }

  await savePrompts();
  renderPrompts();
  closeForm();
});

function createId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function openForm(item = null) {
  formBox.classList.add("show");

  if (item) {
    editingId = item.id;
    entryType.value = item.type || "prompt";
    promptTitle.value = item.title;
    promptText.value = item.text;
  } else {
    editingId = null;
    entryType.value = "prompt";
    promptTitle.value = "";
    promptText.value = "";
  }
}

function closeForm() {
  formBox.classList.remove("show");
  editingId = null;
  entryType.value = "prompt";
  promptTitle.value = "";
  promptText.value = "";
}

function showNotice(text) {
  notice.textContent = text;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => {
    notice.textContent = "";
  }, 1800);
}

function getPreview(text, maxLength = 220) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateStats() {
  const total = prompts.length;
  const promptsOnly = prompts.filter(item => (item.type || "prompt") === "prompt").length;
  const notesOnly = prompts.filter(item => item.type === "note").length;

  totalCount.textContent = total;
  promptCount.textContent = promptsOnly;
  noteCount.textContent = notesOnly;
}

async function loadPrompts() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  prompts = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];

  prompts = prompts.map(item => ({
    ...item,
    type: item.type || "prompt"
  }));
}

async function savePrompts() {
  await chrome.storage.local.set({
    [STORAGE_KEY]: prompts
  });
}

async function copyPrompt(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotice("Текст скопирован.");
  } catch (error) {
    showNotice("Не удалось скопировать текст.");
  }
}

function askDelete(id) {
  deleteConfirmId = id;
  renderPrompts();
}

function cancelDelete() {
  deleteConfirmId = null;
  renderPrompts();
}

async function confirmDelete(id) {
  prompts = prompts.filter(item => item.id !== id);
  deleteConfirmId = null;
  await savePrompts();
  renderPrompts();
  showNotice("Запись удалена.");
}

function createEmptyState() {
  promptList.innerHTML = `
    <div class="empty">
      <h3 class="empty-title">Пока пусто</h3>
      <p class="empty-text">
        Добавь первую заметку или промпт, чтобы всё нужное было под рукой и копировалось в один клик.
      </p>
      <button id="emptyAddBtn" class="empty-add-btn" type="button">Добавить первую запись</button>
    </div>
  `;

  const emptyAddBtn = document.getElementById("emptyAddBtn");
  if (emptyAddBtn) {
    emptyAddBtn.addEventListener("click", () => {
      openForm();
    });
  }
}

function getTypeLabel(type) {
  return type === "note" ? "Заметка" : "Промпт";
}

function getTypeBadgeClass(type) {
  return type === "note" ? "type-badge note" : "type-badge";
}

function renderPrompts() {
  updateStats();

  if (!prompts.length) {
    createEmptyState();
    return;
  }

  promptList.innerHTML = "";

  prompts.forEach(item => {
    const type = item.type || "prompt";
    const card = document.createElement("div");
    card.className = "card";

    const confirmBlock = deleteConfirmId === item.id
      ? `
        <div class="confirm-box">
          <div class="confirm-text">
            Удалить запись «${escapeHtml(item.title)}»? Это действие нельзя отменить.
          </div>
          <div class="confirm-actions">
            <button data-action="confirm-delete" class="danger">Да, удалить</button>
            <button data-action="cancel-delete">Отмена</button>
          </div>
        </div>
      `
      : "";

    card.innerHTML = `
      <div class="card-top">
        <div class="card-title-wrap">
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          <div class="${getTypeBadgeClass(type)}">${getTypeLabel(type)}</div>
        </div>
        <div class="badge">Готово к копированию</div>
      </div>
      <div class="preview">${escapeHtml(getPreview(item.text))}</div>
      <div class="actions">
        <button data-action="copy">Копировать</button>
        <button data-action="edit">Редактировать</button>
        <button data-action="delete" class="delete-btn">Удалить</button>
      </div>
      ${confirmBlock}
    `;

    card.querySelector('[data-action="copy"]').addEventListener("click", () => {
      copyPrompt(item.text);
    });

    card.querySelector('[data-action="edit"]').addEventListener("click", () => {
      deleteConfirmId = null;
      openForm(item);
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", () => {
      askDelete(item.id);
    });

    if (deleteConfirmId === item.id) {
      card.querySelector('[data-action="confirm-delete"]').addEventListener("click", () => {
        confirmDelete(item.id);
      });

      card.querySelector('[data-action="cancel-delete"]').addEventListener("click", () => {
        cancelDelete();
      });
    }

    promptList.appendChild(card);
  });
}

async function init() {
  await loadPrompts();
  renderPrompts();
}

init();