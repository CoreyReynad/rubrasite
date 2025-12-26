const statusEl = document.getElementById("status");
const btn = document.getElementById("btn");
document.getElementById("year").textContent = new Date().getFullYear();

btn.addEventListener("click", () => {
  statusEl.textContent = "Готово: кнопка сработала ✅";
});
