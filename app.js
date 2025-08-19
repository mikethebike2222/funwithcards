/* ====== Viewport Fix ====== */
function setVH(){
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setVH();
addEventListener('resize', setVH);
addEventListener('orientationchange', ()=>{ setVH(); queueLayout(); });
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden){ setVH(); queueLayout(); }});

/* ====== Persistenter State (unverändert) ====== */
const LS_DECKS="leitnerDecks";
let decks = JSON.parse(localStorage.getItem(LS_DECKS)||"[]");
if(decks.length===0){
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  decks = [{id,name:"Spanisch ES→DE", sideA:"ES", sideB:"DE"}];
  localStorage.setItem(LS_DECKS, JSON.stringify(decks));
}
let currentDeckId = localStorage.getItem("leitnerCurrentDeck") || decks[0].id;
function deckKey(k){ return `${k}_${currentDeckId}`; }

let activeCards  = JSON.parse(localStorage.getItem(deckKey("cards"))   || "[]");
let reserveCards = JSON.parse(localStorage.getItem(deckKey("reserve")) || "[]");
let learnedCards = JSON.parse(localStorage.getItem(deckKey("learned")) || "[]");

let direction = localStorage.getItem(deckKey("direction")) || "a2b";
let mode = localStorage.getItem(deckKey("mode")) || "lernen"; // lernen|prüfen
let currentTestBox = parseInt(localStorage.getItem(deckKey("box"))||"1",10);
let showAnswer = false;
let editOpen = false;
const batchSizeFresh = 7;

/* ====== DOM ====== */
const chipPoints = qs("#pointsChip");
const chipLevel  = qs("#levelChip");
const chipStreak = qs("#streakChip");

const modeToggle = qs("#modeToggle");
const editToggle = qs("#editToggle");

const cardsArea = qs("#cardsArea");
const cardA = qs("#cardA");
const cardB = qs("#cardB");

const rfBar = qs("#rfBar");
const btnRight = qs("#btnRight");
const btnWrong = qs("#btnWrong");

const editPanel = qs("#editPanel");
const editA = qs("#editA");
const editB = qs("#editB");
const saveEditBtn = qs("#saveEditBtn");
const cancelEditBtn = qs("#cancelEditBtn");

const drawer = qs("#drawer");
qs("#drawerToggle").onclick = ()=> drawer.setAttribute("aria-hidden","false");
qs("#drawerClose").onclick  = ()=> drawer.setAttribute("aria-hidden","true");

const freshBtn = qs("#freshBtn");
const boxBadge = qs("#boxBadge");

/* Werkzeuge */
const deckSelect = qs("#deckSelect");
const deckAddBtn = qs("#deckAddBtn");
const deckRenameBtn = qs("#deckRenameBtn");
const deckDeleteBtn = qs("#deckDeleteBtn");
const sideALabel = qs("#sideALabel");
const sideBLabel = qs("#sideBLabel");
const saveLabelsBtn = qs("#saveLabelsBtn");
const langSelect = qs("#langSelect");
const toggleDirectionBtn = qs("#toggleDirectionBtn");
const csvFile = qs("#csvFile");
const pie = qs("#pieChart").getContext("2d");

/* NEU: Boxbars */
const boxBars = qs("#boxBars");

