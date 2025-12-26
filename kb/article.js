function getArticleId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date)) return dateStr;
  return date.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
}

function renderArticle(article) {
  const container = document.getElementById("kb-article-card");
  if (!container) return;

  if (!article) {
    container.innerHTML = `<p class="kb-muted">Статья не найдена.</p>`;
    return;
  }

  container.innerHTML = `
    <header class="kb-article-page__header">
      <div>
        <p class="kb-muted">Обновлено: ${formatDate(article.updatedAt)}</p>
        <h1 class="kb-article-page__title">${article.title}</h1>
      </div>
      <div class="kb-article-page__tags">
        ${article.tags.map((tag) => `<span class="kb-chip">${tag}</span>`).join("")}
      </div>
    </header>
    <div class="kb-article-page__content">${article.contentHtml}</div>
  `;
}

export async function initArticlePage() {
  const articleId = getArticleId();
  const container = document.getElementById("kb-article-card");

  if (!articleId) {
    renderArticle(null);
    return;
  }

  try {
    const response = await fetch("../data/kb.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить данные базы знаний");
    const data = await response.json();
    const article = data.articles.find((item) => item.id === articleId);
    renderArticle(article || null);
  } catch (error) {
    if (container) container.innerHTML = `<p class="kb-muted">${error.message}</p>`;
  }
}
