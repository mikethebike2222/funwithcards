/***** Übersetzungen ****************************************************/
const T = {
  de:{title:"Vokabeltrainer",tools:"Werkzeuge",deck:"Deck:",lang:"UI-Sprache:",
      addTitle:"Neue Karte hinzufügen",addBtn:"Karte hinzufügen",importTitle:"CSV Import",
      exportBtn:"Exportieren",stats:"Statistik",fresh:"+7",noCards:"Keine Karten",
      modeLearn:"Lernen", modeTest:"Prüfen", wrong:"❌ Falsch", right:"✅ Richtig",
      blocks:{ lang:"UI-Sprache", decks:"Übungen", csv:"CSV Import", dir:"Abfrage-Richtung", stats:"Statistik", manage:"Verwalten" },
      dirBtn:"Richtung wechseln"
  },
  en:{title:"Vocabulary Trainer",tools:"Tools",deck:"Deck:",lang:"UI Language:",
      addTitle:"Add New Card",addBtn:"Add Card",importTitle:"CSV Import",
      exportBtn:"Export",stats:"Statistics",fresh:"+7",noCards:"No cards",
      modeLearn:"Learn", modeTest:"Test", wrong:"❌ Wrong", right:"✅ Right",
      blocks:{ lang:"UI Language", decks:"Exercises", csv:"CSV Import", dir:"Query Direction", stats:"Statistics", manage:"Manage" },
      dirBtn:"Switch direction"
  },
  sv:{title:"Ordkortstränare",tools:"Verktyg",deck:"Kortlek:",lang:"UI-språk:",
      addTitle:"Lägg till nytt kort",addBtn:"Lägg till kort",importTitle:"CSV-import",
      exportBtn:"Exportera",stats:"Statistik",fresh:"+7",noCards:"Inga kort",
      modeLearn:"Lära", modeTest:"Testa", wrong:"❌ Fel", right:"✅ Rätt",
      blocks:{ lang:"UI-språk", decks:"Övningar", csv:"CSV-import", dir:"Frågeriktning", stats:"Statistik", manage:"Hantera" },
      dirBtn:"Byt riktning"
  },
  es:{title:"Entrenador de Vocabulario",tools:"Herramientas",deck:"Baraja:",lang:"Idioma de UI:",
      addTitle:"Añadir tarjeta",addBtn:"Añadir",importTitle:"Importar CSV",
      exportBtn:"Exportar",stats:"Estadísticas",fresh:"+7",noCards:"Sin tarjetas",
      modeLearn:"Aprender", modeTest:"Probar", wrong:"❌ Incorrecto", right:"✅ Correcto",
      blocks:{ lang:"Idioma de UI", decks:"Ejercicios", csv:"Importar CSV", dir:"Dirección de repaso", stats:"Estadísticas", manage:"Administrar" },
      dirBtn:"Cambiar dirección"
  }
};

/***** Storage & State **************************************************/
const LS_DECKS="leitnerDecks", LS_LANG="leitnerLang";
let decks = JSON.parse(localStorage.getItem(LS_DECKS)||"[]");
if(decks.length===0){
  const id=(crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
  decks=[{id,name:"Default",sideALabel:"A",sideBLabel:"B"}];
  localStorage.setItem(LS_DECKS,JSON.stringify(decks));
}
let currentDeckId=localStorage.getItem("leitnerCurrentDeck")||decks[0].id;
let direction="a2b", mode="lernen", currentTestBox=1, learnIndex=0;
let testRevealed=false;
const batchSizeFresh=7;

function deckKey(k){ return `${k}_${currentDeckId}`; }
function normalizeCards(arr){
  if(!Array.isArray(arr)) return [];
  return arr.map(c=>({
    sideA:c.sideA ?? c.es ?? "",
    sideB:c.sideB ?? c.de ?? "",
    box:Number.isFinite(c.box)?c.box:1,
    introduced: typeof c.introduced==="boolean"?c.introduced:true,
    lastSeen:c.lastSeen||null, wrong:Number.isFinite(c.wrong)?c.wrong:0,
    id:c.id||(Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2))
  })).filter(c=>c.sideA && c.sideB);
}
let activeCards  = normalizeCards(JSON.parse(localStorage.getItem(deckKey("cards"))||"[]"));
let reserveCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("reserve"))||"[]"));
let learnedCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("learned"))||"[]"));