/* ====== I18N (unverändert) ====== */
const i18n = {
  de:{ edit:"Bearbeiten", wrong:"Falsch", right:"Richtig", tools:"Werkzeuge", progress:"Fortschritt", uiLang:"UI-Sprache", decks:"Übungen", direction:"Richtung", stats:"Statistik", manage:"Verwalten", delActive:"Aktive Karte löschen", resetProgress:"Nur Fortschritt", resetAll:"Alles löschen", save:"Speichern", cancel:"Abbrechen" },
  en:{ edit:"Edit", wrong:"Wrong", right:"Right", tools:"Tools", progress:"Progress", uiLang:"UI language", decks:"Decks", direction:"Direction", stats:"Stats", manage:"Manage", delActive:"Delete active card", resetProgress:"Progress only", resetAll:"Delete all", save:"Save", cancel:"Cancel" },
  sv:{ edit:"Redigera", wrong:"Fel", right:"Rätt", tools:"Verktyg", progress:"Framsteg", uiLang:"UI-språk", decks:"Övningar", direction:"Riktning", stats:"Statistik", manage:"Hantera", delActive:"Radera aktivt kort", resetProgress:"Endast framsteg", resetAll:"Radera allt", save:"Spara", cancel:"Avbryt" },
  es:{ edit:"Editar", wrong:"Mal", right:"Bien", tools:"Herramientas", progress:"Progreso", uiLang:"Idioma UI", decks:"Barajas", direction:"Dirección", stats:"Estadísticas", manage:"Gestionar", delActive:"Eliminar tarjeta activa", resetProgress:"Solo progreso", resetAll:"Borrar todo", save:"Guardar", cancel:"Cancelar" },
};
let uiLang = localStorage.getItem("uiLang") || "de";
function applyI18n(){
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k = el.getAttribute("data-i18n");
    el.textContent = (i18n[uiLang] && i18n[uiLang][k]) || el.textContent;
  });
  modeToggle.textContent = mode==="lernen" ? "Lernen" : "Prüfen";
  editToggle.innerHTML = `✏️ ${i18n[uiLang].edit}`;
}
applyI18n();

/* ====== Helpers ====== */
function qs(s){ return document.querySelector(s); }
function save(){
  localStorage.setItem(LS_DECKS, JSON.stringify(decks));
  localStorage.setItem("leitnerCurrentDeck", currentDeckId);
  localStorage.setItem(deckKey("cards"), JSON.stringify(activeCards));
  localStorage.setItem(deckKey("reserve"), JSON.stringify(reserveCards));
  localStorage.setItem(deckKey("learned"), JSON.stringify(learnedCards));
  localStorage.setItem(deckKey("direction"), direction);
  localStorage.setItem(deckKey("mode"), mode);
  localStorage.setItem(deckKey("box"), String(currentTestBox));
}
function currentDeck(){ return decks.find(d=>d.id===currentDeckId)||decks[0]; }

/* ====== Text-Fit ====== */
function fitText(el, min=16, max=72){
  const availW = el.clientWidth, availH = el.clientHeight;
  let lo=min, hi=max, best=min;
  el.style.wordBreak="keep-all"; el.style.hyphens="auto";
  while(lo<=hi){
    const m=(lo+hi>>1);
    el.style.fontSize=m+"px";
    if(el.scrollWidth<=availW && el.scrollHeight<=availH){ best=m; lo=m+1; }
    else { hi=m-1; }
  }
  el.style.fontSize=best+"px";
}

/* ====== RF-Bar Sichtbarkeit (NEU) ====== */
function setRF(show){
  rfBar.style.display = show ? 'flex' : 'none';
  rfBar.setAttribute('aria-hidden', show ? 'false' : 'true');
}

/* ====== Render ====== */
let currentIndex = 0;
let currentCard = null;

function pickLearnCard(){
  const b1 = activeCards.filter(c=>c.box===1);
  if(b1.length===0) return null;
  currentIndex = (currentIndex + b1.length) % b1.length;
  return b1[currentIndex];
}
function pickTestCard(){
  const pool = activeCards.filter(c=>c.box===currentTestBox);
  if(pool.length===0) return null;
  if(currentCard && pool.length>1){
    let next; do{ next = pool[Math.floor(Math.random()*pool.length)]; }while(next===currentCard);
    return next;
  }
  return pool[Math.floor(Math.random()*pool.length)];
}

