function createTree(folders) {
  const byParent = folders.reduce((acc, folder) => {
    const key = folder.parentId ?? null;
    acc[key] = acc[key] || [];
    acc[key].push(folder);
    return acc;
  }, {});

  Object.values(byParent).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));

  return { byParent };
}

function renderFolders(tree, activeFolderId, onSelect) {
  const container = document.getElementById("kb-folders");
  if (!container) return;
  container.innerHTML = "";

  const createBranch = (parentId, depth = 0) => {
    const nodes = tree.byParent[parentId ?? null] || [];
    if (!nodes.length) return "";

    return nodes
      .map((node) => {
        const isActive = node.id === activeFolderId;
        const children = createBranch(node.id, depth + 1);
        return `
          <div class="kb-tree__item" data-id="${node.id}" style="--indent:${depth}">
            <button class="kb-tree__btn${isActive ? " is-active" : ""}" type="button">
              <span class="kb-tree__name">${node.name}</span>
            </button>
            ${children ? `<div class="kb-tree__children">${children}</div>` : ""}
          </div>`;
      })
      .join("");
  };

  container.innerHTML = createBranch(null);

  container.onclick = (event) => {
    const btn = event.target.closest(".kb-tree__btn");
    if (!btn) return;
    const item = btn.closest(".kb-tree__item");
    const id = item?.dataset.id;
    if (id) onSelect(id);
  };
}

function renderTags(articles, selectedTags, onToggle) {
  const container = document.getElementById("kb-tags");
  if (!container) return;

  const tags = new Set();
  articles.forEach((article) => article.tags.forEach((tag) => tags.add(tag)));
  const sorted = Array.from(tags).sort((a, b) => a.localeCompare(b));

  container.innerHTML = sorted
    .map(
      (tag) => `
        <button type="button" class="kb-tag${selectedTags.has(tag) ? " is-active" : ""}" data-tag="${tag}">
          ${tag}
        </button>`
    )
    .join("");

  container.onclick = (event) => {
    const btn = event.target.closest(".kb-tag");
    if (!btn) return;
    const tag = btn.dataset.tag;
    if (!tag) return;
    onToggle(tag);
  };
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date)) return dateStr;
  return date.toLocaleDateString("ru-RU", { year: "numeric", month: "short", day: "numeric" });
}

function renderArticles(articles, folderName) {
  const listEl = document.getElementById("kb-articles");
  const countEl = document.getElementById("kb-count");
  const emptyEl = document.getElementById("kb-empty");
  const activeFolderEl = document.getElementById("kb-active-folder");
  if (!listEl || !countEl || !emptyEl || !activeFolderEl) return;

  activeFolderEl.textContent = folderName;
  countEl.textContent = `${articles.length} статей`;

  if (!articles.length) {
    listEl.innerHTML = "";
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  listEl.innerHTML = articles
    .map(
      (article) => `
        <article class="kb-article">
          <header>
            <a class="kb-article__title" href="./article.html?id=${article.id}">${article.title}</a>
            <p class="kb-article__meta">Обновлено: ${formatDate(article.updatedAt)}</p>
          </header>
          <div class="kb-article__tags">
            ${article.tags
              .map((tag) => `<span class="kb-chip" aria-label="Тег">${tag}</span>`)
              .join("")}
          </div>
          <p class="kb-article__preview">${article.preview || ""}</p>
        </article>`
    )
    .join("");
}

function filterArticles({ articles, folderId, query, selectedTags }) {
  return articles
    .filter((article) => (folderId === "root" ? true : article.folderId === folderId))
    .filter((article) => {
      if (!query) return true;
      return article.title.toLowerCase().includes(query.toLowerCase());
    })
    .filter((article) => {
      if (!selectedTags.size) return true;
      return Array.from(selectedTags).every((tag) => article.tags.includes(tag));
    });
}

export async function initKbPage() {
  const searchInput = document.getElementById("kb-search");
  const state = { data: null, activeFolderId: "root", selectedTags: new Set(), query: "" };

  try {
    const response = await fetch("../data/kb.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить данные базы знаний");
    state.data = await response.json();
  } catch (error) {
    const listEl = document.getElementById("kb-articles");
    if (listEl) listEl.innerHTML = `<p class="kb-muted">${error.message}</p>`;
    return;
  }

  const tree = createTree(state.data.folders);

  const rerender = () => {
    renderFolders(tree, state.activeFolderId, (nextId) => {
      state.activeFolderId = nextId;
      rerender();
    });

    renderTags(state.data.articles, state.selectedTags, (tag) => {
      if (state.selectedTags.has(tag)) {
        state.selectedTags.delete(tag);
      } else {
        state.selectedTags.add(tag);
      }
      rerender();
    });

    const articles = filterArticles({
      articles: state.data.articles,
      folderId: state.activeFolderId,
      query: state.query,
      selectedTags: state.selectedTags,
    });

    const folderName = state.data.folders.find((f) => f.id === state.activeFolderId)?.name || "Папка";
    renderArticles(articles, folderName);
  };

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.query = event.target.value.trim();
      rerender();
    });
  }

  rerender();
}
