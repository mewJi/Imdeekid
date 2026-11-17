/* ตัวเลือกช่วงเวลาที่ใช้ร่วมกันหลายหน้า (ภาพรวม / วิเคราะห์): วัน · สัปดาห์ (จันทร์–อาทิตย์) · เดือน · ปี
   เลือกจากปฏิทินได้ และจำค่าที่เลือกไว้ร่วมกันทุกหน้า
   ใช้: const cur = A.periodCur();  แล้วใส่ A.periodBarHTML(cur) ลงในหน้า  จากนั้นเรียก A.periodBind(el, cur) หลังวาด HTML */
(function(){
"use strict";
const A = window.App, {$,$$,icon,thShort,thLong,parseD,today} = A;

const P = A.period = { mode: A.LS.get("hpmode") || "week", anchor: null }; /* anchor = null → วันนี้ */

/* โหมดสัปดาห์: ปุ่มแสดงช่วงสัปดาห์ที่เลือก กดแล้วเปิดปฏิทิน แตะวันไหนก็เลือกทั้งสัปดาห์ของวันนั้น */
function weekSelect(anchor, td){
  const pr = A.periodRange("week", anchor), end = pr.to;
  return `<button type="button" class="inp wkbtn" data-pb="week" aria-haspopup="dialog" aria-expanded="false">${icon("cal")}<span>${thShort(pr.from)} – ${thShort(end)} ${parseD(end).getFullYear()+543}${pr.from===A.periodRange("week", td).from?" · สัปดาห์นี้":""}</span></button>`;
}
const WK_H = ["จ","อ","พ","พฤ","ศ","ส","อา"];
function weekCalHTML(month, anchor, td){ /* month = วันที่ 1 ของเดือนที่แสดง (YYYY-MM-01) */
  const monOf = d => A.addDays(d, -((parseD(d).getDay()+6)%7));
  const first = parseD(month), y=first.getFullYear(), mo=first.getMonth(), last = A.isoD(new Date(y,mo+1,0));
  const sel = A.periodRange("week", anchor), curMonth = td.slice(0,7)+"-01";
  let cells = ""; for(let d=monOf(month); d<=last; d=A.addDays(d,1)){
    const dd=parseD(d), other = dd.getMonth()!==mo, future = d>td, inSel = d>=sel.from && d<=sel.to;
    cells += `<button type="button" class="wc-d${other?" o":""}${d===td?" t":""}${inSel?" sel":""}" data-d="${d}"${future?" disabled":""} aria-label="${thLong(d)}"${inSel?' aria-current="true"':""}>${dd.getDate()}${A.hasDay(d)?"<i></i>":""}</button>`; }
  return `<div class="wc-h"><button type="button" class="icbtn" data-wc="prev" aria-label="เดือนก่อนหน้า">${icon("chevL")}</button><b>${A.TH_MF[mo]} ${y+543}</b><button type="button" class="icbtn" data-wc="next" aria-label="เดือนถัดไป"${month>=curMonth?" disabled":""}>${icon("chevR")}</button></div>
    <div class="wc-w">${WK_H.map(h=>`<span>${h}</span>`).join("")}</div><div class="wc-g">${cells}</div>
    <div class="wc-f"><span class="tiny">แตะวันที่เพื่อเลือกทั้งสัปดาห์ · จุด = มีข้อมูล</span><button type="button" class="btn sm" data-wc="now">สัปดาห์นี้</button></div>`;
}

/* ช่วงที่เลือกอยู่ตอนนี้ */
A.periodCur = () => {
  const td = today(); if(P.anchor && P.anchor>td) P.anchor = null;
  const anchor = P.anchor || td, pr = A.periodRange(P.mode, anchor);
  return {td, anchor, pr, mode:P.mode, dates:A.periodDates(pr), canNext: pr.to < td};
};

A.periodBarHTML = cur => `<div class="period-bar no-print">
    ${A.seg("hp-mode", [["day","วัน"],["week","สัปดาห์"],["month","เดือน"],["year","ปี"]], cur.mode, "range-seg")}
    <div class="period-nav"><button type="button" class="icbtn" data-pb="prev" aria-label="ช่วงก่อนหน้า">${icon("chevL")}</button>${cur.mode==="week" ? weekSelect(cur.anchor, cur.td) : `<input type="date" class="inp" data-pb="date" value="${cur.anchor}" max="${cur.td}" aria-label="เลือกวันที่">`}<button type="button" class="icbtn" data-pb="next" aria-label="ช่วงถัดไป"${cur.canNext?"":" disabled"}>${icon("chevR")}</button><button type="button" class="btn sm" data-pb="today"${cur.anchor===cur.td?" disabled":""}>วันนี้</button></div>
  </div>`;

/* ผูกการทำงานของแถบเลือกช่วงเวลาภายใน el (เปลี่ยนแล้ววาดหน้าใหม่) */
A.periodBind = (el, cur) => {
  const {td, anchor} = cur, pb = k => $(`[data-pb="${k}"]`, el);
  $$('[data-seg="hp-mode"] button', el).forEach(b=>b.onclick=()=>{ P.mode=b.dataset.v; A.LS.set("hpmode", P.mode); A.render(); });
  const go = a => { const sameWeekAsToday = P.mode==="week" && a && A.periodRange("week", a).from === A.periodRange("week", td).from; P.anchor = (!a || a>=td || sameWeekAsToday) ? null : a; A.render(); };
  pb("prev").onclick = ()=>go(A.stepAnchor(P.mode, anchor, -1));
  pb("next").onclick = ()=>go(A.stepAnchor(P.mode, anchor, 1));
  pb("today").onclick = ()=>go(null);
  const di = pb("date"); if(di) di.onchange = e=>{ if(e.target.value) go(e.target.value); };
  const wb = pb("week");
  if(wb){ let pop = null, month = anchor.slice(0,7)+"-01";
    const close = ()=>{ if(pop){ pop.remove(); pop=null; wb.setAttribute("aria-expanded","false"); document.removeEventListener("click", away, true); document.removeEventListener("keydown", esc2, true); } };
    const away = e=>{ if(pop && !pop.contains(e.target) && !wb.contains(e.target)) close(); };
    const esc2 = e=>{ if(e.key==="Escape"){ e.stopPropagation(); close(); wb.focus(); } };
    const draw = ()=>{ pop.innerHTML = weekCalHTML(month, anchor, td); };
    wb.onclick = ()=>{ if(pop){ close(); return; } pop=document.createElement("div"); pop.className="wk-cal"; pop.setAttribute("role","dialog"); pop.setAttribute("aria-label","เลือกสัปดาห์"); wb.parentElement.appendChild(pop); wb.setAttribute("aria-expanded","true"); draw();
      document.addEventListener("click", away, true); document.addEventListener("keydown", esc2, true);
      pop.addEventListener("click", e=>{ const t=e.target.closest("[data-wc]"), dd=e.target.closest(".wc-d");
        if(t){ const k=t.dataset.wc;
          if(k==="prev"){ month=A.isoD(new Date(parseD(month).getFullYear(), parseD(month).getMonth()-1, 1)); draw(); return; }
          if(k==="next"){ month=A.isoD(new Date(parseD(month).getFullYear(), parseD(month).getMonth()+1, 1)); draw(); return; }
          if(k==="now"){ close(); go(null); return; } }
        if(dd && !dd.disabled){ close(); go(dd.dataset.d); } }); };
  }
};
})();
