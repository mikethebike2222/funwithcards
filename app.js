/* =========================
   Vokabeltrainer – index.js
   ========================= */

/* ---------- Persistenz-Schlüssel ---------- */
const LS_DECKS = "leitnerDecks";
const LS_CURR_DECK = "leitnerCurrentDeck";
const LS_UI_LANG = "uiLang";

/* ---------- Globaler State ---------- */
let decks = JSON.parse(localStorage.getItem(LS_DECKS) || "[]");
if (decks.length === 0) {
  const id = crypto.randomUUID();
  decks = [{ id, name: "Default", sideALabel: "A", sideBLabel: "B", importedFiles: [] }];
  localStorage.setItem(LS_DECKS, JSON.stringify(decks));
}
let currentDeckId = localStorage.getItem(LS_CURR_DECK) || decks[0].id;
let activeCards = JSON.parse(localStorage.getItem(deckKey("cards")) || "[]");    // {sideA, sideB, box}
let reserveCards = JSON.parse(localStorage.getItem(deckKey("reserve")) || "[]");
let learnedCards = JSON.parse(localStorage.getItem(deckKey("learned")) || "[]");
let uiLang = localStorage.getItem(LS_UI_LANG) || "de";

let mode = "lernen";            // "lernen" | "prüfen"
let direction = "a2b";          // "a2b" | "b2a"
let currentTestBox = 1;         // 1..5
let learnIndex = 0;             // Zeiger in Box 1
let revealed = false;           // Karte im Prüfen aufgedeckt?
const batchSizeFresh = 7;

/* ---------- DOM-Referenzen ---------- */
const btnMode = document.getElementById("btnMode");
const btnEdit = document.getElementById("btnEdit");
const drawerToggle = document.getElementById("drawerToggle");

const tileEs = document.getElementById("tileEs");
const tileDe = document.getElementById("tileDe");

const btnRight = document.getElementById("btnRight");
const btnWrong = document.getElementById("btnWrong");

const boxChart = document.getElementById("boxChart");
const pieChartCanvas = document.getElementById("pieChart");
const boxBadge = document.getElementById("boxBadge"); // optional (Landscape)

const langSelect = document.getElementById("langSelect");
const deckSelect = document.getElementById("deckSelect");
const btnFresh = document.getElementById("btnFresh");

const inputSideA = document.getElementById("inputSideA");
const inputSideB = document.getElementById("inputSideB");
const btnSaveLabels = document.getElementById("btnSaveLabels");

const importCsv = document.getElementById("importCsv");
const importList = document.getElementById("importList");
const btnExport = document.getElementById("btnExport");

const directionBadge = document.getElementById("directionBadge");
const toggleDirectionBtn = document.getElementById("toggleDirectionBtn");

