/* ===== Bestehender State/Storage bleibt unverändert ===== */
const LS_DECKS = "leitnerDecks";
let decks = JSON.parse(localStorage.getItem(LS_DECKS) || "[]");
if (decks.length === 0) {
  const id = crypto.randomUUID();
  decks = [{ id, name: "Default", sideALabel: "A", sideBLabel: "B" }];
  localStorage.setItem(LS_DECKS, JSON.stringify(decks));
}
let currentDeckId = localStorage.getItem("leitnerCurrentDeck") || decks[0].id;
function deckKey(k){ return `${k}_${currentDeckId}`; }

let activeCards = JSON.parse(localStorage.getItem(deckKey("cards")) || "[]");
let reserveCards = JSON.parse(localStorage.getItem(deckKey("reserve")) || "[]");
let learnedCards = JSON.parse(localStorage.getItem(deckKey("learned")) || "[]");

let mode = "lernen";               // "lernen" | "prüfen"
let direction = "a2b";             // "a2b" | "b2a"
let currentTestBox = 1;
let learnIndex = 0;
let currentCard = null;
let revealState = "prompt";        // "prompt" | "answer"

/* ===== DOM ===== */
const modeToggleBtn = document.getElementById('modeToggleBtn');
const editBtn = document.getElementById('editBtn');
const fabMenu = document.getElementById('fabMenu');

const leftTile = document.getElementById('tileLeft');
const rightTile = document.getElementById('tileRight');

const answerBar = document.getElementById('answerBar');
const btnWrong = document.getElementById('btnWrong');
const btnRight = document.getElementById('btnRight');

const modeTopLeft = document.getElementById('modeTopLeft');
const boxBadgeTopRight = document.getElementById('boxBadgeTopRight');

const boxChart = document.getElementById('boxChart');
const drawer = document.getElementById('drawer');
const drawerClose = document.getElementById('drawerClose');
const freshBtn = document.getElementById('freshBtn');

const langSelect = document.getElementById('langSelect');
const deckSelect = document.getElementById('deckSelect');
const sideALabelInput = document.getElementById('sideALabelInput');
const sideBLabelInput = document.getElementById('sideBLabelInput');
const saveLabelsBtn = document.getElementById('saveLabelsBtn');
const toggleDirectionBtn = document.getElementById('toggleDirectionBtn');

const csvFile = document.getElementById('csvFile');
const pointsChip=document.getElementById("pointsChip"), levelChip=document.getElementById("levelChip"), streakChip=document.getElementById("streakChip");

/* ===== Utilities ===== */
function saveData(){
  localStorage.setItem(LS_DECKS, JSON.stringify(decks));
  localStorage.setItem("leitnerCurrentDeck", currentDeckId);
  localStorage.setItem(deckKey("cards"), JSON.stringify(activeCards));
  localStorage.setItem(deckKey("reserve"), JSON.stringify(reserveCards));
  localStorage.setItem(deckKey("learned"), JSON.stringify(learnedCards));
}
const currentDeck = ()=> decks.find(d=>d.id===currentDeckId) || decks[0];
function dirText(){ const d=currentDeck(); const A=d?.sideALabel||"A"; const B=d?.sideBLabel||"B"; return direction==='a2b' ? `${A} → ${B}` : `${B} → ${A}`; }

/* ===== Orientation & Scroll Lock ===== */
const isLandscape = () => window.matchMedia('(orientation: landscape)').matches;
function applyScrollLock(){
  if(isLandscape()){
    document.documentElement.style.height='100svh';
    document.body.style.height='100svh';
    document.body.style.overflow='hidden';
  }else{
    document.documentElement.style.height='';
    document.body.style.height='';
    document.body.style.overflowX='hidden';
    document.body.style.overflowY='auto';
  }
}
addEventListener('resize', applyScrollLock);
addEventListener('orientationchange', ()=>setTimeout(applyScrollLock,50));
applyScrollLock();

/* ===== Fit-Routine (keine Silbentrennung mitten im Wort) ===== */
function fitText(el, maxSteps=28, minPx=14){
  let size = parseFloat(getComputedStyle(el).fontSize) || 36;
  const parent = el.parentElement;
  let steps=0;
  while(steps < maxSteps && (
    el.scrollWidth > parent.clientWidth - 2 ||
    el.scrollHeight > parent.clientHeight - 2
  )){
    size -= 1;
    if(size < minPx) break;
    el.style.fontSize = size + 'px';
    steps++;
  }
}
function setCardText(tileEl, text){
  const t = tileEl.querySelector('.txt');
  t.textContent = text || '';
  requestAnimationFrame(()=>fitText(t));
}

