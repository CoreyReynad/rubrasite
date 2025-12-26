const statusEl = document.getElementById("status");
const btn = document.getElementById("btn");
const yearEl = document.getElementById("year");

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (btn && statusEl) {
  btn.addEventListener("click", () => {
    statusEl.textContent = "Готово: кнопка сработала ✅";
  });
}