/***** DOM **************************************************************/
const $=id=>document.getElementById(id);
const appTitle=$("appTitle"), modeHint=$("modeHint"), toolsTitle=$("toolsTitle"),
      langBlockTitle=$("langBlockTitle"), decksBlockTitle=$("decksBlockTitle"),
      directionBlockTitle=$("directionBlockTitle"), statsTitle=$("statsTitle");
const deckLabel=$("deckLabel"), langLabel=$("langLabel"),
      addCardTitle=$("addCardTitle"), importTitle=$("importTitle"),
      exportBtn=$("exportBtn");
const deckSelect=$("deckSelect"), sideALabelInput=$("sideALabelInput"), sideBLabelInput=$("sideBLabelInput"),
      saveLabelsBtn=$("saveLabelsBtn"), langSelect=$("langSelect"),
      directionBadge=$("directionBadge"), toggleDirectionBtn=$("toggleDirectionBtn"),
      inputSideA=$("inputSideA"), inputSideB=$("inputSideB"), addCardBtn=$("addCardBtn"),
      csvFile=$("csvFile");
const landInfoText=$("landInfoText"), freshBtn=$("freshBtn"), landModeToggle=$("landModeToggle");
const landRight=$("landRight"), landWrong=$("landWrong"), landActions=$("landActions");
const learnPair=$("learnPair"), tileEs=$("tileEs"), tileDe=$("tileDe");
const testPair=$("testPair"), testLeft=$("testLeft"), testRight=$("testRight");
const testActions=$("testActions"), btnWrong=$("btnWrong"), btnRight=$("btnRight");
const drawer=$("drawer"), drawerToggle=$("drawerToggle"), drawerToggleTop=$("drawerToggleTop"), drawerClose=$("drawerClose");
const pieChartCanvas=$("pieChart"), legend=$("legend"), boxChart=$("boxChart");
const sheet=$("sheet"), sheetOpen=$("sheetOpen"), boxChartSheet=$("boxChartSheet");
const editPanel=$("editPanel"), editBtn=$("editBtn"), editA=$("editA"), editB=$("editB"),
      saveEditBtn=$("saveEditBtn"), cancelEditBtn=$("cancelEditBtn");
const pointsChip=$("pointsChip"), levelChip=$("levelChip"), streakChip=$("streakChip");
const deckAddBtn=$("deckAddBtn"), deckRenameBtn=$("deckRenameBtn"), deckDeleteBtn=$("deckDeleteBtn");

/***** Utils ************************************************************/
function currentDeck(){ return decks.find(d=>d.id===currentDeckId)||decks[0]; }
function saveData(){
  localStorage.setItem(LS_DECKS,JSON.stringify(decks));
  localStorage.setItem("leitnerCurrentDeck",currentDeckId);
  localStorage.setItem(deckKey("cards"),JSON.stringify(activeCards));
  localStorage.setItem(deckKey("reserve"),JSON.stringify(reserveCards));
  localStorage.setItem(deckKey("learned"),JSON.stringify(learnedCards));
}
function rebuildDeckSelect(){
  deckSelect.innerHTML="";
  decks.forEach(d=>{
    const o=document.createElement("option");
    o.value=d.id; o.textContent=d.name+(d.id===currentDeckId?" (aktiv)":"");
    deckSelect.appendChild(o);
  });
  deckSelect.value=currentDeckId;
}
function purgeDeckStorage(deckId){
  ["cards","reserve","learned","points","level","streak","lastActivityDate"].forEach(s=>localStorage.removeItem(`${s}_${deckId}`));
}
function fillBox1(n=20){
  const lack=Math.max(0,n-activeCards.filter(c=>c.box===1).length);
  if(lack<=0||reserveCards.length===0) return 0;
  const take=Math.min(lack,reserveCards.length);
  const add=reserveCards.splice(0,take).map(c=>({...c,box:1,introduced:false}));
  activeCards.push(...add); saveData(); return take;
}

