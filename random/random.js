const listInput = document.getElementById("random-list");
const fileInput = document.getElementById("random-file");
const countSelect = document.getElementById("random-count");
const startBtn = document.getElementById("random-start");
const statusEl = document.getElementById("random-status");
const drumsContainer = document.getElementById("slot-drums");
const resultsEl = document.getElementById("random-results");
const clearBtn = document.getElementById("random-clear");

function setStatus(message, tone = "info") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function parseList() {
  if (!listInput) return [];
  return listInput.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function sample(items, count) {
  const pool = [...items];
  const chosen = [];
  for (let i = 0; i < count && pool.length; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}

function buildDrums(count) {
  if (!drumsContainer) return [];
  drumsContainer.innerHTML = "";
  const drums = [];

  for (let i = 0; i < count; i += 1) {
    const drum = document.createElement("div");
    drum.className = "slot-drum";
    const windowEl = document.createElement("div");
    windowEl.className = "slot-drum__window";
    const valueEl = document.createElement("div");
    valueEl.className = "slot-drum__value";
    valueEl.textContent = "–";

    windowEl.appendChild(valueEl);
    drum.appendChild(windowEl);
    drumsContainer.appendChild(drum);
    drums.push({ drum, valueEl });
  }

  return drums;
}

function renderResults(items) {
  if (!resultsEl) return;
  if (!items.length) {
    resultsEl.innerHTML = "";
    return;
  }

  resultsEl.innerHTML = `
    <h3>Победители</h3>
    <ol class="random-winners">
      ${items.map((item) => `<li>${item}</li>`).join("")}
    </ol>
  `;
}

function attachFileLoader() {
  if (!fileInput || !listInput) return;

  fileInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      listInput.value = lines.join("\n");
      setStatus(`Загружено ${lines.length} строк из файла.`, "success");
    };
    reader.onerror = () => setStatus("Не удалось прочитать файл.", "error");
    reader.readAsText(file, "utf-8");
  });
}

function handleClear() {
  if (!clearBtn || !listInput) return;
  clearBtn.addEventListener("click", () => {
    listInput.value = "";
    setStatus("Поле очищено.", "info");
    renderResults([]);
  });
}

function spinDrums(items, winners, drums) {
  const intervals = [];
  const stopPromises = drums.map((drum, index) => {
    const baseSpeed = 70 + index * 10;
    const spin = setInterval(() => {
      drum.valueEl.textContent = items[Math.floor(Math.random() * items.length)];
    }, baseSpeed);
    intervals.push(spin);

    const stopDelay = 1200 + index * 450;
    return new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(spin);
        drum.drum.classList.remove("is-spinning");
        drum.drum.classList.add("is-final");
        drum.valueEl.textContent = winners[index];
        resolve();
      }, stopDelay);
    });
  });

  drums.forEach((item) => item.drum.classList.add("is-spinning"));

  return Promise.all(stopPromises).then(() => intervals.forEach(clearInterval));
}

export function initRandom() {
  if (!listInput || !countSelect || !startBtn) return;

  attachFileLoader();
  handleClear();

  startBtn.addEventListener("click", async () => {
    const items = parseList();
    const count = Number(countSelect.value) || 1;

    if (!items.length) {
      setStatus("Добавьте хотя бы один пункт.", "error");
      return;
    }

    if (count > items.length) {
      setStatus("Победителей больше, чем вариантов.", "error");
      return;
    }

    const drums = buildDrums(count);
    const winners = sample(items, count);

    startBtn.disabled = true;
    setStatus("Запускаем слот…", "info");

    await spinDrums(items, winners, drums);

    startBtn.disabled = false;
    setStatus("Готово! Победители определены.", "success");
    renderResults(winners);
  });
}
