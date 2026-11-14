/* router, navigation, shell */
(function(){
"use strict";
const A = window.App, {$,$$,esc,icon,S} = A;
const NAV = [
  {h:"ติดตาม"},
  {v:"home", label:"ภาพรวม", ic:"home"},
  {v:"days", label:"บันทึกรายวัน", ic:"cal"},
  {h:"วิเคราะห์"},
  {v:"behavior", label:"พฤติกรรมการกิน", ic:"spark"},
  {v:"nutrition", label:"โภชนาการ", ic:"bowl"},
  {v:"growth", label:"การเติบโต", ic:"growth"},
  {h:"แบ่งปัน"},
  {v:"report", label:"รายงานสำหรับแพทย์", ic:"steth"},
  {h:"อื่นๆ"},
  {v:"routine", label:"ตารางกิจวัตร", ic:"clock"},
  {v:"setup", label:"ตั้งค่า", ic:"gear"},
];
const BNAV = [{v:"home",label:"ภาพรวม",ic:"home"},{v:"days",label:"รายวัน",ic:"cal"},{fab:1},{v:"behavior",label:"วิเคราะห์",ic:"chart",match:"insights"},{v:"report",label:"รายงาน",ic:"steth"}];
const TITLES = {home:["ภาพรวม","หน้าหลัก"], days:["บันทึกรายวัน","ติดตาม"], insights:["วิเคราะห์","ข้อมูลเชิงลึก"], report:["รายงานสำหรับแพทย์","แบ่งปัน"], routine:["ตารางกิจวัตร","อื่นๆ"], settings:["ตั้งค่า","อื่นๆ"]};
const RANGED = ["home","insights","report"];

function parse(){
  const h=(location.hash||"").replace(/^#\/?/,"");
  if(/^days(-\d{4}-\d{2}-\d{2})?$/.test(h)) return {v:"days", a:h.slice(5)||null, raw:"days"};
  if(["behavior","nutrition","growth"].includes(h)) return {v:"insights", a:h, raw:h};
  if(h==="report"||h==="routine") return {v:h, a:null, raw:h};
  if(h==="setup") return {v:"settings", a:null, raw:"setup"};
  return {v:"home", a:null, raw:"home"};
}
A.go = p => { if(location.hash==="#"+p) render(); else location.hash = "#"+p; };
A.current = () => parse();

function navHtml(){
  const cur = parse();
  $("#nav").innerHTML = NAV.map(n=> n.h ? `<div class="nav-h">${n.h}</div>` : `<a href="#${n.v}" ${cur.raw===n.v?'aria-current="page"':""}>${icon(n.ic)}${n.label}</a>`).join("");
  $("#bnav").innerHTML = BNAV.map(n=> n.fab ? `<a href="#" data-quick aria-haspopup="dialog" aria-label="เพิ่มบันทึก"><span class="fab">${icon("plus")}</span></a>` : (on=>`<a href="#${n.v}" ${on?'aria-current="page"':""}>${icon(on?n.ic+"_s":n.ic)}${n.label}</a>`)(cur.v===(n.match||n.v))).join("");
}
function kidHtml(){
  const c=A.child(), ph=S.profile.photoUrl||S.profile.photoData;
  $("#kid").innerHTML = `<span class="ava">${ph?`<img src="${esc(ph)}" alt="">`:esc(c.name.slice(0,1))}</span><span><b>${esc(c.name)}</b><span>${c.sex} · ${A.ageText()}</span></span>`;
}
function topRight(v){
  const r = $("#top-r");
  const range = RANGED.includes(v) && v!=="home" ? A.seg("range", [["7","7 วัน"],["14","14 วัน"],["30","30 วัน"],["all","ทั้งหมด"]], S.range, "range-seg") : "";
  const theme = `<button class="icbtn" id="theme-btn" aria-label="สลับโหมดสว่าง/มืด" data-tip="สลับโหมดสว่าง/มืด">${icon(S.theme==="dark"?"sun":"moon")}</button>`;
  r.innerHTML = range + theme;
}
function render(){
  const {v,a} = parse();
  $$(".view").forEach(x=>x.classList.toggle("on", x.id==="v-"+v));
  const t = TITLES[v]; $("#title").textContent = v==="insights" ? ({behavior:"พฤติกรรมการกิน",nutrition:"โภชนาการ",growth:"การเติบโต"})[a||"behavior"] : t[0]; $("#crumb").textContent = t[1];
  document.title = `${$("#title").textContent} · อิ่มดี`;
  navHtml(); kidHtml(); topRight(v);
  try{ A.views[v].render(a); }catch(e){ console.error(e); $("#v-"+v).innerHTML = A.empty("แสดงหน้านี้ไม่ได้", String(e.message||e)); }
  closeSide();
}
A.render = render;
function closeSide(){ $("#side").classList.remove("open"); $("#scrim").classList.remove("on"); }
window.addEventListener("hashchange", ()=>{ render(); window.scrollTo({top:0}); });
$("#menu-btn").onclick = ()=>{ $("#side").classList.add("open"); $("#scrim").classList.add("on"); };
$("#scrim").onclick = closeSide;
$("#kid").onclick = ()=>A.go("setup");
/* ปุ่ม + กลางแถบล่าง: bottom sheet เลือกประเภทบันทึก แล้วเปิดฟอร์มที่แท็บนั้น */
const QUICK = [
  {ic:"bowl", t:"มื้ออาหาร", s:"เมนู ปริมาณที่กิน", tab:""},
  {ic:"milk", t:"นม", s:"มล. หรือจำนวนกล่อง", tab:"milk"},
  {ic:"snack", t:"ของว่าง", s:"ขนม ผลไม้ นอกมื้อ", tab:"snack"},
  {ic:"moon", t:"นอน", s:"ช่วงเวลาที่หลับ", tab:"sleep"},
  {ic:"thermo", t:"อาการ", s:"ไข้ ไอ ถ่าย อารมณ์", tab:"health"},
  {ic:"scale", t:"น้ำหนัก / ส่วนสูง", s:"วัดล่าสุด", tab:"body"},
];
function closeQuick(){ const q=$("#qsheet"); if(q) q.remove(); }
function openQuick(date){
  closeQuick(); const dt = date || "";
  const q=document.createElement("div"); q.id="qsheet"; q.className="qsheet"; q.setAttribute("role","dialog"); q.setAttribute("aria-modal","true"); q.setAttribute("aria-label","เพิ่มบันทึก");
  q.innerHTML=`<div class="qs-bg" data-qs-close></div><div class="qs-panel"><div class="qs-grip"></div><h3>บันทึกอะไรดี</h3><div class="qs-list">${QUICK.map(x=>`<button type="button" class="qs-item" data-log="${dt}||${x.tab}"><span class="qs-ic">${icon(x.ic)}</span><span class="qs-tx"><b>${x.t}</b><small>${x.s}</small></span>${icon("chevR","qs-go")}</button>`).join("")}</div></div>`;
  document.body.appendChild(q); const f=q.querySelector(".qs-item"); if(f) f.focus();
}
document.addEventListener("click", e=>{
  if(e.target.closest("[data-quick]")){ e.preventDefault(); openQuick(); return; }
  if(e.target.closest("[data-qs-close]")){ closeQuick(); return; }
  const lg = e.target.closest("[data-log]"); if(lg){ e.preventDefault(); closeQuick(); const [d,k,tab]=(lg.dataset.log||"").split("|"); if(tab==="day"){ openQuick(d); return; } /* บันทึกรายวันรวม → ให้เลือกประเภทก่อน */ A.openLog({date:d||undefined, meal:k||undefined, tab:tab||undefined}); return; }
  const hr = e.target.closest("[data-href]"); if(hr && !hr.disabled){ e.preventDefault(); location.hash = hr.dataset.href; return; }
  const sg = e.target.closest('[data-seg="range"] button'); if(sg){ S.range = sg.dataset.v; A.LS.set("range", S.range); render(); return; }
  if(e.target.closest("#theme-btn")){ S.theme = S.theme==="dark"?"light":"dark"; document.documentElement.dataset.theme=S.theme; A.LS.set("theme", S.theme); topRight(parse().v); return; }
  const z = e.target.closest("img[data-zoom]"); if(z){ const lb=$("#lightbox"); lb.querySelector("img").src=z.src; lb.classList.add("on"); return; }
  if(e.target.closest("#lightbox")) $("#lightbox").classList.remove("on");
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ closeQuick(); $("#lightbox").classList.remove("on"); closeSide(); if(A.closeLog) A.closeLog(); } });
const editing = () => { const a=document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && $("#content").contains(a); };
A.on(()=>{ if(editing()){ A._pending=true; kidHtml(); return; } render(); });
document.addEventListener("focusout", ()=>setTimeout(()=>{ if(A._pending && !editing()){ A._pending=false; render(); } },0));
document.documentElement.dataset.theme = S.theme;
render();
A.connect();
setInterval(()=>{ if(parse().v==="routine" && A.views.routine.tick) A.views.routine.tick(); }, 30000);
})();
