/***** Übersetzungen *****/
const T = {
  de:{ fresh:"+7", modeLearn:"Lernen", modeTest:"Prüfen", wrong:"❌ Falsch", right:"✅ Richtig", noCards:"Keine Karten" },
  en:{ fresh:"+7", modeLearn:"Learn",   modeTest:"Test",   wrong:"❌ Wrong",  right:"✅ Right",   noCards:"No cards" },
  sv:{ fresh:"+7", modeLearn:"Lära",    modeTest:"Testa",  wrong:"❌ Fel",    right:"✅ Rätt",    noCards:"Inga kort" },
  es:{ fresh:"+7", modeLearn:"Aprender",modeTest:"Probar", wrong:"❌ Mal",    right:"✅ Bien",    noCards:"Sin tarjetas" }
};

/***** Storage & State *****/
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

/***** DOM *****/
const $=id=>document.getElementById(id);
const pointsChip=$("pointsChip"), levelChip=$("levelChip"), streakChip=$("streakChip");
const toggleModeBtn=$("toggleModeBtn"), editBtn=$("editBtn");
const landModeToggle=$("landModeToggle"), landBoxBadge=$("landBoxBadge");
const learnPair=$("learnPair"), tileEs=$("tileEs"), tileDe=$("tileDe");
const testPair=$("testPair"), testLeft=$("testLeft"), testRight=$("testRight");
const testActions=$("testActions"), btnWrong=$("btnWrong"), btnRight=$("btnRight");
const landActions=$("landActions"), landRight=$("landRight"), landWrong=$("landWrong");
const boxChart=$("boxChart"), boxChartSheet=$("boxChartSheet");
const drawerToggle=$("drawerToggle"), sheet=$("sheet"), sheetClose=$("sheetClose");
const freshBtn=$("freshBtn"), langSelect=$("langSelect");
const deckSelect=$("deckSelect"), deckAddBtn=$("deckAddBtn"), deckRenameBtn=$("deckRenameBtn"), deckDeleteBtn=$("deckDeleteBtn");
const sideALabelInput=$("sideALabelInput"), sideBLabelInput=$("sideBLabelInput"), saveLabelsBtn=$("saveLabelsBtn");
const inputSideA=$("inputSideA"), inputSideB=$("inputSideB"), addCardBtn=$("addCardBtn");
const csvFile=$("csvFile"), exportBtn=$("exportBtn");
const pieChartCanvas=$("pieChart"), legend=$("legend");
const editPanel=$("editPanel"), editA=$("editA"), editB=$("editB"), saveEditBtn=$("saveEditBtn"), cancelEditBtn=$("cancelEditBtn");
const directionBadge=$("directionBadge"), toggleDirectionBtn=$("toggleDirectionBtn");

/***** Utils *****/
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
function fillBox1(n=20){
  const lack=Math.max(0,n-activeCards.filter(c=>c.box===1).length);
  if(lack<=0||reserveCards.length===0) return 0;
  const take=Math.min(lack,reserveCards.length);
  const add=reserveCards.splice(0,take).map(c=>({...c,box:1,introduced:false}));
  activeCards.push(...add); saveData(); return take;
}

/***** Sprache *****/
let currentLang=localStorage.getItem(LS_LANG)||"de"; langSelect.value=currentLang;
function t(){ return T[currentLang]||T.de; }

/***** Gamification *****/
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
function updateGamification(){ pointsChip.textContent=points; levelChip.textContent=level; streakChip.textContent=streak; }
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