/***** Sprache **********************************************************/
let currentLang=localStorage.getItem(LS_LANG)||"de"; $("langSelect").value=currentLang;
function applyTranslations(){
  const t=T[currentLang];
  appTitle.textContent=t.title; toolsTitle.textContent=t.tools;
  langBlockTitle.textContent=t.blocks.lang; decksBlockTitle.textContent=t.blocks.decks;
  importTitle.textContent=t.blocks.csv; directionBlockTitle.textContent=t.blocks.dir;
  statsTitle.textContent=t.blocks.stats; deckLabel.textContent=t.deck; langLabel.textContent=t.lang;
  addCardTitle.textContent=t.addTitle; exportBtn.textContent=t.exportBtn;
  $("addCardBtn").textContent=t.addBtn; $("freshBtn").textContent=t.fresh;
  $("btnWrong").textContent=t.wrong; $("btnRight").textContent=t.right;
  $("toggleDirectionBtn").textContent=t.dirBtn;
  updateLegend(); updateModeButtons(); updateLandInfo();
}

/***** Labels / Richtung ************************************************/
function dirText(){
  const d=currentDeck(); const A=d?.sideALabel||"A", B=d?.sideBLabel||"B";
  return (direction==="a2b")?`${A} → ${B}`:`${B} → ${A}`;
}
function applyLabelInputs(){
  const d=currentDeck(); const A=d?.sideALabel||"A", B=d?.sideBLabel||"B";
  sideALabelInput.value=A; sideBLabelInput.value=B;
  const sample=[...activeCards,...reserveCards,...learnedCards];
  if(sample.length){ const p=sample[Math.floor(Math.random()*sample.length)]; inputSideA.placeholder=p.sideA; inputSideB.placeholder=p.sideB; }
  else{ inputSideA.placeholder=A; inputSideB.placeholder=B; }
}

/***** Gamification *****************************************************/
let points=parseInt(localStorage.getItem(deckKey("points"))||"0",10);
let level =parseInt(localStorage.getItem(deckKey("level")) ||"1",10);
let streak=parseInt(localStorage.getItem(deckKey("streak"))||"0",10);
let lastActivityDate=localStorage.getItem(deckKey("lastActivityDate"))||null;
function saveMeta(){
  localStorage.setItem(deckKey("points"),points);
  localStorage.setItem(deckKey("level"),level);
  localStorage.setItem(deckKey("streak"),streak);
  localStorage.setItem(deckKey("lastActivityDate"),lastActivityDate||"");
}
function markActivity(addPts=0){
  if(addPts>0){ points+=addPts; const newLevel=Math.max(1,Math.floor(points/100)+1); if(newLevel>level) level=newLevel; }
  const today=new Date().toISOString().slice(0,10);
  if(!lastActivityDate){ streak=1; lastActivityDate=today; }
  else{
    const diff=Math.round((new Date(today)-new Date(lastActivityDate))/(1000*60*60*24));
    if(diff===1) streak+=1; else if(diff>1) streak=1; lastActivityDate=today;
  }
  updateGamification(); saveMeta();
}
function updateGamification(){ $("pointsChip").textContent=points; $("levelChip").textContent=level; $("streakChip").textContent=streak; }