/* ---------- i18n ---------- */
const I18N = {
  de: {
    modeLearn: "Lernen",
    modeTest: "Prüfen",
    edit: "Bearbeiten",
    menu: "Werkzeug",
    right: "Richtig",
    wrong: "Falsch",
    fresh: "+7",
    stats: "Statistik",
    progress: "Fortschritt",
    uiLanguage: "UI-Sprache",
    decks: "Übungen",
    deck: "Deck",
    add: "Neu",
    rename: "Umbenennen",
    remove: "Löschen",
    sideA: "A",
    sideB: "B",
    save: "Speichern",
    cancel: "Abbrechen",
    import: "CSV-Import",
    export: "Exportieren",
    direction: "Richtung",
    a2b: "A → B",
    b2a: "B → A",
    manage: "Verwalten",
    delActiveCard: "Aktive Karte löschen",
    resetProgress: "Nur Fortschritt löschen",
    delDeckAndProgress: "Kartendeck aus Übung löschen",
    box: "Box",
    none: "Keine Karten",
    points: "Punkte",
    level: "Level",
    streakDays: "d",
  },
  en: {
    modeLearn: "Learn",
    modeTest: "Test",
    edit: "Edit",
    menu: "Tools",
    right: "Right",
    wrong: "Wrong",
    fresh: "+7",
    stats: "Statistics",
    progress: "Progress",
    uiLanguage: "UI language",
    decks: "Exercises",
    deck: "Deck",
    add: "New",
    rename: "Rename",
    remove: "Delete",
    sideA: "A",
    sideB: "B",
    save: "Save",
    cancel: "Cancel",
    import: "CSV import",
    export: "Export",
    direction: "Direction",
    a2b: "A → B",
    b2a: "B → A",
    manage: "Manage",
    delActiveCard: "Delete active card",
    resetProgress: "Reset progress only",
    delDeckAndProgress: "Remove deck from exercise",
    box: "Box",
    none: "No cards",
    points: "Points",
    level: "Level",
    streakDays: "d",
  },
  sv: {
    modeLearn: "Lära",
    modeTest: "Testa",
    edit: "Redigera",
    menu: "Verktyg",
    right: "Rätt",
    wrong: "Fel",
    fresh: "+7",
    stats: "Statistik",
    progress: "Framsteg",
    uiLanguage: "UI-språk",
    decks: "Övningar",
    deck: "Kortlek",
    add: "Ny",
    rename: "Byt namn",
    remove: "Radera",
    sideA: "A",
    sideB: "B",
    save: "Spara",
    cancel: "Avbryt",
    import: "CSV-import",
    export: "Exportera",
    direction: "Riktning",
    a2b: "A → B",
    b2a: "B → A",
    manage: "Hantera",
    delActiveCard: "Ta bort aktivt kort",
    resetProgress: "Återställ bara framsteg",
    delDeckAndProgress: "Ta bort lek från övning",
    box: "Box",
    none: "Inga kort",
    points: "Poäng",
    level: "Nivå",
    streakDays: "d",
  },
  es: {
    modeLearn: "Aprender",
    modeTest: "Repasar",
    edit: "Editar",
    menu: "Herramientas",
    right: "Correcto",
    wrong: "Incorrecto",
    fresh: "+7",
    stats: "Estadísticas",
    progress: "Progreso",
    uiLanguage: "Idioma de la UI",
    decks: "Ejercicios",
    deck: "Mazo",
    add: "Nuevo",
    rename: "Renombrar",
    remove: "Eliminar",
    sideA: "A",
    sideB: "B",
    save: "Guardar",
    cancel: "Cancelar",
    import: "Importar CSV",
    export: "Exportar",
    direction: "Dirección",
    a2b: "A → B",
    b2a: "B → A",
    manage: "Administrar",
    delActiveCard: "Eliminar carta actual",
    resetProgress: "Reiniciar progreso",
    delDeckAndProgress: "Quitar mazo del ejercicio",
    box: "Caja",
    none: "Sin cartas",
    points: "Puntos",
    level: "Nivel",
    streakDays: "d",
  },
};
function t(key) {
  const pack = I18N[uiLang] || I18N.de;
  return pack[key] ?? key;
}

/* ---------- Helpers ---------- */
function deckKey(k) { return `${k}_${currentDeckId}`; }
function currentDeck() { return decks.find(d => d.id === currentDeckId) || decks[0]; }
function saveData() {
  localStorage.setItem(LS_DECKS, JSON.stringify(decks));
  localStorage.setItem(LS_CURR_DECK, currentDeckId);
  localStorage.setItem(LS_UI_LANG, uiLang);
  localStorage.setItem(deckKey("cards"), JSON.stringify(activeCards));
  localStorage.setItem(deckKey("reserve"), JSON.stringify(reserveCards));
  localStorage.setItem(deckKey("learned"), JSON.stringify(learnedCards));
}
function isLandscape() { return window.matchMedia("(orientation: landscape)").matches; }

/* ---------- i18n anwenden ---------- */
function applyI18n() {
  if (btnMode) btnMode.textContent = (mode === "lernen") ? t("modeLearn") : t("modeTest");
  if (btnEdit) btnEdit.textContent = t("edit");
  if (btnRight) btnRight.textContent = t("right");
  if (btnWrong) btnWrong.textContent = t("wrong");
  if (btnFresh) btnFresh.textContent = t("fresh");
  if (directionBadge) directionBadge.textContent = (direction === "a2b") ? t("a2b") : t("b2a");

  // Platzhalter „Keine Karten“ ggf. lokalisieren
  if (tileEs && tileEs.textContent === "Keine Karten") tileEs.textContent = t("none");
  if (tileDe && tileDe.textContent === "Keine Karten") tileDe.textContent = t("none");
}

