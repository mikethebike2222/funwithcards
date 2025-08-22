/* =========================================================================
   Vokabeltrainer – app.js  (komplette, defensive Version)
   Enthält Fixes:
   - sichere UI-Overlays (ui-hidden statt hidden)
   - Judge-Bar nur zeigen bei Prüfmodus + revealed
   - Text-Fit sofort beim Start & nach jeder Layoutänderung
   - Deck-/CSV-Import aktualisiert Charts, UI, Fit
   - UI-Sprache aktualisiert alle sichtbaren Texte
   ========================================================================= */

/* -------------------------- State & Storage -------------------------- */
const LS_DECKS = "leitnerDecks";
const LS_CURRENT_DECK = "leitnerCurrentDeck";

const state = {
  mode: "lernen",         // "lernen" | "pruefen"
  revealed: true,         // im Lernen: true (beide Seiten), im Prüfen erst nach revealAnswer()
  currentBox: 1,          // aktive Box in Prüfen/Diagramm
  uiLang: localStorage.getItem("uiLang") || "de",
  combo: 0
};

let decks = safeParse(localStorage.getItem(LS_DECKS), []);
if (decks.length === 0) {
  const id = crypto?.randomUUID?.() || "deck-default";
  decks = [{ id, name: "Default", sideALabel: "A", sideBLabel: "B", csvNames: [] }];
  localStorage.setItem(LS_DECKS, JSON.stringify(decks));
}
let currentDeckId = localStorage.getItem(LS_CURRENT_DECK) || decks[0].id;

function deckKey(suffix){ return `${suffix}_${currentDeckId}`; }

let activeCards  = safeParse(localStorage.getItem(deckKey("cards")),   []);
let reserveCards = safeParse(localStorage.getItem(deckKey("reserve")), []);
let learnedCards = safeParse(localStorage.getItem(deckKey("learned")), []);

function safeParse(str, fallback){
  try { return JSON.parse(str ?? "") ?? fallback; } catch { return fallback; }
}

function persist(){
  localStorage.setItem(LS_DECKS, JSON.stringify(decks));
  localStorage.setItem(LS_CURRENT_DECK, currentDeckId);
  localStorage.setItem(deckKey("cards"),   JSON.stringify(activeCards));
  localStorage.setItem(deckKey("reserve"), JSON.stringify(reserveCards));
  localStorage.setItem(deckKey("learned"), JSON.stringify(learnedCards));
  localStorage.setItem("uiLang", state.uiLang);
}

/* -------------------------- DOM Helpers -------------------------- */
const $ = (sel) => document.querySelector(sel);
const byId = (id) => document.getElementById(id);

// Kern-Elemente (defensiv – können fehlen)
const elTileA           = byId("tileA") || byId("tileEs") || byId("tileFront") || byId("tile1");
const elTileB           = byId("tileB") || byId("tileDe") || byId("tileBack")  || byId("tile2");
const elJudgeBar        = byId("judgeBar");
const elBtnWrong        = byId("btnWrong");
const elBtnRight        = byId("btnRight");
const elModeToggle      = byId("modeToggle");      // Button „Lernen/Prüfen“
const elEditBtn         = byId("editBtn");         // Button „Bearbeiten“
const elFabMenu         = byId("menuBtn");         // FAB / Menü
const elDrawer          = byId("drawer");
const elDrawerToggle    = byId("drawerToggle") || elFabMenu;
const elDrawerClose     = byId("drawerClose");
const elDeckSelect      = byId("deckSelect");
const elLangSelect      = byId("langSelect");
const elImportFile      = byId("importFile");
const elAdd7Btn         = byId("freshBtn") || byId("add7Btn");
const elBoxChart        = byId("boxChart");
const elPieChart        = byId("pieChart");
const elBoxBadge        = byId("landInfoText") || byId("boxBadge");
const elDirectionBadge  = byId("directionBadge");
const elToggleDirection = byId("toggleDirectionBtn");
const inputA            = byId("inputSideA");
const inputB            = byId("inputSideB");
const saveLabelsBtn     = byId("saveLabelsBtn");
const sideALabelInput   = byId("sideALabelInput");
const sideBLabelInput   = byId("sideBLabelInput");