/***** Diagramme ********************************************************/
const PIE_COLORS=["#60a5fa","#3b82f6","#1d4ed8","#a78bfa","#7c3aed","#22c55e","#f59e0b"];
function updateLegend(){
  $("legend").innerHTML=[
    [0,"Box 1"],[1,"Box 2"],[2,"Box 3"],[3,"Box 4"],[4,"Box 5"],[5,"Reserve"],[6,"Gelernt"]
  ].map(([i,lab])=>`<span><i style="background:${PIE_COLORS[i]}"></i>${lab}</span>`).join(" ");
}
function buildBoxChart(targetEl){
  const el=targetEl||$("boxChart"); el.innerHTML="";
  const counts=[1,2,3,4,5].map(b=>activeCards.filter(c=>c.box===b).length);
  const max=Math.max(1,...counts);
  counts.forEach((cnt,idx)=>{
    const bar=document.createElement("div");
    bar.className="bar"+(currentTestBox===idx+1?" active":"");
    bar.style.height=(cnt/max*100)+"%";
    bar.title=`Box ${idx+1}: ${cnt}`;
    bar.addEventListener("click",()=>{
      currentTestBox=idx+1;
      mode=(currentTestBox===1)?"lernen":"prüfen";
      closeSheet();
      render(); refreshCountsUI();
    });
    el.appendChild(bar);
  });
}
function drawPieChart(){
  const ctx=$("pieChart").getContext("2d");
  ctx.clearRect(0,0,220,220);
  const boxCounts=[1,2,3,4,5].map(b=>activeCards.filter(c=>c.box===b).length);
  const parts=[...boxCounts, reserveCards.length, learnedCards.length];
  const total=parts.reduce((a,b)=>a+b,0);
  if(!total) return;
  let a=-Math.PI/2;
  parts.forEach((v,i)=>{
    if(v<=0) return;
    const ang=v/total*2*Math.PI;
    ctx.beginPath(); ctx.moveTo(110,110); ctx.arc(110,110,110,a,a+ang); ctx.closePath();
    ctx.fillStyle=PIE_COLORS[i%PIE_COLORS.length]; ctx.fill(); a+=ang;
  });
}
function updateLandInfo(){
  const count=activeCards.filter(c=>c.box===currentTestBox).length;
  $("landInfoText").textContent=`B${currentTestBox}: ${count}`;
  updateModeButtons();
}
function refreshCountsUI(){
  buildBoxChart(); drawPieChart(); updateLandInfo();
  if(matchMedia("(orientation:landscape)").matches && matchMedia("(pointer:coarse)").matches){
    buildBoxChart($("boxChartSheet"));
  }
}

/***** Schriftgröße – ohne Worttrennung ********************************/
function fitTileText(tile, minPx=16){
  // Startgröße nehmen, dann notfalls verkleinern
  const base = parseFloat(getComputedStyle(tile).fontSize) || 28;
  let size = base;
  tile.style.fontSize=size+"px";
  tile.style.whiteSpace="normal";
  tile.style.wordBreak="normal";
  tile.style.hyphens="none";
  // sanft vergrößern bis es gerade so anstößt
  for(let i=0;i<8;i++){
    tile.style.fontSize=(size+1)+"px";
    if(tile.scrollHeight>tile.clientHeight || tile.scrollWidth>tile.clientWidth){ tile.style.fontSize=size+"px"; break; }
    size++;
  }
  // notfalls verkleinern
  let guard=0;
  while((tile.scrollHeight>tile.clientHeight || tile.scrollWidth>tile.clientWidth) && size>minPx && guard<40){
    size--; guard++; tile.style.fontSize=size+"px";
  }
}
function fitBothTiles(){ fitTileText(tileEs); fitTileText(tileDe); }

