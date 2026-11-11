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
  $("#bnav").innerHTML = BNAV.map(n=> n.fab ? `<a href="#" data-log="" aria-label="บันทึกการกิน"><span class="fab">${icon("plus")}</span></a>` : `<a href="#${n.v}" ${(cur.v===(n.match||n.v))?'aria-current="page"':""}>${icon(n.ic)}${n.label}</a>`).join("");
}
function kidHtml(){
  const c=A.child(), ph=S.profile.photoUrl||S.profile.photoData;
  $("#kid").innerHTML = `<span class="ava">${ph?`<img src="${esc(ph)}" alt="">`:esc(c.name.slice(0,1))}</span><span><b>${esc(c.name)}</b><span>${c.sex} · ${A.ageText()}</span></span>`;
}
function topRight(v){
  const r = $("#top-r");
  const range = RANGED.includes(v) ? A.seg("range", [["7","7 วัน"],["14","14 วัน"],["30","30 วัน"],["all","ทั้งหมด"]], S.range, "range-seg") : "";
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
document.addEventListener("click", e=>{
  const lg = e.target.closest("[data-log]"); if(lg){ e.preventDefault(); const [d,k,tab]=(lg.dataset.log||"").split("|"); A.openLog({date:d||undefined, meal:k||undefined, tab:tab||undefined}); return; }
  const hr = e.target.closest("[data-href]"); if(hr && !hr.disabled){ e.preventDefault(); location.hash = hr.dataset.href; return; }
  const sg = e.target.closest('[data-seg="range"] button'); if(sg){ S.range = sg.dataset.v; A.LS.set("range", S.range); render(); return; }
  if(e.target.closest("#theme-btn")){ S.theme = S.theme==="dark"?"light":"dark"; document.documentElement.dataset.theme=S.theme; A.LS.set("theme", S.theme); topRight(parse().v); return; }
  const z = e.target.closest("img[data-zoom]"); if(z){ const lb=$("#lightbox"); lb.querySelector("img").src=z.src; lb.classList.add("on"); return; }
  if(e.target.closest("#lightbox")) $("#lightbox").classList.remove("on");
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ $("#lightbox").classList.remove("on"); closeSide(); if(A.closeLog) A.closeLog(); } });
const editing = () => { const a=document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && $("#content").contains(a); };
A.on(()=>{ if(editing()){ A._pending=true; kidHtml(); return; } render(); });
document.addEventListener("focusout", ()=>setTimeout(()=>{ if(A._pending && !editing()){ A._pending=false; render(); } },0));
document.documentElement.dataset.theme = S.theme;
render();
A.connect();
setInterval(()=>{ if(parse().v==="routine" && A.views.routine.tick) A.views.routine.tick(); }, 30000);
})();
