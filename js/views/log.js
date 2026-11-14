(function(){
"use strict";
const A = window.App, {$,$$,esc,icon,S,MEALS,MEAL,CATS,UNITS,FEED,BEHAV,MOOD,SYM,STOOL,PLACES,today,thLong,toMin,nowHM,fmtAmt} = A;
const GRP_U = {carb:"ทัพพี", protein:"ช้อนกินข้าว", veg:"ทัพพี", fruit:"ส่วน"};
const GRP_N = {carb:"ข้าว-แป้ง", protein:"เนื้อสัตว์ ไข่ ถั่ว", veg:"ผัก", fruit:"ผลไม้"};
const R = {tab:"meal", d:null, k:null, e:null, l:null, open:{}};
const lastWho = () => A.LS.get("who") || A.members()[0];

function newEntry(d,k){ return {date:d, meal:k, by:lastWho(), start:"", end:"", items:[], feed:"", follow:false, behav:[], sitMax:"", mood:"", screen:null, toys:null, snackBefore:null, with:[], place:"บ้าน", photos:{before:[],after:[]}, groups:{carb:"",protein:"",veg:"",fruit:""}, ai:null, trust:"", note:""}; }
function load(){
  const ex = S.entries[R.d+"_"+R.k];
  if(ex){ R.e = JSON.parse(JSON.stringify(ex)); R.mode = ex.mode || "manual"; }
  else { R.e = newEntry(R.d,R.k); const b=(A.base().meals[R.d]||{})[R.k]; if(b&&b.items) R.e.items=b.items.map(i=>({n:i.n,g:i.g,st:i.st,ea:"",eu:"คำ",sa:"",su:"",note:i.eaten})); }
  R.e.groups = R.e.groups||{carb:"",protein:"",veg:"",fruit:""}; R.e.photos = R.e.photos||{before:[],after:[]};
  const lx = S.daylogs[R.d]; R.l = lx ? JSON.parse(JSON.stringify(lx)) : {date:R.d, by:lastWho(), milk:[{t:"",ml:""}], water:"", snacks:[], sym:[], symNote:"", stool:"", napS:"", napE:"", weight:"", height:"", note:""};
  if(!R.l.milk||!R.l.milk.length) R.l.milk=[{t:"",ml:""}];
  R.l.sleeps = A.sleeps(R.l).map(x=>({...x}));
  A.logDirty=false;
}
A.openLog = ({date, meal, tab}={}) => {
  R.mode = null; R.d = date || today(); R.k = meal || A.guessMeal(); R.tab = DAYTABS.some(x=>x[0]===tab) ? tab : tab==="day" ? "milk" : "meal"; R.open={};
  load(); $("#sheet").classList.add("on"); document.body.style.overflow="hidden"; draw(); setTimeout(()=>{ const f=$("#sheet-panel .sheet-h .icbtn"); if(f) f.focus(); },50);
};
A.closeLog = (force) => {
  if(!$("#sheet").classList.contains("on")) return;
  if(A.logDirty && !force){ const m=$("#lmsg"); if(m && m.dataset.warn!=="1"){ m.dataset.warn="1"; m.textContent="ยังไม่ได้บันทึก กดปิดอีกครั้งเพื่อทิ้งการแก้ไข"; return; } }
  $("#sheet").classList.remove("on"); document.body.style.overflow=""; A.logDirty=false;
};
const opts = (name, list, sel, multi) => `<div class="opts" data-name="${name}" data-multi="${multi?1:0}">${list.map(o=>{ const v=Array.isArray(o)?o[0]:o, l=Array.isArray(o)?o[1]:o; const on = multi ? (sel||[]).includes(v) : sel===v; return `<button type="button" class="opt" aria-pressed="${on}" data-v="${esc(v)}">${esc(l)}</button>`; }).join("")}</div>`;
const yn = (name, v) => opts(name, [["yes","มี / ใช่"],["no","ไม่มี / ไม่ใช่"]], v===true?"yes":v===false?"no":"");
function knownFoods(){
  const c={}; const add=n=>{ if(n) c[n]=(c[n]||0)+1; };
  Object.values(A.base().meals).forEach(day=>Object.values(day).forEach(m=>(m.items||[]).forEach(i=>add(i.n.split(" (")[0]))));
  Object.values(S.entries).forEach(e=>(e.items||[]).forEach(i=>add(i.n)));
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
}
const DAYTABS = [["milk","นม"],["snack","ของว่าง"],["sleep","การนอน"],["health","สุขภาพและการขับถ่าย"],["body","น้ำหนักและส่วนสูง"]];
const BOX = [110,125,180,200];
const lastBox = () => { try{ return +localStorage.getItem("imdee:box")||""; }catch(_){ return ""; } };
function tabHas(v,l){ if(!l) return false;
  if(v==="milk") return (l.milk||[]).some(m=>+m.ml) || !!l.water;
  if(v==="snack") return (l.snacks||[]).some(x=>x.n);
  if(v==="sleep") return A.sleeps(l).length>0;
  if(v==="health") return !!((l.sym||[]).length||l.stool||l.symNote||l.note);
  if(v==="body") return !!(l.weight||l.height);
  return false; }
function milkTotal(m){ return m.u==="box" ? (m.box && +m.n ? Math.round(m.box*m.n) : "") : m.ml; }
function milkRow(m, ix){
  const box = m.u==="box", tot = milkTotal(m);
  return `<div class="mrow milkrow" data-ix="${ix}"><input type="time" class="inp in-mt" value="${esc(m.t||"")}" aria-label="เวลา">
    <span class="stseg mu" role="group" aria-label="หน่วย"><button type="button" class="m-u" data-u="ml" aria-pressed="${!box}">มล.</button><button type="button" class="m-u" data-u="box" aria-pressed="${box}">กล่อง</button></span>
    ${box?`<select class="inp in-box" aria-label="ขนาดกล่อง"><option value="">ขนาดกล่อง</option>${BOX.map(v=>`<option value="${v}"${+m.box===v?" selected":""}>${v} มล.</option>`).join("")}</select><span class="tiny">×</span><input class="inp num in-mn" style="width:64px" inputmode="decimal" value="${esc(m.n??"1")}" aria-label="จำนวนกล่อง"><span class="tiny">กล่อง</span>`
      :`<input class="inp num in-ml" style="width:100px" inputmode="numeric" value="${esc(m.ml||"")}" placeholder="มล." aria-label="ปริมาณนม มล."><span class="tiny">มล.</span>`}
    ${box?`<b class="m-tot num">${tot?`= ${tot} มล.`:'<span class="tiny" style="color:var(--warn)">เลือกขนาดกล่อง</span>'}</b>`:""}
    <button type="button" class="icbtn m-del" aria-label="ลบรอบนม">${icon("x")}</button></div>`;
}
async function addWho(){
  const x=$("#l-newwho"), name=x?x.value.trim():""; if(!name) return;
  read(); const mem=[...A.members()]; if(!mem.includes(name)) mem.push(name);
  S.settings.members = mem; await A.save("app/settings", JSON.parse(JSON.stringify(S.settings)));
  (R.tab==="meal"?R.e:R.l).by = name; A.LS.set("who", name); R.addWho=false; A.emit("settings"); redraw();
}
function sec(id, n, title, hint, body, ok){ const open = R.open[id]!==undefined ? R.open[id] : true; return `<details class="fsec" data-sec="${id}"${open?" open":""}><summary><span class="n">${n}</span>${title}<span class="hint${ok?" ok":""}">${hint||""}</span></summary><div class="fsec-b">${body}</div></details>`; }
const num = v => { const x=parseFloat(String(v??"").replace(",",".")); return isFinite(x)?x:null; };
const rnd = v => Math.round(v*100)/100;
const FRACS = [[1,"หมด"],[.75,"¾"],[.5,"½"],[.25,"¼"]];
const unitSel = (cls, val, def) => `<select class="inp ${cls}" aria-label="หน่วย"><option value="">หน่วย</option>${UNITS.map(u=>`<option${u===(val||def)?" selected":""}>${u}</option>`).join("")}</select>`;
const catSel = (cls, val, n) => `<select class="inp ${cls}" aria-label="หมวดอาหาร">${CATS.map(c=>`<option${c===(val||A.guessCat(n))?" selected":""}>${c}</option>`).join("")}</select>`;
const newItem = (n="") => ({n, g:n?A.guessCat(n):"", sa:"", su:"", st:"", ea:"", eu:"", frac:null, comps:[]});
function servedRow(i, ix){
  const comps = i.comps||[], open = i.showComps || comps.length;
  return `<div class="sitem" data-ix="${ix}">
    <div class="row1"><input class="inp in-n" value="${esc(i.n)}" placeholder="ชื่ออาหารหรือเมนู" aria-label="ชื่ออาหาร" list="food-list">${catSel("in-g", i.g, i.n)}<button type="button" class="icbtn in-del" aria-label="ลบรายการ">${icon("trash")}</button></div>
    <div class="row2"><span>เสิร์ฟ</span><input class="inp num in-sa" inputmode="decimal" value="${esc(i.sa??"")}" placeholder="จำนวน" aria-label="จำนวนที่เสิร์ฟ">${unitSel("in-su", i.su, "")}</div>
    ${open?`<div class="comps"><span class="tiny">ส่วนประกอบในจานที่เสิร์ฟ เช่น เส้น แซลมอน ครีมซอส ผัก</span>${comps.map((c,cx)=>`<div class="comp" data-cx="${cx}"><input class="inp c-n" value="${esc(c.n)}" placeholder="ส่วนประกอบ" aria-label="ส่วนประกอบ" list="food-list">${catSel("c-g", c.g, c.n)}<input class="inp num c-sa" inputmode="decimal" value="${esc(c.sa??"")}" placeholder="จำนวน" aria-label="จำนวนส่วนประกอบ">${unitSel("c-su", c.su, "ช้อน")}<button type="button" class="icbtn c-del" aria-label="ลบส่วนประกอบ">${icon("x")}</button></div>`).join("")}
      <button type="button" class="btn sm c-add" style="justify-self:start">${icon("plus")}เพิ่มส่วนประกอบ</button></div>`
      :`<button type="button" class="ctog c-open">+ แตกส่วนประกอบของเมนูนี้</button>`}
    ${i.note?`<p class="tiny">ข้อมูลเดิม: ${esc(i.note)}</p>`:""}
  </div>`;
}
function eatenRow(i, ix){
  const eat = i.st==="ate"||i.st==="part", sa = num(i.sa), comps = (i.comps||[]).filter(c=>c.n);
  const cur = eat ? "eat" : i.st;
  let h = `<div class="eitem${i.st&&!eat?" off":""}" data-ix="${ix}"><div class="eh"><b class="e-name">${esc(i.n||"(ยังไม่ใส่ชื่อ)")}</b><span class="tiny e-served">เสิร์ฟ ${esc(fmtAmt(i.sa,i.su)||"ไม่ระบุปริมาณ")}${comps.length?` · ${comps.length} ส่วนประกอบ`:""}</span></div>
    <div class="stseg" role="group" aria-label="กินหรือไม่">${[["eat","กิน","ate"],["none","ไม่กิน","none"],["spit","คาย","spit"],["unk","ไม่ทราบ","unk"]].map(([v,l,c])=>`<button type="button" class="${c}" data-eat="${v}" aria-pressed="${cur===v}">${l}</button>`).join("")}</div>`;
  if(eat){
    if(!i.compMode) h += `<div class="fracs"><span>กินไป</span>${sa!=null?FRACS.map(([f,l])=>`<button type="button" data-frac="${f}" aria-pressed="${i.frac!=null&&+i.frac===f}">${l}</button>`).join("")+"<span>หรือ</span>":""}<input class="inp num in-ea" inputmode="decimal" value="${i.frac!=null?"":esc(i.ea??"")}" placeholder="จำนวน" aria-label="จำนวนที่กิน">${unitSel("in-eu", i.eu, i.su||"คำ")}<button type="button" data-frac="?" aria-pressed="${i.frac==="?"}">ไม่ทราบปริมาณ</button></div>
      ${i.frac!=null&&i.frac!=="?"&&sa!=null?`<span class="tiny">= ${esc(fmtAmt(rnd(sa*i.frac), i.su))}${comps.length?" (ใช้สัดส่วนนี้กับทุกส่วนประกอบ)":""}</span>`:""}`;
    const chunky = [i.eu,i.su].includes("ชิ้น") || [i.eu,i.su].includes("คำ") || (i.comps||[]).some(c=>["ชิ้น","คำ"].includes(c.su));
    if(chunky) h += `<div class="fracs"><span>ขนาดชิ้น/คำ</span>${Object.entries(A.SIZE).map(([k,z])=>`<button type="button" data-size="${k}" aria-pressed="${(i.size||"m")===k}">${z.lab}</button>`).join("")}<span class="tiny">เล็ก = ครึ่งหนึ่งของขนาดมาตรฐาน · ใหญ่ = 1.5 เท่า</span></div>`;
    h += `<div class="conv">${convHTML(i)}</div>`;
    if(comps.length){
      h += `<button type="button" class="ctog" data-cmode>${i.compMode?"− ใช้สัดส่วนเดียวกันทั้งจาน":"+ ระบุว่ากินส่วนประกอบไหนบ้าง"}</button>`;
      if(i.compMode) h += `<div class="comps">${(i.comps||[]).map((c,cx)=>!c.n?"":`<div class="ecomp" data-cx="${cx}"><span>${esc(c.n)} <span class="tiny">เสิร์ฟ ${esc(fmtAmt(c.sa,c.su)||"–")}</span></span><span class="stseg"><button type="button" class="ate" data-cst="ate" aria-pressed="${c.st==="ate"}">กิน</button><button type="button" class="none" data-cst="none" aria-pressed="${c.st==="none"}">ไม่กิน</button></span>${c.st==="ate"?`<input class="inp num ec-ea" inputmode="decimal" value="${esc(c.ea??"")}" placeholder="ทั้งหมด" aria-label="จำนวนที่กิน">${unitSel("ec-eu", c.eu, c.su||"ช้อน")}`:""}</div>`).join("")}</div>`;
    }
  }
  return h + `</div>`;
}
function convHTML(i){
  const di = A.entryToMeal({items:[i], photos:{before:[],after:[]}, groups:{}}, null).items[0];
  if(!di) return "";
  const r = A.itemServ(di);
  if(r.zero) return "";
  if(!r.known) return `<span class="tiny">ระบบยังแปลงไม่ได้ ใส่จำนวนและหน่วยที่กิน หรือปริมาณที่เสิร์ฟ</span>`;
  const t = A.servText(r.serv);
  return t ? `<span class="tiny">ระบบนับเป็น </span><b class="conv-v">${esc(t)}</b>${r.partsUnknown?`<span class="tiny"> · ${r.partsUnknown} ส่วนประกอบไม่ทราบปริมาณ</span>`:""}` : "";
}
function syncItem(i){
  const sa = num(i.sa);
  if(i.st!=="ate" && i.st!=="part") return;
  if(i.frac!=null && i.frac!=="?"){ if(sa!=null){ i.ea=String(rnd(sa*i.frac)); i.eu=i.su||i.eu; } i.st = +i.frac>=1 ? "ate" : "part"; }
  else if(num(i.ea)!=null) i.st = sa!=null && i.eu===i.su && num(i.ea)>=sa ? "ate" : "part";
  if(i.compMode){ const cs=(i.comps||[]).filter(c=>c.n&&c.st); if(cs.length) i.st = cs.every(c=>c.st==="ate") && cs.length===(i.comps||[]).filter(c=>c.n).length ? "ate" : "part"; }
}
function itemDone(i){
  if(!i.st) return false;
  if(i.st!=="ate" && i.st!=="part") return true;
  if(i.compMode) return (i.comps||[]).filter(c=>c.n).every(c=>c.st);
  return i.frac!=null || num(i.ea)!=null || !!i.note;
}
function sumHTML(){
  const m = A.entryToMeal({...R.e, groups:{}, trust:"", ai:null}, null), it = A.mealIntake({...m, eaten:null});
  if(!(it && it.ok)) return `<p class="tiny">ติ๊กว่ากินและใส่ปริมาณ แล้วระบบจะสรุปมื้อนี้ตาม 5 หมู่ให้ตรงนี้</p>`;
  const q=A.req(A.parseD(R.d)), sh=MEAL[R.k].share, tg=q.kcal*sh, pk=Math.round(it.kcal/tg*100), pr=A.present5(it.serv);
  return A.statBoxes([{label:"พลังงานมื้อนี้", v:Math.round(it.kcal), unit:`/ ${Math.round(tg)} kcal`, p:pk, lev:pk<60?"bad":pk<85?"warn":"good", sub:`${pk}% ของเป้า${MEAL[R.k].name}`},
    {label:"อาหารหลัก 5 หมู่", v:pr.n, unit:"/ 5 หมู่", p:pr.n/5*100, lev:pr.n===5?"good":pr.n>=4?"warn":"bad", sub:A.fiveChips(pr)}]) + `<div style="margin-top:10px">${A.mealFive(it.serv, 0, sh, q)}</div>`;
  return `<p class="tiny">ติ๊กว่ากินและใส่ปริมาณ แล้วระบบจะสรุปมื้อนี้ตาม 5 หมู่ให้ตรงนี้</p>`;
}
function photoSlot(k,lbl){
  const list=R.e.photos[k]||[];
  return `<div class="field">${lbl}<div class="pthumbs">${list.map((p,ix)=>`<span class="pt"><img src="${esc(A.photoUrl(p))}" alt="${lbl} ${ix+1}"><button type="button" data-pk="${k}" data-pix="${ix}" aria-label="เอารูปออก">${icon("x")}</button></span>`).join("")}<label class="padd">${S.assets?`${icon("camera")}<span>เพิ่มรูป</span>`:"เพิ่มรูปได้เมื่อเชื่อมต่อ"}<input type="file" accept="image/*" multiple data-pk="${k}" ${S.assets?"":"disabled"} hidden></label></div></div>`;
}
function draw(){
  const P=$("#sheet-panel"), e=R.e, l=R.l, ex=!!S.entries[R.d+"_"+R.k];
  const hd = `<div class="sheet-h"><h2 id="sheet-title">บันทึกการกิน</h2><button class="icbtn" data-close aria-label="ปิด">${icon("x")}</button></div>`;
  let b = `<div class="frow"><label class="field">วันที่<input type="date" id="l-date" value="${R.d}" max="${today()}"></label><div class="field">ผู้บันทึก${opts("who", A.members(), R.tab==="meal"?e.by:l.by).replace(/<\/div>$/, `<button type="button" class="opt opt-add" aria-expanded="${!!R.addWho}">+ เพิ่ม</button></div>`)}${R.addWho?`<div class="addwho"><input class="inp" id="l-newwho" placeholder="เช่น ปู่ ย่า พี่เลี้ยง" aria-label="ชื่อผู้บันทึกใหม่"><button type="button" class="btn sm primary" id="l-newwho-ok">เพิ่ม</button></div><span class="tiny">แก้หรือลบรายชื่อได้ที่ ตั้งค่า</span>`:""}</div></div>`;
  b += `<div style="margin-top:10px;min-width:0">${A.seg("ltab", [["meal","มื้ออาหาร"], ...DAYTABS.map(([v,lab])=>[v, lab+(tabHas(v,l)?' <i class="tdot"></i>':"")])], R.tab, "ltabs")}</div>`;
  let f;
  if(R.tab==="meal"){
    const base=(A.base().meals[R.d]||{})[R.k];
    b += `<div class="field" style="margin-top:10px">มื้อ${opts("meal", MEALS.map(M=>[M.k,M.short]), R.k)}</div>`;
    if(ex) b += `<p class="tiny">กำลังแก้ไขบันทึกเดิมของ${MEAL[R.k].name}</p>`; else if(base&&base.items) b += `<p class="tiny">เติมรายการอาหารจากข้อมูลเดิมไว้ให้แล้ว แก้หรือเพิ่มได้</p>`;
    let no = 0;
    if(!R.mode){
      b += `<div class="modepick"><p class="sub" style="margin:0">จะบันทึก${MEAL[R.k].name}แบบไหน</p>
        <button type="button" class="mcard" data-mode="manual"><span class="mic">${icon("edit")}</span><b>บันทึกเอง</b><span>ใส่เมนูและปริมาณเองเป็นหน่วยครัวเรือน เหมาะกับมื้อที่ไม่ได้ถ่ายรูป</span></button>
        <button type="button" class="mcard ai" data-mode="photo"><span class="mic">${icon("sparkle")}</span><b>ประเมินจากรูป <span class="pill accent">AI</span></b><span>ถ่ายรูปก่อนและหลังกิน AI ช่วยระบุเมนู ส่วนประกอบ ปริมาณที่เสิร์ฟและที่กินจริง แล้วคุณตรวจแก้ได้</span></button></div>`;
      P.innerHTML = hd + `<div class="sheet-b" id="sheet-b">${b}</div><div class="sheet-f"><span class="msg" id="lmsg"></span></div>`;
      return;
    }
    b += `<div class="modebar"><span>${R.mode==="photo"?`${icon("sparkle")} ประเมินจากรูปด้วย AI`:`${icon("edit")} บันทึกเอง`}</span><button type="button" class="ctog" data-mode="">เปลี่ยนวิธี</button></div>`;
    if(R.mode==="photo"){
      const nb=(e.photos.before||[]).length, na=(e.photos.after||[]).length, done=!!(e.ai&&e.ai.fromPhotos);
      b += sec("aiphoto",++no,"รูปก่อนและหลังกิน", done?"AI วิเคราะห์แล้ว":"ขั้นแรก", `
        <div class="frow">${photoSlot("before","ก่อนกิน (ตอนเสิร์ฟ)")}${photoSlot("after","หลังกิน (ที่เหลือ)")}</div><p class="tiny" id="l-up"></p>
        <div class="aibox"><button type="button" class="btn primary" id="l-aiphoto" ${nb||na?"":"disabled"}>${icon("sparkle")}${done?"ให้ AI วิเคราะห์ใหม่":"ให้ AI วิเคราะห์รูป"}</button>
          <span class="tiny" id="l-aimsg">${done?`วิเคราะห์จากรูป ${e.ai.withPhotos} รูป · ความมั่นใจ${({low:"ต่ำ",medium:"ปานกลาง",high:"สูง"})[e.ai.confidence]||"–"}${e.ai.note?" · "+esc(e.ai.note):""}`:nb||na?`มีรูปก่อนกิน ${nb} · หลังกิน ${na}${na?"":" · ไม่มีรูปหลังกิน AI จะประเมินได้แค่ปริมาณที่เสิร์ฟ"}`:"เพิ่มรูปก่อนกินอย่างน้อย 1 รูป ถ้ามีรูปหลังกินด้วย AI จะประเมินปริมาณที่กินจริงได้"}</span></div>
        ${done?`<p class="note" style="margin:0">AI กรอกรายการ ส่วนประกอบ และปริมาณในขั้นถัดไปให้แล้ว ตรวจและแก้ให้ตรงกับที่เห็นจริงก่อนบันทึก</p>`:`<p class="tiny" style="margin:0">ถ่ายจากด้านบนให้เห็นจานทั้งใบ วางช้อนไว้ข้างจานช่วยให้ AI กะขนาดได้ดีขึ้น</p>`}`, done);
      if(!done){ b += `<p class="tiny" style="text-align:center">ไม่มีรูป หรืออยากกรอกเอง <button type="button" class="ctog" data-mode="manual" style="display:inline">ข้ามไปบันทึกเอง</button></p>`;
        P.innerHTML = hd + `<div class="sheet-b" id="sheet-b">${b}</div><div class="sheet-f"><span class="msg" id="lmsg"></span></div>`; return; }
    }
    const dur = e.start&&e.end ? ((toMin(e.end)-toMin(e.start))+1440)%1440 : null;
    const named = e.items.filter(i=>i.n), nItems = named.length, nDone = named.filter(itemDone).length;
    b += sec("served",++no,"อาหารที่เสิร์ฟ", nItems?`${nItems} รายการ`:"ขั้นที่ 1", `
      <select class="inp" id="l-quickfood" aria-label="เลือกเมนูที่เคยบันทึก"><option value="">+ เลือกเมนูที่เคยบันทึก</option>${knownFoods().map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("")}</select>
      <datalist id="food-list">${knownFoods().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
      <div style="display:grid;gap:8px" id="l-items">${e.items.map(servedRow).join("")}</div>
      <button type="button" class="btn" id="l-additem">${icon("plus")}เพิ่มอาหารที่เสิร์ฟ</button>
      <p class="tiny">ใส่ปริมาณเป็นหน่วยที่ใช้จริงที่บ้าน เช่น 1 ทัพพี 1 ฟอง 5 ชิ้น ไม่ต้องชั่ง · เมนูรวม เช่น สปาเก็ตตี้ครีมซอสแซลมอน กด "แตกส่วนประกอบ" เพื่อแยกเส้น แซลมอน ซอส ผัก</p>`, nItems>0);
    b += sec("eaten",++no,"อาหารที่กินจริง", nItems?`${nDone}/${nItems} รายการระบุแล้ว`:"ขั้นที่ 2", `
      <div style="display:grid;gap:8px" id="l-eaten">${nItems?e.items.map((i,ix)=>i.n?eatenRow(i,ix):"").join(""):'<p class="tiny">ใส่อาหารที่เสิร์ฟในขั้นที่ 1 ก่อน รายการจะมาแสดงตรงนี้ให้ติ๊กว่ากินหรือไม่กิน</p>'}</div>
      <div><h4 style="margin:6px 0 8px">สรุปมื้อนี้ตาม 5 หมู่</h4><div id="l-sum">${sumHTML()}</div></div>`, nItems&&nDone===nItems);
    b += sec("time",++no,"เวลา", dur!=null?`รวม ${dur} นาที`:"", `<div class="frow">
      <label class="field">เริ่ม<span class="tin"><input type="time" id="l-start" value="${esc(e.start)}"><button type="button" class="btn sm" data-now="l-start">ตอนนี้</button></span></label>
      <label class="field">จบ<span class="tin"><input type="time" id="l-end" value="${esc(e.end)}"><button type="button" class="btn sm" data-now="l-end">ตอนนี้</button></span></label>
      <label class="field">นั่งต่อเนื่องนานสุด (นาที)<input id="l-sit" inputmode="numeric" class="num" value="${esc(e.sitMax)}" placeholder="ประมาณ"></label></div>`, dur!=null);
    b += sec("feed",++no,"การป้อนและพฤติกรรม", (FEED.find(x=>x[0]===e.feed)||[])[1]||"", `
      <div class="field">ใครเป็นคนตักเข้าปาก${opts("feed", FEED, e.feed)}</div>
      <label class="check"><input type="checkbox" id="l-follow" ${e.follow?"checked":""}> ต้องเดินตามป้อน</label>
      <div class="field">พฤติกรรมที่เกิดขึ้น (เลือกได้หลายข้อ)${opts("behav", BEHAV, e.behav, true)}</div>`, !!e.feed);
    b += sec("env",++no,"บรรยากาศก่อนและระหว่างมื้อ", "ไม่บังคับ", `
      <div class="field">ก่อนกิน${opts("mood", MOOD, e.mood)}</div>
      <div class="frow"><div class="field">ทีวี/มือถือเปิดอยู่${yn("screen",e.screen)}</div><div class="field">ของเล่นที่โต๊ะ${yn("toys",e.toys)}</div><div class="field">นม/ขนมภายใน 1 ชม. ก่อนมื้อ${yn("snackBefore",e.snackBefore)}</div></div>
      <div class="field">กินด้วยกันกับ${opts("with", [...A.members(),"กินพร้อมผู้ใหญ่ที่โต๊ะ","เด็กคนอื่น"], e.with, true)}</div>
      <div class="field">ที่ไหน${opts("place", PLACES, e.place)}</div>`);
    if(R.mode!=="photo") b += sec("photo",++no,"รูปก่อน/หลังกิน", "ไม่บังคับ", `<div class="frow">${photoSlot("before","ก่อนกิน")}${photoSlot("after","หลังกิน")}</div><p class="tiny" id="l-up"></p>`);
    b += sec("note",++no,"เล่าเพิ่ม", "ไม่บังคับ", `<textarea class="inp" id="l-note" rows="3" placeholder="เช่น เห็นอาหารแล้วเดินหนี ยอมกินเมื่อแม่นั่งกินด้วย">${esc(e.note)}</textarea>`);
    f = `<span class="msg" id="lmsg">${S.canWrite?"":"บัญชีนี้ดูได้อย่างเดียว"}</span>${ex?`<button type="button" class="btn danger" id="l-del">${icon("trash")}ลบ</button>`:""}<button type="button" class="btn primary" id="l-save">บันทึก${MEAL[R.k].name}</button>`;
  } else {
    const tb = R.tab; const ms=l.milk.reduce((a,x)=>a+(+x.ml||0),0);
    if(tb==="milk") b += sec("milk",1,"นม", ms?`รวม ${ms} มล.`:"", `<div id="l-milk" style="display:grid;gap:8px">${l.milk.map((m,ix)=>milkRow(m,ix)).join("")}</div>
      <p class="tiny" style="margin:0">กรอกเป็น มล. หรือเป็นกล่องก็ได้ ถ้าเลือกกล่อง ให้เลือกขนาดกล่องแล้วใส่จำนวน ระบบจะรวมเป็น มล. ต่อรอบให้ (ครึ่งกล่องใส่ 0.5)</p>
      <div class="chips"><button type="button" class="btn sm" id="l-addmilk">${icon("plus")}เพิ่มรอบนม</button></div>
      <label class="field">น้ำเปล่าทั้งวัน (มล. ประมาณ)<input class="num" id="l-water" inputmode="numeric" value="${esc(l.water)}"></label>`, ms>0);
    if(tb==="snack") b += sec("snack",1,"ของว่างนอกมื้อ", (l.snacks||[]).length?`${l.snacks.length} รายการ`:"", `<div id="l-snacks" style="display:grid;gap:6px">${l.snacks.map((s,ix)=>`<div class="mrow" data-ix="${ix}"><input type="time" class="inp in-st" value="${esc(s.t)}" aria-label="เวลา"><input class="inp in-sn" style="flex:1;min-width:120px" value="${esc(s.n)}" placeholder="อะไร" list="food-list"><input class="inp in-sa2" style="width:130px" value="${esc(s.a)}" placeholder="เท่าไหร่"><button type="button" class="icbtn s-del" aria-label="ลบ">${icon("x")}</button></div>`).join("")}</div>
      <datalist id="food-list">${knownFoods().map(n=>`<option value="${esc(n)}">`).join("")}</datalist><div class="chips"><button type="button" class="btn sm" id="l-addsnack">${icon("plus")}เพิ่มของว่าง</button></div>`);
    if(tb==="health") b += sec("sym",1,"อาการและการขับถ่าย", (l.sym||[]).length?l.sym.join(", "):"", `<div class="field">อาการวันนี้${opts("sym", SYM, l.sym, true)}</div><label class="field">รายละเอียด<input id="l-symnote" value="${esc(l.symNote)}" placeholder="เช่น สำลักน้ำซุปตอนเย็น 1 ครั้ง"></label><div class="field">ขับถ่าย${opts("stool", STOOL, l.stool)}</div>`, (l.sym||[]).length>0);
    if(tb==="sleep") b += sec("nap",1,"การนอน", l.sleeps.length?`${l.sleeps.length} รอบ`:"", `<div id="l-sleeps" style="display:grid;gap:8px">${l.sleeps.length?l.sleeps.map((x,ix)=>`<div class="slrow" data-ix="${ix}">
        <span class="stseg" role="group" aria-label="รอบการนอน">${A.SLEEP_P.map(p=>`<button type="button" data-sp="${p}" aria-pressed="${x.p===p}">${p}</button>`).join("")}</span>
        <div class="frow"><label class="field">เริ่มหลับ<input type="time" class="in-ss" value="${esc(x.s||"")}"></label><label class="field">ตื่น · ไม่บังคับ<input type="time" class="in-se" value="${esc(x.e||"")}"></label></div>
        <button type="button" class="icbtn sl-del" aria-label="ลบรอบการนอน">${icon("x")}</button></div>`).join(""):'<p class="tiny">ยังไม่มีรอบการนอนของวันนี้</p>'}</div>
      <div class="chips"><button type="button" class="btn sm" id="l-addsleep">${icon("plus")}เพิ่มรอบการนอน</button></div>
      <p class="tiny" style="margin:0">เลือกรอบ (สาย บ่าย เย็น กลางคืน) ใส่เวลาเริ่มหลับ ส่วนเวลาตื่นใส่ทีหลังได้</p>`, l.sleeps.length>0);
    if(tb==="body") b += sec("body",1,"น้ำหนักและส่วนสูง", "ถ้าวัดวันนี้", `<div class="frow"><label class="field">น้ำหนัก (กก.)<input class="num" id="l-w" inputmode="decimal" value="${esc(l.weight)}"></label><label class="field">ส่วนสูง (ซม.)<input class="num" id="l-h" inputmode="decimal" value="${esc(l.height)}"></label></div><p class="tiny">ค่าที่ใส่จะไปอยู่ในกราฟการเติบโตด้วย</p>`);
    if(tb==="health") b += sec("dnote",2,"หมายเหตุของวัน", "", `<textarea class="inp" id="l-dnote" rows="2">${esc(l.note)}</textarea>`);
    f = `<span class="msg" id="lmsg">${S.canWrite?"":"บัญชีนี้ดูได้อย่างเดียว"}</span><button type="button" class="btn primary" id="l-dsave">บันทึก${(DAYTABS.find(x=>x[0]===R.tab)||[,""])[1]}</button>`;
  }
  P.innerHTML = hd + `<div class="sheet-b" id="sheet-b">${b}</div><div class="sheet-f">${f}</div>`;
  const at=P.querySelector('.ltabs button[aria-pressed="true"]'); if(at){ const sg=at.parentElement; sg.scrollLeft = Math.max(0, at.offsetLeft - (sg.clientWidth-at.offsetWidth)/2); }
}
function readItems(){
  $$("#l-items .sitem").forEach(r=>{ const i=R.e.items[+r.dataset.ix]; if(!i) return; i.n=r.querySelector(".in-n").value.trim(); i.g=r.querySelector(".in-g").value; i.sa=r.querySelector(".in-sa").value.trim(); i.su=r.querySelector(".in-su").value;
    $$(".comp", r).forEach(cr=>{ const c=(i.comps||[])[+cr.dataset.cx]; if(!c) return; c.n=cr.querySelector(".c-n").value.trim(); c.g=cr.querySelector(".c-g").value; c.sa=cr.querySelector(".c-sa").value.trim(); c.su=cr.querySelector(".c-su").value; }); });
  $$("#l-eaten .eitem").forEach(r=>{ const i=R.e.items[+r.dataset.ix]; if(!i) return;
    const ea=r.querySelector(".in-ea"); if(ea){ const v=ea.value.trim(); if(v){ i.ea=v; i.eu=r.querySelector(".in-eu").value; i.frac=null; } else if(i.frac==null) i.ea=""; }
    $$(".ecomp", r).forEach(cr=>{ const c=i.comps[+cr.dataset.cx]; const x=cr.querySelector(".ec-ea"); if(c&&x){ c.ea=x.value.trim(); c.eu=cr.querySelector(".ec-eu").value; } });
    syncItem(i); });
}
function readMeal(){ const e=R.e; readItems(); const v=id=>{ const x=$("#"+id); return x?x.value.trim():undefined; };
  if($("#l-start")){ e.start=v("l-start"); e.end=v("l-end"); e.sitMax=v("l-sit"); e.follow=$("#l-follow").checked; }
  if($("#l-note")) e.note=v("l-note");
  $$(".in-grp").forEach(x=>e.groups[x.dataset.g]=x.value.trim()); }
function readDay(){ const l=R.l;
  $$("#l-milk .mrow").forEach(r=>{ const m=l.milk[+r.dataset.ix]; m.t=r.querySelector(".in-mt").value;
    if(m.u==="box"){ m.box=+r.querySelector(".in-box").value||""; m.n=r.querySelector(".in-mn").value.trim().replace(",","."); m.ml=milkTotal(m); }
    else { m.u="ml"; m.ml=r.querySelector(".in-ml").value.trim(); delete m.box; delete m.n; } });
  $$("#l-snacks .mrow").forEach(r=>{ const s=l.snacks[+r.dataset.ix]; s.t=r.querySelector(".in-st").value; s.n=r.querySelector(".in-sn").value.trim(); s.a=r.querySelector(".in-sa2").value.trim(); });
  const v=id=>{ const x=$("#"+id); return x?x.value.trim():""; };
  if($("#l-water")) l.water=v("l-water"); if($("#l-symnote")) l.symNote=v("l-symnote"); $$("#l-sleeps .slrow").forEach(r=>{ const x=l.sleeps[+r.dataset.ix]; if(x){ x.s=r.querySelector(".in-ss").value; x.e=r.querySelector(".in-se").value; } }); if($("#l-w")){ l.weight=v("l-w"); l.height=v("l-h"); } if($("#l-dnote")) l.note=v("l-dnote"); }
const read = () => R.tab==="meal" ? readMeal() : readDay();
const redraw = () => {
  const sb=$("#sheet-b"), y=sb?sb.scrollTop:0, ae=document.activeElement;
  let key=null; if(ae && ae.tagName!=="SELECT" && sb && sb.contains(ae) && ae.classList.length){ const r=ae.closest("[data-ix]"), c=ae.closest("[data-cx]"), box=ae.closest("#l-items,#l-eaten,#l-milk,#l-snacks"); key={cls:[...ae.classList].find(x=>/^(in|c|ec)-/.test(x)), ix:r&&r.dataset.ix, cx:c&&c.dataset.cx, box:box&&box.id}; }
  draw(); const nb=$("#sheet-b"); if(nb) nb.scrollTop=y;
  if(key&&key.cls&&key.box){ const el=$(`#${key.box} ${key.ix!=null?`[data-ix="${key.ix}"] `:""}${key.cx!=null?`[data-cx="${key.cx}"] `:""}.${key.cls}`); if(el) try{ el.focus({preventScroll:true}); }catch(_){} }
};
const msg = t => { const m=$("#lmsg"); if(m){ m.textContent=t; m.dataset.warn=""; } };

async function saveMeal(){
  readMeal(); const e=R.e; e.items=e.items.filter(i=>i.n);
  if(!e.items.length && !e.note){ msg("ใส่อาหารอย่างน้อย 1 รายการ หรือเล่าเพิ่มก่อนบันทึก"); return; }
  const nost = e.items.find(i=>!i.st); if(nost){ msg(`ติ๊กว่า "${nost.n}" กินหรือไม่กิน (ไม่แน่ใจ เลือก "ไม่ทราบ")`); R.open.eaten=true; redraw(); return; }
  const noamt = e.items.find(i=>!itemDone(i)); if(noamt){ msg(`ใส่ปริมาณที่กินของ "${noamt.n}" หรือกด "ไม่ทราบปริมาณ"`); R.open.eaten=true; redraw(); return; }
  // amounts now come from the served/eaten items; old per-group estimates stay only when items carry no amounts
  const hasAmt = e.items.some(i=>(i.st==="ate"||i.st==="part") && (i.frac!=null&&i.frac!=="?" || +i.ea>0 || i.compMode));
  if(hasAmt || !e.trust){ e.trust="items"; e.groups={carb:"",protein:"",veg:"",fruit:""}; }
  e.mode=R.mode||"manual"; e.date=R.d; e.meal=R.k; e.updatedAt=Date.now(); if(S.uid) e.uid=S.uid;
  const clean=JSON.parse(JSON.stringify(e)); msg("กำลังบันทึก…");
  const ok = await A.save("mealentries/"+R.d+"_"+R.k, clean);
  if(!ok){ msg("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"); return; }
  if(S.mode!=="db") S.entries[R.d+"_"+R.k]=clean;
  A.LS.set("who", e.by); A.logDirty=false; A.closeLog(true); A.toast(`บันทึก${MEAL[R.k].name}แล้ว`); A.emit("entries");
}
async function delMeal(){
  const b=$("#l-del"); if(b.dataset.c!=="1"){ b.dataset.c="1"; b.innerHTML="ยืนยันการลบ"; return; }
  if(!(await A.remove("mealentries/"+R.d+"_"+R.k))) return;
  delete S.entries[R.d+"_"+R.k]; A.logDirty=false; A.closeLog(true); A.toast("ลบบันทึกแล้ว"); A.emit("entries");
}
async function saveDay(){
  readDay(); const l=R.l;
  if(l.milk.some(m=>m.u==="box" && +m.n && !m.box)){ msg("เลือกขนาดกล่องนมก่อนบันทึก"); return; }
  if((l.sleeps||[]).some(x=>x.e && !x.s)){ msg("ใส่เวลาเริ่มหลับของทุกรอบการนอน"); return; }
  l.sleeps=(l.sleeps||[]).filter(x=>x.s); l.napS=""; l.napE="";
  l.date=R.d; l.updatedAt=Date.now(); l.milk=l.milk.filter(m=>m.t||m.ml); l.snacks=l.snacks.filter(s=>s.n);
  msg("กำลังบันทึก…");
  const ok = await A.save("daylogs/"+R.d, JSON.parse(JSON.stringify(l)));
  if(!ok){ msg("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"); return; }
  const w=parseFloat(l.weight), ht=parseFloat(l.height);
  if(w||ht){ const g={...(S.growthExtra[R.d]||{})}; if(w) g.weight=w; if(ht){ g.height=ht; g.heightText=String(ht); } g.src="บันทึกโดย"+(l.by||""); await A.save("growth/"+R.d, g); if(S.mode!=="db") S.growthExtra[R.d]=g; }
  if(S.mode!=="db") S.daylogs[R.d]=l;
  A.LS.set("who", l.by); A.logDirty=false; A.closeLog(true); A.toast("บันทึกประจำวันแล้ว"); A.emit("daylogs");
}
async function aiEstimate(){
  readMeal(); const e=R.e, out=$("#l-ai");
  let sample=null; try{ sample = await claude.use("sample"); }catch(_){}
  if(!sample){ out.innerHTML=`<p class="tiny">ใช้ AI ไม่ได้ในโหมดนี้ ประเมินเองได้ที่การ์ดซ้าย</p>`; return; }
  const items=e.items.filter(i=>i.n); const blobs=[]; let canImg=false; try{ const lim=await sample.limits(); canImg=!!(lim&&lim.images); }catch(_){}
  const phs=[...(e.photos.before||[]).map(p=>["ก่อนกิน",p]),...(e.photos.after||[]).map(p=>["หลังกิน",p])];
  if(canImg) for(const [,p] of phs){ try{ const r=await fetch(A.photoUrl(p)); blobs.push(await r.blob()); }catch(_){} }
  if(!items.length && !blobs.length){ out.innerHTML=`<p class="tiny">ใส่รายการอาหารหรือเพิ่มรูปก่อน แล้วค่อยให้ AI ประเมิน</p>`; return; }
  const age = A.ageText();
  const prompt = `ช่วยประเมินปริมาณอาหารที่เด็กอายุ ${age} กินจริงในหนึ่งมื้อ เพื่อเทียบกับธงโภชนาการเด็ก 1–3 ปีของไทย
หน่วย: ข้าว-แป้ง = ทัพพี (≈ ข้าวสุก 60 กรัม), เนื้อสัตว์ ไข่ ถั่ว = ช้อนกินข้าว (≈ เนื้อสุก 15 กรัม, ไข่ 1 ฟอง = 2 ช้อน), ผัก = ทัพพี (≈ ผักสุก 40 กรัม), ผลไม้ = ส่วน (≈ ผลไม้ชิ้นพอดีคำ 6–8 ชิ้น หรือกล้วยครึ่งลูก)
นับเฉพาะที่กลืนจริง ไม่นับ "ไม่กิน" หรือ "คาย" · เด็ก 1 คำ ≈ 1 ช้อนชาพูน · ถ้าข้อมูลไม่พอให้ประเมินอย่างระมัดระวังและลดความมั่นใจ
รายการ:
${items.map(i=>`- ${i.n} (${i.g}) ผล: ${({ate:"กินหมด",part:"กินบางส่วน",none:"ไม่กิน",spit:"คาย",unk:"ไม่ทราบ"})[i.st]||"ไม่ระบุ"} · กินไป: ${fmtAmt(i.ea,i.eu)||"ไม่ระบุ"} · ตักให้: ${fmtAmt(i.sa,i.su)||"ไม่ระบุ"}`).join("\n")||"(ไม่มี ใช้รูปแทน)"}
${blobs.length?`มีรูป ${blobs.length} รูป ตามลำดับ: ${phs.map(x=>x[0]).join(", ")}`:"ไม่มีรูป"}
ตอบเป็น JSON เท่านั้น: {"carb":number,"protein":number,"veg":number,"fruit":number,"fat":true|false|null,"confidence":"low"|"medium"|"high","note":"ภาษาไทย 1 ประโยค บอกสมมติฐานหลัก"} ปัดทีละ 0.25`;
  out.innerHTML=`<p class="tiny">กำลังประเมิน…</p>`;
  try{
    const r = await sample.json(prompt, {images: blobs.length?blobs:undefined, modelTier:"default"});
    const n=v=>Math.round(Math.max(0,+v||0)*4)/4;
    e.ai={eaten:{carb:n(r.carb),protein:n(r.protein),veg:n(r.veg),fruit:n(r.fruit),fat:r.fat??null}, confidence:r.confidence||"low", note:String(r.note||"").slice(0,200), at:Date.now(), withPhotos:blobs.length};
    if(!Object.values(e.groups).some(v=>v!=="")) e.trust="ai";
    A.logDirty=true; R.open.groups=true; redraw();
  }catch(err){ out.innerHTML=`<p class="tiny">${err&&err.code==="rate_limited"?"ใช้ AI ถี่เกินไป รอสักครู่แล้วลองใหม่":err&&err.code==="not_granted"?"ยังไม่ได้อนุญาตให้ใช้ AI":"AI ประเมินไม่สำเร็จ ลองใหม่ หรือประเมินเอง"}</p>`; }
}
/* smart mode: AI reads before/after photos → served items, components and eaten amounts */
function aiApply(r, nPhotos){
  const e=R.e, U=new Set(UNITS), C=new Set(CATS);
  const unit = u => { u=String(u||"").trim().replace(/^มล$/,"มล."); return U.has(u)?u:(u==="ช้อนกินข้าว"||u==="ช้อนโต๊ะ"?"ช้อน":u==="กรัม"?"กรัม":"ส่วน"); };
  const cat = (g,n) => C.has(g) ? g : A.guessCat(n);
  const q = v => { const x=+v; return isFinite(x)&&x>0 ? String(Math.round(x*100)/100) : ""; };
  const items = (Array.isArray(r.items)?r.items:[]).filter(x=>x&&x.n).slice(0,20).map(x=>{
    const st = ["ate","part","none","spit","unk"].includes(x.status) ? x.status : "unk";
    const it = {n:String(x.n).slice(0,60), g:cat(x.g,x.n), sa:q(x.served&&x.served.amount), su:x.served&&x.served.amount?unit(x.served.unit):"", st, ea:"", eu:"", frac:null, ai:true,
      comps:(Array.isArray(x.comps)?x.comps:[]).filter(c=>c&&c.n).slice(0,8).map(c=>({n:String(c.n).slice(0,40), g:cat(c.g,c.n), sa:q(c.amount), su:c.amount?unit(c.unit):""}))};
    if(st==="ate"||st==="part"){ const f=+x.eatenFraction; if(isFinite(f)&&f>0&&it.sa){ const snap=[1,.75,.5,.25].reduce((a,b)=>Math.abs(b-f)<Math.abs(a-f)?b:a); it.frac = Math.abs(snap-f)<=.1 ? snap : null; if(it.frac==null){ it.ea=String(Math.round(+it.sa*f*100)/100); it.eu=it.su; } } else it.frac="?"; }
    if(it.comps.length) it.showComps=true;
    syncItem(it); return it; });
  const n=v=>Math.round(Math.max(0,+v||0)*4)/4, g=r.groups||{};
  e.items = items.length ? items : e.items;
  e.ai = {eaten:{carb:n(g.carb),protein:n(g.protein),veg:n(g.veg),fruit:n(g.fruit),fat:g.fat??null}, confidence:r.confidence||"low", note:String(r.note||"").slice(0,200), at:Date.now(), withPhotos:nPhotos, fromPhotos:true};
  e.trust = "items";
  R.open.served=true; R.open.eaten=true; A.logDirty=true;
}
A._aiApply = (r,n=2) => { aiApply(r,n); redraw(); };
async function aiFromPhotos(){
  readMeal(); const e=R.e, msgEl=()=>$("#l-aimsg");
  let sample=null; try{ sample = await claude.use("sample"); }catch(_){}
  if(!sample){ msgEl().textContent="ใช้ AI ไม่ได้ในหน้านี้ เปิดผ่านลิงก์ของแอป หรือเปลี่ยนเป็นบันทึกเอง"; return; }
  let canImg=false; try{ const lim=await sample.limits(); canImg=!!(lim&&lim.images); }catch(_){}
  if(!canImg){ msgEl().textContent="บัญชีนี้ยังส่งรูปให้ AI ไม่ได้ เปลี่ยนเป็นบันทึกเองได้"; return; }
  const phs=[...(e.photos.before||[]).map(p=>["ก่อนกิน",p]),...(e.photos.after||[]).map(p=>["หลังกิน",p])], blobs=[];
  for(const [,p] of phs){ try{ const r=await fetch(A.photoUrl(p)); blobs.push(await r.blob()); }catch(_){} }
  if(!blobs.length){ msgEl().textContent="ยังไม่มีรูป เพิ่มรูปก่อนกินก่อน"; return; }
  const btn=$("#l-aiphoto"); if(btn){ btn.disabled=true; btn.innerHTML=`${icon("sparkle")}กำลังวิเคราะห์…`; }
  msgEl().textContent="AI กำลังดูรูป ใช้เวลาราว 10–30 วินาที";
  const prompt = `คุณช่วยผู้ปกครองบันทึกมื้ออาหารของเด็กอายุ ${A.ageText()} จากรูป ${blobs.length} รูป ตามลำดับ: ${phs.map(x=>x[0]).join(", ")}
งาน: 1) ระบุอาหารแต่ละอย่างที่เสิร์ฟ (เมนูรวมให้แตกส่วนประกอบ เช่น สปาเก็ตตี้ครีมซอสแซลมอน → เส้น แซลมอน ครีมซอส ผัก) 2) ประเมินปริมาณที่เสิร์ฟเป็นหน่วยครัวเรือน 3) เทียบรูปก่อนและหลังว่ากินไปกี่ส่วน (0–1) ถ้าไม่มีรูปหลังกิน ให้ status = "unk"
หน่วยที่ใช้ได้: ${UNITS.join(", ")} (ข้าว-แป้ง ใช้ ทัพพี · เนื้อสัตว์ ใช้ ช้อน · ไข่ ใช้ ฟอง · ผัก ใช้ ทัพพี หรือ ชิ้น · ผลไม้ ใช้ ชิ้น หรือ ส่วน · น้ำมัน/ซอสมัน ใช้ ช้อนชา)
หมวดที่ใช้ได้: ${CATS.join(", ")}
ข้าวสวย 1 ทัพพี ≈ 55 กรัม · เนื้อสุก 1 ช้อน ≈ 15 กรัม · ผลไม้ 1 ส่วน ≈ 6–8 ชิ้นพอดีคำ · ถ้าไม่แน่ใจให้ประเมินแบบระมัดระวังและลดความมั่นใจ
ตอบเป็น JSON เท่านั้น:
{"items":[{"n":"ชื่ออาหารภาษาไทย","g":"หมวด","served":{"amount":number,"unit":"หน่วย"},"status":"ate|part|none|unk","eatenFraction":number,"comps":[{"n":"ส่วนประกอบ","g":"หมวด","amount":number,"unit":"หน่วย"}]}],
 "groups":{"carb":number,"protein":number,"veg":number,"fruit":number,"fat":true|false|null},
 "confidence":"low|medium|high","note":"ภาษาไทย 1 ประโยค บอกสิ่งที่ไม่แน่ใจ"}
groups = ปริมาณที่กินจริงทั้งมื้อ หน่วย ข้าว-แป้ง ทัพพี · เนื้อสัตว์ ช้อนกินข้าว · ผัก ทัพพี · ผลไม้ ส่วน`;
  try{
    const r = await sample.json(prompt, {images: blobs, modelTier:"default"});
    aiApply(r, blobs.length); redraw();
  }catch(err){ const m=msgEl(); if(m) m.textContent = err&&err.code==="rate_limited"?"ใช้ AI ถี่เกินไป รอสักครู่แล้วลองใหม่":err&&err.code==="not_granted"?"ยังไม่ได้อนุญาตให้ใช้ AI":"AI วิเคราะห์ไม่สำเร็จ ลองใหม่ หรือเปลี่ยนเป็นบันทึกเอง"; const b2=$("#l-aiphoto"); if(b2){ b2.disabled=false; b2.innerHTML=`${icon("sparkle")}ให้ AI วิเคราะห์รูป`; } }
}
async function addPhoto(input){
  const k=input.dataset.pk, fs=[...(input.files||[])]; if(!fs.length||!S.assets) return;
  readMeal(); const um=$("#l-up"); if(um) um.textContent="กำลังอัปโหลดรูป…";
  try{ for(const f of fs){ const sm=await A.resizeImg(f,1280); const r=await S.assets.upload(sm.blob); R.e.photos[k].push(S.assets.local ? {id:r.id} : {id:r.id,url:r.url}); } A.logDirty=true; redraw(); }
  catch(_){ if(um) um.textContent="อัปโหลดรูปไม่สำเร็จ ลองใหม่"; }
}
const panel = $("#sheet");
panel.addEventListener("keydown", ev=>{ if(ev.target.id==="l-newwho" && ev.key==="Enter"){ ev.preventDefault(); addWho(); } });
panel.addEventListener("toggle", ev=>{ const d=ev.target.closest&&ev.target.closest("details.fsec"); if(d) R.open[d.dataset.sec]=d.open; }, true);
panel.addEventListener("click", ev=>{
  const t=ev.target;
  if(t.closest("[data-close]")) return A.closeLog();
  const sg=t.closest('[data-seg="ltab"] button'); if(sg){ read(); R.tab=sg.dataset.v; redraw(); return; }
  if(t.closest("#l-addsleep")){ readDay(); const now=nowHM(); R.l.sleeps.push({p:A.sleepPeriod(now), s:now, e:""}); A.logDirty=true; redraw(); return; }
  if(t.closest(".sl-del")){ readDay(); R.l.sleeps.splice(+t.closest(".slrow").dataset.ix,1); A.logDirty=true; redraw(); return; }
  const spb=t.closest("[data-sp]"); if(spb){ readDay(); R.l.sleeps[+spb.closest(".slrow").dataset.ix].p=spb.dataset.sp; A.logDirty=true; redraw(); return; }
  if(t.closest(".opt-add")){ read(); R.addWho=!R.addWho; redraw(); const x=$("#l-newwho"); if(x) x.focus(); return; }
  if(t.closest("#l-newwho-ok")) return addWho();
  const op=t.closest(".opt"); if(op){ const set=op.closest(".opts"), name=set.dataset.name, multi=set.dataset.multi==="1", v=op.dataset.v; read();
    if(name==="meal"){ R.k=v; load(); draw(); return; }
    const tgt = name==="who" ? (R.tab==="meal"?R.e:R.l) : (["sym","stool"].includes(name)?R.l:R.e);
    if(name==="who") tgt.by=v;
    else if(multi){ const arr=tgt[name]||(tgt[name]=[]); const i=arr.indexOf(v); if(i>=0) arr.splice(i,1); else { if(name==="sym"&&v==="ไม่มีอาการ") arr.length=0; else if(name==="sym"){ const j=arr.indexOf("ไม่มีอาการ"); if(j>=0) arr.splice(j,1); } arr.push(v); } }
    else if(["screen","toys","snackBefore"].includes(name)){ const nv=v==="yes"; tgt[name]=tgt[name]===nv?null:nv; }
    else tgt[name] = tgt[name]===v ? "" : v;
    A.logDirty=true; redraw(); return; }
  const mu=t.closest(".m-u"); if(mu){ readDay(); const m=R.l.milk[+mu.closest(".mrow").dataset.ix]; if(m.u!==mu.dataset.u){ m.u=mu.dataset.u; if(m.u==="box"){ m.box=m.box||lastBox(); m.n=m.n||"1"; } m.ml=milkTotal(m); } A.logDirty=true; redraw(); return; }
  const ix = el => +el.closest("[data-ix]").dataset.ix;
  const ce=t.closest("[data-eat]"); if(ce){ readItems(); const i=R.e.items[ix(ce)], v=ce.dataset.eat; if(v==="eat"){ if(i.st!=="ate"&&i.st!=="part"){ i.st="part"; i.frac=null; i.ea=""; } } else { i.st=v; i.frac=null; i.ea=""; i.compMode=false; } A.logDirty=true; redraw(); return; }
  const fr=t.closest("[data-frac]"); if(fr){ readItems(); const i=R.e.items[ix(fr)], v=fr.dataset.frac; i.frac = v==="?" ? (i.frac==="?"?null:"?") : +v; if(i.frac==="?") i.ea=""; syncItem(i); A.logDirty=true; redraw(); return; }
  const sz=t.closest("[data-size]"); if(sz){ readItems(); R.e.items[ix(sz)].size = sz.dataset.size==="m" ? null : sz.dataset.size; A.logDirty=true; redraw(); return; }
  const cm=t.closest("[data-cmode]"); if(cm){ readItems(); const i=R.e.items[ix(cm)]; i.compMode=!i.compMode; if(i.compMode){ i.frac=null; i.ea=""; } A.logDirty=true; redraw(); return; }
  const cs=t.closest("[data-cst]"); if(cs){ readItems(); const i=R.e.items[ix(cs)], c=i.comps[+cs.closest("[data-cx]").dataset.cx]; c.st = c.st===cs.dataset.cst?"":cs.dataset.cst; syncItem(i); A.logDirty=true; redraw(); return; }
  if(t.closest(".c-open")){ readItems(); const i=R.e.items[ix(t)]; i.showComps=true; i.comps=i.comps||[]; if(!i.comps.length) i.comps.push({n:"",g:"",sa:"",su:"ช้อน"}); redraw(); const c=$$(`.sitem[data-ix="${ix(t)}"] .c-n`); if(c.length) c[c.length-1].focus(); return; }
  if(t.closest(".c-add")){ readItems(); const k=ix(t); R.e.items[k].comps.push({n:"",g:"",sa:"",su:"ช้อน"}); redraw(); const c=$$(`.sitem[data-ix="${k}"] .c-n`); c[c.length-1].focus(); return; }
  if(t.closest(".c-del")){ readItems(); const i=R.e.items[ix(t)]; i.comps.splice(+t.closest("[data-cx]").dataset.cx,1); A.logDirty=true; redraw(); return; }
  const st=t.closest(".stseg button"); if(st && st.dataset.st && t.closest(".item")){ readItems(); R.e.items[+st.closest(".item").dataset.ix].st=st.dataset.st; A.logDirty=true; redraw(); return; }
  if(t.closest(".in-del")){ readItems(); R.e.items.splice(ix(t),1); A.logDirty=true; redraw(); return; }
  const af=t.closest("[data-addf]"); if(af){ readMeal(); const n=af.dataset.addf; if(!R.e.items.some(i=>i.n===n)) R.e.items.push(newItem(n)); A.logDirty=true; redraw(); return; }
  if(t.closest("#l-additem")){ readMeal(); R.e.items.push(newItem()); redraw(); const ins=$$("#l-items .in-n"); ins[ins.length-1].focus(); return; }
  const nw=t.closest("[data-now]"); if(nw){ $("#"+nw.dataset.now).value=nowHM(); readMeal(); A.logDirty=true; redraw(); return; }
  const sp=t.closest("[data-step]"); if(sp){ const i=panel.querySelector(`.in-grp[data-g="${sp.dataset.step}"]`); i.value=Math.max(0,(parseFloat(i.value)||0)+parseFloat(sp.dataset.d)); readMeal(); if(!R.e.trust) R.e.trust="manual"; A.logDirty=true; redraw(); return; }
  if(t.closest("#l-aibtn")) return aiEstimate();
  if(t.closest("#l-aiphoto")) return aiFromPhotos();
  const md=t.closest("[data-mode]"); if(md){ read(); R.mode = md.dataset.mode || null; redraw(); return; }
  const gc=t.closest(".gcard"); if(gc && !t.closest("input,button")){ read(); R.e.trust = R.e.trust===gc.dataset.trust?"":gc.dataset.trust; A.logDirty=true; redraw(); return; }
  const px=t.closest(".pt button"); if(px){ readMeal(); R.e.photos[px.dataset.pk].splice(+px.dataset.pix,1); A.logDirty=true; redraw(); return; }
  if(t.closest("#l-save")) return saveMeal();
  if(t.closest("#l-del")) return delMeal();
  if(t.closest("#l-dsave")) return saveDay();
  if(t.closest("#l-addmilk")){ readDay(); const prev=R.l.milk[R.l.milk.length-1]||{}; R.l.milk.push(prev.u==="box"?{t:nowHM(),u:"box",box:prev.box||lastBox(),n:"1",ml:""}:{t:nowHM(),u:"ml",ml:""}); redraw(); return; }
  if(t.closest(".m-del")){ readDay(); R.l.milk.splice(+t.closest(".mrow").dataset.ix,1); if(!R.l.milk.length) R.l.milk.push({t:"",ml:""}); redraw(); return; }
  if(t.closest("#l-addsnack")){ readDay(); R.l.snacks.push({t:nowHM(),n:"",a:""}); redraw(); return; }
  if(t.closest(".s-del")){ readDay(); R.l.snacks.splice(+t.closest(".mrow").dataset.ix,1); redraw(); return; }
});
panel.addEventListener("change", ev=>{
  const t=ev.target;
  if(t.tagName==="SELECT") t.blur(); // เลือกแล้วปิด dropdown/picker ทันที ไม่ให้ค้างบนมือถือ
  if(t.id==="l-quickfood"){ const n=t.value; if(!n) return; readMeal(); if(!R.e.items.some(i=>i.n===n)) R.e.items.push(newItem(n)); A.logDirty=true; redraw(); return; }
  if(t.id==="l-date"){ if(!t.value) return; R.d=t.value; load(); draw(); return; }
  if(t.type==="file") return addPhoto(t);
  if(t.classList.contains("in-n") && t.closest(".sitem")){ t.closest(".sitem").querySelector(".in-g").value=A.guessCat(t.value); }
  if(t.classList.contains("c-n")) t.closest(".comp").querySelector(".c-g").value=A.guessCat(t.value);
  if(t.closest("#l-items") && (t.classList.contains("in-n")||t.classList.contains("in-sa")||t.classList.contains("in-su")||t.classList.contains("c-n")||t.classList.contains("c-sa")||t.classList.contains("c-su"))){ readItems(); A.logDirty=true; setTimeout(redraw,0); return; }
  read(); if(t.classList.contains("in-grp") && !R.e.trust && t.value!==""){ R.e.trust="manual"; redraw(); }
  A.logDirty=true;
});
panel.addEventListener("input", ev=>{ A.logDirty=true;
  if(ev.target.closest && ev.target.closest("#l-items,#l-eaten")){ readItems(); const r=ev.target.closest(".sitem"); if(r){ const i=R.e.items[+r.dataset.ix], er=$(`#l-eaten .eitem[data-ix="${r.dataset.ix}"] .e-name`); if(er) er.textContent=i.n||"(ยังไม่ใส่ชื่อ)"; } const sm=$("#l-sum"); if(sm) sm.innerHTML=sumHTML(); $$("#l-eaten .eitem").forEach(r=>{ const c=r.querySelector(".conv"); if(c) c.innerHTML=convHTML(R.e.items[+r.dataset.ix]); }); }
  const r=ev.target.closest&&ev.target.closest("#l-milk .mrow"); if(!r) return;
  readDay(); const m=R.l.milk[+r.dataset.ix];
  if(m.box) try{ localStorage.setItem("imdee:box", m.box); }catch(_){}
  const tb=r.querySelector(".m-tot"); if(tb) tb.innerHTML = m.ml?`= ${m.ml} มล.`:'<span class="tiny" style="color:var(--warn)">เลือกขนาดกล่อง</span>';
  const ms=R.l.milk.reduce((a,x)=>a+(+x.ml||0),0), h=$('details[data-sec="milk"] .hint'); if(h){ h.textContent = ms?`รวม ${ms} มล.`:""; h.classList.toggle("ok", ms>0); }
});
window.addEventListener("beforeunload", e=>{ if(A.logDirty){ e.preventDefault(); e.returnValue=""; } });
})();