/* ===== Prüfen-Flow ===== */
function updateAnswerBar(){
  const show = (mode === 'prüfen' && revealState === 'answer');
  answerBar.classList.toggle('show', show);
}
function attachTestReveal(){
  [leftTile, rightTile].forEach(el=>{
    if(el._revealBound) return;
    el.addEventListener('click', ()=>{
      if(mode!=='prüfen' || !currentCard) return;
      if(revealState==='prompt'){
        // Antwort auf rechter Karte zeigen
        setCardText(rightTile, direction==='a2b' ? currentCard.sideB : currentCard.sideA);
        revealState='answer';
        updateAnswerBar();
      }
    }, {passive:true});
    el._revealBound = true;
  });
}
attachTestReveal();

if(!btnWrong._bound){
  btnWrong.addEventListener('click', ()=>handleAnswer(false));
  btnRight.addEventListener('click', ()=>handleAnswer(true));
  btnWrong._bound = btnRight._bound = true;
}
function handleAnswer(correct){
  if(mode!=='prüfen' || revealState!=='answer' || !currentCard) return;
  // ---- dein bisheriger Auf-/Abstieg / Punkte:
  if(correct){
    // Beispiel: Aufstieg oder learned
    if(currentCard.box >= 5){
      activeCards = activeCards.filter(c=>c!==currentCard);
      learnedCards.push({...currentCard, learnedAt: new Date().toISOString()});
    }else{
      currentCard.box += 1;
      currentCard.lastSeen = new Date().toISOString();
    }
  }else{
    currentCard.box = Math.max(1, (currentCard.box||1)-1);
    currentCard.wrong = (currentCard.wrong||0)+1;
    currentCard.lastSeen = new Date().toISOString();
  }
  saveData();
  revealState='prompt';
  pickNextTestCard();
  render();
}

/* ===== Kartenwahl ===== */
function getBoxCount(b){ return activeCards.filter(c=>c.box===b).length; }
function pickNextTestCard(){
  const pool = activeCards.filter(c=>c.box===currentTestBox);
  if(!pool.length){ currentCard = null; return; }
  currentCard = pool[Math.floor(Math.random()*pool.length)];
}

/* ===== Render ===== */
function render(){
  // Toggle Labels
  const labelLearn = 'Lernen';
  const labelTest  = 'Prüfen';
  modeToggleBtn.textContent = (mode==='lernen') ? labelLearn : labelTest;
  modeTopLeft.textContent   = (mode==='lernen') ? labelLearn : labelTest;

  // Direction Button text
  toggleDirectionBtn.textContent = dirText();

  if(mode==='lernen'){
    const b1 = activeCards.filter(c=>c.box===1);
    currentCard = b1.length ? b1[learnIndex % b1.length] : null;
    setCardText(leftTile,  currentCard ? (direction==='a2b'? currentCard.sideA : currentCard.sideB) : '—');
    setCardText(rightTile, currentCard ? (direction==='a2b'? currentCard.sideB : currentCard.sideA) : '—');
  }else{
    pickNextTestCard();
    setCardText(leftTile,  currentCard ? (direction==='a2b'? currentCard.sideA : currentCard.sideB) : '—');
    setCardText(rightTile, ''); // leer bis Reveal
  }

  // Answer bar
  updateAnswerBar();

  // Landscape badge
  const n = getBoxCount(currentTestBox);
  boxBadgeTopRight.textContent = `B${currentTestBox}: ${n}`;

  // Bars (portrait) – einfache Visualisierung
  if(boxChart){
    boxChart.innerHTML='';
    const counts=[1,2,3,4,5].map(getBoxCount);
    const max=Math.max(...counts,1);
    counts.forEach((val,idx)=>{
      const d=document.createElement('div');
      d.className='bar';
      d.style.height = (val/max*100)+'%';
      d.title=`B${idx+1}: ${val}`;
      d.addEventListener('click', ()=>{
        currentTestBox = idx+1;
        mode = (currentTestBox===1) ? 'lernen' : 'prüfen';
        revealState='prompt';
        render();
      });
      boxChart.appendChild(d);
    });
  }
}

/* ===== Gesten (Lernen) – entprellt, kein Vertikal-Swipe) ===== */
let swipeLock=false;
function nextLearnCard(){
  if(swipeLock) return;
  swipeLock=true;
  const b1len = activeCards.filter(c=>c.box===1).length;
  if(b1len>0) learnIndex = (learnIndex + 1) % b1len;
  render();
  setTimeout(()=>swipeLock=false, 180);
}
function bindLearnGestures(){
  const area = document.querySelector('.cards');
  if(area._learnBound) return;
  let startX=0,startY=0,dx=0,dy=0,active=false;
  const THX=40, THY=60;
  area.addEventListener('touchstart',(e)=>{ const t=e.touches[0]; startX=t.clientX; startY=t.clientY; dx=dy=0; active=true; },{passive:true});
  area.addEventListener('touchmove',(e)=>{ if(!active)return; const t=e.touches[0]; dx=t.clientX-startX; dy=t.clientY-startY; },{passive:true});
  area.addEventListener('touchend',()=>{ if(!active)return; active=false; if(Math.abs(dy)>THY) return; nextLearnCard(); });
  area._learnBound=true;
}
bindLearnGestures();

