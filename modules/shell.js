const navItems = [
  { href: "index.html", label: "Главная" },
  { href: "project.html", label: "Проект" },
  { href: "contacts.html", label: "Контакты" },
  { href: "kb/", label: "База знаний" },
  { href: "kanban/", label: "Канбан" },
  { href: "gallery/", label: "Галерея" },
  { href: "random/", label: "Рандом" },
  { href: "stats/", label: "Статистика" },
];

function createHeader(basePath) {
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="wrap site-header__inner">
      <a class="brand" href="${basePath}index.html">Мой сайт</a>
      <nav class="nav">
        ${navItems
          .map(({ href, label }) => `<a href="${basePath}${href}">${label}</a>`)
          .join("")}
      </nav>
    </div>
  `;
  return header;
}

function createFooter() {
  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.innerHTML = `
    <div class="wrap footer__inner">
      <small>© <span id="year"></span></small>
    </div>
  `;
  return footer;
}

export function mountShell() {
  const siteRoot = new URL("../", import.meta.url).pathname;
  const header = createHeader(siteRoot);
  const footer = createFooter();
  const yearEl = footer.querySelector("#year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const headerMount = document.getElementById("shell-header");
  if (headerMount) {
    headerMount.replaceWith(header);
  } else {
    document.body.insertBefore(header, document.body.firstChild || null);
  }

  const footerMount = document.getElementById("shell-footer");
  if (footerMount) {
    footerMount.replaceWith(footer);
  } else {
    document.body.appendChild(footer);
  }
}