function render(){
  const isLandscape = matchMedia("(orientation:landscape)").matches;
  boxBadge.style.display = isLandscape ? "block" : "none";

  const deck = currentDeck();
  const A = deck.sideA || "A", B = deck.sideB || "B";
  toggleDirectionBtn.textContent = direction==="a2b" ? `${A} → ${B}` : `${B} → ${A}`;

  if(mode==="lernen"){
    setRF(false);                    // <<< RF-Bar im Lernen NIE sichtbar
    const c = pickLearnCard();
    if(!c){ cardA.textContent="Keine Karten"; cardB.textContent=""; fitText(cardA); fitText(cardB); updateBoxUI(); return; }
    cardA.textContent = direction==="a2b" ? c.sideA : c.sideB;
    cardB.textContent = direction==="a2b" ? c.sideB : c.sideA;
    fitText(cardA); fitText(cardB);
  }else{
    if(!currentCard) currentCard = pickTestCard();
    if(!currentCard){ cardA.textContent="Keine Karten"; cardB.textContent=""; setRF(false); fitText(cardA); fitText(cardB); updateBoxUI(); return; }
    cardA.textContent = direction==="a2b" ? currentCard.sideA : currentCard.sideB;
    cardB.textContent = showAnswer ? (direction==="a2b" ? currentCard.sideB : currentCard.sideA) : "";
    setRF(showAnswer);               // <<< RF-Bar nur NACH Aufdecken sichtbar
    fitText(cardA); fitText(cardB);
  }

  // Badge
  const countInBox = activeCards.filter(c=>c.box===currentTestBox).length;
  boxBadge.textContent = `B${currentTestBox}: ${countInBox}`;

  // Mode-Button
  modeToggle.textContent = mode==="lernen" ? "Lernen" : "Prüfen";

  updateBoxUI();
}

/* ====== Swipe/Tap Gesten ====== */
(function addGestures(){
  let sx=0, sy=0, dx=0, dy=0, moved=false;
  cardsArea.addEventListener("touchstart", e=>{
    const t=e.touches[0]; sx=t.clientX; sy=t.clientY; dx=dy=0; moved=false;
  },{passive:true});
  cardsArea.addEventListener("touchmove", e=>{
    const t=e.touches[0]; dx=t.clientX-sx; dy=t.clientY-sy;
    if(Math.abs(dx)>12||Math.abs(dy)>12) moved=true;
    if(Math.abs(dx) > Math.abs(dy) + 6) e.preventDefault();
  },{passive:false});
  cardsArea.addEventListener("touchend", ()=>{
    const absX=Math.abs(dx), absY=Math.abs(dy);
    const isSwipe = absX>40 && absX>absY;
    if(!isSwipe){
      // Tap
      if(mode==="lernen"){ currentIndex++; render(); }
      else { if(!showAnswer){ showAnswer=true; render(); } }
      return;
    }
    // Horizontaler Swipe
    if(mode==="lernen"){
      currentIndex++; render();
    }else if(showAnswer){
      if(dx>0) btnRight.click(); else btnWrong.click();
    }else{
      showAnswer=true; render();
    }
  });
})();

/* ====== Buttons ====== */
modeToggle.onclick = ()=>{
  mode = (mode==="lernen") ? "prüfen" : "lernen";
  showAnswer=false; currentCard=null; save(); render();
};

editToggle.onclick = ()=>{
  editOpen = !editOpen;
  if(editOpen){
    const c = (mode==="lernen") ? pickLearnCard() : (currentCard || pickTestCard());
    editA.value = direction==="a2b" ? (c?.sideA||"") : (c?.sideB||"");
    editB.value = direction==="a2b" ? (c?.sideB||"") : (c?.sideA||"");
    editPanel.hidden=false; setTimeout(()=>editA.focus(),10);
  }else{
    editPanel.hidden=true;
  }
};
saveEditBtn.onclick = ()=>{
  const A=editA.value.trim(), B=editB.value.trim();
  if(!A||!B) return;
  const target = (mode==="lernen") ? pickLearnCard() : currentCard;
  if(!target) return;
  if(direction==="a2b"){ target.sideA=A; target.sideB=B; } else { target.sideA=B; target.sideB=A; }
  save(); render(); editPanel.hidden=true; editOpen=false;
};
cancelEditBtn.onclick = ()=>{ editPanel.hidden=true; editOpen=false; };

