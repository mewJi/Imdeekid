(function(){
"use strict";
const A = window.App, {$,$$,esc,icon,S,MEALS,MEAL,CATS,UNITS,FEED,BEHAV,MOOD,SYM,STOOL,PLACES,today,thLong,toMin,nowHM,fmtAmt} = A;
const GRP_U = {carb:"ทัพพี", protein:"ช้อนกินข้าว", veg:"ทัพพี", fruit:"ส่วน"};
const GRP_N = {carb:"ข้าว-แป้ง", protein:"เนื้อสัตว์ ไข่ ถั่ว", veg:"ผัก", fruit:"ผลไม้"};
const R = {tab:"meal", d:null, k:null, e:null, l:null, open:{}};
/* ไอคอนเลือกมื้อ: เช้า = พระอาทิตย์ขึ้น, กลางวัน = พระอาทิตย์, เย็น = พระอาทิตย์ตก */
const MICON = {bk:"sunrise", ln:"sun", dn:"sunset"};
const whoList = cur => { const m=[...A.members()]; if(cur && !m.includes(cur)) m.push(cur); return m; }; // รายชื่อผู้บันทึก + คนที่เคยบันทึกไว้ (กันค่าเดิมหาย)
const lastWho = () => A.LS.get("who") || A.members()[0];

function newEntry(d,k){ return {date:d, meal:k, by:lastWho(), start:"", end:"", items:[], feed:"", follow:false, followLv:"", behav:[], vitamin:null, sit:"", ask:"", full:"", bargain:"", chew:[], refuse:[], screenLv:"", placeOther:"", factors:[], sitMax:"", mood:"", screen:null, toys:null, snackBefore:null, with:[], place:"บ้าน", photos:{before:[],after:[]}, groups:{carb:"",protein:"",veg:"",fruit:""}, ai:null, trust:"", note:""}; }
function load(){
  const ex = S.entries[R.d+"_"+R.k];
  if(ex){ R.e = JSON.parse(JSON.stringify(ex)); R.mode = ex.mode || "manual"; }
  else { R.e = newEntry(R.d,R.k); const b=(A.base().meals[R.d]||{})[R.k]; if(b&&b.items) R.e.items=b.items.map(i=>({n:i.n,g:i.g,st:i.st,ea:"",eu:"คำ",sa:"",su:"",note:i.eaten})); }
  if(R.e.place==="นอกบ้านอื่นๆ") R.e.place="อื่นๆ"; /* ข้อมูลเดิมใช้ชื่อเก่า */
  if(Array.isArray(R.e.with)) R.e.with = [...new Set(R.e.with.map(x=>x==="กินพร้อมผู้ใหญ่ที่โต๊ะ"?"พร้อมผู้ใหญ่":x))];
  R.e.groups = R.e.groups||{carb:"",protein:"",veg:"",fruit:""}; R.e.photos = R.e.photos||{before:[],after:[]};
  const lx = S.daylogs[R.d]; R.l = lx ? JSON.parse(JSON.stringify(lx)) : {date:R.d, by:lastWho(), milk:[{t:"",ml:""}], water:"", snacks:[], sym:[], symNote:"", stool:"", napS:"", napE:"", weight:"", height:"", note:""};
  if(!R.l.milk||!R.l.milk.length) R.l.milk=[{t:"",ml:""}];
  R.l.sleeps = A.sleeps(R.l).map(x=>({...x}));
  A.logDirty=false;
}
A.openLog = ({date, meal, tab}={}) => {
  R.mode = null; R.d = date || today(); R.k = meal || A.guessMeal(); R.tab = DAYTABS.some(x=>x[0]===tab) ? tab : tab==="day" ? "milk" : "meal"; R.open={}; R.step=1;
  load(); $("#sheet").classList.add("on"); document.body.style.overflow="hidden"; draw(); setTimeout(()=>{ const f=$("#sheet-panel .sheet-h .icbtn"); if(f) f.focus(); },50);
};
A.closeLog = (force) => {
  if(!$("#sheet").classList.contains("on")) return;
  if(A.logDirty && !force){ const m=$("#lmsg"); if(m && m.dataset.warn!=="1"){ m.dataset.warn="1"; m.textContent="ยังไม่ได้บันทึก กดปิดอีกครั้งเพื่อทิ้งการแก้ไข"; return; } }
  closeWhoModal(); $("#sheet").classList.remove("on"); document.body.style.overflow=""; A.logDirty=false;
};
/* ตัวเลือกเดี่ยวแบบ radio (ไม่ใช่ป้าย/ชิป) ใช้ตัวจัดการคลิก .opt เดียวกับ opts */
const radioOpts = (name, list, sel, dense) => `<div class="opts radio${dense?" dense":""}" data-name="${name}" data-multi="0" role="radiogroup">${list.map(o=>{ const v=Array.isArray(o)?o[0]:o, l=Array.isArray(o)?o[1]:o; return `<button type="button" class="opt" role="radio" aria-checked="${sel===v}" data-v="${esc(v)}">${esc(l)}</button>`; }).join("")}</div>`;
/* เลือกได้หลายข้อ แบบ checkbox list (ค่าที่เก็บ = ป้ายข้อความ) */
const checkOpts = (name, list, sel) => `<div class="opts radio check dense" data-name="${name}" data-multi="1" role="group">${list.map(o=>`<button type="button" class="opt" role="checkbox" aria-checked="${(sel||[]).includes(o)}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
const opts = (name, list, sel, multi) => `<div class="opts" data-name="${name}" data-multi="${multi?1:0}">${list.map(o=>{ const v=Array.isArray(o)?o[0]:o, l=Array.isArray(o)?o[1]:o; const on = multi ? (sel||[]).includes(v) : sel===v; return `<button type="button" class="opt" aria-pressed="${on}" data-v="${esc(v)}">${esc(l)}</button>`; }).join("")}</div>`;
const yn = (name, v) => opts(name, [["yes","มี / ใช่"],["no","ไม่มี / ไม่ใช่"]], v===true?"yes":v===false?"no":"");
function knownFoods(){
  const c={}; const add=n=>{ if(n) c[n]=(c[n]||0)+1; };
  Object.values(A.base().meals).forEach(day=>Object.values(day).forEach(m=>(m.items||[]).forEach(i=>add(i.n.split(" (")[0]))));
  Object.values(S.entries).forEach(e=>(e.items||[]).forEach(i=>add(i.n)));
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
}
/* แต่ละประเภทบันทึกเป็น sheet ของตัวเอง (ไม่มีแถบแท็บสลับ) — ชื่อหัวและไอคอนตามประเภท */
const TYPEINFO = {
  meal:{t:"บันทึกมื้ออาหาร", ic:"bowl"}, milk:{t:"บันทึกนม", ic:"milk"}, snack:{t:"บันทึกของว่าง", ic:"snack"},
  sleep:{t:"บันทึกการนอน", ic:"moon"}, health:{t:"บันทึกอาการและการขับถ่าย", ic:"thermo"}, body:{t:"บันทึกน้ำหนักและส่วนสูง", ic:"scale"},
};
const DAYTABS = [["milk","นม"],["snack","ของว่าง"],["sleep","การนอน"],["health","สุขภาพและการขับถ่าย"],["body","น้ำหนักและส่วนสูง"]];
const BOX = [110,125,180,220]; /* ขนาดขวด/กล่องนม (มล.) */
const MLP = [30,60,120,180,240], OZP = [1,2,3,4,5,6,7,8], OZ_ML = 29.5735; /* ตัวเลือกเร็วของ มล./ออนซ์ · 1 ออนซ์ ≈ 29.57 มล. */
const lastBox = () => { try{ return +localStorage.getItem("imdee:box")||""; }catch(_){ return ""; } };
function tabHas(v,l){ if(!l) return false;
  if(v==="milk") return (l.milk||[]).some(m=>+m.ml) || !!l.water;
  if(v==="snack") return (l.snacks||[]).some(x=>x.n);
  if(v==="sleep") return A.sleeps(l).length>0;
  if(v==="health") return !!((l.sym||[]).length||l.stool||l.symNote||l.note);
  if(v==="body") return !!(l.weight||l.height);
  return false; }
function milkTotal(m){ return m.u==="box" ? (m.box && +m.n ? Math.round(m.box*m.n) : "") : m.u==="oz" ? (+m.oz>0 ? Math.round(m.oz*OZ_ML) : "") : m.ml; }
const MILK_U = [["ml","มล."],["oz","ออนซ์"],["box","ขวด/กล่อง"]];
function milkRow(m, ix){
  const u = m.u==="box"||m.u==="oz" ? m.u : "ml", tot = milkTotal(m);
  const chip = (v,cur,suf="") => `<button type="button" class="m-chip" data-v="${v}" aria-pressed="${+cur===v}">${v}${suf}</button>`;
  let amt;
  if(u==="ml") amt = `<div class="m-cap">ปริมาณ (มล.)</div><div class="m-chips">${MLP.map(v=>chip(v,m.ml)).join("")}</div>
    <div class="m-custom"><input class="inp num in-ml" ${numAttr(m.ml||"")} inputmode="numeric" value="${esc(m.ml||"")}" placeholder="กรอกเอง" aria-label="ปริมาณนม มล."><span class="tiny">มล.</span></div>`;
  else if(u==="oz") amt = `<div class="m-cap">ปริมาณ (ออนซ์)</div><div class="m-chips">${OZP.map(v=>chip(v,m.oz)).join("")}</div>
    <div class="m-custom"><input class="inp num in-oz" ${numAttr(m.oz||"")} inputmode="decimal" value="${esc(m.oz||"")}" placeholder="กรอกเอง" aria-label="ปริมาณนม ออนซ์"><span class="tiny">ออนซ์</span><b class="m-tot num">${tot?`≈ ${tot} มล.`:""}</b></div>`;
  else { const sizes=[...BOX, ...(m.box && !BOX.includes(+m.box) ? [+m.box] : [])].sort((a,b)=>a-b);
    amt = `<div class="m-cap">ขนาดต่อขวด/กล่อง (มล.)</div><div class="m-chips">${sizes.map(v=>chip(v,m.box)).join("")}</div>
    <div class="m-custom"><span class="tiny">จำนวน</span><input class="inp num in-mn" ${numAttr(m.n??"1")} inputmode="decimal" value="${esc(m.n??"1")}" aria-label="จำนวนขวด/กล่อง"><span class="tiny">ขวด/กล่อง</span><b class="m-tot num">${tot?`= ${tot} มล.`:'<span class="tiny" style="color:var(--warn)">เลือกขนาด</span>'}</b></div>`; }
  return `<div class="mrow milkrow milk2" data-ix="${ix}">
    <div class="m-time"><span class="m-cap">เวลา</span><input ${A.TIME_ATTR} class="inp in-mt" value="${esc(m.t||"")}" aria-label="เวลา"></div>
    <div class="m-type"><span class="m-cap">ประเภทการกินนม</span><span class="stseg mu" role="group" aria-label="ประเภทการกินนม">${MILK_U.map(([v,l])=>`<button type="button" class="m-u" data-u="${v}" aria-pressed="${u===v}">${l}</button>`).join("")}</span></div>
    <div class="m-amt">${amt}</div>
    <button type="button" class="icbtn m-del" aria-label="ลบรอบนม">${icon("x")}</button></div>`;
}
/* ผู้บันทึก: ถ้าเกิน 1 บรรทัด ให้ย่อเหลือบรรทัดเดียว + ปุ่ม "ดูเพิ่ม" (กดเพื่อขยาย/ย่อ) */
function fitWho(){
  $$('#sheet-panel .opts[data-name="who"]').forEach(box=>{
    box.querySelectorAll(".opt-more").forEach(b=>b.remove());
    const all=[...box.querySelectorAll(".opt")], add=box.querySelector(".opt-add"), chips=all.filter(k=>k!==add);
    all.forEach(k=>{ k.hidden=false; });
    const wraps=()=>{ const v=[...box.children].filter(c=>!c.hidden); return v.length>1 && v[v.length-1].offsetTop > v[0].offsetTop+4; };
    if(!wraps()) return;
    const more=document.createElement("button"); more.type="button"; more.className="opt opt-more"; box.appendChild(more);
    more.textContent="ดูเพิ่ม"; more.setAttribute("aria-haspopup","dialog"); if(add) add.hidden=true;
    for(let i=chips.length-1; i>=0 && wraps(); i--) if(chips[i].getAttribute("aria-pressed")!=="true") chips[i].hidden=true;
  });
}
/* modal เลือกผู้บันทึก (เปิดจากปุ่ม "ดูเพิ่ม") */
function openWhoPicker(){
  closeWhoModal(); read();
  const cur=(R.tab==="meal"?R.e:R.l).by;
  const m=document.createElement("div"); m.id="who-modal"; m.className="whomodal"; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","wm-title");
  m.innerHTML=`<div class="wm-bg" data-wm-close></div><div class="wm-card"><h3 id="wm-title">เลือกผู้บันทึก</h3><div class="wm-list">${whoList(cur).map(n=>{ const canDel = A.members().length>1 && A.members().includes(n); return `<span class="wm-chip"><button type="button" class="opt wm-opt" data-who="${esc(n)}" aria-pressed="${n===cur}">${esc(n)}</button>${canDel?`<button type="button" class="wm-x" data-who-del="${esc(n)}" aria-label="ลบ ${esc(n)} ออกจากรายชื่อ">${icon("x")}</button>`:""}</span>`; }).join("")}</div><p class="tiny" style="margin:0">กด ✕ เพื่อลบชื่อที่ไม่ใช้ (บันทึกเก่าของชื่อนั้นยังอยู่)</p><div class="wm-act"><button type="button" class="btn opt-add">+ เพิ่มชื่อใหม่</button><button type="button" class="btn" data-wm-close>ปิด</button></div></div>`;
  $("#sheet").appendChild(m); const f=m.querySelector('[aria-pressed="true"]')||m.querySelector(".wm-opt"); if(f) f.focus();
}
/* ลบผู้บันทึกที่ไม่ใช้ออกจากรายชื่อ (ต้องเหลืออย่างน้อย 1 คน) — บันทึกเก่าที่ลงชื่อไว้ไม่ถูกแก้ */
async function delWho(name){
  const mem = A.members().filter(m=>m!==name); if(!mem.length || mem.length===A.members().length) return;
  read(); S.settings.members = mem; await A.save("app/settings", JSON.parse(JSON.stringify(S.settings)));
  const tgt = R.tab==="meal" ? R.e : R.l; if(tgt.by===name) tgt.by = mem[0];
  if(A.LS.get("who")===name) A.LS.set("who", mem[0]);
  A.emit("settings"); redraw(); openWhoPicker();
}
function closeWhoModal(){ $$("#sheet .whomodal").forEach(m=>m.remove()); }
/* modal เพิ่มเมนูที่เสิร์ฟ: ชื่อ หมวด จำนวน หน่วย + ส่วนประกอบ (กรอกใน modal แล้วกด "เพิ่มรายการ") */
/* modal เพิ่มอาหาร: หน่วยเปลี่ยนตามหมวด (ถ้าผู้ใช้เลือกหน่วยเองแล้วและยังอยู่ในหมวดใหม่ ให้คงไว้) */
function syncUnitSel(g, u){ if(!g||!u) return; const cur=u.value, keep=(u.dataset.touched && A.unitsFor(g.value).some(([v])=>v===cur)) ? cur : A.defaultUnit(g.value); u.innerHTML=unitOpts(g.value, keep); }
const imSyncUnits = () => syncUnitSel($("#im-g"), $("#im-su"));
function openItemModal(pre, eix){
  const edit = eix!=null && !!R.e.items[eix]; /* eix = ลำดับรายการที่กำลังแก้ (ไม่ใส่ = เพิ่มใหม่) */
  closeWhoModal();
  const m=document.createElement("div"); m.id="item-modal"; m.className="whomodal top"; if(edit) m.dataset.ix=String(eix); m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","wm-title");
  m.innerHTML=`<div class="wm-bg" data-wm-close></div><div class="wm-card wide"><h3 id="wm-title">${edit?"แก้ไขเมนูที่เสิร์ฟ":"เพิ่มเมนูที่เสิร์ฟ"}</h3>
    <label class="field"><span>ชื่ออาหารหรือเมนู${STAR}</span><input class="inp" id="im-n" list="food-list" placeholder="เช่น ข้าวสวย ไข่ต้ม สปาเก็ตตี้" autocomplete="off" enterkeyhint="done"><p class="tiny field-err" id="im-err" role="alert" hidden>กรุณาระบุชื่ออาหารหรือเมนู</p></label>
    <label class="field"><span>หมวด${STAR}</span>${catSel("", "", "").replace('class="inp "','class="inp" id="im-g"')}</label>
    <div class="field">ปริมาณที่เสิร์ฟ<div class="im-grid2"><input class="inp num" id="im-sa" type="number" step="any" min="0" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="จำนวน" aria-label="จำนวนที่เสิร์ฟ">${unitSel("", "", "").replace('class="inp "','class="inp" id="im-su"')}</div></div>
    <div class="wm-act"><button type="button" class="btn" data-wm-close>ยกเลิก</button><button type="button" class="btn primary" id="im-ok">${edit?"บันทึก":"เพิ่มรายการ"}</button></div></div>`;
  $("#sheet").appendChild(m); const x=$("#im-n");
  if(edit){ const it=R.e.items[eix]; x.value=it.n||""; const g=$("#im-g"); g.value=gOf(it); g.dataset.touched="1"; imSyncUnits();
    const su=$("#im-su"); if(it.su){ if(![...su.options].some(o=>o.value===it.su)) su.add(new Option(it.su,it.su)); su.value=it.su; su.dataset.touched="1"; } /* หน่วยที่เคยบันทึกแต่ถูกเอาออกจากรายการ ยังแสดงตามเดิม */
    $("#im-sa").value=it.sa==null?"":String(it.sa); return; }
  if(pre && x){ x.value=pre; const g=$("#im-g"); if(g) g.value=A.guessCat(pre); imSyncUnits(); const sa=$("#im-sa"); if(sa) sa.focus(); } /* เลือกจากช่องค้นหา: ใส่ชื่อให้แล้ว ไปที่ช่องจำนวนต่อเลย */
  else { imSyncUnits(); if(x) x.focus(); }
}
/* popup เพิ่มส่วนประกอบของเมนู ทีละส่วน (ชื่อ หมวด ปริมาณ หน่วย) */
const cmSyncUnits = () => syncUnitSel($("#cm-g"), $("#cm-su"));
let compCtx=null; /* เก็บฟอร์มส่วนประกอบไว้ชั่วคราวตอนไปเลือกชื่อในตัวค้นหา */
let compAdded=[]; /* ชื่อส่วนประกอบที่เพิ่มไปแล้วในรอบนี้ (เพิ่มได้หลายรายการต่อเนื่อง) */
/* รายการที่เพิ่มไปแล้วในรอบนี้: แสดงเป็นการ์ดด้านล่างฟอร์ม ลบได้อย่างเดียว (ถ้าจะแก้ ให้ลบแล้วเพิ่มใหม่) */
let compBase=[]; /* ส่วนประกอบที่เมนูนี้มีอยู่แล้วตอนเปิดป๊อปอัป (แสดงในรายการด้วย ลบได้แบบร่างเช่นกัน) */
const compTotal = () => compBase.length + compAdded.length;
const refreshAdded = () => { const p=$("#cm-added"); if(!p) return; const all=[...compBase.map(c=>[c,false]), ...compAdded.map(c=>[c,true])]; p.hidden=!all.length;
  p.innerHTML = all.length ? `<div class="cm-list-h"><div class="cm-list-t"><b>รายการส่วนประกอบ</b><span>${all.length} รายการ</span></div><button type="button" class="btn sm" id="cm-next" hidden>${icon("plus")}เพิ่มรายการ</button></div>`+all.map(([c,isNew],i)=>`<div class="cm-card" data-i="${i}"><div class="cp-main"><b class="cp-n">${esc(c.n)}${isNew?` <span class="new-tag">ใหม่</span>`:""}</b><span class="tiny">${esc([gOf(c), fmtAmt(c.sa,c.su)].filter(Boolean).join(" · "))}</span></div><button type="button" class="icbtn cm-del" aria-label="ลบ ${esc(c.n)}">${icon("trash")}</button></div>`).join("") : ""; };
/* กรอบกรอกส่วนประกอบใหม่: แสดงตอนเริ่ม/ตอนกด "เพิ่มรายการ" ที่หัวรายการ ส่วนหลังเพิ่มแต่ละรายการจะซ่อน เหลือแต่การ์ดรายการด้านบน */
const setCompForm = open => { const f=$("#cm-form"), nx=$("#cm-next"); if(f) f.hidden=!open; if(nx) nx.hidden = open || !compTotal(); };
/* การเปลี่ยนแปลงในป๊อปอัป (เพิ่ม/ลบ) เป็นแค่ "ร่าง" จนกว่าจะกดยืนยัน (ยกเลิก = ทิ้งทั้งหมด) */
function delAddedComp(i){ const nb=compBase.length; if(i<nb) compBase.splice(i,1); else if(compAdded[i-nb]) compAdded.splice(i-nb,1); else return; refreshAdded(); const f=$("#cm-form"); setCompForm(!compTotal() || !(f&&f.hidden)); }
function commitAdded(k){ readItems(); const it=R.e.items[k];
  if(it){ const nxt=compBase.concat(compAdded); if(compAdded.length || nxt.length!==compItems(it).length){ it.comps=nxt; it.showComps=true; A.logDirty=true;
      if(!compItems(it).length){ it.compMode=false; it.mode=undefined; if(["part","none","ate"].includes(it.st)){ it.st=""; it.frac=null; it.ea=""; } } else if(it.mode==="some") syncItem(it); } }
  compAdded=[]; compBase=[]; closeWhoModal(); redraw(); }
function openCompModal(k, d, cx){
  const it=R.e.items[k]; if(!it) return;
  const edit = cx!=null; /* cx = ลำดับส่วนประกอบที่กำลังแก้ (ไม่ใส่ = เพิ่มใหม่) */
  if(edit){ compAdded=[]; compBase=[]; } else if(!d){ compAdded=[]; compBase=compItems(it).slice(); }
  closeWhoModal();
  const m=document.createElement("div"); m.id="comp-modal"; m.className="whomodal top"; m.dataset.ix=String(k); if(edit) m.dataset.cx=String(cx); m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","wm-title");
  m.innerHTML=`<div class="wm-bg" data-wm-close></div><div class="wm-card wide cm-wrap"><div class="cm-head"><h3 id="wm-title">${edit?"แก้ไขส่วนประกอบ":"เพิ่มส่วนประกอบ"}</h3><div class="parent-note">${icon("bowl")}<span><b>${esc(it.n||"ยังไม่ใส่ชื่อ")}</b></span></div></div>
    <div class="cm-body">
    <div class="cm-list" id="cm-added" hidden></div>
    <div class="cm-form" id="cm-form">
    <div class="field"><span>ชื่อส่วนประกอบ${STAR}</span><input type="hidden" id="cm-n"><button type="button" class="inp pickfield pf-empty" id="cm-pick" aria-haspopup="dialog"><span class="combo-ic">${icon("search")}</span><span class="pf-t" id="cm-pick-t">เลือกหรือค้นหาส่วนประกอบ</span></button><p class="tiny field-err" id="cm-err" role="alert" hidden>กรุณาระบุชื่อส่วนประกอบ</p></div>
    <div class="cm-row"><label class="field"><span>หมวด${STAR}</span>${catSel("", "", "").replace('class="inp "','class="inp" id="cm-g"')}</label>
      <div class="field"><span>ปริมาณที่เสิร์ฟ${STAR}</span><div class="cm-qty"><input class="inp num" id="cm-sa" type="number" step="any" min="0" inputmode="decimal" enterkeyhint="done" placeholder="จำนวน" autocomplete="off" aria-label="จำนวนส่วนประกอบ">${unitSel("", "", "", "").replace('class="inp "','class="inp" id="cm-su"')}</div></div></div>
    <p class="tiny field-err" id="cm-qerr" role="alert" hidden>กรุณาระบุปริมาณที่เสิร์ฟ</p>
    ${edit?"":`<button type="button" class="btn" id="cm-more">${icon("plus")}เพิ่มรายการ</button>`}
    </div>
    </div>
    <div class="wm-act"><button type="button" class="btn" data-wm-close>ยกเลิก</button><button type="button" class="btn primary" id="cm-ok">ยืนยัน</button></div></div>`;
  $("#sheet").appendChild(m); cmSyncUnits(); refreshAdded(); setCompForm(true);
  if(d){ if(d.n){ $("#cm-n").value=d.n; const pk=$("#cm-pick"); pk.classList.remove("pf-empty"); $("#cm-pick-t").textContent=d.n; }
    const g=$("#cm-g"); if(d.gt){ g.value=d.g; g.dataset.touched="1"; } else if(d.n){ g.value=A.guessCat(d.n); } cmSyncUnits();
    if(d.sa) $("#cm-sa").value=d.sa; const su=$("#cm-su");
    if(d.su && (d.gt || g.value===d.g)){ if(![...su.options].some(o=>o.value===d.su)) su.add(new Option(d.su,d.su)); su.value=d.su; su.dataset.touched="1"; } /* หน่วยที่เคยบันทึกไว้แต่ถูกเอาออกจากรายการ ยังแสดงตามเดิม */
    if(d.n && !edit){ const sa=$("#cm-sa"); if(sa && !d.sa) sa.focus(); } }
}
function pickComp(){ const m=$("#comp-modal"); if(!m) return; compCtx={k:+m.dataset.ix, cx:m.dataset.cx!=null?+m.dataset.cx:null, d:{n:$("#cm-n").value, g:$("#cm-g").value, gt:!!$("#cm-g").dataset.touched, sa:$("#cm-sa").value, su:$("#cm-su").value}}; openFoodPicker({comp:true}); }
function submitComp(more){
  const m=$("#comp-modal"); if(!m) return; const k=+m.dataset.ix, n=($("#cm-n")||{}).value.trim();
  const isEdit = m.dataset.cx!=null;
  if(!n && !more && !isEdit && compTotal()){ commitAdded(k); return; } /* มีรายการในรายการอยู่ และไม่ได้กรอกรายการใหม่ → ยืนยันตามที่เห็นในรายการ */
  /* ชื่อ และ ปริมาณ(จำนวน+หน่วย) ต้องกรอก: ข้อความเตือนแสดงใต้ช่องนั้นๆ */
  const saV=$("#cm-sa").value.trim(), suV=$("#cm-su").value, badQ = !(parseFloat(saV)>0) || !suV;
  const eN=$("#cm-err"), eQ=$("#cm-qerr"), pk0=$("#cm-pick"), sa0=$("#cm-sa"), su0=$("#cm-su");
  if(eN) eN.hidden=!!n; if(n) pk0.removeAttribute("aria-invalid"); else pk0.setAttribute("aria-invalid","true");
  if(eQ) eQ.hidden=!badQ; if(!(parseFloat(saV)>0)) sa0.setAttribute("aria-invalid","true"); else sa0.removeAttribute("aria-invalid");
  if(!suV) su0.setAttribute("aria-invalid","true"); else su0.removeAttribute("aria-invalid");
  if(!n){ pk0.focus(); return; } if(badQ){ (!(parseFloat(saV)>0)?sa0:su0).focus(); return; }
  readItems(); const it=R.e.items[k]; if(!it){ closeWhoModal(); return; }
  const c={n, g:$("#cm-g").value, sa:$("#cm-sa").value.trim(), su:$("#cm-su").value};
  if(isEdit){ /* แก้ไขส่วนประกอบเดิม: ใช้ทันทีเมื่อกดยืนยัน */
    if(it.comps && it.comps[+m.dataset.cx]) Object.assign(it.comps[+m.dataset.cx], c); it.showComps=true; A.logDirty=true; closeWhoModal(); redraw(); return; }
  compAdded.push(c); /* เพิ่มเป็นรายการร่าง ยังไม่ถือว่าเพิ่มจริงจนกว่าจะกดยืนยัน */
  if(!more){ commitAdded(k); return; }
  { /* เพิ่มรายการ: เก็บเป็นร่าง ล้างฟอร์ม ซ่อนกรอบกรอก แสดงการ์ดรายการด้านบน */
    $("#cm-n").value=""; const pk=$("#cm-pick"); pk.classList.add("pf-empty"); pk.removeAttribute("aria-invalid"); $("#cm-pick-t").textContent="เลือกหรือค้นหาส่วนประกอบ";
    const e=$("#cm-err"); if(e) e.hidden=true; const eq=$("#cm-qerr"); if(eq) eq.hidden=true; $("#cm-sa").removeAttribute("aria-invalid"); $("#cm-su").removeAttribute("aria-invalid"); const g=$("#cm-g"); g.selectedIndex=0; delete g.dataset.touched; const su=$("#cm-su"); delete su.dataset.touched; cmSyncUnits(); $("#cm-sa").value=""; refreshAdded(); setCompForm(false);
    const body=m.querySelector(".cm-body"); if(body) body.scrollTop=0; }
}
function submitItem(){
  const n=($("#im-n")||{}).value.trim(), err=$("#im-err");
  if(!n){ if(err) err.hidden=false; const x=$("#im-n"); if(x){ x.setAttribute("aria-invalid","true"); x.focus(); } return; }
  const em=$("#item-modal"); if(em && em.dataset.ix!=null){ readMeal(); const old=R.e.items[+em.dataset.ix]; if(old){ Object.assign(old,{n, g:$("#im-g").value, sa:$("#im-sa").value.trim(), su:$("#im-su").value}); A.logDirty=true; closeWhoModal(); redraw(); return; } }
  const it=newItem(n); it.g=$("#im-g").value; it.sa=$("#im-sa").value.trim(); it.su=$("#im-su").value;
  readMeal(); R.e.items.push(it); A.logDirty=true; closeWhoModal(); redraw();
  const rows=$$("#l-items .sitem"); if(rows.length) rows[rows.length-1].scrollIntoView({block:"nearest"});
}
function openWhoModal(){
  closeWhoModal();
  const m=document.createElement("div"); m.id="who-modal"; m.className="whomodal"; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","wm-title");
  m.innerHTML=`<div class="wm-bg" data-wm-close></div><div class="wm-card"><h3 id="wm-title">เพิ่มผู้บันทึก</h3><input class="inp" id="l-newwho" placeholder="เช่น ปู่ ย่า พี่เลี้ยง" aria-label="ชื่อผู้บันทึกใหม่" maxlength="30" autocomplete="off"><p class="tiny" style="margin:0">แก้หรือลบรายชื่อได้ที่ ตั้งค่า</p><div class="wm-act"><button type="button" class="btn" data-wm-close>ยกเลิก</button><button type="button" class="btn primary" id="l-newwho-ok">เพิ่ม</button></div></div>`;
  $("#sheet").appendChild(m); const x=$("#l-newwho"); if(x) x.focus();
}
async function addWho(){
  const x=$("#l-newwho"), name=x?x.value.trim():""; if(!name) return;
  read(); const mem=[...A.members()]; if(!mem.includes(name)) mem.push(name);
  S.settings.members = mem; await A.save("app/settings", JSON.parse(JSON.stringify(S.settings)));
  (R.tab==="meal"?R.e:R.l).by = name; A.LS.set("who", name); closeWhoModal(); A.emit("settings"); redraw();
}
function sec(id, n, title, hint, body, ok){ const open = R.open[id]!==undefined ? R.open[id] : true; return `<details class="fsec" data-sec="${id}"${open?" open":""}><summary><span class="n">${n}</span><span class="stt">${title}</span><span class="hint${ok?" ok":""}">${hint||""}</span></summary><div class="fsec-b">${body}</div></details>`; }
const num = v => { const x=parseFloat(String(v??"").replace(",",".")); return isFinite(x)?x:null; };
const rnd = v => Math.round(v*100)/100;
const FRACS = [[1,"หมด"],[.75,"¾"],[.5,"½"],[.25,"¼"]];
/* ช่องตัวเลข: ใช้ type=number เพื่อให้แป้นพิมพ์เป็นตัวเลขเสมอ (ถ้าค่าเดิมเป็นข้อความ เช่น "1/2" ให้คงเป็นข้อความ จะได้ไม่หาย) */
const numAttr = v => (v==null || v==='' || /^\d*\.?\d+$/.test(String(v).trim())) ? 'type="number" step="any" min="0"' : 'type="text"';
const unitOpts = (cat, cur) => { let list = cat ? A.unitsFor(cat) : UNITS.map(u=>[u,u]); if(cur && !list.some(([v])=>v===cur)) list = [...list, [cur,cur]];
  return `<option value="">หน่วย</option>${list.map(([v,l])=>`<option value="${esc(v)}"${v===cur?" selected":""}>${esc(l)}</option>`).join("")}`; };
const unitSel = (cls, val, def, cat) => `<select class="inp ${cls}" aria-label="หน่วย">${unitOpts(cat, val||def)}</select>`;
const gOf = it => it.g || A.guessCat(it.n);
const catSel = (cls, val, n) => `<select class="inp ${cls}" aria-label="หมวดอาหาร">${CATS.map(c=>`<option${c===(val||A.guessCat(n))?" selected":""}>${c}</option>`).join("")}</select>`;
const newItem = (n="") => ({n, g:n?A.guessCat(n):"", sa:"", su:n?A.defaultUnit(A.guessCat(n)):"", st:"", ea:"", eu:"", frac:null, comps:[]});
function servedRow(i, ix){
  const comps = i.comps||[], open = i.showComps || comps.length;
  return `<div class="sitem ro" data-ix="${ix}">
    <div class="row1"><span class="fico" aria-hidden="true">${icon("bowl")}</span><div class="cp-main"><b class="cp-n">${esc(i.n||"(ยังไม่ใส่ชื่อ)")}</b><span class="tiny">${esc([gOf(i), fmtAmt(i.sa,i.su)].filter(Boolean).join(" · ")||"ยังไม่ระบุปริมาณ")}</span></div><button type="button" class="icbtn in-edit" aria-label="แก้ไขอาหาร ${esc(i.n||"")}">${icon("edit")}</button><button type="button" class="icbtn in-del" aria-label="ลบรายการ ${esc(i.n||"")}">${icon("trash")}</button></div>
    ${open?`<div class="comps"><span class="tiny">ส่วนประกอบ</span>${comps.map((c,cx)=>`<div class="comp ro" data-cx="${cx}"><div class="cp-main"><b class="cp-n">${esc(c.n||"(ยังไม่ใส่ชื่อ)")}</b><span class="tiny">${esc([gOf(c), fmtAmt(c.sa,c.su)].filter(Boolean).join(" · "))}</span></div><button type="button" class="icbtn c-edit" aria-label="แก้ไขส่วนประกอบ ${esc(c.n||"")}">${icon("edit")}</button><button type="button" class="icbtn c-del" aria-label="ลบส่วนประกอบ ${esc(c.n||"")}">${icon("trash")}</button></div>`).join("")}
      <button type="button" class="btn sm c-add" style="justify-self:start">${icon("plus")}เพิ่มส่วนประกอบ</button></div>`
      :`<button type="button" class="ctog c-open">+ แตกส่วนประกอบของเมนูนี้</button>`}
  </div>`;
}
/* ---- เมนูที่ทาน: เมนูที่มีส่วนประกอบ มี 2 โหมด "กินหมด" (คิดตามสัดส่วนที่เสิร์ฟ) / "กินบางอย่าง, ไม่กิน" (ระบุเป็นเศษส่วนทีละส่วนประกอบ) ---- */
const CFRACS = [[1,"กินหมด"],[.75,"¾"],[.5,"½"],[.25,"¼"],[0,"ไม่กิน"]];
/* เมื่อเลือก "ไม่กิน": ระบุลักษณะที่เกิดขึ้น (ไม่บังคับ เลือกได้ข้อเดียว; ไม่นำมาคำนวณสารอาหารเหมือนกัน) */
const NOEAT = ["เข้าปากแล้วคายทันที","เคี้ยวแล้วคาย","อมสักพักแล้วคาย","กินแล้วอ้วกออกมา"];
const noEatHTML = cur => `<div class="noeat"><div class="m-cap">เกิดอะไรขึ้น <span class="tiny">ไม่บังคับ</span></div><div class="fracs">${NOEAT.map(v=>`<button type="button" data-noeat="${esc(v)}" aria-pressed="${cur===v}">${esc(v)}</button>`).join("")}</div></div>`;
const compItems = i => (i.comps||[]).filter(c=>c.n);
const modeOf = i => !compItems(i).length ? null : (i.mode || (i.compMode ? "some" : (i.st==="ate" ? "all" : (i.st==="none" ? "none" : null))));
const compFrac = c => { if(c.cf!=null) return +c.cf; if(c.st==="none") return 0;
  if(c.st==="ate"){ const sa=num(c.sa), ea=num(c.ea); if(!(ea>0)) return 1; if(sa>0 && (!c.eu||c.eu===c.su)){ const f=ea/sa, m=[1,.75,.5,.25].find(x=>Math.abs(x-f)<.01); return m!=null?m:null; } }
  return null; };
function nutBox(i, ix){
  const di = A.entryToMeal({items:[i], photos:{before:[],after:[]}, groups:{}}, null).items[0]; if(!di || !di.parts) return "";
  const rows = di.parts.map(p=>{
    if(p.st==="none") return `<li class="mute"><span>${esc(p.n)}</span><span>ไม่กิน · ไม่นำมาคำนวณ</span></li>`;
    if(p.st==="unk") return `<li class="mute"><span>${esc(p.n)}</span><span>ยังไม่ได้เลือกว่ากินเท่าไหร่</span></li>`;
    const r=A.itemServ(p);
    return `<li><span>${esc(p.n)}${p.eaten?` <span class="tiny">กิน ${esc(p.eaten)}</span>`:""}</span><span>${r.known?esc(A.servText(r.serv)):`<span class="tiny">ยังแปลงไม่ได้</span>`}</span></li>`; }).join("");
  const tot = A.mealIntake({items:[di]});
  const sum = di.parts.length && di.parts.every(p=>p.st==="none") ? "ไม่กินเลย · ไม่นำมาคำนวณ" : tot && tot.ok ?`${Math.round(tot.kcal)} kcal · โปรตีน ${rnd(tot.p)} ก. · แคลเซียม ${Math.round(tot.ca)} มก.` : "ยังคำนวณไม่ได้";
  const open = R.open["nut"+ix]===true; /* ค่าเริ่มต้นพับไว้ */
  return `<details class="nutbox" data-nk="${ix}"${open?" open":""}><summary><span>สารอาหารที่ได้</span><b>${esc(sum)}</b></summary><ul>${rows}</ul><p class="tiny">ค่าประมาณจากปริมาณที่ระบุ ไม่ใช่การชั่งจริง</p></details>`;
}
function eatenRowC(i, ix){
  const mode = modeOf(i), comps = compItems(i);
  let h = `<div class="eitem" data-ix="${ix}"><div class="eh"><b class="e-name">${esc(i.n||"(ยังไม่ใส่ชื่อ)")}</b><span class="tiny e-served">เสิร์ฟ ${esc(fmtAmt(i.sa,i.su)||"ไม่ระบุปริมาณ")} · ${comps.length} ส่วนประกอบ</span></div>
    <div class="stseg modeseg" role="group" aria-label="กินหมด กินบางส่วน หรือไม่กินเลย">${[["all","กินหมด"],["some","กินบางส่วน"],["none","ไม่กินเลย"]].map(([v,l])=>`<button type="button" data-emode="${v}" aria-pressed="${mode===v}">${l}</button>`).join("")}</div>`;
  if(mode==="all") h += `<p class="tiny" style="margin:0">คิดตามสัดส่วนปริมาณที่เสิร์ฟของทุกส่วนประกอบ</p>`;
  if(mode==="none") h += noEatHTML(i.noEat);
  if(mode==="some") h += `<div class="ecomps">${(i.comps||[]).map((c,cx)=>!c.n?"":`<div class="ecomp2" data-cx="${cx}"><div class="cp-main"><b class="cp-n">${esc(c.n)}</b><span class="tiny">เสิร์ฟ ${esc(fmtAmt(c.sa,c.su)||"–")}</span></div><div class="fracs cf" role="group" aria-label="กิน ${esc(c.n)} ไปเท่าไหร่">${CFRACS.map(([f,l])=>`<button type="button" data-cfrac="${f}" aria-pressed="${compFrac(c)===f}">${l}</button>`).join("")}</div>${compFrac(c)===0?noEatHTML(c.noEat):""}</div>`).join("")}</div>`;
  if(mode==="all"||mode==="some") h += nutBox(i, ix);
  return h + `</div>`;
}
/* เมนูที่ไม่มีส่วนประกอบ: เลือกว่ากินไปเท่าไหร่ของที่เสิร์ฟ (หมด ¾ ½ ¼ ไม่กิน) */
const itemFrac = i => i.st==="none" ? 0 : (i.frac!=null && i.frac!=="?" ? +i.frac : (i.st==="ate" && !(num(i.ea)>0) ? 1 : null));
function eatenRow(i, ix){
  if(compItems(i).length) return eatenRowC(i, ix);
  const cur = itemFrac(i), eat = cur!==0;
  let h = `<div class="eitem${cur===0?" off":""}" data-ix="${ix}"><div class="eh"><b class="e-name">${esc(i.n||"(ยังไม่ใส่ชื่อ)")}</b><span class="tiny e-served">เสิร์ฟ ${esc(fmtAmt(i.sa,i.su)||"ไม่ระบุปริมาณ")}</span></div>
    <div class="fracs cf" role="group" aria-label="กิน ${esc(i.n||"")} ไปเท่าไหร่">${CFRACS.map(([f,l])=>`<button type="button" data-ifrac="${f}" aria-pressed="${cur===f}">${l}</button>`).join("")}</div>`;
  if(cur===0) h += noEatHTML(i.noEat);
  if(eat && cur!=null){
    const chunky = [i.eu,i.su].includes("ชิ้น") || [i.eu,i.su].includes("คำ");
    if(chunky) h += `<div class="fracs"><span>ขนาดชิ้น/คำ</span>${Object.entries(A.SIZE).map(([k,z])=>`<button type="button" data-size="${k}" aria-pressed="${(i.size||"m")===k}">${z.lab}</button>`).join("")}<span class="tiny">เล็ก = ครึ่งหนึ่งของขนาดมาตรฐาน · ใหญ่ = 1.5 เท่า</span></div>`;
    h += `<div class="conv">${convHTML(i)}</div>`;
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
  if(i.mode==="some" && i.compMode){ /* กินบางอย่าง: สถานะรวมมาจากส่วนประกอบทุกตัว (ไม่กินเลยทั้งหมด = ไม่กิน) */
    const all=compItems(i), set=all.filter(c=>c.st);
    i.st = set.length===all.length && all.length && set.every(c=>c.st==="none") ? "none" : (set.length===all.length && set.every(c=>c.st==="ate" && compFrac(c)===1) ? "ate" : "part");
    return; }
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
const MAX_PHOTOS = 5; // รูปสูงสุดต่อช่อง (ก่อนกิน / หลังกิน)
function photoSlot(k,lbl){
  const list=R.e.photos[k]||[], full=list.length>=MAX_PHOTOS;
  return `<div class="field">${lbl}${list.length?` <span class="tiny">(${list.length}/${MAX_PHOTOS})</span>`:""}<div class="pthumbs">${list.map((p,ix)=>`<span class="pt"><img src="${esc(A.photoUrl(p))}" alt="${lbl} ${ix+1}"><button type="button" data-pk="${k}" data-pix="${ix}" aria-label="เอารูปออก">${icon("x")}</button></span>`).join("")}${full?"":`<label class="padd">${S.assets?`${icon("camera")}<span>เพิ่มรูป</span>`:"เพิ่มรูปได้เมื่อเชื่อมต่อ"}<input type="file" accept="image/*" multiple data-pk="${k}" ${S.assets?"":"disabled"} hidden></label>`}</div>${full?`<span class="tiny">ครบ ${MAX_PHOTOS} รูปแล้ว</span>`:""}</div>`;
}
/* ===== ช่องที่จำเป็น: ปุ่มบันทึกใช้ได้เมื่อกรอกครบ · ดอกจัน * · แท็ก "จำเป็น" (มี ✓ เมื่อกรอกไปบางส่วน) ===== */
const STAR = '<span class="req-star" aria-hidden="true">*</span>';
const reqTag = (done, text, extra) => `<span class="req-tag${done?" part":""}">${text}</span>${done?`<span class="req-ok" role="img" aria-label="กรอกแล้ว">${icon("check")}</span>`:""}${extra?`<span class="req-x">${extra}</span>`:""}`;
const milkSum = l => (l.milk||[]).reduce((a,m)=>a+(+milkTotal(m)||0),0);
function hintFor(id){
  const e=R.e, l=R.l;
  if(id==="served"){ const n=e.items.filter(i=>i.n).length; return reqTag(n>0,"จำเป็น", n?`${n} รายการ`:""); }
  if(id==="eaten"){ const named=e.items.filter(i=>i.n), d=named.filter(itemDone).length; return reqTag(d>0,"จำเป็น", named.length?`${d}/${named.length} รายการ`:""); }
  if(id==="vitamin") return reqTag(e.vitamin!=null,"จำเป็น", e.vitamin===true?"มี":e.vitamin===false?"ไม่มี":"");
  if(id==="time"){ const dur = e.start&&e.end ? ((toMin(e.end)-toMin(e.start))+1440)%1440 : null; return reqTag(!!(e.start||e.end),"จำเป็น", dur!=null?`รวม ${dur} นาที`:""); }
  if(id==="milk"){ const ms=milkSum(l); return reqTag(ms>0||num(l.water)>0,"จำเป็น", ms?`รวม ${ms} มล.`:""); }
  if(id==="snack"){ const n=(l.snacks||[]).filter(s=>s.n).length; return reqTag(n>0,"จำเป็น", n?`${n} รายการ`:""); }
  if(id==="nap"){ const sl=l.sleeps||[], n=sl.filter(x=>x.s).length; return reqTag(n>0,"จำเป็น", n?`${n} รอบ`:""); }
  if(id==="sym"){ const f=!!((l.sym||[]).length||l.stool||l.symNote||l.note); return reqTag(f,"กรอกอย่างน้อย 1 อย่าง", (l.sym||[]).length?esc(l.sym.join(", ")):""); }
  if(id==="body"){ const f=!!(num(l.weight)>0||num(l.height)>0); return reqTag(f,"กรอกอย่างน้อย 1 อย่าง",""); }
  return "";
}
/* ตรวจว่ากรอกครบหรือยัง → {ok, missing:[ชื่อช่องที่ยังขาด]} */
function validateLog(){
  const missing=[], e=R.e, l=R.l;
  if(R.tab==="meal"){
    const items=e.items.filter(i=>i.n);
    if(!items.length) missing.push("เมนูที่เสิร์ฟ");
    else if(items.some(i=>!i.st)) missing.push("การกินหรือไม่กิน");
    else if(items.some(i=>!itemDone(i))) missing.push("ปริมาณที่กิน");
    const okT = v => /^\d{2}:\d{2}$/.test(v||"");
    if(!okT(e.start)) missing.push("เวลาเริ่ม");
    if(!okT(e.end)) missing.push("เวลาจบ");
    if(e.vitamin==null) missing.push("วิตามิน/อาหารเสริม");
  } else if(R.tab==="milk"){
    if(!(milkSum(l)>0 || num(l.water)>0)) missing.push("ปริมาณนมหรือน้ำเปล่า");
    if((l.milk||[]).some(m=>m.u==="box" && +m.n && !m.box)) missing.push("ขนาดกล่องนม");
  } else if(R.tab==="snack"){
    if(!(l.snacks||[]).some(s=>s.n)) missing.push("ชื่อของว่าง");
  } else if(R.tab==="sleep"){
    const sl=l.sleeps||[];
    if(!sl.some(x=>x.s)) missing.push("เวลาเริ่มหลับ");
    else if(sl.some(x=>x.e && !x.s)) missing.push("เวลาเริ่มหลับของทุกรอบ");
  } else if(R.tab==="health"){
    if(!((l.sym||[]).length||l.stool||l.symNote||l.note)) missing.push("อาการหรือหมายเหตุ");
  } else if(R.tab==="body"){
    if(!(num(l.weight)>0||num(l.height)>0)) missing.push("น้ำหนักหรือส่วนสูง");
  }
  return {ok:!missing.length, missing};
}
/* อัปเดตสถานะปุ่มบันทึก + แท็ก ✓ ของหัวข้อ (เรียกหลังพิมพ์/กดทุกครั้ง) */
function refreshSave(){
  const btn=$("#l-save")||$("#l-dsave"), nx=$("#l-next"); if((!btn && !nx) || !R.e || !$("#sheet").classList.contains("on")) return;
  read(); const v=validateLog();
  if(nx && (R.step||1)===1){ nx.disabled = !v.ok; nx.title = v.ok ? "" : "กรุณาระบุ: "+v.missing.join(" · "); } /* ขั้น 1 ต้องกรอกครบก่อนไปต่อ */
  const sd=document.querySelector('.stepper li:first-child:not(.on)'); if(sd){ sd.classList.toggle("done", !!v.ok); const dt=sd.querySelector(".sdot"); if(dt) dt.innerHTML = v.ok ? icon("check") : "1"; }
  if(!btn) return;
  btn.disabled = !v.ok || !S.canWrite;
  btn.title = v.ok ? "" : "กรุณาระบุ: "+v.missing.join(" · ");
  const m=$("#lmsg"); if(m && (m.textContent||"").startsWith("กรุณาระบุ: ")) m.textContent=""; /* ไม่แสดงรายการที่ยังขาดที่แถบล่างแล้ว (ดูแท็ก "จำเป็น" ที่หัวข้อแทน) */
  ["served","eaten","time","vitamin","milk","snack","nap","sym","body"].forEach(id=>{ const h=$(`details[data-sec="${id}"] .hint`); if(h) h.innerHTML=hintFor(id); });
}
function draw(){
  const P=$("#sheet-panel"), e=R.e, l=R.l, ex=!!S.entries[R.d+"_"+R.k];
  const ti = TYPEINFO[R.tab] || TYPEINFO.meal;
  const hd = `<div class="sheet-h"><h2 id="sheet-title"><span class="sh-ic">${icon(ti.ic)}</span>${ti.t}</h2><button class="icbtn" data-close aria-label="ปิด">${icon("x")}</button></div>`;
  let b = `<div class="frow"><label class="field">วันที่<input type="date" id="l-date" value="${R.d}" max="${today()}"></label><div class="field">ผู้บันทึก${opts("who", whoList(R.tab==="meal"?e.by:l.by), R.tab==="meal"?e.by:l.by).replace(/<\/div>$/, `<button type="button" class="opt opt-add" aria-haspopup="dialog">+ เพิ่ม</button></div>`)}</div></div>`;
  let f;
  if(R.tab==="meal"){
    const base=(A.base().meals[R.d]||{})[R.k];
    b += `<div class="field" style="margin-top:10px">มื้อ<div class="opts mealpick" data-name="meal" data-multi="0" role="group" aria-label="มื้อ">${MEALS.map(M=>`<button type="button" class="opt" aria-pressed="${R.k===M.k}" data-v="${M.k}">${icon(MICON[M.k]||"bowl")}<b>${esc(M.short)}</b></button>`).join("")}</div></div>`;
    if(ex) b += `<p class="tiny">กำลังแก้ไขบันทึกเดิมของ${MEAL[R.k].name}</p>`; else if(base&&base.items) b += `<p class="tiny">เติมรายการอาหารจากข้อมูลเดิมไว้ให้แล้ว แก้หรือเพิ่มได้</p>`;
    let S1="", S2="", S3="", n1=0, n2=0, n3=0; /* เนื้อหาของแต่ละขั้น (stepper) */
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
      S1 += sec("aiphoto",++n1,"รูปก่อนและหลังกิน", done?"AI วิเคราะห์แล้ว":"ขั้นแรก", `
        <div class="frow frow-col">${photoSlot("before","ก่อนกิน (ตอนเสิร์ฟ)")}${photoSlot("after","หลังกิน (ที่เหลือ)")}</div><p class="tiny" id="l-up"></p>
        <div class="aibox"><button type="button" class="btn primary" id="l-aiphoto" ${nb||na?"":"disabled"}>${icon("sparkle")}${done?"ให้ AI วิเคราะห์ใหม่":"ให้ AI วิเคราะห์รูป"}</button>
          <span class="tiny" id="l-aimsg">${done?`วิเคราะห์จากรูป ${e.ai.withPhotos} รูป · ความมั่นใจ${({low:"ต่ำ",medium:"ปานกลาง",high:"สูง"})[e.ai.confidence]||"–"}${e.ai.note?" · "+esc(e.ai.note):""}`:nb||na?`มีรูปก่อนกิน ${nb} · หลังกิน ${na}${na?"":" · ไม่มีรูปหลังกิน AI จะประเมินได้แค่ปริมาณที่เสิร์ฟ"}`:"เพิ่มรูปก่อนกินอย่างน้อย 1 รูป ถ้ามีรูปหลังกินด้วย AI จะประเมินปริมาณที่กินจริงได้"}</span></div>
        ${done?`<p class="note" style="margin:0">AI กรอกรายการ ส่วนประกอบ และปริมาณในขั้นถัดไปให้แล้ว ตรวจและแก้ให้ตรงกับที่เห็นจริงก่อนบันทึก</p>`:`<p class="tiny" style="margin:0">ถ่ายจากด้านบนให้เห็นจานทั้งใบ วางช้อนไว้ข้างจานช่วยให้ AI กะขนาดได้ดีขึ้น</p>`}`, done);
      if(!done){ b += S1 + `<p class="tiny" style="text-align:center">ไม่มีรูป หรืออยากกรอกเอง <button type="button" class="ctog" data-mode="manual" style="display:inline">ข้ามไปบันทึกเอง</button></p>`;
        P.innerHTML = hd + `<div class="sheet-b" id="sheet-b">${b}</div><div class="sheet-f"><span class="msg" id="lmsg"></span></div>`; return; }
    }
    const dur = e.start&&e.end ? ((toMin(e.end)-toMin(e.start))+1440)%1440 : null;
    const named = e.items.filter(i=>i.n), nItems = named.length, nDone = named.filter(itemDone).length;
    S1 += sec("served",++n1,`เมนูที่เสิร์ฟ<button type="button" class="info-btn" data-info="info-served" aria-label="วิธีใส่ปริมาณ" aria-expanded="false">${icon("info")}</button>`, hintFor("served"), `
      <div class="info-note" id="info-served" hidden>ใส่ปริมาณเป็นหน่วยที่ใช้จริงที่บ้าน เช่น 1 ทัพพี 1 ฟอง 5 ชิ้น ไม่ต้องชั่ง · เมนูรวม เช่น สปาเก็ตตี้ครีมซอสแซลมอน กด "แตกส่วนประกอบ" เพื่อแยกเส้น แซลมอน ซอส ผัก</div>

      <datalist id="food-list">${knownFoods().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
      <div style="display:grid;gap:8px" id="l-items">${e.items.length ? e.items.map(servedRow).join("") : `<div class="empty">${icon("bowl")}<b>ยังไม่มีเมนูที่เสิร์ฟ</b><span class="tiny">เพิ่มเมนูที่เสิร์ฟลูกในมื้อนี้</span><button type="button" class="btn" id="l-additem">${icon("plus")}เพิ่มเมนูที่เสิร์ฟ</button></div>`}</div>
      ${e.items.length ? `<button type="button" class="btn" id="l-additem">${icon("plus")}เพิ่มเมนูที่เสิร์ฟ</button>` : ""}`, nItems>0);
    S1 += sec("eaten",++n1,"เมนูที่ทาน", hintFor("eaten"), nItems ? `
      <div style="display:grid;gap:8px" id="l-eaten">${e.items.map((i,ix)=>i.n?eatenRow(i,ix):"").join("")}</div>` : `
      <div class="empty" id="l-eaten">${icon("bowl")}<b>กรุณาระบุเมนูที่เสิร์ฟก่อน</b></div>`, nItems&&nDone===nItems);
    S1 += sec("time",++n1,"เวลา", hintFor("time"), `<div class="frow frow-col">
      <label class="field">เริ่ม<span class="tin"><input ${A.TIME_ATTR} id="l-start" value="${esc(e.start)}"><button type="button" class="btn sm" data-now="l-start">ตอนนี้</button></span></label>
      <label class="field">จบ<span class="tin"><input ${A.TIME_ATTR} id="l-end" value="${esc(e.end)}"><button type="button" class="btn sm" data-now="l-end">ตอนนี้</button></span></label></div>`, dur!=null);
    S1 += sec("vitamin",++n1,"วิตามิน/อาหารเสริม", hintFor("vitamin"), radioOpts("vitamin", A.OPT.YN, e.vitamin===true?"yes":e.vitamin===false?"no":"", true));
    const OP = A.OPT, q = (lab, inner, note) => `<div class="qgroup"><div class="ql">${lab}${note?` <span class="tiny">${note}</span>`:""}</div>${inner}</div>`;
    S2 += sec("feed",++n2,"วิธีกินและพฤติกรรม", (FEED.find(x=>x[0]===e.feed)||[])[1]||"", `
      <div class="subsec"><h4 class="subh">วิธีกิน</h4>${radioOpts("feed", FEED, e.feed)}</div>
      <div class="subsec"><h4 class="subh">พฤติกรรม</h4>
        ${q("การนั่งทาน", radioOpts("sit", OP.SIT, e.sit, true))}
        ${e.sit && e.sit!=="none" ? `<label class="field"><span>ระยะเวลาที่นั่งทาน (นาที โดยประมาณ) <span class="tiny">ไม่บังคับ</span></span><input id="l-sit" ${numAttr(e.sitMax)} inputmode="numeric" enterkeyhint="done" class="num" value="${esc(e.sitMax)}" placeholder="เช่น 15"></label>` : ""}
        ${q("การขออาหาร", radioOpts("ask", OP.ASK, e.ask, true))}
        ${q("การบอกอิ่ม", radioOpts("full", OP.FULL, e.full, true))}
        ${q("การเดินตามป้อน", radioOpts("followLv", OP.FOLLOW, e.followLv, true))}
        ${q("การต่อรองให้กิน", radioOpts("bargain", OP.BARGAIN, e.bargain, true))}
        ${q("การอมและเคี้ยวอาหาร", checkOpts("chew", OP.CHEW, e.chew), "เลือกได้มากกว่า 1 ข้อ")}
        ${q("การปฏิเสธอาหาร", checkOpts("refuse", OP.REFUSE, e.refuse), "เลือกได้มากกว่า 1 ข้อ")}
      </div>`, !!e.feed);
    S2 += sec("env",++n2,"บรรยากาศก่อนและระหว่างมื้อ", "ไม่บังคับ", `
      <div class="subsec">
        ${q("สถานที่กิน", radioOpts("place", [...OP.PLACE.slice(0,-1), ["อื่นๆ","อื่นๆ (โปรดระบุ)"]], e.place==="นอกบ้านอื่นๆ"?"อื่นๆ":e.place, true))}
        ${(e.place==="อื่นๆ"||e.place==="นอกบ้านอื่นๆ") ? `<input class="inp" id="l-place-other" maxlength="60" placeholder="ระบุสถานที่ เช่น สนามเด็กเล่น" aria-label="ระบุสถานที่กิน" value="${esc(e.placeOther||"")}">` : ""}
        ${q("การกินพร้อมกัน", checkOpts("with", OP.WITH, e.with), "เลือกได้มากกว่า 1 ข้อ")}
        ${q("การเปิดจอระหว่างมื้อ", radioOpts("screenLv", OP.SCREEN, e.screenLv, true))}
        ${q("มีของเล่นระหว่างมื้อ", radioOpts("toys", OP.YN, e.toys===true?"yes":e.toys===false?"no":"", true))}
        ${q("นม/ขนมภายใน 1 ชม. ก่อนมื้อ", radioOpts("snackBefore", OP.YN, e.snackBefore===true?"yes":e.snackBefore===false?"no":"", true))}
        ${q("ปัจจัยอื่นๆ", checkOpts("factors", OP.FACTORS, e.factors), "เลือกได้มากกว่า 1 ข้อ")}
      </div>`);
    if(R.mode!=="photo") S3 += sec("photo",++n3,"รูปก่อน/หลังกิน", "ไม่บังคับ", `<div class="frow frow-col">${photoSlot("before","ก่อนกิน")}${photoSlot("after","หลังกิน")}</div><p class="tiny" id="l-up"></p>`);
    S3 += sec("note",++n3,"เล่าเพิ่ม", "ไม่บังคับ", `<textarea class="inp" id="l-note" rows="3" placeholder="เช่น เห็นอาหารแล้วเดินหนี ยอมกินเมื่อแม่นั่งกินด้วย">${esc(e.note)}</textarea>`);
    /* stepper: ขั้น 1 เมนู/เวลา (บังคับ) → ขั้น 2 พฤติกรรม/บรรยากาศ → ขั้น 3 รูป/เล่าเพิ่ม (ไม่บังคับ) */
    const step = Math.min(3, Math.max(1, R.step||1)), v0 = validateLog();
    const STEPS = [["เมนูและเวลา","บังคับ"],["พฤติกรรม","ไม่บังคับ"],["รูปและเล่าเพิ่ม","ไม่บังคับ"]];
    b += `<ol class="stepper" aria-label="ขั้นตอนการบันทึก">${STEPS.map(([lab,tag],i)=>{ const n=i+1, st = n===step?"on":(n<step||(n===1&&v0.ok)?"done":""); return `<li class="${st}"${n===step?' aria-current="step"':""}><button type="button" data-goto="${n}"><span class="sdot">${st==="done"?icon("check"):n}</span><span class="slab">${lab}</span><span class="stag">${tag}</span></button></li>`; }).join("")}</ol>`;
    b += [S1,S2,S3][step-1];
    f = `<span class="msg" id="lmsg">${S.canWrite?"":"บัญชีนี้ดูได้อย่างเดียว"}</span>${ex?`<button type="button" class="btn danger" id="l-del">${icon("trash")}ลบ</button>`:""}${step>1?`<button type="button" class="btn" id="l-prev">${icon("chevL")}ย้อนกลับ</button>`:""}${step<3?`<button type="button" class="btn primary" id="l-next"${v0.ok||step>1?"":" disabled"}>ถัดไป${icon("chevR")}</button>`:`<button type="button" class="btn primary" id="l-save" disabled>บันทึก${MEAL[R.k].name}</button>`}`;
  } else {
    const tb = R.tab; const ms=l.milk.reduce((a,x)=>a+(+x.ml||0),0);
    if(tb==="milk") b += sec("milk",1,"นม", hintFor("milk"), `<div id="l-milk" style="display:grid;gap:8px">${l.milk.map((m,ix)=>milkRow(m,ix)).join("")}</div>
      <p class="tiny" style="margin:0">เลือกประเภทการกินนม แล้วแตะตัวเลือก หรือกรอกเองก็ได้ ถ้าเป็นออนซ์หรือขวด/กล่อง ระบบจะรวมเป็น มล. ต่อรอบให้ (ครึ่งกล่องใส่ 0.5)</p>
      <div class="chips"><button type="button" class="btn sm" id="l-addmilk">${icon("plus")}เพิ่มรอบนม</button></div>
      <label class="field">น้ำเปล่าทั้งวัน (มล. ประมาณ)<input class="num" id="l-water" ${numAttr(l.water)} inputmode="numeric" value="${esc(l.water)}"></label>`, ms>0);
    if(tb==="snack") b += sec("snack",1,"ของว่างนอกมื้อ", hintFor("snack"), `<div id="l-snacks" style="display:grid;gap:6px">${l.snacks.map((s,ix)=>`<div class="mrow" data-ix="${ix}"><input ${A.TIME_ATTR} class="inp in-st" value="${esc(s.t)}" aria-label="เวลา"><input class="inp in-sn" style="flex:1;min-width:120px" value="${esc(s.n)}" placeholder="อะไร" list="food-list"><input class="inp in-sa2" style="width:130px" value="${esc(s.a)}" placeholder="เท่าไหร่"><button type="button" class="icbtn s-del" aria-label="ลบ">${icon("x")}</button></div>`).join("")}</div>
      <datalist id="food-list">${knownFoods().map(n=>`<option value="${esc(n)}">`).join("")}</datalist><div class="chips"><button type="button" class="btn sm" id="l-addsnack">${icon("plus")}เพิ่มของว่าง</button></div>`);
    if(tb==="health") b += sec("sym",1,"อาการและการขับถ่าย", hintFor("sym"), `<div class="field">อาการวันนี้${opts("sym", SYM, l.sym, true)}</div><label class="field">รายละเอียด<input id="l-symnote" value="${esc(l.symNote)}" placeholder="เช่น สำลักน้ำซุปตอนเย็น 1 ครั้ง"></label><div class="field">ขับถ่าย${opts("stool", STOOL, l.stool)}</div>`, (l.sym||[]).length>0);
    if(tb==="sleep") b += sec("nap",1,"การนอน", hintFor("nap"), `<div id="l-sleeps" style="display:grid;gap:8px">${l.sleeps.length?l.sleeps.map((x,ix)=>`<div class="slrow" data-ix="${ix}">
        <span class="stseg" role="group" aria-label="รอบการนอน">${A.SLEEP_P.map(p=>`<button type="button" data-sp="${p}" aria-pressed="${x.p===p}">${p}</button>`).join("")}</span>
        <div class="frow"><label class="field">เริ่มหลับ<input ${A.TIME_ATTR} class="in-ss" value="${esc(x.s||"")}"></label><label class="field">ตื่น · ไม่บังคับ<input ${A.TIME_ATTR} class="in-se" value="${esc(x.e||"")}"></label></div>
        <button type="button" class="icbtn sl-del" aria-label="ลบรอบการนอน">${icon("x")}</button></div>`).join(""):'<p class="tiny">ยังไม่มีรอบการนอนของวันนี้</p>'}</div>
      <div class="chips"><button type="button" class="btn sm" id="l-addsleep">${icon("plus")}เพิ่มรอบการนอน</button></div>
      <p class="tiny" style="margin:0">เลือกรอบ (สาย บ่าย เย็น กลางคืน) ใส่เวลาเริ่มหลับ ส่วนเวลาตื่นใส่ทีหลังได้</p>`, l.sleeps.length>0);
    if(tb==="body") b += sec("body",1,"น้ำหนักและส่วนสูง", hintFor("body"), `<div class="frow"><label class="field">น้ำหนัก (กก.)<input class="num" id="l-w" ${numAttr(l.weight)} inputmode="decimal" value="${esc(l.weight)}"></label><label class="field">ส่วนสูง (ซม.)<input class="num" id="l-h" ${numAttr(l.height)} inputmode="decimal" value="${esc(l.height)}"></label></div><p class="tiny">ค่าที่ใส่จะไปอยู่ในกราฟการเติบโตด้วย</p>`);
    if(tb==="health") b += sec("dnote",2,"หมายเหตุของวัน", "", `<textarea class="inp" id="l-dnote" rows="2">${esc(l.note)}</textarea>`);
    f = `<span class="msg" id="lmsg">${S.canWrite?"":"บัญชีนี้ดูได้อย่างเดียว"}</span><button type="button" class="btn primary" id="l-dsave" disabled>บันทึก${(DAYTABS.find(x=>x[0]===R.tab)||[,""])[1]}</button>`;
  }
  P.innerHTML = hd + `<div class="sheet-b" id="sheet-b">${b}</div><div class="sheet-f">${f}</div>`;
  refreshSave();
  const at=P.querySelector('.ltabs button[aria-pressed="true"]'); if(at){ const sg=at.parentElement; sg.scrollLeft = Math.max(0, at.offsetLeft - (sg.clientWidth-at.offsetWidth)/2); }
}
/* อ่านค่าในฟอร์ม แล้วถ้าหมวดอาหารเปลี่ยน (เลือกเอง หรือเดาจากชื่อ) ให้หน่วยเสิร์ฟยังอยู่ในหมวดนั้น ไม่งั้นใช้หน่วยเริ่มต้นของหมวด */
const fixUnit = (su, g) => (su && A.unitsFor(g).some(([v])=>v===su)) ? su : A.defaultUnit(g);
function readItemsFixUnits(){
  const before = R.e.items.map(i=>[gOf(i), (i.comps||[]).map(gOf)]);
  readItems();
  R.e.items.forEach((i,k)=>{ const b=before[k]; if(!b) return;
    if(gOf(i)!==b[0]) i.su = fixUnit(i.su, gOf(i));
    (i.comps||[]).forEach((c,x)=>{ if(b[1][x]!==undefined && gOf(c)!==b[1][x]) c.su = fixUnit(c.su, gOf(c)); }); });
}
function readItems(){
  /* เมนูที่เสิร์ฟและส่วนประกอบแก้ในป๊อปอัป ไม่อ่านจาก DOM */
  $$("#l-eaten .eitem").forEach(r=>{ const i=R.e.items[+r.dataset.ix]; if(!i) return;
    const ea=r.querySelector(".in-ea"); if(ea){ const v=ea.value.trim(); if(v){ i.ea=v; i.eu=r.querySelector(".in-eu").value; i.frac=null; } else if(i.frac==null) i.ea=""; }
    $$(".ecomp", r).forEach(cr=>{ const c=i.comps[+cr.dataset.cx]; const x=cr.querySelector(".ec-ea"); if(c&&x){ c.ea=x.value.trim(); c.eu=cr.querySelector(".ec-eu").value; } });
    syncItem(i); });
}
function readMeal(){ const e=R.e; readItems(); const v=id=>{ const x=$("#"+id); return x?x.value.trim():undefined; };
  if($("#l-start")){ e.start=v("l-start"); e.end=v("l-end"); if($("#l-sit")) e.sitMax=v("l-sit"); }
  if($("#l-place-other")) e.placeOther=v("l-place-other");
  if($("#l-note")) e.note=v("l-note");
  $$(".in-grp").forEach(x=>e.groups[x.dataset.g]=x.value.trim()); }
function readDay(){ const l=R.l;
  $$("#l-milk .mrow").forEach(r=>{ const m=l.milk[+r.dataset.ix]; m.t=r.querySelector(".in-mt").value;
    if(m.u==="box"){ const nn=r.querySelector(".in-mn"); if(nn) m.n=nn.value.trim().replace(",","."); m.ml=milkTotal(m); delete m.oz; }
    else if(m.u==="oz"){ const oo=r.querySelector(".in-oz"); if(oo) m.oz=oo.value.trim().replace(",","."); m.ml=String(milkTotal(m)||""); delete m.box; delete m.n; }
    else { m.u="ml"; const mm=r.querySelector(".in-ml"); if(mm) m.ml=mm.value.trim(); delete m.box; delete m.n; delete m.oz; } });
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

const normTimes = () => $$("#sheet-panel [data-time]").forEach(i=>{ i.value = A.normTime(i.value); });
async function saveMeal(){
  normTimes(); readMeal(); const e=R.e; e.items=e.items.filter(i=>i.n);
  if(!e.items.length && !e.note){ msg("กรุณาระบุอาหารอย่างน้อย 1 รายการ หรือเล่าเพิ่มเติม"); return; }
  const nost = e.items.find(i=>!i.st); if(nost){ msg(`กรุณาระบุว่า "${nost.n}" กินหรือไม่กิน (ไม่แน่ใจ เลือก "ไม่ทราบ")`); R.open.eaten=true; R.step=1; redraw(); return; }
  const noamt = e.items.find(i=>!itemDone(i)); if(noamt){ msg(`กรุณาระบุปริมาณที่กินของ "${noamt.n}" หรือกด "ไม่ทราบปริมาณ"`); R.open.eaten=true; R.step=1; redraw(); return; }
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
  normTimes(); readDay(); const l=R.l;
  if(l.milk.some(m=>m.u==="box" && +m.n && !m.box)){ msg("กรุณาระบุขนาดกล่องนม"); return; }
  if((l.sleeps||[]).some(x=>x.e && !x.s)){ msg("กรุณาระบุเวลาเริ่มหลับของทุกรอบการนอน"); return; }
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
  if(!blobs.length){ msgEl().textContent="กรุณาเพิ่มรูปอาหารก่อน"; return; }
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
  const k=input.dataset.pk, all=[...(input.files||[])]; if(!all.length||!S.assets) return;
  readMeal(); const room=Math.max(0, MAX_PHOTOS-(R.e.photos[k]||[]).length), fs=all.slice(0,room), cut=all.length>fs.length;
  const um=$("#l-up"); if(um) um.textContent="กำลังอัปโหลดรูป…";
  if(!fs.length){ if(um) um.textContent=`เพิ่มได้สูงสุด ${MAX_PHOTOS} รูปต่อช่อง`; return; }
  try{ for(const f of fs){ const sm=await A.resizeImg(f,1280); const r=await S.assets.upload(sm.blob); R.e.photos[k].push((S.assets.local||S.assets.idOnly) ? {id:r.id} : {id:r.id,url:r.url}); } A.logDirty=true; redraw(); if(cut){ const msg5=`เพิ่มได้สูงสุด ${MAX_PHOTOS} รูปต่อช่อง ระบบเพิ่มให้ ${fs.length} รูปแรก`; const m2=$("#l-up"); if(m2) m2.textContent=msg5; if(A.toast) A.toast(msg5); } }
  catch(_){ if(um) um.textContent="อัปโหลดรูปไม่สำเร็จ ลองใหม่"; }
}
const panel = $("#sheet");
panel.addEventListener("keydown", ev=>{ if(!ev.target.closest || !ev.target.closest("#who-modal")) return; if(ev.key==="Enter"){ ev.preventDefault(); addWho(); } else if(ev.key==="Escape"){ ev.stopPropagation(); closeWhoModal(); } });
panel.addEventListener("toggle", ev=>{ const nb=ev.target.closest&&ev.target.closest("details.nutbox"); if(nb){ R.open["nut"+nb.dataset.nk]=nb.open; return; } const d=ev.target.closest&&ev.target.closest("details.fsec"); if(d) R.open[d.dataset.sec]=d.open; }, true);
/* กด Esc ตอนมี modal ซ้อนอยู่: ปิดเฉพาะ modal ไม่ว่าโฟกัสอยู่ที่ใด (ไม่ปิดฟอร์มด้านหลัง) */
panel.addEventListener("keydown", ev=>{ if(ev.key==="Escape" && $("#sheet .whomodal")){ ev.stopPropagation(); closeWhoModal(); } }, true);
/* เลือก/ค้นหาเมนูที่เคยบันทึก: เปิดเป็น modal — เห็นรายการก่อน คีย์บอร์ดขึ้นเมื่อแตะช่องค้นหาเท่านั้น จึงไม่บังรายการ */
function renderFoodPicker(){
  const l=$("#fp-list"), i=$("#fp-q"), f=$("#fp-foot"); if(!l||!i) return;
  const raw=i.value.trim(), q=raw.toLowerCase(), all=knownFoods();
  const hit=(q?all.filter(n=>n.toLowerCase().includes(q)):all).slice(0,80);
  let h=hit.map((n,k)=>`<li role="option" class="combo-opt" id="fo-${k}" data-food="${esc(n)}">${esc(n)}</li>`).join("");
  if(!h) h=`<li class="combo-empty" role="presentation">${raw?"ไม่พบเมนูนี้ในรายการที่เคยบันทึก":"ยังไม่มีเมนูที่เคยบันทึก พิมพ์ชื่อเมนูในช่องค้นหา แล้วกด “เพิ่มในรายการ”"}</li>`;
  l.innerHTML=h; i.removeAttribute("aria-activedescendant");
  const isNew = raw && !all.some(n=>n.toLowerCase()===q);
  if(f) f.innerHTML = isNew ? `<span class="fp-newtxt">“${esc(raw)}” ยังไม่มีในรายการ</span><button type="button" class="btn primary" id="fp-new">${icon("plus")}เพิ่มในรายการ</button>` : "";
}
function openFoodPicker(o){
  readMeal(); closeWhoModal();
  const m=document.createElement("div"); m.id="food-modal"; m.className="whomodal top"; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","wm-title");
  m.innerHTML=`<div class="wm-bg" data-wm-close></div><div class="wm-card wide fp-card"><h3 id="wm-title">${o&&o.comp?"เลือกส่วนประกอบ":"เพิ่มเมนูที่เสิร์ฟ"}</h3><div class="combo"><span class="combo-ic">${icon("search")}</span><input class="inp combo-in" id="fp-q" type="text" role="combobox" aria-controls="fp-list" aria-autocomplete="list" autocomplete="off" enterkeyhint="search" placeholder="${o&&o.comp?"เลือกหรือค้นหาส่วนประกอบ":"เลือกหรือค้นหาเมนูที่เคยบันทึก"}" aria-label="เลือกหรือค้นหา"></div><ul class="fp-list" id="fp-list" role="listbox"></ul><div class="fp-foot" id="fp-foot"></div><div class="wm-act"><button type="button" class="btn" data-wm-close>ปิด</button></div></div>`;
  if(o&&o.comp) m.dataset.comp="1"; $("#sheet").appendChild(m); renderFoodPicker();
}
function moveFood(d){
  const l=$("#fp-list"), i=$("#fp-q"); if(!l||!i) return;
  const o=[...l.querySelectorAll(".combo-opt")]; if(!o.length) return;
  let k=o.findIndex(x=>x.getAttribute("aria-selected")==="true"); o.forEach(x=>x.removeAttribute("aria-selected"));
  k = k<0 ? (d>0?0:o.length-1) : (k+d+o.length)%o.length;
  o[k].setAttribute("aria-selected","true"); o[k].scrollIntoView({block:"nearest"}); i.setAttribute("aria-activedescendant", o[k].id);
}
function addFood(n){ n=(n||"").trim(); if(!n) return; const fm=$("#food-modal"); if(fm&&fm.dataset.comp&&compCtx){ const c=compCtx; compCtx=null; openCompModal(c.k,{...c.d,n},c.cx); return; } readMeal(); openItemModal(n); } // เลือกเมนูแล้วเปิด modal กรอกข้อมูลต่อ
panel.addEventListener("keydown", ev=>{
  if(ev.key==="Enter" && ev.target.tagName==="INPUT" && ev.target.closest && ev.target.closest("#comp-modal")){ ev.preventDefault(); submitComp(); return; }
  if(!ev.target.closest || !ev.target.closest("#item-modal")) return;
  if(ev.key==="Escape"){ ev.stopPropagation(); closeWhoModal(); }
  else if(ev.key==="Enter" && ev.target.tagName==="INPUT"){ ev.preventDefault(); submitItem(); }
});
panel.addEventListener("keydown", ev=>{
  if(ev.target.id!=="fp-q") return;
  if(ev.key==="ArrowDown"){ ev.preventDefault(); moveFood(1); }
  else if(ev.key==="ArrowUp"){ ev.preventDefault(); moveFood(-1); }
  else if(ev.key==="Enter"){ ev.preventDefault(); const l=$("#fp-list"), o=l&&(l.querySelector('[aria-selected="true"]')||l.querySelector(".combo-opt")); if(o) addFood(o.dataset.food); else addFood($("#fp-q").value); }
  else if(ev.key==="Escape"){ ev.stopPropagation(); closeWhoModal(); }
});
panel.addEventListener("click", ev=>{
  const t=ev.target;
  const ib=t.closest("[data-info]"); if(ib){ ev.preventDefault(); const note=$("#"+ib.dataset.info), det=ib.closest("details"); if(note){ if(det) det.open=true; const show=note.hidden; note.hidden=!show; ib.setAttribute("aria-expanded", String(show)); } return; } /* ไอคอน ⓘ: เปิด/ปิดคำอธิบาย (ไม่พับหัวข้อ) */
  const fo=t.closest(".combo-opt"); if(fo){ addFood(fo.dataset.food); return; }
  if(t.closest("#fp-new")){ addFood(($("#fp-q")||{}).value); return; }
  if(t.closest("[data-close]")) return A.closeLog();
  const sg=t.closest('[data-seg="ltab"] button'); if(sg){ read(); R.tab=sg.dataset.v; redraw(); return; }
  if(t.closest("#l-addsleep")){ readDay(); const now=nowHM(); R.l.sleeps.push({p:A.sleepPeriod(now), s:now, e:""}); A.logDirty=true; redraw(); return; }
  if(t.closest(".sl-del")){ readDay(); R.l.sleeps.splice(+t.closest(".slrow").dataset.ix,1); A.logDirty=true; redraw(); return; }
  const spb=t.closest("[data-sp]"); if(spb){ readDay(); R.l.sleeps[+spb.closest(".slrow").dataset.ix].p=spb.dataset.sp; A.logDirty=true; redraw(); return; }
  const wd=t.closest("[data-who-del]"); if(wd){ delWho(wd.dataset.whoDel); return; }
  const wo=t.closest("[data-who]"); if(wo){ (R.tab==="meal"?R.e:R.l).by=wo.dataset.who; A.logDirty=true; closeWhoModal(); redraw(); return; }
  if(t.closest(".opt-more")){ openWhoPicker(); return; }
  if(t.closest(".opt-add")){ read(); openWhoModal(); return; }
  if(t.closest("#cm-pick")){ pickComp(); return; }
  if(t.closest("[data-wm-close]")){ const fm=$("#food-modal"); if(fm&&fm.dataset.comp&&compCtx){ const c=compCtx; compCtx=null; openCompModal(c.k,c.d,c.cx); return; } closeWhoModal(); return; }
  if(t.closest("#l-newwho-ok")) return addWho();
  const op=t.closest(".opt"); if(op){ const set=op.closest(".opts"), name=set.dataset.name, multi=set.dataset.multi==="1", v=op.dataset.v; read();
    if(name==="meal"){ R.k=v; load(); draw(); return; }
    const tgt = name==="who" ? (R.tab==="meal"?R.e:R.l) : (["sym","stool"].includes(name)?R.l:R.e);
    if(name==="who") tgt.by=v;
    else if(multi){ const arr=tgt[name]||(tgt[name]=[]); const i=arr.indexOf(v); if(i>=0) arr.splice(i,1); else { if(name==="sym"&&v==="ไม่มีอาการ") arr.length=0; else if(name==="sym"){ const j=arr.indexOf("ไม่มีอาการ"); if(j>=0) arr.splice(j,1); } arr.push(v); } }
    else if(["screen","toys","snackBefore","vitamin"].includes(name)){ const nv=v==="yes"; tgt[name]=tgt[name]===nv?null:nv; }
    else tgt[name] = tgt[name]===v ? "" : v;
    if(name==="sit" && tgt.sit==="none") tgt.sitMax=""; /* ไม่นั่งทานเลย: ไม่มีระยะเวลานั่ง */
    if(name==="screenLv") tgt.screen = tgt.screenLv ? tgt.screenLv!=="off" : null; /* ค่าเดิมที่ใช้เปรียบเทียบมื้อที่เปิดจอ/ไม่เปิด */
    if(name==="place" && tgt.place!=="อื่นๆ") tgt.placeOther="";
    if(name==="followLv") tgt.follow = tgt.followLv==="always" || tgt.followLv==="some"; /* ค่าเดิมที่ใช้นับ "มื้อที่ต้องเดินตามป้อน" */
    A.logDirty=true; redraw(); return; }
  const mc=t.closest(".m-chip"); if(mc){ readDay(); const m=R.l.milk[+mc.closest(".mrow").dataset.ix], v=+mc.dataset.v; /* ปุ่มตัวเลือกเร็ว กดซ้ำเพื่อยกเลิก */
    if(m.u==="box"){ m.box = +m.box===v ? "" : v; m.n=m.n||"1"; } else if(m.u==="oz"){ m.oz = +m.oz===v ? "" : String(v); } else { m.ml = +m.ml===v ? "" : String(v); }
    m.ml = m.u==="ml" ? m.ml : String(milkTotal(m)||""); A.logDirty=true; redraw(); return; }
  const mu=t.closest(".m-u"); if(mu){ readDay(); const m=R.l.milk[+mu.closest(".mrow").dataset.ix]; if(m.u!==mu.dataset.u){ m.u=mu.dataset.u; if(m.u==="box"){ m.box=m.box||lastBox(); m.n=m.n||"1"; } else if(m.u==="oz"){ m.oz=m.oz||""; } m.ml=String(milkTotal(m)||""); if(m.u!=="box"){ delete m.box; delete m.n; } if(m.u!=="oz") delete m.oz; } A.logDirty=true; redraw(); return; }
  const ix = el => +el.closest("[data-ix]").dataset.ix;
  const ce=t.closest("[data-eat]"); if(ce){ readItems(); const i=R.e.items[ix(ce)], v=ce.dataset.eat; if(v==="eat"){ if(i.st!=="ate"&&i.st!=="part"){ i.st="part"; i.frac=null; i.ea=""; } } else { i.st=v; i.frac=null; i.ea=""; i.compMode=false; } A.logDirty=true; redraw(); return; }
  const fr=t.closest("[data-frac]"); if(fr){ readItems(); const i=R.e.items[ix(fr)], v=fr.dataset.frac; i.frac = v==="?" ? (i.frac==="?"?null:"?") : +v; if(i.frac==="?") i.ea=""; syncItem(i); A.logDirty=true; redraw(); return; }
  const sz=t.closest("[data-size]"); if(sz){ readItems(); R.e.items[ix(sz)].size = sz.dataset.size==="m" ? null : sz.dataset.size; A.logDirty=true; redraw(); return; }
  const ne=t.closest("[data-noeat]"); if(ne){ readItems(); const i=R.e.items[ix(ne)], cc=ne.closest("[data-cx]"), tg = cc ? (i.comps||[])[+cc.dataset.cx] : i; if(!tg) return; const v=ne.dataset.noeat; tg.noEat = tg.noEat===v ? "" : v; A.logDirty=true; redraw(); return; }
  const ifr=t.closest("[data-ifrac]"); if(ifr){ readItems(); const i=R.e.items[ix(ifr)]; if(!i) return; const f=+ifr.dataset.ifrac;
    i.compMode=false; i.mode=undefined;
    if(f!==0) delete i.noEat;
    if(f===0){ i.st="none"; i.frac=null; i.ea=""; } else { i.frac=f; i.st = f>=1 ? "ate" : "part"; i.ea=""; syncItem(i); } /* หมด ¾ ½ ¼: คิดเป็นสัดส่วนของปริมาณที่เสิร์ฟ */
    A.logDirty=true; redraw(); return; }
  const em=t.closest("[data-emode]"); if(em){ readItems(); const i=R.e.items[ix(em)]; if(!i) return;
    if(em.dataset.emode!=="none") delete i.noEat;
    if(em.dataset.emode==="all"){ i.mode="all"; i.compMode=false; i.frac=1; i.st="ate"; i.ea=""; syncItem(i); } /* กินหมด: คิดตามสัดส่วนที่เสิร์ฟ */
    else if(em.dataset.emode==="none"){ i.mode="none"; i.compMode=false; i.frac=null; i.ea=""; i.st="none"; } /* ไม่กินเลย: ไม่นำมาคำนวณ */
    else { i.mode="some"; i.compMode=true; i.frac=null; i.ea=""; syncItem(i); } /* กินบางส่วน: ระบุทีละส่วนประกอบ (ค่าที่เลือกไว้เดิมยังอยู่) */
    A.logDirty=true; redraw(); return; }
  const cf=t.closest("[data-cfrac]"); if(cf){ readItems(); const i=R.e.items[ix(cf)], c=i&&(i.comps||[])[+cf.closest("[data-cx]").dataset.cx]; if(!c) return;
    const f=+cf.dataset.cfrac; c.cf=f; if(f!==0) delete c.noEat; c.st = f===0 ? "none" : "ate"; c.eu=c.su||""; c.ea = f>=1 ? "" : (num(c.sa)!=null ? String(rnd(num(c.sa)*f)) : "");
    i.mode="some"; i.compMode=true; i.frac=null; i.ea=""; syncItem(i); A.logDirty=true; redraw(); return; }
  const cEd=t.closest(".c-edit"); if(cEd){ readItems(); const k=ix(cEd), cx=+cEd.closest("[data-cx]").dataset.cx, c=(R.e.items[k].comps||[])[cx]; if(c) openCompModal(k,{n:c.n,g:gOf(c),gt:true,sa:c.sa==null?"":String(c.sa),su:c.su||""},cx); return; }
  if(t.closest(".c-open") || t.closest(".c-add")){ readItems(); openCompModal(ix(t)); return; }
  if(t.closest("#cm-ok")){ submitComp(); return; }
  if(t.closest("#cm-more")){ submitComp(true); return; }
  if(t.closest("#cm-next")){ setCompForm(true); const f=$("#cm-form"); if(f) f.scrollIntoView({block:"nearest"}); return; }
  const cmd=t.closest(".cm-del"); if(cmd){ delAddedComp(+cmd.closest(".cm-card").dataset.i); return; }
  if(t.closest(".c-del")){ readItems(); const i=R.e.items[ix(t)]; i.comps.splice(+t.closest("[data-cx]").dataset.cx,1);
    if(!compItems(i).length){ i.compMode=false; i.mode=undefined; if(i.st==="part"||i.st==="none"||i.st==="ate"){ i.st=""; i.frac=null; i.ea=""; } } else if(i.mode==="some") syncItem(i); /* ไม่เหลือส่วนประกอบ: กลับไปใช้แบบกรอกปริมาณทั้งเมนู */
    A.logDirty=true; redraw(); return; }
  const st=t.closest(".stseg button"); if(st && st.dataset.st && t.closest(".item")){ readItems(); R.e.items[+st.closest(".item").dataset.ix].st=st.dataset.st; A.logDirty=true; redraw(); return; }
  const iEd=t.closest(".in-edit"); if(iEd){ readItems(); openItemModal(null, ix(iEd)); return; }
  if(t.closest(".in-del")){ readItems(); R.e.items.splice(ix(t),1); A.logDirty=true; redraw(); return; }
  const af=t.closest("[data-addf]"); if(af){ readMeal(); const n=af.dataset.addf; if(!R.e.items.some(i=>i.n===n)) R.e.items.push(newItem(n)); A.logDirty=true; redraw(); return; }
  if(t.closest("#l-additem")){ openFoodPicker(); return; }
  if(t.closest("#im-ok")){ submitItem(); return; }
  const nw=t.closest("[data-now]"); if(nw){ $("#"+nw.dataset.now).value=nowHM(); readMeal(); A.logDirty=true; redraw(); return; }
  const sp=t.closest("[data-step]"); if(sp){ const i=panel.querySelector(`.in-grp[data-g="${sp.dataset.step}"]`); i.value=Math.max(0,(parseFloat(i.value)||0)+parseFloat(sp.dataset.d)); readMeal(); if(!R.e.trust) R.e.trust="manual"; A.logDirty=true; redraw(); return; }
  if(t.closest("#l-aibtn")) return aiEstimate();
  if(t.closest("#l-aiphoto")) return aiFromPhotos();
  const stp=t.closest("[data-goto]"); if(stp){ read(); const to=+stp.dataset.goto, v=validateLog(); if(to>1 && !v.ok){ if(A.toast) A.toast("กรุณาระบุ: "+v.missing.join(" · ")); R.step=1; } else R.step=to; redraw(); const sb=$("#sheet-b"); if(sb) sb.scrollTop=0; return; }
  if(t.closest("#l-next")){ read(); if(!validateLog().ok) return; R.step=Math.min(3,(R.step||1)+1); redraw(); const sb=$("#sheet-b"); if(sb) sb.scrollTop=0; return; }
  if(t.closest("#l-prev")){ read(); R.step=Math.max(1,(R.step||1)-1); redraw(); const sb=$("#sheet-b"); if(sb) sb.scrollTop=0; return; }
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
  if(t.closest && t.closest("#comp-modal")){
    if(t.id==="cm-g"){ t.dataset.touched="1"; cmSyncUnits(); }
    else if(t.id==="cm-su"){ t.dataset.touched="1"; t.removeAttribute("aria-invalid"); if(parseFloat(($("#cm-sa")||{}).value)>0){ const q=$("#cm-qerr"); if(q) q.hidden=true; } }
    else if(t.id==="cm-n"){ const g=$("#cm-g"); if(g&&!g.dataset.touched){ g.value=A.guessCat(t.value); cmSyncUnits(); } }
    return; }
  if(t.closest && t.closest("#item-modal")){ // ช่องใน modal เพิ่มอาหาร: ไม่นับเป็นการแก้ข้อมูลจนกว่าจะกด "เพิ่มรายการ"
    if(t.id==="im-g"){ t.dataset.touched="1"; imSyncUnits(); }
    else if(t.id==="im-su") t.dataset.touched="1";
    else if(t.id==="im-n"){ const g=$("#im-g"); if(g&&!g.dataset.touched){ g.value=A.guessCat(t.value); imSyncUnits(); } }
    return; }
  if(t.id==="fp-q") return; // ช่องค้นหาเมนู: ไม่นับเป็นการแก้ข้อมูล
  if(t.id==="l-date"){ if(!t.value) return; R.d=t.value; load(); draw(); return; }
  if(t.type==="file") return addPhoto(t);
  if(t.classList.contains("in-n") && t.closest(".sitem")){ t.closest(".sitem").querySelector(".in-g").value=A.guessCat(t.value); }
  if(t.classList.contains("c-n")) t.closest(".comp").querySelector(".c-g").value=A.guessCat(t.value);
  if(t.closest("#l-items") && (t.classList.contains("in-n")||t.classList.contains("in-g")||t.classList.contains("in-sa")||t.classList.contains("in-su")||t.classList.contains("c-n")||t.classList.contains("c-g")||t.classList.contains("c-sa")||t.classList.contains("c-su"))){ readItemsFixUnits(); A.logDirty=true; setTimeout(redraw,0); return; }
  read(); if(t.classList.contains("in-grp") && !R.e.trust && t.value!==""){ R.e.trust="manual"; redraw(); }
  A.logDirty=true;
});
panel.addEventListener("input", ev=>{ if(ev.target.id==="fp-q"){ renderFoodPicker(); return; }
  if(ev.target.closest && ev.target.closest("#comp-modal")){ const t=ev.target; if(t.id==="cm-n"){ const e3=$("#cm-err"); if(e3) e3.hidden=true; const g=$("#cm-g"); if(g&&!g.dataset.touched){ g.value=A.guessCat(t.value); cmSyncUnits(); } }
    else if(t.id==="cm-sa"){ if(parseFloat(t.value)>0){ t.removeAttribute("aria-invalid"); const q=$("#cm-qerr"); if(q && ($("#cm-su")||{}).value) q.hidden=true; } } return; }
  if(ev.target.closest && ev.target.closest("#item-modal")){ const t=ev.target, e2=$("#im-err"); if(t.id==="im-n"){ if(e2) e2.hidden=true; t.removeAttribute("aria-invalid"); const g=$("#im-g"); if(g&&!g.dataset.touched){ g.value=A.guessCat(t.value); imSyncUnits(); } } return; }
  A.logDirty=true;
  if(ev.target.closest && ev.target.closest("#l-items,#l-eaten")){ readItems(); const r=ev.target.closest(".sitem"); if(r){ const i=R.e.items[+r.dataset.ix], er=$(`#l-eaten .eitem[data-ix="${r.dataset.ix}"] .e-name`); if(er) er.textContent=i.n||"(ยังไม่ใส่ชื่อ)"; } $$("#l-eaten .eitem").forEach(r=>{ const c=r.querySelector(".conv"); if(c) c.innerHTML=convHTML(R.e.items[+r.dataset.ix]); }); }
  const r=ev.target.closest&&ev.target.closest("#l-milk .mrow"); if(!r) return;
  readDay(); const m=R.l.milk[+r.dataset.ix];
  if(m.box) try{ localStorage.setItem("imdee:box", m.box); }catch(_){}
  const tb=r.querySelector(".m-tot"); if(tb) tb.innerHTML = m.ml ? (m.u==="oz" ? `≈ ${m.ml} มล.` : `= ${m.ml} มล.`) : (m.u==="box" ? '<span class="tiny" style="color:var(--warn)">เลือกขนาด</span>' : "");
  r.querySelectorAll(".m-chip").forEach(c=>c.setAttribute("aria-pressed", String(+c.dataset.v === +(m.u==="oz" ? m.oz : m.u==="box" ? m.box : m.ml))));
  const ms=R.l.milk.reduce((a,x)=>a+(+x.ml||0),0), h=$('details[data-sec="milk"] .hint'); if(h){ h.textContent = ms?`รวม ${ms} มล.`:""; h.classList.toggle("ok", ms>0); }
});
{ const pn=$("#sheet-panel"); if(pn) new MutationObserver(fitWho).observe(pn,{childList:true}); window.addEventListener("resize", fitWho); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitWho); }
/* หลังพิมพ์/เลือก/กด ทุกครั้ง ให้ตรวจใหม่ว่าปุ่มบันทึกควรใช้ได้หรือยัง (รอให้ handler อื่นทำงานเสร็จก่อน) */
["input","change","click"].forEach(t=>panel.addEventListener(t, ()=>setTimeout(refreshSave,0)));
window.addEventListener("beforeunload", e=>{ if(A.logDirty){ e.preventDefault(); e.returnValue=""; } });
})();