/***** Render ***********************************************************/
let currentCard=null;
function updateModeButtons(){
  const t=T[currentLang];
  $("toggleModeBtn").textContent=(mode==="lernen")?t.modeLearn:t.modeTest;
  $("landModeToggle").textContent=(mode==="lernen")?t.modeLearn:t.modeTest;
  $("modeHint").textContent=`Modus: ${(mode==="lernen")?t.modeLearn:t.modeTest}`;
}
function render(){
  $("directionBadge").textContent=dirText();
  testRevealed=false; $("testActions").hidden=true; $("landActions").hidden=true;

  if(mode==="lernen"){
    $("learnPair").hidden=false; $("testPair").hidden=true;
    const b1=activeCards.filter(c=>c.box===1);
    if(!b1.length){ tileEs.textContent=T[currentLang].noCards; tileDe.textContent=""; currentCard=null; fitBothTiles(); return; }
    const idx=((learnIndex<0?0:learnIndex) % b1.length);
    currentCard=b1[idx];
    tileEs.textContent=(direction==="a2b")?currentCard.sideA:currentCard.sideB;
    tileDe.textContent=(direction==="a2b")?currentCard.sideB:currentCard.sideA;
    fitBothTiles();
  }else{
    $("learnPair").hidden=true; $("testPair").hidden=false;
    const bx=activeCards.filter(c=>c.box===currentTestBox);
    if(!bx.length){ $("testLeft").textContent=T[currentLang].noCards; $("testRight").textContent=""; currentCard=null; fitTileText(testLeft); fitTileText(testRight); return; }
    currentCard=bx[Math.floor(Math.random()*bx.length)];
    testLeft.textContent=(direction==="a2b")?currentCard.sideA:currentCard.sideB;
    testRight.textContent=""; testRight.classList.add("muted");
    $("testPair").classList.remove("out-up","out-down"); $("testPair").classList.add("in-fade");
    fitTileText(testLeft); fitTileText(testRight);
  }
  updateModeButtons(); updateGamification(); updateLandInfo();
}

/***** Prüf-Flow + Animation ********************************************/
let actionLock=false, lockTimer=null, animFallback=null;
function lock(ms=260){ actionLock=true; clearTimeout(lockTimer); lockTimer=setTimeout(()=>actionLock=false, ms+40); }
function animateAndAdvance(cls, after){
  if(actionLock) return;
  actionLock=true;
  const el=$("testPair");
  el.classList.remove("in-fade"); el.classList.add("test-anim", cls);
  const cleanup=()=>{ el.classList.remove("test-anim", cls); clearTimeout(animFallback); actionLock=false; after(); };
  el.addEventListener("animationend", cleanup, {once:true});
  animFallback=setTimeout(cleanup, 360);
}
function revealAnswer(){
  if(mode!=="prüfen" || !currentCard || actionLock || testRevealed) return;
  const ans=(direction==="a2b")?currentCard.sideB:currentCard.sideA;
  testRight.textContent=ans; testRight.classList.remove("muted");
  testRevealed=true; $("testActions").hidden=false; $("landActions").hidden=false;
  fitTileText(testRight); lock(200);
}
$("testPair").addEventListener("click", revealAnswer);

function handleRight(){
  if(mode!=="prüfen" || !currentCard || !testRevealed) return;
  animateAndAdvance("out-up", ()=>{
    const now=new Date().toISOString();
    if(currentCard.box>=5){
      activeCards=activeCards.filter(c=>c.id!==currentCard.id);
      learnedCards.push({...currentCard, learnedAt:now});
      markActivity(5);
    }else{
      currentCard.box+=1; currentCard.lastSeen=now; markActivity(Math.max(1,currentCard.box));
    }
    saveData(); render(); refreshCountsUI();
  });
}
function handleWrong(){
  if(mode!=="prüfen" || !currentCard || !testRevealed) return;
  animateAndAdvance("out-down", ()=>{
    currentCard.box=Math.max(1,currentCard.box-1);
    currentCard.wrong=(currentCard.wrong||0)+1;
    currentCard.lastSeen=new Date().toISOString();
    markActivity(0); saveData(); render(); refreshCountsUI();
  });
}
$("btnRight").addEventListener("click", handleRight);
$("btnWrong").addEventListener("click", handleWrong);
$("landRight").addEventListener("click", handleRight);
$("landWrong").addEventListener("click", handleWrong);

