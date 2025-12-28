const storageKeys = {
  options: "slot-options",
  drums: "slot-drums-count",
  unique: "slot-unique",
};

const ITEM_HEIGHT = 34;
const ITEM_GAP = 10;
const CENTER_OFFSET = 57; // aligns active row to center of the window

const optionsInput = document.getElementById("slot-options");
const fileInput = document.getElementById("slot-file");
const drumRange = document.getElementById("slot-drum-count");
const drumValue = document.getElementById("slot-drum-value");
const uniqueCheckbox = document.getElementById("slot-unique");
const statusEl = document.getElementById("slot-status");
const drumsContainer = document.getElementById("slot-drums");
const resultsEl = document.getElementById("slot-results");
const copyBtn = document.getElementById("slot-copy");
const spinBtn = document.getElementById("slot-spin");
const stopBtn = document.getElementById("slot-stop");
const resetBtn = document.getElementById("slot-reset");
const modeRadios = document.querySelectorAll('input[name="slot-mode"]');

let isSpinning = false;
let forceStop = false;
let currentResults = [];
let activeRunners = [];

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function dedupeLines(lines) {
  const seen = new Set();
  const result = [];
  lines.forEach((line) => {
    const normalized = normalizeLine(line);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

function loadFromStorage() {
  const savedOptions = localStorage.getItem(storageKeys.options);
  if (optionsInput && savedOptions) {
    try {
      optionsInput.value = JSON.parse(savedOptions).join("\n");
    } catch (err) {
      console.error(err);
    }
  }
  const savedDrums = localStorage.getItem(storageKeys.drums);
  if (drumRange && drumValue && savedDrums) {
    drumRange.value = savedDrums;
    drumValue.textContent = savedDrums;
  }
  const savedUnique = localStorage.getItem(storageKeys.unique);
  if (uniqueCheckbox && savedUnique !== null) {
    uniqueCheckbox.checked = savedUnique === "true";
  }
}

function persistOptions(lines) {
  localStorage.setItem(storageKeys.options, JSON.stringify(lines));
}

function persistDrumCount(count) {
  localStorage.setItem(storageKeys.drums, String(count));
}

function persistUniqueFlag(value) {
  localStorage.setItem(storageKeys.unique, String(value));
}

function setStatus(message, tone = "info") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function getMode() {
  const checked = Array.from(modeRadios).find((radio) => radio.checked);
  return checked ? checked.value : "replace";
}

function parseOptions() {
  if (!optionsInput) return [];
  const lines = optionsInput.value.split("\n");
  return dedupeLines(lines);
}

function mergeOptions(newLines) {
  const current = parseOptions();
  const combined = getMode() === "append" ? [...current, ...newLines] : newLines;
  const deduped = dedupeLines(combined);
  if (optionsInput) {
    optionsInput.value = deduped.join("\n");
  }
  persistOptions(deduped);
  return deduped;
}

function buildDrums(count) {
  if (!drumsContainer) return [];
  drumsContainer.innerHTML = "";
  const drums = [];
  for (let i = 0; i < count; i += 1) {
    const drumEl = document.createElement("div");
    drumEl.className = "slot-drum";

    const windowEl = document.createElement("div");
    windowEl.className = "slot-drum__window";

    const listEl = document.createElement("div");
    listEl.className = "slot-drum__list";
    windowEl.appendChild(listEl);

    const overlay = document.createElement("div");
    overlay.className = "slot-drum__highlight";
    windowEl.appendChild(overlay);

    const label = document.createElement("div");
    label.className = "slot-drum__label";
    label.textContent = `Барабан ${i + 1}`;

    drumEl.appendChild(windowEl);
    drumEl.appendChild(label);
    drumsContainer.appendChild(drumEl);
    drums.push({ element: drumEl, listEl, currentIndex: 0 });
  }
  return drums;
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildSequence(values, finalValue) {
  const base = values.length ? shuffle(values) : ["—"];
  const sequence = [];
  while (sequence.length < 60) {
    sequence.push(...base);
  }
  sequence.push(finalValue, finalValue);
  return sequence;
}

function renderList(listEl, items) {
  listEl.innerHTML = items.map((item) => `<div class="slot-drum__item">${item}</div>`).join("");
}

function applyPosition(listEl, index) {
  const step = ITEM_HEIGHT + ITEM_GAP;
  const translate = -(index * step - CENTER_OFFSET);
  listEl.style.transform = `translateY(${translate}px)`;
}

function highlightActive(listEl, index) {
  const items = Array.from(listEl.children);
  items.forEach((el, idx) => {
    el.classList.toggle("is-active", idx === index);
  });
}

function runDrum(drum, values, finalValue, index) {
  const sequence = buildSequence(values, finalValue);
  drum.currentIndex = 0;
  renderList(drum.listEl, sequence);
  applyPosition(drum.listEl, drum.currentIndex);
  highlightActive(drum.listEl, drum.currentIndex);

  const baseDelay = 90 + index * 16;
  const maxDelay = 260 + index * 32;
  const runDuration = 1300 + index * 420 + Math.random() * 240;
  let startTs = null;
  let timerId = null;

  drum.element.classList.add("is-spinning");
  drum.element.classList.remove("is-final");

  return new Promise((resolve) => {
    function step(timestamp) {
      if (!startTs) startTs = timestamp;
      const elapsed = timestamp - startTs;
      const slowing = elapsed >= runDuration || forceStop;
      const slowTime = Math.max(0, elapsed - runDuration);
      const extra = slowing ? Math.min(slowTime * 0.5, maxDelay - baseDelay) : 0;
      const delay = Math.min(maxDelay, baseDelay + extra);

      drum.currentIndex = (drum.currentIndex + 1) % sequence.length;
      applyPosition(drum.listEl, drum.currentIndex);
      highlightActive(drum.listEl, drum.currentIndex);

      const currentValue = sequence[drum.currentIndex];
      const isFinalSpot = slowing && delay >= maxDelay * 0.85 && currentValue === finalValue;

      if (isFinalSpot) {
        drum.element.classList.remove("is-spinning");
        drum.element.classList.add("is-final");
        renderList(drum.listEl, [finalValue, finalValue, finalValue]);
        drum.listEl.style.transition = "transform 0.28s ease-out";
        applyPosition(drum.listEl, 1);
        highlightActive(drum.listEl, 1);
        resolve();
        return;
      }

      timerId = setTimeout(() => window.requestAnimationFrame(step), delay);
    }

    window.requestAnimationFrame(step);
    drum.cancel = () => {
      if (timerId) clearTimeout(timerId);
    };
  });
}

function pickWinners(options, count, unique) {
  if (!options.length || count < 1) return [];
  const pool = [...options];
  const winners = [];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool[idx]);
    if (unique) {
      pool.splice(idx, 1);
    }
  }
  return winners;
}

function renderResults(items) {
  if (!resultsEl) return;
  if (!items.length) {
    resultsEl.innerHTML = `<p class="slot-hint">Пока нет результатов.</p>`;
    copyBtn?.setAttribute("disabled", "true");
    return;
  }
  resultsEl.innerHTML = `
    <ol class="slot-winners">
      ${items.map((item) => `<li>${item}</li>`).join("")}
    </ol>
  `;
  copyBtn?.removeAttribute("disabled");
}

function setButtonsState(spinning) {
  isSpinning = spinning;
  if (spinBtn) spinBtn.disabled = spinning;
  if (stopBtn) stopBtn.disabled = !spinning;
  if (resetBtn) resetBtn.disabled = spinning;
}

async function startSpin() {
  if (isSpinning) return;
  if (!drumRange || !spinBtn) return;
  const options = parseOptions();
  const drumsCount = Number(drumRange.value) || 1;
  const unique = uniqueCheckbox?.checked ?? true;

  if (!options.length) {
    setStatus("Добавьте хотя бы один вариант.", "error");
    return;
  }
  if (unique && options.length < drumsCount) {
    setStatus("Вариантов меньше, чем барабанов — уменьшите количество или разрешите повторы.", "error");
    return;
  }

  const drums = buildDrums(drumsCount);
  const winners = pickWinners(options, drumsCount, unique);
  currentResults = [];
  renderResults([]);
  setStatus("Крутим барабаны…", "info");
  setButtonsState(true);
  forceStop = false;
  activeRunners = drums.map((drum, index) => runDrum(drum, options, winners[index], index));

  await Promise.all(activeRunners);
  currentResults = winners;
  renderResults(winners);
  setStatus("Готово! Все барабаны остановлены.", "success");
  setButtonsState(false);
}

function stopSpinEarly() {
  if (!isSpinning) return;
  forceStop = true;
}

function resetAll() {
  if (isSpinning) return;
  forceStop = false;
  currentResults = [];
  localStorage.removeItem(storageKeys.options);
  localStorage.removeItem(storageKeys.drums);
  localStorage.removeItem(storageKeys.unique);
  if (optionsInput) optionsInput.value = "";
  if (drumRange) {
    drumRange.value = "3";
    drumValue.textContent = "3";
  }
  if (uniqueCheckbox) uniqueCheckbox.checked = true;
  if (drumsContainer) drumsContainer.innerHTML = "";
  renderResults([]);
  setStatus("Сброшено. Заполните список и крутите снова.", "info");
}

function attachHandlers() {
  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      const [file] = event.target.files || [];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/);
        const options = mergeOptions(lines);
        setStatus(`Загружено ${options.length} вариантов.`, "success");
      };
      reader.onerror = () => setStatus("Не удалось прочитать файл.", "error");
      reader.readAsText(file, "utf-8");
      event.target.value = "";
    });
  }

  if (optionsInput) {
    optionsInput.addEventListener("input", () => {
      const options = parseOptions();
      persistOptions(options);
    });
  }

  if (drumRange && drumValue) {
    drumRange.addEventListener("input", () => {
      drumValue.textContent = drumRange.value;
      persistDrumCount(drumRange.value);
    });
  }

  if (uniqueCheckbox) {
    uniqueCheckbox.addEventListener("change", () => {
      persistUniqueFlag(uniqueCheckbox.checked);
    });
  }

  spinBtn?.addEventListener("click", startSpin);
  stopBtn?.addEventListener("click", stopSpinEarly);
  resetBtn?.addEventListener("click", resetAll);

  copyBtn?.addEventListener("click", async () => {
    if (!currentResults.length) return;
    try {
      await navigator.clipboard.writeText(currentResults.join("\n"));
      setStatus("Результаты скопированы.", "success");
    } catch (err) {
      console.error(err);
      setStatus("Не удалось скопировать результаты.", "error");
    }
  });
}

export function initSlot() {
  loadFromStorage();
  renderResults([]);
  attachHandlers();
  const drumsCount = Number(drumRange?.value || 3);
  buildDrums(drumsCount);
  setStatus("Добавьте варианты и запускайте слот.", "info");
}