// Slide-Up Panel & Landscape-Rail (optional)
const elSlideUpPanel    = byId("slideupPanel");
const elLandscapeRail   = byId("landscapeRail");

/* -------------------------- i18n -------------------------- */
const I18N = {
  de: {
    learn: "Lernen",
    test: "Prüfen",
    edit: "Bearbeiten",
    good: "Richtig",
    bad: "Falsch",
    boxPrefix: "B",
    none: "Keine Karten",
    a: "A",
    b: "B"
  },
  en: {
    learn: "Learn",
    test: "Test",
    edit: "Edit",
    good: "Correct",
    bad: "Wrong",
    boxPrefix: "B",
    none: "No cards",
    a: "A",
    b: "B"
  },
  es: {
    learn: "Aprender",
    test: "Probar",
    edit: "Editar",
    good: "Correcto",
    bad: "Fallo",
    boxPrefix: "C",
    none: "Sin tarjetas",
    a: "A",
    b: "B"
  },
  sv: {
    learn: "Lära",
    test: "Testa",
    edit: "Redigera",
    good: "Rätt",
    bad: "Fel",
    boxPrefix: "L",
    none: "Inga kort",
    a: "A",
    b: "B"
  }
};
function t(key){ return (I18N[state.uiLang] && I18N[state.uiLang][key]) || I18N.de[key] || key; }

/* -------------------------- Deck helpers -------------------------- */
function currentDeck(){
  return decks.find(d=>d.id===currentDeckId) || decks[0];
}
function currentBoxCount(){
  return activeCards.filter(c=>c.box===state.currentBox).length;
}

/* -------------------------- UI Overlay visibility (Fix) -------------------------- */
function uiShow(el){ if (el) el.classList.remove("ui-hidden"); }
function uiHide(el){ if (el) el.classList.add("ui-hidden"); }

function updateJudgeBarVisibility(){
  if (!elJudgeBar) return;
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  const shouldShow = portrait && state.mode === "pruefen" && state.revealed === true && currentBoxCount() > 0;
  if (shouldShow) uiShow(elJudgeBar); else uiHide(elJudgeBar);
}

/* -------------------------- Fit text into tiles -------------------------- */
function fitTileText(tile, minPx=14, maxPx=120){
  if (!tile) return;
  // Inhalt messen – während Messung kein Umbruch mitten im Wort
  tile.style.wordBreak = "keep-all";
  tile.style.hyphens = "auto";
  tile.style.whiteSpace = "normal";

  // Binäre Suche für Schriftgröße
  let lo=minPx, hi=maxPx, best=minPx;
  const fits = () => (tile.scrollWidth <= tile.clientWidth+1) && (tile.scrollHeight <= tile.clientHeight+1);
  // Start bei hi und runter
  while (lo <= hi){
    const mid = Math.floor((lo+hi)/2);
    tile.style.fontSize = mid + "px";
    if (fits()){ best = mid; lo = mid+1; } else { hi = mid-1; }
  }
  tile.style.fontSize = best + "px";
}

function fitAllTilesSoon(){
  // nach next paint, dann noch einmal nach kurzer Zeit (falls Fonts laden)
  requestAnimationFrame(()=>{
    setTimeout(()=>{
      fitTileText(elTileA);
      fitTileText(elTileB);
    }, 0);
    setTimeout(()=>{
      fitTileText(elTileA);
      fitTileText(elTileB);
    }, 120);
  });
}

/* -------------------------- Rendering -------------------------- */
function renderCards(forceShowBack=false){
  if (!elTileA || !elTileB) return;
  const cardsInBox1 = activeCards.filter(c=>c.box===1);

  if (state.mode === "lernen"){
    state.revealed = true;
    const card = cardsInBox1[learnIndex % Math.max(cardsInBox1.length,1)];
    if (!cardsInBox1.length){
      elTileA.textContent = t("none");
      elTileB.textContent = "";
    } else {
      setTileTextFromDirection(elTileA, elTileB, card);
    }
  } else {
    const bx = activeCards.filter(c=>c.box===state.currentBox);
    if (!bx.length){
      elTileA.textContent = t("none");
      elTileB.textContent = "";
      state.revealed = false;
    } else {
      const card = bx[pruefIndex % bx.length];
      // Vorderseite anzeigen
      if (!state.revealed || !forceShowBack){
        setTileFront(elTileA, elTileB, card);
      } else {
        // Rückseite
        setTileBack(elTileA, elTileB, card);
      }
    }
  }
  updateTopUI();
  updateJudgeBarVisibility();
  fitAllTilesSoon();
}