/***** Lernmodus – Swipe links/rechts **********************************/
(function(){
  let startX=0,startY=0,tracking=false; const TH=40, area=$("learnPair");
  function onStart(e){ const t=e.touches?e.touches[0]:e; startX=t.clientX; startY=t.clientY; tracking=true; }
  function onEnd(e){
    if(!tracking) return; tracking=false;
    if(actionLock || mode!=="lernen") return;
    const t=e.changedTouches?e.changedTouches[0]:e;
    const dx=t.clientX-startX, dy=t.clientY-startY; if(Math.abs(dy)>60) return;
    if(dx<-TH){ learnIndex++; }
    else if(dx>TH){ learnIndex=Math.max(0,learnIndex-1); }
    else{ learnIndex++; }
    markActivity(1); lock(200); render();
  }
  ["touchstart","mousedown"].forEach(ev=>area.addEventListener(ev,onStart,{passive:true}));
  ["touchend","mouseup","mouseleave"].forEach(ev=>area.addEventListener(ev,onEnd));
})();

/***** Bottom-Sheet (Button, kein Swipe-Up) *****************************/
function openSheet(){ $("sheet").classList.add("open"); $("sheet").setAttribute("aria-hidden","false"); }
function closeSheet(){ $("sheet").classList.remove("open"); $("sheet").setAttribute("aria-hidden","true"); }
$("sheetOpen").addEventListener("click", ()=>{ const s=$("sheet"); s.classList.contains("open")?closeSheet():openSheet(); });

