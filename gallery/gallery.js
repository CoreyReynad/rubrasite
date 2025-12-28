const dataUrl = new URL("../data/gallery.json", import.meta.url);

function createElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (typeof content === "string") el.textContent = content;
  return el;
}

function renderTags(items, selectedTags, onToggle) {
  const container = document.getElementById("gallery-tags");
  if (!container) return;

  const tags = new Set();
  items.forEach((item) => item.tags.forEach((tag) => tags.add(tag)));
  const sorted = Array.from(tags).sort((a, b) => a.localeCompare(b, "ru"));

  container.innerHTML = sorted
    .map(
      (tag) => `
        <button type="button" class="gallery-tag${selectedTags.has(tag) ? " is-active" : ""}" data-tag="${tag}">
          ${tag}
        </button>`
    )
    .join("");

  container.onclick = (event) => {
    const btn = event.target.closest(".gallery-tag");
    if (!btn) return;
    const tag = btn.dataset.tag;
    if (!tag) return;
    onToggle(tag);
  };
}

function renderGrid(items, onOpenModal) {
  const grid = document.getElementById("gallery-grid");
  const count = document.getElementById("gallery-count");
  const empty = document.getElementById("gallery-empty");
  if (!grid || !count || !empty) return;

  count.textContent = `${items.length} элементов`;

  if (!items.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = items
    .map(
      (item) => `
        <article class="gallery-card" data-id="${item.id}">
          <div class="gallery-card__image">
            <img src="${item.imageUrl}" alt="${item.title}" loading="lazy" />
          </div>
          <header class="gallery-card__body">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <div class="gallery-card__tags">
              ${item.tags.map((tag) => `<span class="gallery-chip">${tag}</span>`).join("")}
            </div>
          </header>
        </article>`
    )
    .join("");

  grid.onclick = (event) => {
    const card = event.target.closest(".gallery-card");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    const target = items.find((item) => item.id === id);
    if (target) onOpenModal(target);
  };
}

function setupModal() {
  const modal = document.getElementById("gallery-modal");
  const closeBtn = modal?.querySelector("[data-close]");
  const titleEl = modal?.querySelector("#gallery-modal-title");
  const descEl = modal?.querySelector("#gallery-modal-desc");
  const imgEl = modal?.querySelector("#gallery-modal-image");
  const tagsEl = modal?.querySelector("#gallery-modal-tags");

  const hide = () => {
    if (modal) modal.hidden = true;
  };

  const show = (item) => {
    if (!modal || !titleEl || !descEl || !imgEl || !tagsEl) return;
    titleEl.textContent = item.title;
    descEl.textContent = item.description;
    imgEl.src = item.imageUrl;
    imgEl.alt = item.title;
    tagsEl.innerHTML = item.tags.map((tag) => `<li class="gallery-chip">${tag}</li>`).join("");
    modal.hidden = false;
  };

  closeBtn?.addEventListener("click", hide);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) hide();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) hide();
  });

  return { show };
}

function filterItems(items, query, selectedTags) {
  return items
    .filter((item) => {
      if (!query) return true;
      return item.title.toLowerCase().includes(query.toLowerCase());
    })
    .filter((item) => {
      if (!selectedTags.size) return true;
      return Array.from(selectedTags).every((tag) => item.tags.includes(tag));
    });
}

async function loadData() {
  const response = await fetch(dataUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Не удалось загрузить галерею");
  return response.json();
}

export async function initGallery() {
  const search = document.getElementById("gallery-search");
  const modal = setupModal();
  const state = { items: [], selectedTags: new Set(), query: "" };

  try {
    const data = await loadData();
    state.items = data.items || [];
  } catch (error) {
    const grid = document.getElementById("gallery-grid");
    if (grid) grid.innerHTML = `<p class="gallery-empty">${error.message}</p>`;
    return;
  }

  const rerender = () => {
    renderTags(state.items, state.selectedTags, (tag) => {
      if (state.selectedTags.has(tag)) {
        state.selectedTags.delete(tag);
      } else {
        state.selectedTags.add(tag);
      }
      rerender();
    });

    const items = filterItems(state.items, state.query, state.selectedTags);
    renderGrid(items, (item) => modal.show(item));
  };

  if (search) {
    search.addEventListener("input", (event) => {
      state.query = event.target.value.trim();
      rerender();
    });
  }

  rerender();
}