/* ===== Buttons / Drawer ===== */
if(!modeToggleBtn._bound){
  modeToggleBtn.addEventListener('click', ()=>{ mode=(mode==='lernen')?'prüfen':'lernen'; revealState='prompt'; render(); });
  modeToggleBtn._bound=true;
}
if(!modeTopLeft._bound){
  modeTopLeft.addEventListener('click', ()=>{ mode=(mode==='lernen')?'prüfen':'lernen'; revealState='prompt'; render(); });
  modeTopLeft._bound=true;
}
if(!editBtn._bound){
  editBtn.addEventListener('click', ()=>{ openEditorFor(currentCard); });
  editBtn._bound=true;
}
if(!fabMenu._bound){
  fabMenu.addEventListener('click', ()=> drawer.classList.add('open'));
  fabMenu._bound=true;
}
drawerClose.addEventListener('click', ()=> drawer.classList.remove('open'));

/* ===== +7 (aus Reserve nach Box1) ===== */
freshBtn.addEventListener('click', ()=>{
  const take = Math.min(7, reserveCards.length);
  if(take<=0) return;
  const add = reserveCards.splice(0, take).map(c=>({...c, box:1, lastSeen:null, introduced:false}));
  activeCards.push(...add);
  mode='lernen';
  learnIndex = Math.max(0, activeCards.filter(c=>c.box===1).length - add.length);
  saveData();
  render();
});

/* ===== Richtung & Labels ===== */
toggleDirectionBtn.addEventListener('click', ()=>{ direction = (direction==='a2b') ? 'b2a' : 'a2b'; render(); });
saveLabelsBtn.addEventListener('click', ()=>{
  const d = currentDeck(); if(!d) return;
  d.sideALabel = sideALabelInput.value.trim() || 'A';
  d.sideBLabel = sideBLabelInput.value.trim() || 'B';
  saveData(); render();
});

/* ===== CSV Import (A,B) ===== */
csvFile.addEventListener('change', (ev)=>{
  const file=ev.target.files[0]; if(!file) return;
  const rdr=new FileReader();
  rdr.onload=e=>{
    try{
      const raw=e.target.result;
      const lines = raw.split(/\r?\n/);
      let imported=0;
      lines.forEach(line=>{
        if(!line.trim()) return;
        const sep = (line.includes(';') && (!line.includes(',') || line.indexOf(';')<line.indexOf(',')))?';':',';
        const [a,b] = line.split(sep).map(s=>s?.trim().replace(/^"(.*)"$/,'$1'));
        if(!a||!b) return;
        const exists = activeCards.some(c=>c.sideA===a) || reserveCards.some(c=>c.sideA===a) || learnedCards.some(c=>c.sideA===a);
        if(!exists){ reserveCards.push({sideA:a, sideB:b, box:1, lastSeen:null, introduced:false, wrong:0}); imported++; }
      });
      saveData();
      alert(`Importiert: ${imported}`);
      render();
    }catch(err){ alert('Import fehlgeschlagen'); }
  };
  rdr.readAsText(file);
});

/* ===== Decks init ===== */
function rebuildDeckSelect(){
  deckSelect.innerHTML='';
  decks.forEach(d=>{
    const o=document.createElement('option');
    o.value=d.id; o.textContent=d.name + (d.id===currentDeckId?' (aktiv)':'');
    deckSelect.appendChild(o);
  });
  deckSelect.value=currentDeckId;
  sideALabelInput.value = currentDeck().sideALabel || 'A';
  sideBLabelInput.value = currentDeck().sideBLabel || 'B';
}
deckSelect.addEventListener('change', ()=>{
  currentDeckId = deckSelect.value;
  activeCards = JSON.parse(localStorage.getItem(deckKey("cards")) || "[]");
  reserveCards = JSON.parse(localStorage.getItem(deckKey("reserve")) || "[]");
  learnedCards = JSON.parse(localStorage.getItem(deckKey("learned")) || "[]");
  rebuildDeckSelect();
  render();
});

/* ===== Editor-Platzhalter – nutze deinen vorhandenen Editor ===== */
function openEditorFor(card){
  // Öffne dein bestehendes Edit-Panel; falls keins offen ist, könnte man ein Sheet zeigen.
  // Platzhalter:
  if(!card){ alert('Keine Karte aktiv.'); return; }
  // Beispielhaft:
  drawer.classList.add('open');
  sideALabelInput.focus();
}

/* ===== Start ===== */
function init(){
  rebuildDeckSelect();
  mode='lernen';
  render();
}
init();