/***** Diagramme *****/
const PIE_COLORS=["#60a5fa","#3b82f6","#1d4ed8","#a78bfa","#7c3aed","#22c55e","#f59e0b"];
function updateLegend(){
  legend.innerHTML=[
    [0,"Box 1"],[1,"Box 2"],[2,"Box 3"],[3,"Box 4"],[4,"Box 5"],[5,"Reserve"],[6,"Gelernt"]
  ].map(([i,lab])=>`<span><i style="background:${PIE_COLORS[i]}"></i>${lab}</span>`).join(" ");
}
function buildBoxChart(targetEl){
  const el=targetEl||boxChart; el.innerHTML="";
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
  const ctx=pieChartCanvas.getContext("2d");
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

/***** Schriftgröße passend machen (ohne Worttrennung) *****/
function fitTileText(tile, minPx=16){
  tile.style.whiteSpace="normal"; tile.style.wordBreak="normal"; tile.style.hyphens="none";
  let size=parseFloat(getComputedStyle(tile).fontSize)||28;
  // zuerst vergrößern bis knapp vor Overflow
  for(let i=0;i<6;i++){
    tile.style.fontSize=(size+1)+"px";
    if(tile.scrollHeight>tile.clientHeight || tile.scrollWidth>tile.clientWidth){ tile.style.fontSize=size+"px"; break; }
    size++;
  }
  // wenn Overflow: verkleinern
  let guard=0;
  while((tile.scrollHeight>tile.clientHeight || tile.scrollWidth>tile.clientWidth) && size>minPx && guard<50){
    size--; guard++; tile.style.fontSize=size+"px";
  }
}
function fitBothTiles(){ fitTileText(tileEs); fitTileText(tileDe); fitTileText(testLeft); fitTileText(testRight); }

/***** Mode & Rendering *****/
function dirText(){ const d=currentDeck(); const A=d?.sideALabel||"A", B=d?.sideBLabel||"B"; return (direction==="a2b")?`${A} → ${B}`:`${B} → ${A}`; }
function updateModeButtons(){
  const label=(mode==="lernen")?t().modeLearn:t().modeTest;
  toggleModeBtn.textContent=label;
  landModeToggle.textContent=label;
}
function updateBoxBadge(){
  const count=activeCards.filter(c=>c.box===currentTestBox).length;
  landBoxBadge.textContent=`B${currentTestBox}: ${count}`;
}
let currentCard=null;
function render(){
  testRevealed=false; testActions.hidden=true; landActions.hidden=true;
  directionBadge.textContent=dirText();

  if(mode==="lernen"){
    learnPair.hidden=false; testPair.hidden=true;
    const b1=activeCards.filter(c=>c.box===1);
    if(!b1.length){ tileEs.textContent=t().noCards; tileDe.textContent=""; currentCard=null; fitBothTiles(); return; }
    const idx=((learnIndex<0?0:learnIndex) % b1.length);
    currentCard=b1[idx];
    tileEs.textContent=(direction==="a2b")?currentCard.sideA:currentCard.sideB;
    tileDe.textContent=(direction==="a2b")?currentCard.sideB:currentCard.sideA;
    fitBothTiles();
  }else{
    learnPair.hidden=true; testPair.hidden=false;
    const bx=activeCards.filter(c=>c.box===currentTestBox);
    if(!bx.length){ testLeft.textContent=t().noCards; testRight.textContent=""; currentCard=null; fitBothTiles(); return; }
    currentCard=bx[Math.floor(Math.random()*bx.length)];
    testLeft.textContent=(direction==="a2b")?currentCard.sideA:currentCard.sideB;
    testRight.textContent=""; testRight.classList.add("muted");
    testPair.classList.remove("out-up","out-down"); testPair.classList.add("in-fade");
    fitBothTiles();
  }
  updateModeButtons(); updateBoxBadge(); updateGamification();
}

/***** Interaktionen *****/
// Lernmodus – Wischen/Tippen: 1 Aktion pro Geste
(function(){
  let startX=0,startY=0,tracking=false; const TH=40, area=learnPair;
  let lock=false; const lockit=()=>{ lock=true; setTimeout(()=>lock=false, 220); };
  function onStart(e){ const t=e.touches?e.touches[0]:e; startX=t.clientX; startY=t.clientY; tracking=true; }
  function onEnd(e){
    if(!tracking||lock||mode!=="lernen") return; tracking=false;
    const t=e.changedTouches?e.changedTouches[0]:e;
    const dx=t.clientX-startX, dy=t.clientY-startY; if(Math.abs(dy)>60) return;
    if(dx<-TH){ learnIndex++; } else if(dx>TH){ learnIndex=Math.max(0,learnIndex-1); } else { learnIndex++; }
    markActivity(1); render(); lockit();
  }
  ["touchstart","mousedown"].forEach(ev=>area.addEventListener(ev,onStart,{passive:true}));
  ["touchend","mouseup","mouseleave"].forEach(ev=>area.addEventListener(ev,onEnd));
})();

// Prüfen – Tap zum Reveal, dann ✅/❌
function revealAnswer(){
  if(mode!=="prüfen" || !currentCard || testRevealed) return;
  const ans=(direction==="a2b")?currentCard.sideB:currentCard.sideA;
  testRight.textContent=ans; testRight.classList.remove("muted");
  testRevealed=true; testActions.hidden=false; landActions.hidden=false;
  fitTileText(testRight);
}
testPair.addEventListener("click", revealAnswer);

function advanceRight(){
  if(mode!=="prüfen" || !currentCard || !testRevealed) return;
  testPair.classList.remove("in-fade");
  testPair.classList.add("test-anim","out-up");
  const done=()=>{
    testPair.classList.remove("test-anim","out-up");
    const now=new Date().toISOString();
    if(currentCard.box>=5){
      activeCards=activeCards.filter(c=>c.id!==currentCard.id);
      learnedCards.push({...currentCard, learnedAt:now});
      markActivity(5);
    }else{
      currentCard.box+=1; currentCard.lastSeen=now; markActivity(Math.max(1,currentCard.box));
    }
    saveData(); render(); refreshCountsUI();
  };
  testPair.addEventListener("animationend", done, {once:true});
}
function advanceWrong(){
  if(mode!=="prüfen" || !currentCard || !testRevealed) return;
  testPair.classList.remove("in-fade");
  testPair.classList.add("test-anim","out-down");
  const done=()=>{
    testPair.classList.remove("test-anim","out-down");
    currentCard.box=Math.max(1,currentCard.box-1);
    currentCard.wrong=(currentCard.wrong||0)+1;
    currentCard.lastSeen=new Date().toISOString();
    markActivity(0); saveData(); render(); refreshCountsUI();
  };
  testPair.addEventListener("animationend", done, {once:true});
}
btnRight.addEventListener("click", advanceRight);
btnWrong.addEventListener("click", advanceWrong);
landRight.addEventListener("click", advanceRight);
landWrong.addEventListener("click", advanceWrong);

/***** Mode Toggle *****/
function toggleMode(){ mode=(mode==="lernen")?"prüfen":"lernen"; testRevealed=false; testActions.hidden=true; landActions.hidden=true; render(); refreshCountsUI(); }
toggleModeBtn.addEventListener("click", toggleMode);
landModeToggle.addEventListener("click", toggleMode);

/***** FAB / Bottom-Sheet *****/
function openSheet(){ sheet.classList.add("open"); sheet.setAttribute("aria-hidden","false"); }
function closeSheet(){ sheet.classList.remove("open"); sheet.setAttribute("aria-hidden","true"); }
drawerToggle.addEventListener("click", openSheet);
sheetClose.addEventListener("click", closeSheet);

/***** +7 *****/
freshBtn.addEventListener("click", ()=>{
  const take=Math.min(batchSizeFresh,reserveCards.length);
  if(take<=0){ alert("Keine Karten in der Reserve."); return; }
  const add=reserveCards.splice(0,take).map(c=>({...c,box:1,introduced:false}));
  activeCards.push(...add); mode="lernen";
  const b1=activeCards.filter(c=>c.box===1).length; learnIndex=Math.max(0,b1-add.length);
  markActivity(2); saveData(); render(); refreshCountsUI(); closeSheet();
});

/***** Richtung *****/
toggleDirectionBtn.addEventListener("click", ()=>{ direction=(direction==="a2b")?"b2a":"a2b"; render(); });

/***** Neue Karte *****/
addCardBtn.addEventListener("click", ()=>{
  const A=inputSideA.value.trim(), B=inputSideB.value.trim(); if(!A||!B) return;
  activeCards.push({sideA:A, sideB:B, box:1, introduced:true, wrong:0, lastSeen:null, id:Math.random().toString(36).slice(2)});
  inputSideA.value=""; inputSideB.value=""; markActivity(1);
  saveData(); render(); refreshCountsUI();
});

/***** CSV Import *****/
csvFile.addEventListener("change",(ev)=>{
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
    saveData(); alert(`Import: ${imported} Einträge. In Box 1: +${added}`); render(); refreshCountsUI();
    csvFile.value="";
  };
  rdr.readAsArrayBuffer(file);
});