function setTileTextFromDirection(aEl, bEl, card){
  const dirA2B = (direction === "a2b");
  aEl.textContent = dirA2B ? card.sideA : card.sideB;
  bEl.textContent = dirA2B ? card.sideB : card.sideA;
}
function setTileFront(aEl, bEl, card){
  // Front = nur eine Seite sichtbar (zweite leeren)
  const dirA2B = (direction === "a2b");
  aEl.textContent = dirA2B ? card.sideA : card.sideB;
  bEl.textContent = "";
}
function setTileBack(aEl, bEl, card){
  const dirA2B = (direction === "a2b");
  aEl.textContent = dirA2B ? card.sideA : card.sideB;
  bEl.textContent = dirA2B ? card.sideB : card.sideA;
}

/* -------------------------- Mode & indices -------------------------- */
let learnIndex = 0;
let pruefIndex = 0;
let direction  = "a2b"; // "a2b" | "b2a"

function setMode(newMode){
  state.mode = newMode;
  state.revealed = (newMode === "lernen");
  renderCards();
}

function revealAnswer(){
  if (state.mode !== "pruefen") return;
  state.revealed = true;
  renderCards(true);
}

/* -------------------------- Top UI texts -------------------------- */
function updateTopUI(){
  if (elModeToggle){
    elModeToggle.textContent = (state.mode === "lernen") ? t("learn") : t("test");
  }
  if (elEditBtn) elEditBtn.textContent = t("edit");
  if (elBoxBadge){
    const d = t("boxPrefix");
    elBoxBadge.textContent = `${d}${state.currentBox}: ${currentBoxCount()}`;
  }
  if (elDirectionBadge){
    const d = currentDeck();
    const A = d.sideALabel || t("a");
    const B = d.sideBLabel || t("b");
    elDirectionBadge.textContent = (direction==="a2b") ? `${A} → ${B}` : `${B} → ${A}`;
  }
  // Judge-Buttons (sofern die Bar sichtbar ist)
  if (elBtnRight) elBtnRight.textContent = t("good");
  if (elBtnWrong) elBtnWrong.textContent = t("bad");
}

/* -------------------------- Charts (defensiv) -------------------------- */
function buildBoxChart(){
  if (!elBoxChart) return;
  elBoxChart.innerHTML = "";
  const counts = [1,2,3,4,5].map(i => activeCards.filter(c=>c.box===i).length);
  const max = Math.max(...counts, 1);
  counts.forEach((count, idx)=>{
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = (count/max*100) + "%";
    bar.title = `${t("boxPrefix")}${idx+1}: ${count}`;
    bar.addEventListener("click", ()=>{
      state.currentBox = idx+1;
      if (state.mode === "lernen" && state.currentBox !== 1){
        setMode("pruefen");
      } else {
        renderCards();
      }
    }, {passive:true});
    elBoxChart.appendChild(bar);
  });
}

function drawPieChart(){
  if (!elPieChart || !elPieChart.getContext) return;
  const ctx = elPieChart.getContext("2d");
  const w = elPieChart.width, h = elPieChart.height;
  ctx.clearRect(0,0,w,h);
  const total = activeCards.length + reserveCards.length + learnedCards.length;
  if (!total) return;
  const data = [
    {value: activeCards.length,  color:"#3b82f6"},
    {value: reserveCards.length, color:"#f59e0b"},
    {value: learnedCards.length, color:"#10b981"}
  ];
  let start = -Math.PI/2;
  const cx = w/2, cy = h/2, r = Math.min(cx, cy);
  for (const seg of data){
    const slice = (seg.value/total) * 2*Math.PI;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,start,start+slice); ctx.closePath();
    ctx.fillStyle = seg.color; ctx.fill();
    start += slice;
  }
}

