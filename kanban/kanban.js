const dataUrl = new URL("../data/kanban.json", import.meta.url);

const fieldLabels = {
  title: "Название",
  tags: "Теги",
  points: "Оценка",
  owner: "Ответственный",
  due: "Дедлайн",
};

function createElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (typeof content === "string") {
    el.textContent = content;
  }
  return el;
}

function renderPreviewField(card, field) {
  const value = card[field];

  if (field === "title") {
    const title = createElement("h3", "kanban-card__title");
    title.textContent = value || "Без названия";
    return title;
  }

  if (field === "tags" && Array.isArray(value) && value.length) {
    const list = createElement("ul", "kanban-card__tags");
    value.forEach((tag) => {
      const item = createElement("li");
      item.className = "kanban-tag";
      item.textContent = tag;
      list.append(item);
    });
    return list;
  }

  if (field === "points" && typeof value !== "undefined") {
    const meta = createElement("p", "kanban-card__meta");
    meta.textContent = `${value} pt`;
    return meta;
  }

  if (field === "owner" && value) {
    const meta = createElement("p", "kanban-card__meta");
    meta.textContent = `Ответственный: ${value}`;
    return meta;
  }

  if (field === "due" && value) {
    const meta = createElement("p", "kanban-card__meta");
    meta.textContent = `Дедлайн: ${value}`;
    return meta;
  }

  if (typeof value !== "undefined") {
    const meta = createElement("p", "kanban-card__meta");
    meta.textContent = `${fieldLabels[field] || field}: ${value}`;
    return meta;
  }

  return null;
}

function renderCard(card, board, columnName, openModal) {
  const previewFields = board.cardPreviewFields && board.cardPreviewFields.length
    ? board.cardPreviewFields
    : ["title"]; // fallback

  const cardEl = createElement("button", "kanban-card");
  cardEl.type = "button";
  cardEl.dataset.cardId = card.id;
  cardEl.setAttribute("aria-label", card.title || "Карточка");

  previewFields.forEach((field) => {
    const node = renderPreviewField(card, field);
    if (node) cardEl.append(node);
  });

  cardEl.addEventListener("click", () => openModal(card, board, columnName));
  return cardEl;
}

function renderColumn(column, cards, board, openModal) {
  const columnEl = createElement("div", "kanban-column");
  const header = createElement("div", "kanban-column__header");
  const title = createElement("h3", "kanban-column__title", column.name);
  const count = createElement("span", "kanban-column__count", `${cards.length}`);
  header.append(title, count);
  columnEl.append(header);

  if (!cards.length) {
    const empty = createElement("div", "kanban-empty", "Пока пусто");
    columnEl.append(empty);
    return columnEl;
  }

  cards.forEach((card) => {
    const cardNode = renderCard(card, board, column.name, openModal);
    columnEl.append(cardNode);
  });

  return columnEl;
}

function formatPreviewFields(fields) {
  if (!fields || !fields.length) return "Нет полей";
  return fields
    .map((field) => fieldLabels[field] || field)
    .join(" · ");
}

function populateMeta(board, previewTarget) {
  if (!previewTarget) return;
  previewTarget.textContent = formatPreviewFields(board.cardPreviewFields);
}

function buildMetaList(card, columnName) {
  const entries = [
    { label: "Колонка", value: columnName },
  ];

  const helpers = {
    tags: (value) => Array.isArray(value) && value.length ? value.join(", ") : null,
    points: (value) => (typeof value !== "undefined" ? `${value} pt` : null),
  };

  Object.entries(card).forEach(([key, rawValue]) => {
    if (["id", "boardId", "columnId", "details", "title"].includes(key)) return;
    const value = helpers[key] ? helpers[key](rawValue) : rawValue;
    if (!value) return;
    entries.push({ label: fieldLabels[key] || key, value });
  });

  return entries;
}

function renderModal(card, board, columnName, modalEl) {
  const titleEl = modalEl.querySelector("#kanban-modal-title");
  const detailsEl = modalEl.querySelector("#kanban-modal-details");
  const metaList = modalEl.querySelector("#kanban-modal-meta");

  titleEl.textContent = card.title || "Карточка";
  detailsEl.textContent = card.details || "Нет описания";
  metaList.innerHTML = "";

  const metaItems = buildMetaList(card, columnName);
  metaItems.forEach(({ label, value }) => {
    const item = createElement("li", "kanban-meta__item");
    const metaLabel = createElement("span", "kanban-meta__label", label);
    const metaValue = createElement("div");
    metaValue.textContent = value;
    item.append(metaLabel, metaValue);
    metaList.append(item);
  });

  modalEl.hidden = false;
  modalEl.dataset.activeCard = card.id;
}

function setupModal() {
  const modal = document.getElementById("kanban-modal");
  const closeBtn = modal?.querySelector("[data-close]");

  const hide = () => {
    if (modal) modal.hidden = true;
  };

  closeBtn?.addEventListener("click", hide);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) hide();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) hide();
  });

  return { modal, hide };
}

async function loadData() {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Не удалось загрузить данные");
  return response.json();
}

export async function initKanban() {
  const boardContainer = document.getElementById("kanban-board");
  const boardSelect = document.getElementById("kanban-board-select");
  const previewFieldTarget = document.getElementById("kanban-preview-fields");
  const statusTarget = document.getElementById("kanban-status");
  const { modal } = setupModal();

  if (!boardContainer || !boardSelect) return;

  let boards = [];
  let cards = [];

  const setStatus = (text, isError = false) => {
    if (!statusTarget) return;
    statusTarget.textContent = text;
    statusTarget.classList.toggle("kanban-error", isError);
  };

  const openModal = (card, board, columnName) => {
    if (!modal) return;
    renderModal(card, board, columnName, modal);
  };

  const renderBoard = (boardId) => {
    const board = boards.find((item) => item.id === boardId);
    if (!board) {
      boardContainer.innerHTML = "";
      setStatus("Доска не найдена", true);
      return;
    }

    setStatus("Карточки по колонкам", false);
    populateMeta(board, previewFieldTarget);
    boardContainer.innerHTML = "";

    board.columns.forEach((column) => {
      const columnCards = cards.filter(
        (card) => card.boardId === board.id && card.columnId === column.id,
      );
      const columnNode = renderColumn(column, columnCards, board, openModal);
      boardContainer.append(columnNode);
    });
  };

  try {
    setStatus("Загружаем данные...");
    const data = await loadData();
    boards = data.boards || [];
    cards = data.cards || [];

    if (!boards.length) {
      setStatus("Нет досок для отображения", true);
      return;
    }

    boardSelect.innerHTML = boards
      .map((board) => `<option value="${board.id}">${board.name}</option>`)
      .join("");

    boardSelect.addEventListener("change", (event) => {
      renderBoard(event.target.value);
    });

    renderBoard(boardSelect.value || boards[0].id);
  } catch (error) {
    console.error(error);
    setStatus("Не удалось загрузить канбан. Попробуйте позже.", true);
  }
}