/***** Export *****/
exportBtn.addEventListener("click", ()=>{
  const data={activeCards,reserveCards,learnedCards};
  const blob=new Blob([JSON.stringify(data)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="deck.json"; a.click();
});

/***** Decks *****/
function applyLabelInputs(){
  const d=currentDeck(); const A=d?.sideALabel||"A", B=d?.sideBLabel||"B";
  sideALabelInput.value=A; sideBLabelInput.value=B;
  const sample=[...activeCards,...reserveCards,...learnedCards];
  if(sample.length){ const p=sample[Math.floor(Math.random()*sample.length)]; inputSideA.placeholder=p.sideA; inputSideB.placeholder=p.sideB; }
  else{ inputSideA.placeholder=A; inputSideB.placeholder=B; }
}
function createNewDeck(){
  const name=prompt("Name der neuen Übung:"); if(!name) return;
  const id=(crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
  decks.push({id,name,sideALabel:"A",sideBLabel:"B"}); currentDeckId=id;
  activeCards=[]; reserveCards=[]; learnedCards=[]; direction="a2b"; mode="lernen"; currentTestBox=1; learnIndex=0;
  saveData(); rebuildDeckSelect(); applyLabelInputs(); render(); refreshCountsUI();
}
function renameCurrentDeck(){ const deck=currentDeck(); if(!deck) return; const name=prompt("Neuer Name:", deck.name); if(!name) return; deck.name=name.trim()||deck.name; saveData(); rebuildDeckSelect(); }
function deleteCurrentDeck(){
  if(decks.length<=1){ alert("Mindestens eine Übung muss bleiben."); return; }
  const deck=currentDeck(); if(!deck) return;
  if(!confirm(`„${deck.name}“ wirklich löschen?`)) return;
  ["cards","reserve","learned","points","level","streak","lastActivityDate"].forEach(s=>localStorage.removeItem(`${s}_${deck.id}`));
  decks=decks.filter(d=>d.id!==deck.id); currentDeckId=decks[0].id;
  activeCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("cards"))||"[]"));
  reserveCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("reserve"))||"[]"));
  learnedCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("learned"))||"[]"));
  const added=fillBox1(20); if(added>0){ mode="lernen"; const b1=activeCards.filter(c=>c.box===1).length; learnIndex=Math.max(0,b1-added); }
  saveData(); rebuildDeckSelect(); applyLabelInputs(); render(); refreshCountsUI();
}
deckAddBtn.addEventListener("click", createNewDeck);
deckRenameBtn.addEventListener("click", renameCurrentDeck);
deckDeleteBtn.addEventListener("click", deleteCurrentDeck);
deckSelect.addEventListener("change", ()=>{
  currentDeckId=deckSelect.value;
  activeCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("cards"))||"[]"));
  reserveCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("reserve"))||"[]"));
  learnedCards = normalizeCards(JSON.parse(localStorage.getItem(deckKey("learned"))||"[]"));
  const added=fillBox1(20); if(added>0){ mode="lernen"; const b1=activeCards.filter(c=>c.box===1).length; learnIndex=Math.max(0,b1-added); }
  saveData(); applyLabelInputs(); render(); refreshCountsUI();
});
saveLabelsBtn.addEventListener("click", ()=>{
  const d=currentDeck(); if(!d) return;
  d.sideALabel=sideALabelInput.value.trim()||"A";
  d.sideBLabel=sideBLabelInput.value.trim()||"B";
  saveData(); applyLabelInputs(); render();
});