/* -------------------------- Deck & CSV Import -------------------------- */
function populateDeckSelect(){
  if (!elDeckSelect) return;
  elDeckSelect.innerHTML = "";
  decks.forEach(d=>{
    const opt = document.createElement("option");
    opt.value = d.id; opt.textContent = d.name + (d.id===currentDeckId ? " (aktiv)" : "");
    elDeckSelect.appendChild(opt);
  });
  elDeckSelect.value = currentDeckId;
}

function switchDeck(id){
  if (!id || id === currentDeckId) return;
  currentDeckId = id;
  activeCards  = safeParse(localStorage.getItem(deckKey("cards")),   []);
  reserveCards = safeParse(localStorage.getItem(deckKey("reserve")), []);
  learnedCards = safeParse(localStorage.getItem(deckKey("learned")), []);
  persist();
  populateDeckSelect();
  renderCards();
  buildBoxChart();
  drawPieChart();
  fitAllTilesSoon();
  updateJudgeBarVisibility();
}

async function importJsonFile(file){
  const text = await file.text();
  const data = safeParse(text, {});
  const newActive  = Array.isArray(data.activeCards)  ? data.activeCards  : [];
  const newReserve = Array.isArray(data.reserveCards) ? data.reserveCards : [];
  const newLearned = Array.isArray(data.learnedCards) ? data.learnedCards : [];

  // falls leer → CSV-JSON aus fremder Struktur tolerieren
  if (!newActive.length && Array.isArray(data.cards)){
    data.cards.forEach(c=>c.box = c.box || 1);
    newActive.push(...data.cards);
  }

  activeCards  = newActive.map(n=>({...n, box: n.box || 1}));
  reserveCards = newReserve.map(n=>({...n, box: 1}));
  learnedCards = newLearned.map(n=>({...n, box: 5}));

  // neue Übung: Box1 automatisch befüllen (20)
  if (activeCards.filter(c=>c.box===1).length === 0 && reserveCards.length){
    const take = reserveCards.splice(0, Math.min(20,reserveCards.length))
                              .map(c=>({...c, box:1}));
    activeCards.push(...take);
  }

  // Dateiname merken
  const d = currentDeck();
  d.csvNames = Array.isArray(d.csvNames) ? d.csvNames : [];
  d.csvNames.push(file.name);

  persist();
  renderCards();
  buildBoxChart();
  drawPieChart();
  fitAllTilesSoon();
  updateJudgeBarVisibility();
}

/* -------------------------- Add +7 -------------------------- */
function addSeven(){
  const take = Math.min(7, reserveCards.length);
  const add = reserveCards.splice(0, take).map(c=>({...c, box:1}));
  activeCards.push(...add);
  persist();
  setMode("lernen"); // automatisch in Lernen
  // Lernindex ans Ende der neuen 7 setzen
  const b1 = activeCards.filter(c=>c.box===1).length;
  learnIndex = Math.max(0, b1 - add.length);
  renderCards();
  buildBoxChart();
  drawPieChart();
  fitAllTilesSoon();
}

/* -------------------------- Judge Aktionen -------------------------- */
function judgeRight(){
  if (state.mode !== "pruefen") return;
  const bx = activeCards.filter(c=>c.box===state.currentBox);
  if (!bx.length) return;
  const card = bx[pruefIndex % bx.length];
  card.box = Math.min(5, card.box+1);
  state.revealed = false;
  pruefIndex++;
  persist();
  renderCards();
  buildBoxChart();
  drawPieChart();
}

function judgeWrong(){
  if (state.mode !== "pruefen") return;
  const bx = activeCards.filter(c=>c.box===state.currentBox);
  if (!bx.length) return;
  const card = bx[pruefIndex % bx.length];
  card.box = 1;
  state.revealed = false;
  pruefIndex++;
  persist();
  renderCards();
  buildBoxChart();
  drawPieChart();
}