/***** Drawer ***********************************************************/
$("drawerToggle").addEventListener("click",()=>{ $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden","false"); });
$("drawerToggleTop").addEventListener("click",()=>{ $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden","false"); });
$("drawerClose").addEventListener("click",()=>{ $("drawer").classList.remove("open"); $("drawer").setAttribute("aria-hidden","true"); });

/***** Labels speichern *************************************************/
$("saveLabelsBtn").addEventListener("click", ()=>{
  const d=currentDeck(); if(!d) return;
  d.sideALabel=sideALabelInput.value.trim()||"A";
  d.sideBLabel=sideBLabelInput.value.trim()||"B";
  saveData(); applyLabelInputs(); render(); refreshCountsUI();
});

/***** Richtung wechseln ************************************************/
$("toggleDirectionBtn").addEventListener("click", ()=>{ direction=(direction==="a2b")?"b2a":"a2b"; render(); });

/***** +7 ***************************************************************/
$("freshBtn").addEventListener("click", ()=>{
  const take=Math.min(batchSizeFresh,reserveCards.length);
  if(take<=0){ alert("Keine Karten in der Reserve."); return; }
  const add=reserveCards.splice(0,take).map(c=>({...c,box:1,introduced:false}));
  activeCards.push(...add); mode="lernen";
  const b1=activeCards.filter(c=>c.box===1).length; learnIndex=Math.max(0,b1-add.length);
  markActivity(2); saveData(); render(); refreshCountsUI();
});

/***** Mode Toggle ******************************************************/
function toggleMode(){ mode=(mode==="lernen")?"prüfen":"lernen"; testRevealed=false; $("testActions").hidden=true; $("landActions").hidden=true; render(); refreshCountsUI(); }
$("toggleModeBtn").addEventListener("click", toggleMode);
$("landModeToggle").addEventListener("click", ()=>{ toggleMode(); closeSheet(); });

/***** Neue Karte *******************************************************/
$("addCardBtn").addEventListener("click", ()=>{
  const A=inputSideA.value.trim(), B=inputSideB.value.trim(); if(!A||!B) return;
  activeCards.push({sideA:A, sideB:B, box:1, introduced:true, wrong:0, lastSeen:null, id:Math.random().toString(36).slice(2)});
  inputSideA.value=""; inputSideB.value=""; markActivity(1);
  saveData(); render(); refreshCountsUI();
});

/***** CSV Import *******************************************************/
$("csvFile").addEventListener("change",(ev)=>{
  const file=ev.target.files?.[0]; if(!file) return;
  const rdr=new FileReader();
  rdr.onload=e=>{
    const buf=e.target.result;
    const tryDec=(enc)=>{ try{ return new TextDecoder(enc).decode(buf);}catch{ return null; } };
    let text=tryDec("utf-8") || tryDec("windows-1252") || tryDec("iso-8859-1") || "";
    let imported=0;
    text.split(/\r?\n/).forEach(line=>{
      if(!line.trim()) return;
      const sep=(line.includes(";") && (!line.includes(",") || line.indexOf(";")<line.indexOf(",")))?";":",";
      const p=line.split(sep).map(s=>s.trim().replace(/^"(.*)"$/,"$1"));
      if(p.length<2) return;
      const A=p[0], B=p[1]; if(!A||!B) return;
      const exists = activeCards.concat(reserveCards,learnedCards).some(c=>c.sideA===A);
      if(!exists){ reserveCards.push({sideA:A, sideB:B, box:1, introduced:false, lastSeen:null, wrong:0, id:Math.random().toString(36).slice(2)}); imported++; }
    });
    const added=fillBox1(20); mode="lernen";
    const b1=activeCards.filter(c=>c.box===1).length; learnIndex=Math.max(0,b1-added);
    saveData(); alert(`Import: ${imported} Einträge. In Box 1: +${added}`);
    render(); refreshCountsUI(); $("csvFile").value="";
  };
  rdr.readAsArrayBuffer(file);
});

/***** Export ***********************************************************/
$("exportBtn").addEventListener("click", ()=>{
  const data={activeCards,reserveCards,learnedCards};
  const blob=new Blob([JSON.stringify(data)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="deck.json"; a.click();
});

/***** Deck-Aktionen ****************************************************/
function createNewDeck(){
  const name=prompt("Name der neuen Übung:"); if(!name) return;
  const id=(crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
  decks.push({id,name,sideALabel:"A",sideBLabel:"B"}); currentDeckId=id;
  activeCards=[]; reserveCards=[]; learnedCards=[]; direction="a2b"; mode="lernen"; currentTestBox=1; learnIndex=0;
  saveData(); rebuildDeckSelect(); applyLabelInputs(); render(); refreshCountsUI();
}
function renameCurrentDeck(){
  const deck=currentDeck(); if(!deck) return;
  const name=prompt("Neuer Name:", deck.name); if(!name) return;
  deck.name=name.trim()||deck.name; saveData(); rebuildDeckSelect();
}
function deleteCurrentDeck(){
  if(decks.length<=1){ alert("Mindestens eine Übung muss bleiben."); return; }
  const deck=currentDeck(); if(!deck) return;
  if(!confirm(`„${deck.name}“ wirklich löschen?`)) return;
  purgeDeckStorage(deck.id);
  decks=decks.filter(d=>d.id!==deck.id); currentDeckId=decks[0].id;
  activeCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("cards"))||"[]"));
  reserveCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("reserve"))||"[]"));
  learnedCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("learned"))||"[]"));
  const added=fillBox1(20); if(added>0){ mode="lernen"; const b1=activeCards.filter(c=>c.box===1).length; learnIndex=Math.max(0,b1-added); }
  saveData(); rebuildDeckSelect(); applyLabelInputs(); render(); refreshCountsUI();
}
$("deckAddBtn").addEventListener("click", createNewDeck);
$("deckRenameBtn").addEventListener("click", renameCurrentDeck);
$("deckDeleteBtn").addEventListener("click", deleteCurrentDeck);
$("deckSelect").addEventListener("change", ()=>{
  currentDeckId=deckSelect.value;
  activeCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("cards"))||"[]"));
  reserveCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("reserve"))||"[]"));
  learnedCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("learned"))||"[]"));
  const added=fillBox1(20); if(added>0){ mode="lernen"; const b1=activeCards.filter(c=>c.box===1).length; learnIndex=Math.max(0,b1-added); }
  saveData(); applyLabelInputs(); render(); refreshCountsUI();
});