/* ---------- Diagramme ---------- */
function buildBoxChart() {
  if (!boxChart) return;
  boxChart.innerHTML = "";
  const counts = [];
  for (let i = 1; i <= 5; i++) counts.push(activeCards.filter(c => c.box === i).length);
  const max = Math.max(...counts, 1);
  counts.forEach((count, idx) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = (count / max * 100) + "%";
    bar.title = `${t("box")} ${idx + 1}: ${count}`;
    bar.addEventListener("click", () => {
      currentTestBox = idx + 1;
      mode = (currentTestBox === 1) ? "lernen" : "prüfen";
      revealed = (mode === "prüfen") ? false : true;
      render();
      applyI18n();
    });
    boxChart.appendChild(bar);
  });
}

function drawPieChart() {
  if (!pieChartCanvas) return;
  const ctx = pieChartCanvas.getContext("2d");
  const W = pieChartCanvas.width, H = pieChartCanvas.height;
  ctx.clearRect(0, 0, W, H);
  const total = activeCards.length + reserveCards.length + learnedCards.length;
  if (total === 0) return;
  const data = [
    { label: "Aktiv", value: activeCards.length, color: "#3b82f6" },
    { label: "Reserve", value: reserveCards.length, color: "#f59e0b" },
    { label: "Gelernt", value: learnedCards.length, color: "#10b981" },
  ];
  let start = -Math.PI / 2;
  data.forEach(seg => {
    const slice = (seg.value / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(W/2, H/2);
    ctx.arc(W/2, H/2, Math.min(W, H)/2, start, start + slice);
    ctx.closePath(); ctx.fillStyle = seg.color; ctx.fill();
    start += slice;
  });
}

/* ---------- Kartenanzeige & Fitting ---------- */
function cardTextA(card) { return (direction === "a2b") ? card.sideA : card.sideB; }
function cardTextB(card) { return (direction === "a2b") ? card.sideB : card.sideA; }

function render() {
  // Box-Badge ggf. setzen
  if (boxBadge) {
    const countInBox = activeCards.filter(c => c.box === currentTestBox).length;
    boxBadge.textContent = `B${currentTestBox}: ${countInBox}`;
  }

  // Buttons R/F nur sichtbar: Prüfen + Revealed
  const showRF = (mode === "prüfen" && revealed === true);
  if (btnRight) btnRight.style.display = showRF ? "inline-flex" : "none";
  if (btnWrong) btnWrong.style.display = showRF ? "inline-flex" : "none";

  // Karten-Content
  if (mode === "lernen") {
    const b1 = activeCards.filter(c => c.box === 1);
    if (b1.length === 0) {
      tileEs.textContent = t("none"); tileDe.textContent = "";
      scheduleFit(); buildBoxChart(); drawPieChart(); return;
    }
    const card = b1[learnIndex % b1.length];
    tileEs.textContent = cardTextA(card);
    tileDe.textContent = cardTextB(card);
  } else {
    const bx = activeCards.filter(c => c.box === currentTestBox);
    if (bx.length === 0) {
      tileEs.textContent = t("none"); tileDe.textContent = "";
      scheduleFit(); buildBoxChart(); drawPieChart(); return;
    }
    const card = pickTestCard(bx);
    tileEs.textContent = cardTextA(card);
    tileDe.textContent = revealed ? cardTextB(card) : ""; // erst nach Aufdecken
  }

  buildBoxChart();
  drawPieChart();
  scheduleFit();
}

let _lastTestId = null;
function pickTestCard(list) {
  // Zufällig, aber nicht 2x hintereinander dieselbe
  if (list.length === 0) return null;
  let idx = Math.floor(Math.random() * list.length);
  if (list.length > 1 && list[idx].id === _lastTestId) {
    idx = (idx + 1) % list.length;
  }
  const card = list[idx];
  _lastTestId = card.id;
  return card;
}

/* --- Text-Fitting (robust) --- */
function fitTileText(el, minPx = 16, maxPx = 48) {
  if (!el) return;
  el.style.wordBreak = "keep-all";
  el.style.hyphens = "auto";
  // Startgröße
  let lo = minPx, hi = maxPx, best = minPx;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    el.style.fontSize = mid + "px";
    // Überläuft?
    const over = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    if (!over) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  el.style.fontSize = best + "px";
}
function fitBothTiles() {
  fitTileText(tileEs);
  fitTileText(tileDe);
}
let _fitScheduled = false;
function scheduleFit() {
  if (_fitScheduled) return;
  _fitScheduled = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try { fitBothTiles(); } finally { _fitScheduled = false; }
    });
  });
}
function ensureFitOnStartup() {
  scheduleFit();
  setTimeout(scheduleFit, 120);
  setTimeout(scheduleFit, 350);
  setTimeout(scheduleFit, 800);
  window.addEventListener("load", scheduleFit, { once: true });
}
function observeTileResize() {
  if (!("ResizeObserver" in window)) return;
  const ro = new ResizeObserver(() => scheduleFit());
  if (tileEs) ro.observe(tileEs);
  if (tileDe) ro.observe(tileDe);
}
window.addEventListener("orientationchange", () => setTimeout(scheduleFit, 140));
window.addEventListener("resize", scheduleFit);