/* -------------------------- Language switching -------------------------- */
function applyUiLanguage(){
  // Dropdown
  if (elLangSelect) elLangSelect.value = state.uiLang;
  // alle sichtbaren Labels aktualisieren
  updateTopUI();
  // ggf. Drawer-Beschriftungen etc. (optional statische Texte)
  document.querySelectorAll("[data-i18n]").forEach(node=>{
    const key = node.getAttribute("data-i18n");
    if (key && I18N[state.uiLang][key]) node.textContent = I18N[state.uiLang][key];
  });
}

/* -------------------------- Direction & Labels -------------------------- */
function saveSideLabels(){
  const d = currentDeck(); if (!d) return;
  d.sideALabel = (sideALabelInput?.value || "").trim() || t("a");
  d.sideBLabel = (sideBLabelInput?.value || "").trim() || t("b");
  persist();
  updateTopUI();
  renderCards();
}

/* -------------------------- Gestures (kurz) -------------------------- */
// Tip auf Karte B → im Prüfmodus reveal
[elTileA, elTileB].forEach(el=>{
  if (!el) return;
  el.addEventListener("click", ()=>{
    if (state.mode === "pruefen" && !state.revealed){
      revealAnswer();
    }
  }, {passive:true});
});

/* -------------------------- Event-Wiring -------------------------- */
if (elModeToggle){
  elModeToggle.addEventListener("click", ()=>{
    setMode(state.mode==="lernen" ? "pruefen" : "lernen");
  });
}
if (elEditBtn){
  elEditBtn.addEventListener("click", ()=>{
    // nur toggeln – Implementierung deines Edit-Panels bleibt
    document.body.classList.toggle("edit-open");
  });
}
if (elDrawerToggle && elDrawer){
  elDrawerToggle.addEventListener("click", ()=> elDrawer.classList.add("open"));
}
if (elDrawerClose && elDrawer){
  elDrawerClose.addEventListener("click", ()=> elDrawer.classList.remove("open"));
}
if (elDeckSelect){
  elDeckSelect.addEventListener("change", (e)=> switchDeck(e.target.value));
}
if (elLangSelect){
  elLangSelect.addEventListener("change", (e)=>{
    state.uiLang = e.target.value || "de";
    persist();
    applyUiLanguage();
    renderCards();
  });
}
if (elImportFile){
  elImportFile.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if (!f) return;
    await importJsonFile(f);
    // zurücksetzen für erneuten Import
    e.target.value = "";
  });
}
if (saveLabelsBtn){
  saveLabelsBtn.addEventListener("click", saveSideLabels);
}
if (elToggleDirection){
  elToggleDirection.addEventListener("click", ()=>{
    direction = (direction==="a2b") ? "b2a" : "a2b";
    updateTopUI();
    renderCards();
  });
}
if (elAdd7Btn){
  elAdd7Btn.addEventListener("click", addSeven);
}
if (elBtnRight) elBtnRight.addEventListener("click", judgeRight);
if (elBtnWrong) elBtnWrong.addEventListener("click", judgeWrong);

/* -------------------------- Resize/Orientation Fixes -------------------------- */
window.addEventListener("resize", ()=>{
  updateJudgeBarVisibility();
  fitAllTilesSoon();
});
window.addEventListener("orientationchange", ()=>{
  // nach Orientationchange einmal sanft neu fitten
  setTimeout(()=>{
    updateJudgeBarVisibility();
    fitAllTilesSoon();
  }, 120);
});

/* -------------------------- Init -------------------------- */
function init(){
  populateDeckSelect();
  // falls neue Übung ohne Karten, aber Reserve hat → B1 füllen
  if (activeCards.filter(c=>c.box===1).length === 0 && reserveCards.length){
    const take = reserveCards.splice(0, Math.min(20,reserveCards.length))
                              .map(c=>({...c, box:1}));
    activeCards.push(...take);
    persist();
  }

  // Label-Inputs befüllen (wenn vorhanden)
  const d = currentDeck();
  if (sideALabelInput) sideALabelInput.value = d.sideALabel || t("a");
  if (sideBLabelInput) sideBLabelInput.value = d.sideBLabel || t("b");

  applyUiLanguage();
  renderCards();
  buildBoxChart();
  drawPieChart();

  // **Wichtig**: sofort Text-fit, damit kein "Dreh-Trigger" nötig ist
  fitAllTilesSoon();
}

init();