/***** Sprache *****/
langSelect.addEventListener("change", ()=>{ currentLang=langSelect.value; localStorage.setItem(LS_LANG,currentLang); toggleModeBtn.textContent=t().modeLearn; render(); });

/***** Editor *****/
editBtn.addEventListener("click", ()=>{
  if(!currentCard){ alert("Keine Karte aktiv."); return; }
  const d=currentDeck(); editA.placeholder=d?.sideALabel||"A"; editB.placeholder=d?.sideBLabel||"B";
  editA.value=currentCard.sideA||""; editB.value=currentCard.sideB||"";
  editPanel.hidden=false; editA.focus();
});
cancelEditBtn.addEventListener("click", ()=> editPanel.hidden=true );
saveEditBtn.addEventListener("click", ()=>{
  if(!currentCard) return; const A=editA.value.trim(), B=editB.value.trim(); if(!A||!B) return;
  currentCard.sideA=A; currentCard.sideB=B; saveData(); editPanel.hidden=true; render();
});

/***** Größenwechsel *****/
addEventListener("resize", ()=>{ testRevealed=false; testActions.hidden=true; landActions.hidden=true; refreshCountsUI(); });
addEventListener("orientationchange", ()=>setTimeout(()=>{ testRevealed=false; testActions.hidden=true; landActions.hidden=true; refreshCountsUI(); },80));

/***** Init *****/
function updateLandScapeVisibility(){
  const isLand = matchMedia("(orientation:landscape)").matches && matchMedia("(pointer:coarse)").matches;
  // Box-Chart im Portrait sichtbar, im Landscape im Sheet
  boxChart.style.display = isLand ? "none" : "flex";
}
function refreshCountsUI(){
  buildBoxChart(); drawPieChart(); updateBoxBadge(); updateLegend();
  if(matchMedia("(orientation:landscape)").matches && matchMedia("(pointer:coarse)").matches){
    buildBoxChart(boxChartSheet);
  }else{
    boxChartSheet.innerHTML="";
  }
  updateLandScapeVisibility();
}
function init(){
  rebuildDeckSelect();
  const added=fillBox1(20); if(added>0){ mode="lernen"; const b1=activeCards.filter(c=>c.box===1).length; learnIndex=Math.max(0,b1-added); }
  applyLabelInputs(); updateGamification(); updateLegend();
  render(); refreshCountsUI();
}
init();