btnRight.onclick = ()=>{
  if(mode!=="prüfen"||!currentCard) return;
  if(currentCard.box>=5){
    activeCards = activeCards.filter(c=>c!==currentCard);
    learnedCards.push({...currentCard, learnedAt:new Date().toISOString()});
  }else{
    currentCard.box += 1;
    currentCard.lastSeen = new Date().toISOString();
  }
  showAnswer=false; currentCard=null; save(); render();
};
btnWrong.onclick = ()=>{
  if(mode!=="prüfen"||!currentCard) return;
  currentCard.box = Math.max(1, currentCard.box-1);
  currentCard.wrong = (currentCard.wrong||0)+1;
  currentCard.lastSeen = new Date().toISOString();
  showAnswer=false; currentCard=null; save(); render();
};

/* ====== Drawer ====== */
freshBtn.onclick = ()=>{
  const take = Math.min(batchSizeFresh, reserveCards.length);
  const add = reserveCards.splice(0,take).map(c=>({...c, box:1}));
  activeCards.push(...add);
  mode="lernen"; showAnswer=false; currentIndex = Math.max(0, activeCards.filter(c=>c.box===1).length - add.length);
  save(); render();
};

/* Decks */
function rebuildDeckSelect(){
  deckSelect.innerHTML="";
  decks.forEach(d=>{
    const o=document.createElement("option");
    o.value=d.id; o.textContent=`${d.name} ${d.id===currentDeckId?"(aktiv)":""}`;
    deckSelect.appendChild(o);
  });
  deckSelect.value=currentDeckId;
  sideALabel.value = currentDeck().sideA || "A";
  sideBLabel.value = currentDeck().sideB || "B";
}
rebuildDeckSelect();
deckSelect.onchange = ()=>{
  currentDeckId=deckSelect.value; save();
  activeCards  = JSON.parse(localStorage.getItem(deckKey("cards"))||"[]");
  reserveCards = JSON.parse(localStorage.getItem(deckKey("reserve"))||"[]");
  learnedCards = JSON.parse(localStorage.getItem(deckKey("learned"))||"[]");
  direction = localStorage.getItem(deckKey("direction")) || "a2b";
  mode = localStorage.getItem(deckKey("mode")) || "lernen";
  currentTestBox = parseInt(localStorage.getItem(deckKey("box"))||"1",10);
  render();
};
deckAddBtn.onclick = ()=>{
  const name=prompt("Name der neuen Übung:"); if(!name) return;
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  decks.push({id,name, sideA:"A", sideB:"B"});
  currentDeckId=id; activeCards=[]; reserveCards=[]; learnedCards=[];
  save(); rebuildDeckSelect(); render();
};
deckRenameBtn.onclick=()=>{
  const d=currentDeck(); if(!d) return;
  const name=prompt("Neuer Name:", d.name); if(!name) return;
  d.name=name; save(); rebuildDeckSelect();
};
deckDeleteBtn.onclick=()=>{
  if(decks.length<=1) return alert("Mindestens eine Übung muss bleiben.");
  if(!confirm("Diese Übung wirklich löschen?")) return;
  const id=currentDeckId;
  ["cards","reserve","learned","direction","mode","box"].forEach(k=>localStorage.removeItem(deckKey(k)));
  decks = decks.filter(d=>d.id!==id);
  currentDeckId = decks[0].id; save(); rebuildDeckSelect();
  activeCards  = JSON.parse(localStorage.getItem(deckKey("cards"))||"[]");
  reserveCards = JSON.parse(localStorage.getItem(deckKey("reserve"))||"[]");
  learnedCards = JSON.parse(localStorage.getItem(deckKey("learned"))||"[]");
  render();
};

saveLabelsBtn.onclick=()=>{
  const d=currentDeck(); if(!d) return;
  d.sideA=sideALabel.value.trim()||"A"; d.sideB=sideBLabel.value.trim()||"B";
  save(); render();
};

/* Sprache */
langSelect.value = uiLang;
langSelect.onchange = ()=>{ uiLang=langSelect.value; localStorage.setItem("uiLang",uiLang); applyI18n(); };

/* Richtung */
toggleDirectionBtn.onclick = ()=>{ direction = (direction==="a2b")?"b2a":"a2b"; save(); render(); };

