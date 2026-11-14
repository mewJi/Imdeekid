(function(){
"use strict";
const A = window.App, {$,esc,icon,S,MEALS,thShort,thLong,TH_DS,parseD,today} = A;

function kpi(cls, ic, k, v, s){ if(v==="–"){ cls="none"; v="ไม่มี"; } /* ไม่มีค่า: แสดงคำว่า "ไม่มี" สีอ่อน ไม่ใช้สีเตือน */ return `<div class="kpi ${cls}"><span class="bar"></span><span class="k">${icon(ic)}${k}</span><span class="v num">${v}</span><span class="s">${s}</span></div>`; }

function kcell(d){
  const di = A.dayIntake(d);
  if(!di.hasAny) return `<div class="kcell"><span>–</span></div>`;
  const k = Math.round(di.tot.kcal), need = di.req.kcal, pc = Math.round(k/need*100);
  const pm = di.milkMl==null ? pc/0.8 : pc, lv = pm<75?"bad":pm<90?"warn":"good";   // no milk logged → judge against the main-meal share (80%)
  const tip = `<b>${thShort(d)} · พลังงานโดยประมาณ</b><br>${k} kcal จาก ${need} kcal (${pc}%)<br>มื้อที่ประเมินได้ ${di.est}/3${di.milkMl!=null?` · นม ${di.milkMl} มล.`:" · ยังไม่ได้บันทึกนม"}`;
  return `<div class="kcell" data-tip="${tip}"><b class="num">${k||"–"}<small> kcal</small></b><span class="meter"><i style="width:${Math.min(100,pc)}%;background:var(--${lv})"></i></span><span class="num">${pc}%${di.milkMl==null?" · ไม่รวมนม":""}${di.est<3?` · ${di.est}/3 มื้อ`:""}</span></div>`;
}
function heatmap(dates){
  const ds = [...dates]; const td = today(); if(!ds.includes(td)) ds.push(td);
  const rows = ds.slice(-14).reverse();
  let h = `<div class="chart fit"><table class="heat"><thead><tr><th class="d">วัน</th>${MEALS.map(M=>`<th>${M.short}</th>`).join("")}<th style="width:92px">พลังงาน</th></tr></thead><tbody>`;
  rows.forEach(d=>{
    h += `<tr><th class="d"><a href="#days-${d}" style="color:var(--ink);text-decoration:none">${thShort(d)}</a><small>${d===td?"วันนี้":TH_DS[parseD(d).getDay()]}</small></th>`;
    MEALS.forEach(M=>{
      const m=A.meal(d,M.k), a=A.accept(m);
      if(m.none){ h+=`<td><button class="hc none" data-log="${d}|${M.k}" aria-label="บันทึก ${thShort(d)} ${M.short}"><span>+ บันทึก</span></button></td>`; return; }
      if(!a||!a.k){ h+=`<td><button class="hc clip" data-href="#days-${d}" data-tip="${thShort(d)} ${M.name}<br>มีคลิปหรือรูป แต่ยังไม่มีรายการอาหาร"><b>คลิป/รูป</b><span>ไม่มีรายการ</span></button></td>`; return; }
      const ok=m.items.filter(i=>i.st==="ate"||i.st==="part").map(i=>i.n), no=m.items.filter(i=>i.st==="none"||i.st==="spit").map(i=>i.n);
      h+=`<td><button class="hc ${A.lev(a.p)}" data-href="#days-${d}" data-tip="<b>${thShort(d)} ${M.name}</b> · กินได้ ${a.ok}/${a.k}<br>✓ ${ok.map(esc).join(", ")||"–"}<br>✕ ${no.map(esc).join(", ")||"–"}"><b class="num">${a.ok}/${a.k}</b><span>${esc(ok.slice(0,2).map(x=>x.split(" ")[0]).join(" · ")||"–")}</span></button></td>`;
    });
    h += `<td class="kc">${kcell(d)}</td></tr>`;
  });
  return h + `</tbody></table></div>`;
}

A.views.home = { render(){
  const el = $("#v-home"), c = A.child(), dates = A.rangeDates(), s = A.stats(dates), gn = A.growthNow(), td = today();
  const ins = A.insights(dates);
  const n = A.nutri(dates);
  const p = s.p==null?null:Math.round(s.p*100);
  const noLog = s.rows.filter(r=>!r.m.items).length;
  const chk = (done,t,sub) => `<li class="${done?"done":""}"><span class="ck">${icon(done?"check":"warn")}</span><span><b>${t}</b><br><span class="tiny">${sub}</span></span></li>`;
  el.innerHTML = `
  <div class="hello">
    <div><p class="sub">${thLong(td)}</p><h2>${esc(c.name)} วันนี้เป็นอย่างไรบ้าง</h2></div>
    <div class="chips"><button class="btn primary" data-log="${td}|${A.guessMeal()}">${icon("plus")}บันทึกมื้อ${A.MEAL[A.guessMeal()].short}</button><button class="btn" data-log="${td}||day">${icon("milk")}นม อาการ การนอน</button></div>
  </div>
  <div class="sec-h"><div><h2>สรุป ${A.rangeLabel()}</h2><p>${dates.length?`${thShort(dates[0])} – ${thShort(dates[dates.length-1])} · ${dates.length} วันที่มีข้อมูล`:"ยังไม่มีข้อมูลในช่วงนี้"}</p></div></div>
  <div class="g4">
    ${kpi(p==null?"":A.lev(s.p), "check", "กินอาหารได้", p==null?"–":`${p}<small>%</small>`, s.k?`${s.ok} จาก ${s.k} รายการ`:"ยังไม่มีรายการอาหาร")}
    ${kpi(n.estMeals.length?n.R.kcal.lev:"", "spark", "พลังงานเฉลี่ยต่อวัน", n.estMeals.length?`${Math.round(n.day.kcal)}<small> / ${n.req.kcal} kcal</small>`:"–", n.estMeals.length?(n.milkKnown?`${n.R.kcal.p}% ของความต้องการ`:`จากมื้อหลัก ${n.R.kcal.p}% · ยังไม่รวมนม`):"ยังไม่มีปริมาณที่กิน")}
    ${kpi(s.sitMed==null?"":s.sitMed>=15?"good":s.sitMed>=8?"warn":"bad", "clock", "นั่งกินต่อเนื่องนานสุด", s.sitMed==null?"–":`${Math.round(s.sitMed)}<small> นาที</small>`, s.sitN?`จาก ${s.sitN} มื้อ`:"ยังไม่มีข้อมูล")}
    ${kpi(s.milkAvg==null?"warn":"", "milk", "นมเฉลี่ยต่อวัน", s.milkAvg==null?"–":`${s.milkAvg}<small> มล.</small>`, s.milkAvg==null?"ยังไม่มีบันทึกปริมาณนม":`จาก ${s.milkDays.length} วัน · เป้าราว 2 กล่อง/วัน`)}
  </div>
  <div class="g-21">
    <div class="card">${A.cardHead(`${esc(c.name)}ได้สารอาหารพอไหม`, `เฉลี่ยต่อวัน เทียบความต้องการของเด็กอายุ ${A.ageText()} น้ำหนัก ${n.req.W} กก.`, `<a class="btn sm" href="#nutrition">ดูละเอียด</a>`)}
      ${n.estMeals.length?`${A.nLegend()}${A.adequacy(n)}<h4 style="margin:18px 0 0">อาหารหลัก 5 หมู่ต่อวัน${n.fiveDays?` <span class="tiny" style="font-weight:400">· ครบ 5 หมู่ ${n.fiveFull}/${n.fiveDays} วัน</span>`:""}</h4>${A.fiveTiles(n)}<p class="tiny" style="margin-top:10px">${n.milkKnown?"":"* ยังไม่รวมนม เพราะยังไม่มีบันทึกปริมาณนม · "}ขีดจาง = 80% (ส่วนที่ควรได้จากมื้อหลัก) · ขีดเข้ม = 100% ของทั้งวัน · ${esc(A.coverageText(n))}</p>`:A.empty("ยังคำนวณไม่ได้","ใส่ปริมาณที่กินในแต่ละมื้อ แล้วระบบจะแปลงเป็นพลังงานให้")}</div>
    <div class="card">${A.cardHead("ที่ยังขาดหรือควรเพิ่ม", "สรุปจากการคำนวณ ไม่ใช่การวินิจฉัย")}${A.gapsHTML(n.gaps, 4)}</div>
  </div>
  <div class="g-21">
    <div class="card">${A.cardHead("กินได้แค่ไหน ทีละมื้อ", "14 วันล่าสุด · ตัวเลข = รายการที่กินได้ / รายการที่รู้ผล · คอลัมน์ขวา = พลังงานทั้งวัน", `<a class="btn sm" href="#days">ดูทั้งหมด</a>`)}
      ${A.legend([["--good","70% ขึ้นไป",";opacity:.8"],["--warn","40–69%"],["--bad","ต่ำกว่า 40%"]])}
      ${heatmap(A.allDates())}</div>
    <div style="display:grid;gap:20px;align-content:start">
      <div class="card">${A.cardHead("การเจริญเติบโต", gn.last?`วัดล่าสุด ${thShort(gn.last.date)}${gn.ago>7?` · ผ่านมา ${gn.ago} วัน`:""}`:"ยังไม่มีข้อมูล", `<a class="btn sm" href="#growth">กราฟ</a>`)}
        <div class="growth-hero"><div class="ring ${gn.lev}">${gn.lev==="good"?"ตามเกณฑ์":gn.lev==="warn"?"เฝ้าดู":gn.lev==="bad"?"ปรึกษาหมอ":"–"}</div>
        <div><div class="gh-v num">${gn.lw?`${gn.lw.weight} กก.`:"–"}</div><div class="sub num">${gn.lh?`ส่วนสูง ${esc(gn.lh.heightText||gn.lh.height)} ซม.`:"ยังไม่มีส่วนสูง"}</div></div></div>
        <div class="zlist"><div class="zrow"><span class="sub">น้ำหนักตามอายุ</span>${A.zPill("wfa",gn.z1)}</div><div class="zrow"><span class="sub">ส่วนสูงตามอายุ</span>${A.zPill("lfa",gn.z2)}</div><div class="zrow"><span class="sub">น้ำหนักตามส่วนสูง</span>${A.zPill("wfl",gn.z3)}</div></div>
        ${gn.ago>7?`<button class="btn sm" style="margin-top:12px" data-log="${td}||body">${icon("plus")}ชั่งน้ำหนักวันนี้</button>`:""}
      </div>
      <div class="card">${A.cardHead("เตรียมก่อนพบคุณหมอ")}
        <ul class="checks">
          ${chk(s.milkDays.length>0, "ปริมาณนมแต่ละวัน", s.milkDays.length?`บันทึกแล้ว ${s.milkDays.length} วัน`:"ยังไม่มีบันทึก")}
          ${chk(gn.last&&gn.ago<=7, "น้ำหนักและส่วนสูงล่าสุด", gn.last?`ล่าสุด ${thShort(gn.last.date)}`:"ยังไม่มี")}
          ${chk(s.symDays.length>0, "อาการระหว่างหรือหลังมื้อ", s.symDays.length?`บันทึกแล้ว ${s.symDays.length} วัน`:"ไอ สำลัก อาเจียน ท้องผูก")}
          ${chk(noLog===0, "บันทึกมื้อที่ขาด", noLog?`ขาด ${noLog} มื้อในช่วงนี้`:"ครบ")}
        </ul>
        <a class="btn primary" style="margin-top:14px;width:100%;justify-content:center" href="#report">${icon("steth")}เปิดรายงานสำหรับแพทย์</a>
      </div>
    </div>
  </div>
  <div class="card">${A.cardHead("สิ่งที่ระบบสังเกตเห็น", "สรุปจากข้อมูลช่วงนี้ ไม่ใช่การวินิจฉัย", `<a class="btn sm" href="#nutrition">ดูการวิเคราะห์</a>`)}
    ${ins.length?`<div class="ins">${ins.map(i=>`<div class="ins-i ${i.lev}"><span class="ico">${icon(i.ic)}</span><div><b>${esc(i.t)}</b><span>${esc(i.d)}</span></div></div>`).join("")}</div>`:A.empty("ยังไม่มีข้อสังเกต","บันทึกเพิ่มอีกสักสองสามวันแล้วระบบจะเริ่มเห็นรูปแบบ")}
  </div>`;
}};
})();