/***** Sprache **********************************************************/
$("langSelect").addEventListener("change", ()=>{ const v=$("langSelect").value; localStorage.setItem(LS_LANG,v); currentLang=v; applyTranslations(); render(); });

/***** Größenwechsel ****************************************************/
addEventListener("resize", ()=>{ testRevealed=false; $("testActions").hidden=true; $("landActions").hidden=true; refreshCountsUI(); });
addEventListener("orientationchange", ()=>setTimeout(()=>{ testRevealed=false; $("testActions").hidden=true; $("landActions").hidden=true; refreshCountsUI(); },80));

/***** Editor ***********************************************************/
$("editBtn").addEventListener("click", ()=>{
  if(!currentCard){ alert("Keine Karte aktiv."); return; }
  const d=currentDeck(); editA.placeholder=d?.sideALabel||"A"; editB.placeholder=d?.sideBLabel||"B";
  editA.value=currentCard.sideA||""; editB.value=currentCard.sideB||"";
  $("editPanel").hidden=false; editA.focus();
});
$("cancelEditBtn").addEventListener("click", ()=> $("editPanel").hidden=true );
$("saveEditBtn").addEventListener("click", ()=>{
  if(!currentCard) return;
  const A=editA.value.trim(), B=editB.value.trim(); if(!A||!B) return;
  currentCard.sideA=A; currentCard.sideB=B; saveData(); $("editPanel").hidden=true; render();
});

/***** Verwalten ********************************************************/
$("deleteBtn").addEventListener("click", ()=>{
  if(!currentCard){ alert("Keine Karte aktiv."); return; }
  if(!confirm("Aktive Karte wirklich löschen?")) return;
  const iA=activeCards.findIndex(c=>c.id===currentCard.id);
  if(iA>=0) activeCards.splice(iA,1);
  else{
    const iR=reserveCards.findIndex(c=>c.id===currentCard.id);
    if(iR>=0) reserveCards.splice(iR,1);
  }
  currentCard=null; saveData(); render(); refreshCountsUI();
});
$("resetProgressBtn").addEventListener("click", ()=>{
  if(!confirm("Nur Lernfortschritt zurücksetzen?")) return;
  activeCards=activeCards.map(c=>({...c,box:1,lastSeen:null,introduced:false,wrong:0}));
  saveData(); render(); refreshCountsUI();
});
$("resetAllBtn").addEventListener("click", ()=>{
  const deck=currentDeck(); if(!deck) return;
  if(!confirm(`Wirklich ALLE Karten & Fortschritte in „${deck.name}“ löschen?`)) return;
  ["cards","reserve","learned","points","level","streak","lastActivityDate"].forEach(s=>localStorage.removeItem(`${s}_${currentDeckId}`));
  activeCards=[]; reserveCards=[]; learnedCards=[];
  points=0; level=1; streak=0; lastActivityDate=null; saveMeta();
  saveData(); render(); refreshCountsUI();
});

/***** Init *************************************************************/
function init(){
  rebuildDeckSelect();
  const added=fillBox1(20); if(added>0){ mode="lernen"; const b1=activeCards.filter(c=>c.box===1).length; learnIndex=Math.max(0,b1-added); }
  applyLabelInputs(); applyTranslations(); updateGamification(); updateLegend();
  $("editPanel").hidden=true; render(); refreshCountsUI();
}
init();