/* ---------- Interaktion ---------- */
// Modus-Toggle
btnMode?.addEventListener("click", () => {
  mode = (mode === "lernen") ? "prüfen" : "lernen";
  revealed = (mode === "prüfen") ? false : true;
  saveData();
  render();
  applyI18n();
});

// Edit (nur Sichtbarkeit/Modus – Logik in HTML/CSS)
btnEdit?.addEventListener("click", () => {
  document.body.classList.toggle("editing");
  // Beim Umschalten neu fitten
  scheduleFit();
});

// +7 Nachschub
btnFresh?.addEventListener("click", () => {
  if (currentTestBox !== 1) currentTestBox = 1;
  const take = Math.min(batchSizeFresh, reserveCards.length);
  const added = reserveCards.splice(0, take).map(c => ({ ...c, box: 1 }));
  activeCards.push(...added);
  mode = "lernen";
  revealed = true;
  learnIndex = Math.max(0, activeCards.filter(c => c.box === 1).length - added.length);
  saveData();
  render();
});

// Richtung
toggleDirectionBtn?.addEventListener("click", () => {
  direction = (direction === "a2b") ? "b2a" : "a2b";
  saveData();
  render();
  applyI18n();
});

// Sprache
if (langSelect) langSelect.value = uiLang;
langSelect?.addEventListener("change", () => {
  uiLang = langSelect.value;
  localStorage.setItem(LS_UI_LANG, uiLang);
  applyI18n();
  scheduleFit();
});

// Deckwechsel
function refreshDeckSelect() {
  if (!deckSelect) return;
  deckSelect.innerHTML = "";
  decks.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id; opt.textContent = d.name + (d.id === currentDeckId ? " (aktiv)" : "");
    deckSelect.appendChild(opt);
  });
  deckSelect.value = currentDeckId;
}
deckSelect?.addEventListener("change", () => {
  currentDeckId = deckSelect.value;
  activeCards = JSON.parse(localStorage.getItem(deckKey("cards")) || "[]");
  reserveCards = JSON.parse(localStorage.getItem(deckKey("reserve")) || "[]");
  learnedCards = JSON.parse(localStorage.getItem(deckKey("learned")) || "[]");
  revealed = (mode === "prüfen") ? false : true;
  saveData();
  render();
  applyI18n();
  updateImportedFilesList();
  // Labels/Placeholder neu
  const d = currentDeck();
  if (inputSideA) inputSideA.placeholder = d.sideALabel || "A";
  if (inputSideB) inputSideB.placeholder = d.sideBLabel || "B";
});

// Labels speichern
btnSaveLabels?.addEventListener("click", () => {
  const d = currentDeck(); if (!d) return;
  d.sideALabel = (inputSideA.value || "A").trim();
  d.sideBLabel = (inputSideB.value || "B").trim();
  saveData();
  render();
  applyI18n();
});

