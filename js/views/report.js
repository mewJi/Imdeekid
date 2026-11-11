(function(){
"use strict";
const A = window.App, {$,$$,esc,icon,S,MEALS,GROUPS,thShort,thDate,parseD,today,hhmm} = A;
const secH = (n,t,sub="") => `<h3><span class="n">${n}</span>${t}${sub?` <span class="tiny" style="font-weight:400">${sub}</span>`:""}</h3>`;

A.views.report = { render(){
  const el=$("#v-report"), dates=A.rangeDates(), s=A.stats(dates), c=A.child(), gn=A.growthNow(), R=A.ref(), base=A.base();
  if(!dates.length){ el.innerHTML = A.empty("ยังไม่มีข้อมูลในช่วงนี้","เลือกช่วงเวลาที่ยาวขึ้นด้านบน หรือเริ่มบันทึกมื้ออาหาร"); return; }
  const p = s.p==null?null:Math.round(s.p*100);
  const n = A.nutri(dates), q = n.req, f = A.nfmt, GN = {carb:"ข้าว-แป้ง", protein:"เนื้อสัตว์ ไข่", veg:"ผัก", fruit:"ผลไม้", milk:"นม"};
  const noLog = s.rows.filter(r=>!r.m.items).map(r=>`${thShort(r.date)} ${r.M.short}`);
  const auto = [
    p!=null?`กินได้ ${p}% ของเมนูที่เสิร์ฟ (${s.ok}/${s.k} รายการ) ไม่กินหรือคาย ${s.no} รายการ${s.spit?` ในนี้เคี้ยวแล้วคาย ${s.spit} ครั้ง (${s.items.filter(i=>i.st==="spit").map(i=>`${i.n.split(" ")[0]} ${thShort(i.date)}`).join(", ")})`:""}`:null,
    s.sitMed!=null?`นั่งกินต่อเนื่องนานสุดมัธยฐาน ${Math.round(s.sitMed)} นาที จาก ${s.sitN} มื้อ${s.durMed!=null?` · เวลามื้อมัธยฐาน ${Math.round(s.durMed)} นาที`:""}`:null,
    n.estMeals.length?`อาหารหลัก 5 หมู่ต่อวัน: ${n.five.map(h=>`หมู่ ${h.n} ${h.short} ${h.p!=null?h.p+"%":"–"}`).join(" · ")} · ครบ 5 หมู่ ${n.fiveFull}/${n.fiveDays} วัน`:null,
    n.estMeals.length?`พลังงานเฉลี่ย ${Math.round(n.day.kcal)} kcal/วัน${n.milkKnown?"":" จากมื้อหลัก (ยังไม่รวมนม)"} เทียบความต้องการ ${q.kcal} kcal (${n.R.kcal.p}%) · โปรตีน ${f(n.day.p)} ก. (${n.R.p.p}%) · ${n.milkKnown?`แคลเซียม ${Math.round(n.day.ca)} มก. (${n.R.ca.p}%)`:"แคลเซียมยังประเมินไม่ได้เพราะไม่มีบันทึกนม"}`:null,
    s.milkAvg!=null?`นมเฉลี่ย ${s.milkAvg} มล./วัน จาก ${s.milkDays.length} วันที่บันทึก`:`ยังไม่มีบันทึกปริมาณนม`,
    s.symDays.length?`อาการที่บันทึก: ${[...new Set(s.symDays.flatMap(l=>l.sym))].join(", ")} (${s.symDays.length} วัน)`:null,
  ].filter(Boolean);
  const mom = (base.notes&&base.notes.findings)||[];
  const clipRows = s.rows.map(r=>({r,st:A.clipStats(r.m)})).filter(x=>x.st);
  const ft = A.foodTable(s.items);
  const acc = A.CATS.map(cat=>{ const its=s.items.filter(i=>i.g===cat); if(!its.length) return null; const ok=its.filter(i=>i.st==="ate"||i.st==="part").length, no=its.filter(i=>i.st==="none"||i.st==="spit").length; return {cat, n:its.length, ok, no}; }).filter(Boolean);
  let h = `<div class="card report">
  <div class="rp-head"><div><p class="tiny">อิ่มดี · รายงานการกินและการเติบโต</p><h2 style="font-size:1.4rem">${esc(c.name)} · สรุปสำหรับแพทย์</h2><p class="sub">ช่วงข้อมูล ${thDate(dates[0])} – ${thDate(dates[dates.length-1])} · บันทึกรายการอาหาร ${s.logged}/${s.total} มื้อ · คลิป ${clipRows.length} มื้อ · พิมพ์เมื่อ ${thDate(today())}</p></div>
    <div class="chips no-print"><button class="btn primary" id="rp-print">${icon("print")}ดาวน์โหลดรายงานสำหรับพิมพ์</button></div></div>

  <section class="rp-sec">${secH(1,"ข้อมูลเด็กและการเจริญเติบโต")}
    <div class="prof"><div><span class="k">ชื่อ</span><div class="v">${esc(c.name)}</div></div><div><span class="k">เพศ</span><div class="v">${esc(c.sex)}</div></div><div><span class="k">วันเกิด</span><div class="v">${thDate(c.birth)}</div></div><div><span class="k">อายุวันนี้</span><div class="v num">${A.ageAt(new Date()).months.toFixed(1)} เดือน</div></div></div>
    ${gn.g.length?`<div class="tw"><table class="t"><thead><tr><th>วันที่วัด</th><th>อายุ (ด.)</th><th>น้ำหนัก</th><th>ส่วนสูง</th><th>น้ำหนัก/อายุ</th><th>ส่วนสูง/อายุ</th><th>น้ำหนัก/ส่วนสูง</th></tr></thead><tbody>${gn.g.map(x=>{ const am=A.ageAt(parseD(x.date)).months; return `<tr><td>${thShort(x.date)}</td><td class="num">${am.toFixed(1)}</td><td class="num">${x.weight??"–"} กก.</td><td class="num">${esc(x.heightText||x.height||"–")} ซม.</td><td>${x.weight?A.zPill("wfa",A.zAt(R.wfa,am,x.weight)):"–"}</td><td>${x.height?A.zPill("lfa",A.zAt(R.lfa,am,x.height)):"–"}</td><td>${x.weight&&x.height?A.zPill("wfl",A.zAt(R.wfl,x.height,x.weight)):"–"}</td></tr>`; }).join("")}</tbody></table></div><p class="tiny">ผู้ปกครองชั่งและวัดเองที่บ้าน · z-score เทียบมาตรฐาน WHO (เกณฑ์กรมอนามัย)${c.sex!=="ชาย"?" · ⚠ ใช้ตารางอ้างอิงเด็กชาย":""}</p>`:A.empty("ยังไม่มีการวัดน้ำหนักและส่วนสูง")}
  </section>

  <section class="rp-sec">${secH(2,"ข้อค้นพบหลัก")}
    <ul class="list">${auto.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    ${mom.length?`<p class="tiny" style="margin-top:4px">จาก${esc(base.notes.reportTitle||"บันทึกผู้ปกครอง")}</p><ul class="list">${mom.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
  </section>

  <section class="rp-sec">${secH(3,"อาหารรายมื้อ: กินได้ / ไม่กิน")}
    ${A.legend([["--good","กินได้/หมด"],["--part","บางส่วน"],["--bad","ไม่กิน"],["--spit","คาย"],["--unk","ไม่ทราบ"]])}
    <div class="tw"><table class="t mx"><thead><tr><th>วัน</th>${MEALS.map(M=>`<th>${M.short}</th>`).join("")}</tr></thead><tbody>${dates.map(d=>`<tr><td class="num" style="white-space:nowrap"><b>${thShort(d)}</b></td>${MEALS.map(M=>{ const m=A.meal(d,M.k); if(!m.items) return `<td class="tiny">${m.none?"ไม่มีข้อมูล":"มีเฉพาะคลิป/รูป"}</td>`; const a=A.accept(m); return `<td><div class="tiny num">${esc(((m.time||"").match(/\d{1,2}:\d{2}(–\d{1,2}:\d{2})?/)||["ไม่ทราบเวลา"])[0])} · กินได้ ${a.ok}/${a.k}</div><div class="mxi">${m.items.map(i=>`<span class="mxc ${i.st}" data-tip="ตักให้: ${esc(i.served)}<br>กินจริง: ${esc(i.eaten)}">${esc(i.n)}</span>`).join("")}</div></td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
  </section>

  <section class="rp-sec">${secH(4,"พลังงานและสารอาหารเทียบความต้องการ", `${n.estMeals.length}/${n.totalMeals} มื้อที่ประเมินปริมาณได้`)}
    <div class="reqbox">
      <div><span class="k">พลังงานที่ต้องการ</span><span class="v num">${q.kcal.toLocaleString()}<small> kcal/วัน</small></span><span class="s">${q.perKg} kcal/กก. ที่น้ำหนัก ${q.W} กก. · FAO/WHO/UNU 2004</span></div>
      <div><span class="k">โปรตีน</span><span class="v num">${q.protein}<small> ก./วัน</small></span><span class="s">${q.protPerKg} ก./กก. · WHO/FAO/UNU 2007</span></div>
      <div><span class="k">แคลเซียม</span><span class="v num">${q.ca}<small> มก./วัน</small></span><span class="s">DRI คนไทย 2563 · ${q.band}</span></div>
      <div><span class="k">ไขมัน</span><span class="v num">${q.amdr.f.join("–")}<small> % พลังงาน</small></span><span class="s">${q.fat[0]}–${q.fat[1]} ก./วัน · AMDR</span></div>
    </div>
    ${n.estMeals.length?`<div class="tw" style="margin-top:12px"><table class="t"><thead><tr><th>สารอาหาร (เฉลี่ยต่อวัน)</th><th>จากมื้อหลัก</th><th>จากนม</th><th>จากของว่าง</th><th>รวม</th><th>ความต้องการ</th><th>%</th></tr></thead><tbody>
      ${[["พลังงาน (kcal)",n.R.kcal,0],["โปรตีน (ก.)",n.R.p,1],["แคลเซียม (มก.)",n.R.ca,0]].map(([l,r,dec])=>`<tr><td>${l}</td><td class="num">${dec?f(r.meals):Math.round(r.meals)}</td><td class="num">${n.milkKnown?(dec?f(r.milk):Math.round(r.milk)):"ไม่ได้บันทึก"}</td><td class="num">${r.snack?(dec?f(r.snack):Math.round(r.snack)):"–"}</td><td class="num"><b>${dec?f(r.v):Math.round(r.v)}</b></td><td class="num">${r.need.toLocaleString()}</td><td><span class="pill ${r.lev} num">${r.p}%</span></td></tr>`).join("")}
      ${n.macro?`<tr><td>สัดส่วนพลังงาน คาร์บ/โปรตีน/ไขมัน</td><td colspan="4" class="num">${n.macro.c}% / ${n.macro.p}% / ${n.macro.f}%${n.milkKnown?"":" (มื้อหลัก)"}</td><td class="num">${q.amdr.c.join("–")} / ${q.amdr.p.join("–")} / ${q.amdr.f.join("–")}%</td><td>${n.macro.f<q.amdr.f[0]?'<span class="pill warn">ไขมันต่ำ</span>':'<span class="pill good">ในช่วง</span>'}</td></tr>`:""}
      </tbody></table></div>
      <div class="tw"><table class="t"><thead><tr><th>อาหารหลัก 5 หมู่ (ต่อวัน)</th><th>ได้ราว</th><th>ควรได้ (${q.band})</th><th>สารอาหารหลักของหมู่</th><th>%</th></tr></thead><tbody>${n.five.map(h=>`<tr><td><b>${esc(h.name)}</b><br><span class="tiny">${esc(h.food)}</span></td><td class="num">${h.parts.map(x=>`${esc(x.lab)} ${x.p!=null||!x.need?f(x.v):"ไม่ได้บันทึก"} ${x.p!=null||!x.need?x.unit:""}`).join("<br>")}</td><td class="num">${h.parts.map(x=>x.need?`${x.need} ${x.unit}`:"ใช้แต่น้อย").join("<br>")}</td><td class="num">${h.nut?`${esc(h.nut.lab)} ${f(h.nut.v)} / ${h.nut.range?h.nut.range.join("–"):h.nut.need} ${h.nut.unit}`:'<span class="tiny">วิตามินไม่ได้คำนวณ</span>'}</td><td>${h.p!=null?`<span class="pill ${h.lev} num">${h.p}%</span>`:"–"}</td></tr>`).join("")}</tbody></table></div>
      <p class="sub">ครบ 5 หมู่ ${n.fiveFull} จาก ${n.fiveDays} วันที่ประเมินได้ครบ 3 มื้อ</p>
      <p class="sub"><b>สรุปจุดที่ขาด:</b> ${n.gaps.map(g=>esc(g.t)).join(" · ")||"ไม่พบจุดที่ขาดชัดเจน"}</p>
      <details class="fold"><summary>รายวัน (${n.days.filter(x=>x.hasAny).length} วัน)</summary><div class="tw" style="margin-top:8px"><table class="t"><thead><tr><th>วัน</th><th>มื้อที่ประเมิน</th><th>มื้อหลัก kcal</th><th>นม มล.</th><th>รวม kcal</th><th>%</th><th>โปรตีน ก.</th><th>แคลเซียม มก.</th></tr></thead><tbody>${n.days.filter(x=>x.hasAny).map(x=>`<tr><td>${thShort(x.date)}</td><td class="num">${x.est}/3</td><td class="num">${Math.round(x.meal.kcal)}</td><td class="num">${x.milkMl??"–"}</td><td class="num">${Math.round(x.tot.kcal)}</td><td class="num">${Math.round(x.tot.kcal/x.req.kcal*100)}%</td><td class="num">${f(x.tot.p)}</td><td class="num">${Math.round(x.tot.ca)}</td></tr>`).join("")}</tbody></table></div></details>
      <p class="tiny">${esc(A.coverageText(n))} · แปลงด้วยรายการอาหารแลกเปลี่ยนของไทย (ข้าว 1 ทัพพี 80 kcal · เนื้อสัตว์ 1 ช้อนกินข้าว ~37 kcal โปรตีน 3.5 ก. · ผัก 1 ทัพพี 25 kcal · ผลไม้ 1 ส่วน 60 kcal · นมจืด 240 มล. 150 kcal) ${n.milkKnown?"":"· ไม่มีบันทึกนม จึงยังไม่รวมพลังงานและแคลเซียมจากนม"}</p>`:A.empty("ยังไม่มีปริมาณที่กินให้คำนวณ")}
  </section>

  <section class="rp-sec">${secH(5,"เวลาที่โต๊ะ (จากคลิป)", `${clipRows.length} มื้อ`)}
    ${clipRows.length?`<div class="tw"><table class="t"><thead><tr><th>มื้อ</th><th>ช่วงเวลา</th><th>นั่ง</th><th>นานสุด</th><th>ที่อื่น</th></tr></thead><tbody>${clipRows.map(({r,st})=>`<tr><td>${thShort(r.date)} ${r.M.short}</td><td class="num">${hhmm(st.start)}–${hhmm(st.end)}</td><td class="num">${st.cnt.S}</td><td class="num">${st.longest}</td><td class="num">${st.cnt.E}</td></tr>`).join("")}</tbody></table></div><p class="tiny">หน่วยนาที · อ่านภาพทุก 20 วินาที–1 นาที คลาดเคลื่อนราว ±2 นาที</p>`:A.empty("ไม่มีคลิปในช่วงนี้")}
  </section>


  <section class="rp-sec">${secH(6,"นม น้ำ ของว่าง อาการ (บันทึกประจำวัน)", `${s.dl.length} วัน`)}
    ${s.dl.length?`<div class="tw"><table class="t"><thead><tr><th>วัน</th><th>นม (มล.)</th><th>น้ำ</th><th>ของว่าง</th><th>อาการ</th><th>ขับถ่าย</th><th>การนอน</th></tr></thead><tbody>${s.dl.map(l=>{ const mk=(l.milk||[]).reduce((a,x)=>a+(+x.ml||0),0); return `<tr><td>${thShort(l.date)}</td><td class="num">${mk||"–"}</td><td class="num">${esc(l.water||"–")}</td><td>${(l.snacks||[]).map(x=>esc(x.n+(x.a?" "+x.a:""))).join(", ")||"–"}</td><td>${(l.sym||[]).map(esc).join(", ")||"–"}${l.symNote?`<div class="tiny">${esc(l.symNote)}</div>`:""}</td><td>${esc(l.stool||"–")}</td><td class="num">${A.sleeps(l).length?esc(A.sleepText(l)):"–"}</td></tr>`; }).join("")}</tbody></table></div>`:A.empty("ยังไม่มีบันทึกประจำวัน","ปริมาณนม อาการ และการขับถ่ายยังไม่ได้บันทึก")}
  </section>

  <section class="rp-sec">${secH(7,"การยอมรับอาหารตามหมวด")}
    ${acc.length?`<div class="tw"><table class="t"><thead><tr><th>หมวด</th><th>รายการ</th><th>กินได้</th><th>ไม่กิน/คาย</th><th>% กินได้</th></tr></thead><tbody>${acc.map(x=>`<tr><td>${esc(x.cat)}</td><td class="num">${x.n}</td><td class="num">${x.ok}</td><td class="num">${x.no}</td><td><span class="pill ${A.lev(x.ok+x.no?x.ok/(x.ok+x.no):null)} num">${A.pct(x.ok,x.ok+x.no)??"–"}%</span></td></tr>`).join("")}</tbody></table></div>`:A.empty("ยังไม่มีรายการอาหาร")}
    ${ft.filter(f=>f.no>=1).length?`<p class="sub"><b>เมนูที่ปฏิเสธหรือคาย:</b> ${ft.filter(f=>f.no>=1).sort((a,b)=>b.no-a.no).map(f=>`${esc(f.n)} (${f.no}/${f.ok+f.no})`).join(", ")}</p>`:""}
  </section>

  ${(base.talk||[]).length?`<section class="rp-sec">${secH(8,"ประเด็นที่ผู้ปกครองอยากปรึกษา")}<ul class="list">${base.talk.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:""}

  <section class="rp-sec">${secH(9,"ข้อจำกัดของข้อมูล")}
    <ul class="list">
      <li>ปริมาณเป็นหน่วยครัวเรือนที่ผู้ปกครองกะเอง (คำ ช้อน ทัพพี ชิ้น) ไม่ได้ชั่ง พลังงานและสารอาหารแปลงจากรายการอาหารแลกเปลี่ยน จึงเป็นค่าประมาณ (คลาดเคลื่อนได้ราว ±20–30%) · ธาตุเหล็ก สังกะสี และวิตามินไม่ได้คำนวณ · "ไม่ทราบ" ไม่ได้แปลว่าไม่ได้กิน · เคี้ยวแล้วคายไม่นับว่ากลืน</li>
      <li>มื้อที่ไม่มีรายการอาหาร: ${noLog.length?esc(noLog.join(", ")):"ไม่มี"}</li>
      <li>${s.milkAvg==null?"ยังไม่มีบันทึกปริมาณนม พลังงาน โปรตีน และแคลเซียมจากนมจึงยังไม่รวม":`นมบันทึก ${s.milkDays.length} วัน ใช้ค่าเฉลี่ยของวันที่บันทึก`} · มื้อที่ประเมินไม่ได้ใช้ค่าเฉลี่ยของมื้อที่ประเมินได้แทน ไม่นับเป็นศูนย์</li>
      <li>น้ำหนักและส่วนสูงวัดที่บ้าน ${gn.g.length} ครั้ง${gn.last?` ล่าสุด ${thShort(gn.last.date)}`:""}</li>
    </ul>
    ${(base.fixes||[]).length?`<details class="fold"><summary>รายการที่ยังต้องยืนยันกับผู้ปกครอง (${base.fixes.length})</summary><div class="tw" style="margin-top:8px"><table class="t"><tbody>${base.fixes.map(x=>`<tr><td style="white-space:nowrap"><b>${esc(x.k)}</b></td><td>${esc(x.v)}</td></tr>`).join("")}</tbody></table></div></details>`:""}
  </section>

  <section class="rp-sec rp-app">${secH("ผ","ภาคผนวก: รายการอาหารทุกมื้อ", `${s.items.length} รายการ`)}
    <details class="fold"><summary>แสดงตาราง (เปิดอัตโนมัติเมื่อพิมพ์)</summary><div class="tw" style="margin-top:8px"><table class="t"><thead><tr><th>มื้อ</th><th>อาหาร</th><th>ตักให้</th><th>กินจริง</th><th>ผล</th></tr></thead><tbody>${s.withItems.map(r=>r.m.items.map((i,ix)=>`<tr><td style="white-space:nowrap">${ix===0?`<b>${thShort(r.date)} ${r.M.short}</b>`:""}</td><td>${esc(i.n)}</td><td>${esc(i.served)}</td><td>${esc(i.eaten)}</td><td>${A.stPill(i.st)}</td></tr>`).join("")).join("")}</tbody></table></div></details>
    <div class="tiny" style="display:grid;gap:4px;margin-top:8px"><b>วิธีเก็บข้อมูลและแหล่งอ้างอิง</b>${((base.notes&&base.notes.method)||[]).map(x=>`<span>${esc(x)}</span>`).join("")}
      <span>เกณฑ์การเจริญเติบโต: กรมอนามัย ประยุกต์จากมาตรฐาน WHO แบ่งระดับที่ ±1.5 และ ±2 SD · <a href="https://www.who.int/tools/child-growth-standards/standards">WHO Child Growth Standards</a></span>
      <span>ปริมาณอาหาร 5 หมู่: ธงโภชนาการสำหรับเด็ก (1–3 ปี ข้าว-แป้ง 3 ทัพพี ผัก 1.5 ทัพพี ผลไม้ 3 ส่วน เนื้อสัตว์ 3 ช้อน นม 2 กล่อง · น้ำมัน น้ำตาล เกลือใช้แต่น้อย) · หมู่ 5 เทียบไขมันรวม 30–40% ของพลังงาน <a href="https://th.rajanukul.go.th/_admin/file-research/869-0-1706064067.pdf">สถาบันราชานุกูล</a> · สัดส่วนมื้อ เช้า 20% กลางวัน 30% เย็น 30% สำนักโภชนาการ กรมอนามัย</span>
      <span>ความต้องการพลังงาน: <a href="https://www.fao.org/4/y5686e/y5686e06.htm">FAO/WHO/UNU Human Energy Requirements 2004</a> (TEE ตามน้ำหนัก อายุ 1–2 ปีลด 7% + 2 kcal ต่อกรัมที่โต) · โปรตีน: WHO/FAO/UNU 2007 safe level · แคลเซียม: ปริมาณสารอาหารอ้างอิงที่ควรได้รับประจำวันสำหรับคนไทย พ.ศ. 2563 · สัดส่วนพลังงาน: IOM AMDR · ค่าแปลงหน่วย: รายการอาหารแลกเปลี่ยน ฝ่ายโภชนาการ โรงพยาบาลศิริราช</span>
      <span>เอกสารนี้เป็นข้อมูลที่ครอบครัวบันทึกเพื่อประกอบการปรึกษา ไม่ใช่การวินิจฉัย</span></div>
  </section>
  </div>`;
  el.innerHTML = h;
  $("#rp-print").onclick = exportReport;
}};
async function exportReport(){
  const c=A.child(); let dl=null; try{ dl = await claude.use("downloads"); }catch(_){}
  $$("#v-report details").forEach(d=>d.open=true);
  let css=""; try{ css = await (await fetch("css/app.css")).text(); }catch(_){}
  const html = `<!DOCTYPE html><html lang="th" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>รายงานการกิน ${esc(c.name)} ${today()}</title><link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600&display=swap" rel="stylesheet"><style>${css}</style><style>body{padding:24px;max-width:1100px;margin:0 auto}.no-print{display:none!important}</style></head><body>${$("#v-report").innerHTML}<script>setTimeout(function(){try{print()}catch(e){}},900)<\/script></body></html>`;
  const filename = `รายงานการกิน-${c.name}-${today()}.html`;
  if(dl){
    for(const data of [html, new Blob([html],{type:"text/html"})]){ try{ await dl.save({filename, data}); A.toast("ได้ไฟล์รายงานแล้ว เปิดไฟล์เพื่อพิมพ์หรือบันทึกเป็น PDF"); return; }catch(e){ if(e && /declin|cancel|denied/i.test(String(e.code||e.message||""))) return; } }
  }
  try{ window.print(); }catch(_){}
  A.toast("ดาวน์โหลดไม่ได้ในหน้านี้ ใช้คำสั่งพิมพ์ของเบราว์เซอร์แทน");
}
window.addEventListener("beforeprint", ()=>{ $$("#v-report details").forEach(d=>d.open=true); });
})();