/* CSV Import */
csvFile.addEventListener("change", ev=>{
  const file=ev.target.files[0]; if(!file) return;
  const rdr=new FileReader();
  rdr.onload=e=>{
    const buf=e.target.result;
    const decs=[new TextDecoder("utf-8"), new TextDecoder("windows-1252"), new TextDecoder("iso-8859-1")];
    let text="", used="utf-8";
    for(const d of decs){
      const t=d.decode(buf); const bad=(t.match(/\uFFFD/g)||[]).length;
      if(bad===0){ text=t; used=d.encoding||used; break; }
      if(!text) text=t;
    }
    const lines=text.split(/\r?\n/); let imported=0;
    for(const raw of lines){
      const s=raw.trim(); if(!s) continue;
      const sep=(s.includes(";")&&(!s.includes(",")||s.indexOf(";")<s.indexOf(",")))?";":",";
      const [a,b]=s.split(sep).map(x=>x?.trim().replace(/^"(.*)"$/,"$1"));
      if(!a||!b) continue;
      if(activeCards.some(c=>c.sideA===a)||reserveCards.some(c=>c.sideA===a)||learnedCards.some(c=>c.sideA===a)) continue;
      reserveCards.push({sideA:a, sideB:b, box:1});
      imported++;
    }
    save(); alert(`Import: ${imported} Einträge (Encoding: ${used})`);
    render();
  };
  rdr.readAsArrayBuffer(file);
});

/* Manage */
qs("#deleteBtn").onclick=()=>{
  const c=(mode==="lernen")?pickLearnCard():currentCard;
  if(!c) return;
  if(!confirm("Aktive Karte löschen?")) return;
  const i=activeCards.indexOf(c); if(i>=0) activeCards.splice(i,1);
  currentCard=null; save(); render();
};
qs("#resetProgressBtn").onclick=()=>{
  if(!confirm("Nur Lernfortschritt zurücksetzen?")) return;
  activeCards=activeCards.map(c=>({...c, box:1, lastSeen:null, wrong:0}));
  save(); render();
};
qs("#resetAllBtn").onclick=()=>{
  if(!confirm("Alle Daten dieser Übung löschen?")) return;
  activeCards=[]; reserveCards=[]; learnedCards=[];
  save(); render();
};

/* ====== Stats & Box Bars ====== */
function drawPie(){
  const total = activeCards.length + reserveCards.length + learnedCards.length;
  pie.clearRect(0,0,220,220);
  if(!total) return;
  const data=[
    {v:activeCards.length, c:"#3b82f6"},
    {v:reserveCards.length, c:"#f59e0b"},
    {v:learnedCards.length, c:"#10b981"},
  ];
  let a=-Math.PI/2;
  data.forEach(s=>{
    const ang=s.v/total*2*Math.PI;
    pie.beginPath(); pie.moveTo(110,110);
    pie.arc(110,110,100,a,a+ang); pie.closePath();
    pie.fillStyle=s.c; pie.fill(); a+=ang;
  });
}

function updateBoxUI(){
  const counts=[1,2,3,4,5].map(i=>activeCards.filter(c=>c.box===i).length);
  const max=Math.max(...counts,1);
  boxBars.innerHTML="";
  counts.forEach((cnt, i)=>{
    const div=document.createElement("div");
    div.className="boxbar"+(currentTestBox===i+1?" active":"");
    div.style.height = Math.max(10, Math.round(90*cnt/max))+"px";
    const label=document.createElement("span"); label.textContent=`B${i+1}: ${cnt}`;
    div.appendChild(label);
    div.onclick=()=>{
      currentTestBox=i+1;
      mode = (currentTestBox===1) ? "lernen" : "prüfen";
      showAnswer=false; currentCard=null;
      save(); render();
    };
    boxBars.appendChild(div);
  });
}

/* ====== Layout Tick ====== */
let raf=null;
function queueLayout(){ if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{ render(); drawPie(); }); }

/* ====== Init ====== */
function init(){
  rebuildDeckSelect();
  applyI18n();
  render(); drawPie();
}
init();