// CSV-Import
importCsv?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const text = ev.target.result;
      // CSV: "A;B" je Zeile – beide Spalten Pflicht
      const rows = text.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
      const newCards = [];
      rows.forEach(line => {
        // trenner ,; TAB erkennen
        const parts = line.split(/;|,|\t/).map(s => s.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          newCards.push({
            id: crypto.randomUUID(),
            sideA: parts[0],
            sideB: parts[1],
            box: 0, // zunächst Reserve
          });
        }
      });
      // Datei im Deck protokollieren
      const d = currentDeck();
      d.importedFiles = d.importedFiles || [];
      d.importedFiles.push(file.name);
      reserveCards.push(...newCards);
      // Automatisch 20 in Box 1 schieben, falls leer
      if (activeCards.filter(c => c.box === 1).length === 0) {
        const take = Math.min(20, reserveCards.length);
        const added = reserveCards.splice(0, take).map(c => ({ ...c, box: 1 }));
        activeCards.push(...added);
        mode = "lernen";
        revealed = true;
      }
      saveData();
      updateImportedFilesList();
      render();
    } catch {
      alert("Import fehlgeschlagen.");
    }
  };
  reader.readAsText(file);
  // Zurücksetzen, damit man dieselbe Datei erneut wählen kann
  e.target.value = "";
});

function updateImportedFilesList() {
  if (!importList) return;
  const d = currentDeck();
  importList.innerHTML = "";
  (d.importedFiles || []).forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    importList.appendChild(li);
  });
}

// Export
btnExport?.addEventListener("click", () => {
  const data = { activeCards, reserveCards, learnedCards };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "deck.json";
  a.click();
});

// Korrektur (Prüfen)
btnRight?.addEventListener("click", () => {
  if (mode !== "prüfen" || !revealed) return;
  const bx = activeCards.filter(c => c.box === currentTestBox);
  if (bx.length === 0) return;
  const card = bx.find(c => cardTextA(c) === tileEs.textContent);
  if (!card) return;
  card.box = Math.min(5, card.box + 1);
  saveData();
  revealed = false;
  render();
});

btnWrong?.addEventListener("click", () => {
  if (mode !== "prüfen" || !revealed) return;
  const bx = activeCards.filter(c => c.box === currentTestBox);
  if (bx.length === 0) return;
  const card = bx.find(c => cardTextA(c) === tileEs.textContent);
  if (!card) return;
  card.box = 1;
  saveData();
  revealed = false;
  render();
});

// Tippen/Swipen auf Karten
let touchStartX = 0, touchStartY = 0, tracking = false;
function onTouchStart(ev) {
  tracking = true;
  const t = ev.touches?.[0] || ev;
  touchStartX = t.clientX; touchStartY = t.clientY;
}
function onTouchEnd(ev) {
  if (!tracking) return;
  tracking = false;
  const t = ev.changedTouches?.[0] || ev;
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  const TH = 35; // Swipe-Schwelle
  if (mode === "prüfen" && revealed) {
    if (absX > absY && absX > TH) {
      if (dx < 0) { btnWrong?.click(); return; }  // links = falsch
      if (dx > 0) { btnRight?.click(); return; }  // rechts = richtig
    }
  }
  // sonst: aufdecken (nur prüfen)
  if (mode === "prüfen" && !revealed) {
    revealed = true;
    render();
  }
}
[tileEs, tileDe].forEach(el => {
  el?.addEventListener("touchstart", onTouchStart, { passive: true });
  el?.addEventListener("touchend", onTouchEnd, { passive: true });
  el?.addEventListener("mousedown", onTouchStart);
  el?.addEventListener("mouseup", onTouchEnd);
});

/* ---------- Init ---------- */
function init() {
  // Deckliste füllen
  refreshDeckSelect();

  // Labels/Placeholder aus aktuellem Deck
  const d = currentDeck();
  if (inputSideA) inputSideA.placeholder = d.sideALabel || "A";
  if (inputSideB) inputSideB.placeholder = d.sideBLabel || "B";

  // Startstatus
  revealed = (mode === "prüfen") ? false : true;

  // UI auf Sprache
  if (langSelect) langSelect.value = uiLang;
  applyI18n();

  // Rendering
  render();

  // robustes Fitting
  ensureFitOnStartup();
  observeTileResize();

  // Import-Liste
  updateImportedFilesList();
}
init();
