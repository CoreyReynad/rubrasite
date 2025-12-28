const dataUrl = new URL("../data/stats.json", import.meta.url);

const sortIcons = {
  asc: "▲",
  desc: "▼",
};

function formatNumber(value) {
  return Number(value).toLocaleString("ru-RU");
}

function updateSortButtons(buttons, activeColumn, direction) {
  buttons.forEach((btn) => {
    const isActive = btn.dataset.sort === activeColumn;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-sort", isActive ? direction : "none");
    const icon = btn.querySelector(".stats-sort__icon");
    if (icon) {
      icon.textContent = isActive ? sortIcons[direction] : "";
    }
  });
}

function renderTable(items, topSet, tableBody) {
  if (!items.length) {
    tableBody.innerHTML = `<tr><td colspan="3" class="stats-empty">Нет данных для отображения</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  items.forEach((item, index) => {
    const row = document.createElement("tr");
    if (topSet.has(item.name)) row.classList.add("is-top");

    const nameCell = document.createElement("td");
    nameCell.className = "stats-name";

    const rank = document.createElement("span");
    rank.className = "stats-rank";
    rank.textContent = `#${index + 1}`;

    const title = document.createElement("div");
    title.className = "stats-name__meta";
    const name = document.createElement("span");
    name.className = "stats-name__title";
    name.textContent = item.name;
    title.append(name);

    if (topSet.has(item.name)) {
      const badge = document.createElement("span");
      badge.className = "stats-badge";
      badge.textContent = "Топ-10";
      title.append(badge);
    }

    nameCell.append(rank, title);

    const messagesCell = document.createElement("td");
    messagesCell.className = "stats-number";
    messagesCell.textContent = formatNumber(item.messages);

    const rewardsCell = document.createElement("td");
    rewardsCell.className = "stats-number";
    rewardsCell.textContent = formatNumber(item.rewards);

    row.append(nameCell, messagesCell, rewardsCell);
    tableBody.append(row);
  });
}

function sortItems(items, column, direction) {
  const sorted = [...items].sort((a, b) => {
    const first = a[column];
    const second = b[column];

    if (first === second) return a.name.localeCompare(b.name);
    return direction === "asc" ? first - second : second - first;
  });
  return sorted;
}

function collectTop(items) {
  return new Set(
    [...items]
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 10)
      .map((item) => item.name)
  );
}

async function loadData() {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error("Не удалось загрузить /data/stats.json");
  }
  return response.json();
}

export async function initStats() {
  const periodTarget = document.getElementById("stats-period");
  const statusTarget = document.getElementById("stats-status");
  const tableBody = document.getElementById("stats-table-body");
  const sortButtons = document.querySelectorAll("[data-sort]");

  if (!periodTarget || !statusTarget || !tableBody) return;

  let items = [];
  let topSet = new Set();
  const sortState = { column: "messages", direction: "desc" };

  const applySort = () => {
    const sorted = sortItems(items, sortState.column, sortState.direction);
    renderTable(sorted, topSet, tableBody);
    updateSortButtons(sortButtons, sortState.column, sortState.direction);
  };

  sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const column = button.dataset.sort;
      if (!column) return;

      if (sortState.column === column) {
        sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
      } else {
        sortState.column = column;
        sortState.direction = "desc";
      }
      applySort();
    });
  });

  try {
    statusTarget.textContent = "Загружаем данные...";
    const data = await loadData();
    items = Array.isArray(data.items) ? data.items : [];
    topSet = collectTop(items);

    periodTarget.textContent = data.period || "Период не указан";
    statusTarget.textContent = `Участников: ${items.length}`;
    applySort();
  } catch (error) {
    statusTarget.textContent = error.message;
    statusTarget.dataset.state = "error";
    tableBody.innerHTML = `<tr><td colspan="3" class="stats-empty">${error.message}</td></tr>`;
  }
}
