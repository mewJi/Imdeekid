(function(){
"use strict";
const A = window.App, {$,$$,esc,icon,S,MEALS,GROUPS,STATES,thShort,thLong,TH_DS,parseD,today,addDays,hhmm} = A;

function dots(d){ return MEALS.map(M=>{ const m=A.meal(d,M.k), a=A.accept(m); return `<i class="${m.none?"":a&&a.k?A.lev(a.p):"neutral"}"></i>`; }).join(""); }
function strip(sel){
  const ds = A.allDates(); const td=today(); if(!ds.includes(td)) ds.push(td); if(!ds.includes(sel)) { ds.push(sel); ds.sort(); }
  return `<div class="daystrip" id="daystrip">${ds.map(d=>`<button class="dchip ${d===td?"today":""}" aria-pressed="${d===sel}" data-href="#days-${d}" aria-label="${thLong(d)}"><small>${TH_DS[parseD(d).getDay()]}</small><b class="num">${parseD(d).getDate()}</b><small>${A.TH_M[parseD(d).getMonth()]}</small><span class="dots">${dots(d)}</span></button>`).join("")}</div>`;
}
function chips(items, sts){ return items.filter(i=>sts.includes(i.st)).map(i=>`<span class="fchip ${i.st}" data-tip="${esc(i.n)}<br>เสิร์ฟ: ${esc(i.served)}<br>กินจริง: ${esc(i.eaten)}">${esc(i.n)}${i.st==="part"?"<small>บางส่วน</small>":i.st==="spit"?"<small>คาย</small>":""}</span>`).join(""); }

function mealCard(d, M){
  const m = A.meal(d, M.k);
  const head = `<summary><svg class="ic chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg><h3><span class="dot" style="background:var(${M.v})"></span>${M.name}</h3>`;
  if(m.none) return `<details class="meal" open>${head}<span class="pill neutral">ยังไม่มีข้อมูล</span></summary><div class="meal-b"><div class="empty">${icon("bowl")}<b>ยังไม่มีบันทึก${M.name}</b><span>บันทึกหลังมื้อได้ ใช้เวลาราว 1–2 นาที</span><button class="btn primary" data-log="${d}|${M.k}">${icon("plus")}บันทึก${M.name}</button></div></div></details>`;
  const a = A.accept(m), st = A.clipStats(m);
  const src = [m.entry?"บันทึกในแอป":m.items?"บันทึกผู้ปกครอง":"", st?"คลิป":"", (m.photos&&(m.photos.before.length||m.photos.after.length))?"รูป":""].filter(Boolean);
  let h = `<details class="meal" open data-meal="${M.k}" id="meal-${M.k}">${head}`;
  if(a&&a.k) h += `<span class="pill ${A.lev(a.p)}">กินได้ ${a.ok}/${a.k}</span>`;
  if(m.time||st) h += `<span class="pill neutral num">${icon("clock")}${st?`${hhmm(st.start)}–${hhmm(st.end)}`:esc(m.time)}</span>`;
  h += src.map(x=>`<span class="pill accent">${x}</span>`).join("") + `</summary><div class="meal-b">`;
  const tabs = [];
  // overview
  let ov = "";
  if(m.items) ov += `<div class="ate-grid"><div class="fgroup"><h4>กินได้ (${a.ok})</h4><div class="chips">${chips(m.items,["ate","part"])||'<span class="tiny">–</span>'}</div></div><div class="fgroup"><h4>ไม่กินหรือคาย (${a.no})</h4><div class="chips">${chips(m.items,["none","spit"])||'<span class="tiny">–</span>'}</div></div>${a.unk?`<div class="fgroup"><h4>ไม่ทราบ (${a.unk})</h4><div class="chips">${chips(m.items,["unk"])}</div></div>`:""}</div>`;
  else ov += `<div class="note">มื้อนี้ยังไม่มีรายการอาหารจากผู้ปกครอง ข้อมูลมาจากคลิปและรูป</div>`;
  ov += `<dl class="kv">`;
  ov += `<dt>ใครป้อน</dt><dd>${m.feedText?esc(m.feedText):'<span class="tiny">ไม่ได้บันทึก</span>'}</dd>`;
  if(m.time) ov += `<dt>เวลา</dt><dd class="num">${esc(m.time)}${m.durMin!=null?` · ${m.durMin} นาที`:""}</dd>`;
  if(m.sitMax) ov += `<dt>นั่งนานสุด</dt><dd>ประมาณ ${m.sitMax} นาที</dd>`;
  if(m.env&&m.env.length) ov += `<dt>บรรยากาศ</dt><dd>${esc(m.env.join(" · "))}</dd>`;
  if(m.behav&&m.behav.length) ov += `<dt>พฤติกรรม</dt><dd><div class="chips">${m.behav.map(b=>`<span class="chip">${esc(b)}</span>`).join("")}</div></dd>`;
  const it = A.mealIntake(m);
  ov += `</dl>`;
  if(it && it.ok){ const q=A.req(parseD(d)), tg=q.kcal*M.share, pk=Math.round(it.kcal/tg*100), pp=Math.round(it.p/(q.protein*M.share)*100), pr=A.present5(it.serv);
    ov += `<div>${A.statBoxes([
      {label:"พลังงานมื้อนี้", v:Math.round(it.kcal), unit:`/ ${Math.round(tg)} kcal`, p:pk, lev:pk<60?"bad":pk<85?"warn":"good", sub:`${pk}% ของเป้า${M.name}`},
      {label:"โปรตีน", v:A.nfmt(it.p), unit:"ก.", p:pp, lev:pp<60?"warn":"good", sub:`${pp}% ของเป้ามื้อ`},
      {label:"อาหารหลัก 5 หมู่", v:pr.n, unit:"/ 5 หมู่", p:pr.n/5*100, lev:pr.n===5?"good":pr.n>=4?"warn":"bad", sub:A.fiveChips(pr)}])}
      <p class="tiny" style="margin-top:6px">${esc(A.METHOD[it.method])}${it.unknown?` · ไม่นับ ${it.unknown} รายการที่ไม่ทราบปริมาณ`:""}</p>
      <h4 style="margin:12px 0 8px">ปริมาณที่กินตาม 5 หมู่</h4>${A.mealFive(it.serv, 0, M.share, q)}</div>`; }
  else if(it && m.items) ov += `<p class="tiny">พลังงานยังประเมินไม่ได้ ใส่ปริมาณที่กินเป็นหน่วยครัวเรือน</p>`;
  if(st) ov += `<div class="stats4">${["S","A","E"].map(k=>`<div><span class="k"><i class="sw" style="background:var(${STATES[k].v})"></i>${STATES[k].label}</span><span class="v num">${st.cnt[k]} นาที</span></div>`).join("")}<div><span class="k">นั่งต่อเนื่องนานสุด</span><span class="v num">${st.longest} นาที</span></div></div>`;
  tabs.push(["สรุป", ov]);
  if(m.items) tabs.push([`รายการอาหาร (${m.items.length})`, `<div class="tw"><table class="t"><thead><tr><th>อาหาร</th><th>ตักให้</th><th>กินจริง</th><th>ผล</th></tr></thead><tbody>${m.items.map(i=>`<tr><td><b>${esc(i.n)}</b><br><span class="tiny">${esc(i.g||"")}</span>${i.parts&&i.parts.length?`<br><span class="tiny">ส่วนประกอบ: ${i.parts.map(p=>esc(p.n+(p.eaten?` ${p.eaten}`:p.st==="none"?" (ไม่กิน)":""))).join(" · ")}</span>`:""}</td><td>${esc(i.served)}</td><td>${esc(i.eaten)}</td><td>${A.stPill(i.st)}</td></tr>`).join("")}</tbody></table></div><p class="tiny">หน่วยตามที่ผู้ปกครองใช้ ไม่ได้ชั่ง · "ไม่ทราบ" ไม่ได้แปลว่าไม่ได้กิน · คาย ไม่นับว่ากลืน</p>`]);
  let bh = "";
  if(m.seq&&m.seq.length) bh += `<div><h4 style="margin-bottom:6px">ลำดับเหตุการณ์</h4><ol class="list">${m.seq.map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div>`;
  if(st) bh += `<div><h4 style="margin-bottom:6px">ไทม์ไลน์จากคลิป (รายนาที)</h4>${A.legend(Object.entries(STATES).map(([k,s])=>[s.v,s.label]))}<div class="chart">${A.chartTimeline(st,"tl"+d.replace(/-/g,"")+M.k)}</div></div>`;
  if(m.clipFeeding) bh += `<div><h4 style="margin-bottom:6px">การป้อนที่เห็นในคลิป</h4><p class="sub">${esc(m.clipFeeding)}</p></div>`;
  if(m.notes&&m.notes.length) bh += `<div><h4 style="margin-bottom:6px">ข้อสังเกตจากคลิป</h4><ul class="list">${m.notes.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
  if(m.note) bh += `<div><h4 style="margin-bottom:6px">เล่าเพิ่ม</h4><p class="sub">${esc(m.note)}</p></div>`;
  if(bh) tabs.push(["พฤติกรรม", bh]);
  const nph = (m.photos?m.photos.before.length+m.photos.after.length:0);
  let ph = "";
  if(nph) ph += `<div class="photos">${["before","after"].map(k=>`<figure><figcaption>${k==="before"?"ก่อนกิน":"หลังกิน"}</figcaption>${(m.photos[k]||[]).length?m.photos[k].map(u=>`<img src="${esc(u)}" alt="${M.name} ${k==="before"?"ก่อนกิน":"หลังกิน"}" loading="lazy" data-zoom>`).join(""):A.empty("ไม่มีรูป")}</figure>`).join("")}</div>`;
  if(m.before||m.after) ph += `<dl class="kv"><dt>ที่ตักให้</dt><dd>${esc(m.before||"–")}</dd><dt>ที่เหลือ</dt><dd>${esc(m.after||"–")}</dd></dl>`;
  if(m.eaten) ph += `<div><h4 style="margin-bottom:8px">ปริมาณตามหมู่อาหาร เทียบเป้า${M.name}</h4><div class="gbars">${GROUPS.filter(g=>g.k!=="fat").map(g=>{ const v=+m.eaten[g.k]||0, tg=g.daily*M.share, p=Math.round(v/tg*100); return `<div class="gbar"><span>${g.name}</span><span class="track"><i style="width:${Math.min(100,p/1.5)}%;background:var(${g.v})"></i><b style="left:${100/1.5}%"></b></span><span class="num tiny">${v} ${g.unit} · ${p}%</span></div>`; }).join("")}</div><p class="tiny" style="margin-top:6px">เส้นขีด = เป้าของมื้อ · ${esc(m.estimateNote||"ค่าประเมิน ไม่ได้ชั่ง")}</p></div>`;
  if(m.snack) ph += `<p class="sub">ขนมหลังมื้อ: ${esc(m.snack.name)} ${esc(m.snack.amount)}</p>`;
  if(ph) tabs.push([nph?`รูปและปริมาณ`:"ปริมาณ", ph]);
  let nt = "";
  if(m.recipe) nt += `<div><h4 style="margin-bottom:4px">ส่วนผสม</h4><p class="sub">${esc(m.recipe)}</p></div>`;
  if(m.cross) nt += `<div class="note" style="border-color:var(--warn);background:var(--warn-soft)"><b>ข้อมูลไม่ตรงกัน</b><br>${esc(m.cross)}</div>`;
  if(m.missing && !m.entry) nt += `<div><h4 style="margin-bottom:4px">ข้อมูลที่ยังต้องเติม</h4><p class="sub">${esc(m.missing)}</p></div>`;
  if(nt) tabs.push(["หมายเหตุ"+(m.cross?" ⚠":""), nt]);
  const id = "mt"+M.k;
  h += `<div class="mtabs" role="tablist">${tabs.map((t,i)=>`<button role="tab" aria-selected="${i===0}" data-mt="${id}-${i}">${t[0]}</button>`).join("")}</div>`;
  h += tabs.map((t,i)=>`<div class="mpane${i===0?" on":""}" id="${id}-${i}" role="tabpanel">${t[1]}</div>`).join("");
  h += `<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span class="tiny">ที่มา: ${esc(m.source||"")}</span><button class="btn sm" data-log="${d}|${M.k}">${icon("edit")}${m.entry?"แก้ไขบันทึก":"บันทึก/เติมข้อมูล"}</button></div>`;
  return h + `</div></details>`;
}
function energyCard(d){
  const x = A.dayIntake(d); if(!x.hasAny) return "";
  const q = x.req, k = x.tot.kcal, pc = Math.round(k/q.kcal*100), pm = x.milkMl==null?pc/0.8:pc, lv = pm<75?"bad":pm<90?"warn":"good";
  const lvp = (p, lo=90) => p<75?"bad":p<lo?"warn":"good";
  const fp = k?Math.round(x.tot.f*9/k*100):null;
  return `<div class="card flat">${A.cardHead(`พลังงานและสารอาหาร${d===today()?"วันนี้":"ทั้งวัน"}`, `ประเมินได้ ${x.est}/3 มื้อ · ${x.milkMl!=null?`รวมนม ${x.milkMl} มล.`:"ยังไม่รวมนม"}${x.snack.ok?` · ของว่าง ${x.snack.ok} รายการ`:""}`, `<span class="pill ${lv} num">${pc}% ของพลังงาน</span>`)}
    ${A.statBoxes([
      {label:"พลังงาน", v:Math.round(k).toLocaleString(), unit:`/ ${q.kcal.toLocaleString()} kcal`, p:pc, lev:lv, sub:`${pc}% ของความต้องการ${x.milkMl==null?" (ยังไม่รวมนม)":""}`},
      {label:"โปรตีน", v:A.nfmt(x.tot.p), unit:`/ ${q.protein} ก.`, p:Math.round(x.tot.p/q.protein*100), lev:lvp(x.tot.p/q.protein*100,100), sub:`${Math.round(x.tot.p/q.protein*100)}% ของความต้องการ`},
      {label:"แคลเซียม", v:Math.round(x.tot.ca), unit:`/ ${q.ca} มก.`, p:Math.round(x.tot.ca/q.ca*100), lev:x.milkMl==null?"neutral":lvp(x.tot.ca/q.ca*100,100), sub:x.milkMl==null?"ยังไม่รวมนม":`${Math.round(x.tot.ca/q.ca*100)}% ของความต้องการ`},
      {label:"ไขมัน", v:fp??"–", unit:"% ของพลังงาน", p:fp!=null?fp/q.amdr.f[1]*100:null, lev:fp==null?"":fp<q.amdr.f[0]?"warn":fp>q.amdr.f[1]?"warn":"good", sub:`ควร ${q.amdr.f.join("–")}%`},
      {label:"อาหารหลัก 5 หมู่", v:x.five.n, unit:"/ 5 หมู่", p:x.five.n/5*100, lev:x.five.n===5?"good":x.five.n>=4?"warn":"bad", sub:A.fiveChips(x.five)}])}
    <h4 style="margin:16px 0 8px">อาหารหลัก 5 หมู่ทั้งวัน <span class="tiny" style="font-weight:400">รวม 3 มื้อ${x.milkMl!=null?" + นม":""}${x.snack.ok?" + ของว่าง":""} เทียบปริมาณที่ควรได้ต่อวัน</span></h4>
    ${A.mealFive(x.tot.serv, 0, 1, q)}
    ${x.est<3||x.milkMl==null?`<p class="tiny" style="margin-top:8px">ตัวเลขของวันนี้ยังไม่ครบ${x.est<3?` (ประเมินได้ ${x.est} มื้อ)`:""}${x.milkMl==null?" · บันทึกปริมาณนมเพื่อให้เห็นภาพทั้งวัน":""}${x.snack.bad.length?` · ของว่างที่แปลงไม่ได้: ${esc(x.snack.bad.join(", "))}`:""}</p>`:""}</div>`;
}
function daylogCard(d){
  const l = S.daylogs[d], g = A.growthAll().find(x=>x.date===d);
  const btn = `<button class="btn sm" data-log="${d}||day">${icon(l?"edit":"plus")}${l?"แก้ไข":"บันทึก"}</button>`;
  if(!l && !g) return `<div class="card flat">${A.cardHead("นม อาการ และการนอน","ยังไม่มีบันทึกประจำวัน",btn)}</div>`;
  const milk=l?(l.milk||[]).reduce((s,x)=>s+(+x.ml||0),0):0;
  return `<div class="card flat">${A.cardHead("นม อาการ และการนอน", l&&l.by?`บันทึกโดย${esc(l.by)}`:"", btn)}
    <div class="stats4">
      <div><span class="k">${icon("milk")}นม</span><span class="v num">${milk?milk+" มล.":"–"}</span>${l&&(l.milk||[]).some(x=>x.u==="box")?`<span class="tiny" style="display:block">${l.milk.filter(x=>+x.ml).map(x=>`${x.t?x.t+" ":""}${x.u==="box"?`${x.n} กล่อง×${x.box}`:x.ml+" มล."}`).join(" · ")}</span>`:""}</div>
      <div><span class="k">อาการ</span><span class="v" style="font-size:.86rem">${l&&l.sym&&l.sym.length?esc(l.sym.join(", ")):"–"}</span></div>
      <div><span class="k">การนอน</span><span class="v" style="font-size:.86rem">${l&&A.sleeps(l).length?esc(A.sleepText(l)):"–"}</span></div>
      <div><span class="k">น้ำหนัก/ส่วนสูง</span><span class="v num">${g?`${g.weight?g.weight+" กก.":""} ${g.height?(g.heightText||g.height)+" ซม.":""}`:"–"}</span></div>
    </div>
    ${l&&((l.snacks||[]).length||l.water||l.stool||l.symNote||l.note)?`<dl class="kv" style="margin-top:10px">${l.water?`<dt>น้ำเปล่า</dt><dd>${esc(l.water)} มล.</dd>`:""}${(l.snacks||[]).length?`<dt>ของว่าง</dt><dd>${l.snacks.map(s=>esc(`${s.t||""} ${s.n} ${s.a||""}`.trim())).join(", ")}</dd>`:""}${l.stool?`<dt>ขับถ่าย</dt><dd>${esc(l.stool)}</dd>`:""}${l.symNote?`<dt>รายละเอียดอาการ</dt><dd>${esc(l.symNote)}</dd>`:""}${l.note?`<dt>หมายเหตุ</dt><dd>${esc(l.note)}</dd>`:""}</dl>`:""}
  </div>`;
}
A.views.days = { render(arg){
  const el = $("#v-days");
  const all = A.allDates();
  const d = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : (all.length? (all.includes(today())?today():all[all.length-1]) : today());
  const base = A.base(); const sm = base.days && base.days[d] && base.days[d].summary;
  const es = MEALS.map(M=>{ const m=A.meal(d,M.k); if(!m.entry) return ""; const a=A.accept(m); return `${M.short}: ${a&&a.k?`กินได้ ${a.ok}/${a.k}`:"ยังไม่ระบุรายการ"}`; }).filter(Boolean).join(" · ");
  el.innerHTML = strip(d) + `
    <div class="day-head"><h2>${thLong(d)}</h2>
      <button class="icbtn" data-href="#days-${addDays(d,-1)}" aria-label="วันก่อนหน้า">${icon("chevL")}</button>
      <button class="icbtn" data-href="#days-${addDays(d,1)}" aria-label="วันถัดไป" ${d>=today()?"disabled":""}>${icon("chevR")}</button>
      <button class="btn primary" data-log="${d}|${A.guessMeal()}">${icon("plus")}บันทึก</button></div>
    ${sm||es?`<div class="note">${sm?esc(sm):""}${sm&&es?"<br><br>":""}${es?`<b>บันทึกในแอป:</b> ${esc(es)}`:""}</div>`:""}
    ${energyCard(d)}
    ${daylogCard(d)}
    ${MEALS.map(M=>mealCard(d,M)).join("")}`;
  const ch = el.querySelector('.dchip[aria-pressed="true"]'); if(ch) ch.scrollIntoView({inline:"center",block:"nearest"});
  $$(".mtabs button", el).forEach(b=>b.onclick=()=>{ const box=b.closest(".meal-b"); $$(".mtabs button",box).forEach(x=>x.setAttribute("aria-selected", x===b)); $$(".mpane",box).forEach(p=>p.classList.toggle("on", p.id===b.dataset.mt)); });
}};
})();
