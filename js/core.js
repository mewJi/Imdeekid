/* ImDee core: utilities, constants, store, domain logic, chart + UI primitives */
(function(){
"use strict";
const App = window.App = {views:{}};
const DEMO = window.TAWAN || {meals:{}, days:{}, growth:[], ref:{}, child:{}};

/* ---------------- utils ---------------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TH_M = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const TH_MF = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const TH_D = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const TH_DS = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const toMin = t => { if(!t) return null; const [h,m] = String(t).split(":").map(Number); return h*60+m; };
const hhmm = m => { m = ((Math.round(m)%1440)+1440)%1440; return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); };
const parseD = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const isoD = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today = () => isoD(new Date());
const addDays = (iso,n) => { const d=parseD(iso); d.setDate(d.getDate()+n); return isoD(d); };
const thShort = s => { const d = parseD(s); return d.getDate()+" "+TH_M[d.getMonth()]; };
const thLong = s => { const d = parseD(s); return "วัน"+TH_D[d.getDay()]+"ที่ "+d.getDate()+" "+TH_MF[d.getMonth()]+" "+(d.getFullYear()+543); };
const thDayShort = s => { const d = parseD(s); return TH_DS[d.getDay()]+". "+d.getDate()+" "+TH_M[d.getMonth()]+" "+(d.getFullYear()+543); }; // อา. 8 พ.ย. 2569
const thDate = s => { const d = parseD(s); return d.getDate()+" "+TH_M[d.getMonth()]+" "+(d.getFullYear()+543); };
const nowHM = () => hhmm(new Date().getHours()*60+new Date().getMinutes());
const guessMeal = () => { const h=new Date().getHours(); return h<11?"bk":h<16?"ln":"dn"; };
const median = a => { if(!a.length) return null; const s=[...a].sort((x,y)=>x-y), m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };
const pct = (a,b) => b? Math.round(a/b*100) : null;
const round = (v,d=1) => Math.round(v*10**d)/10**d;
const uid = () => Math.random().toString(36).slice(2,9);
Object.assign(App, {$,$$,esc,TH_M,TH_MF,TH_D,TH_DS,toMin,hhmm,parseD,isoD,today,addDays,thShort,thLong,thDayShort,thDate,nowHM,guessMeal,median,pct,round,uid});

/* ---------------- icons ---------------- */
const P = {
  home:'<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  cal:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  /* ไอคอนแบบทึบ (solid) สำหรับเมนูที่เลือกอยู่ในแถบล่าง */
  home_s:'<path fill="currentColor" stroke="currentColor" stroke-width="1.6" d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  cal_s:'<path d="M8 3v3M16 3v3" stroke-width="2.2"/><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M5.5 5h13A2.5 2.5 0 0 1 21 7.5v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10A2.5 2.5 0 0 1 5.5 5zM4.5 9.3h15v1.4h-15z"/>',
  chart_s:'<g fill="currentColor" stroke="none"><rect x="3.5" y="10" width="4.5" height="10" rx="1.4"/><rect x="9.75" y="4" width="4.5" height="16" rx="1.4"/><rect x="16" y="13" width="4.5" height="7" rx="1.4"/></g>',
  steth_s:'<path d="M6 3v5a4 4 0 0 0 8 0V3" stroke-width="2.8"/><path d="M10 12v3a5 5 0 0 0 10 0v-2" stroke-width="2.8"/><circle cx="20" cy="11" r="2.6" fill="currentColor" stroke="none"/>',
  snack:'<circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 10h.01M10 15h.01M14.5 15.5h.01M12 12.5h.01"/>',
  thermo:'<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  scale:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0M12 13.5l2-2.8"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  doc:'<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  growth:'<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  bowl:'<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"/>',
  milk:'<path d="M9 3h6v3l2 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l2-3z"/><path d="M7 13h10"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  warn:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.1"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>',
  no:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  chevL:'<path d="M15 6l-6 6 6 6"/>', chevR:'<path d="M9 6l6 6-6 6"/>', chevD:'<path d="M6 9l6 6 6-6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  print:'<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 15A8 8 0 1 1 9 4a6.5 6.5 0 0 0 11 11z"/>',
  sunrise:'<path d="M7 17a5 5 0 0 1 10 0M12 9V4M9 7l3-3 3 3M3 17h2M19 17h2M5.6 11.6l1.4 1.4M18.4 11.6L17 13M3 21h18"/>',
  sunset:'<path d="M7 17a5 5 0 0 1 10 0M12 4v5M9 6l3 3 3-3M3 17h2M19 17h2M5.6 11.6l1.4 1.4M18.4 11.6L17 13M3 21h18"/>',  bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  steth:'<path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
  spark:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
};
const icon = (n, cls="") => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||""}</svg>`;
App.icon = icon;

/* ---------------- constants ---------------- */
const MEALS = [
  {k:"bk", name:"มื้อเช้า", short:"เช้า", schedId:"breakfast", share:.2, win:[7*60+45, 10*60], v:"--m-bk"},
  {k:"ln", name:"มื้อกลางวัน", short:"กลางวัน", schedId:"lunch", share:.3, win:[12*60+15, 15*60], v:"--m-ln"},
  {k:"dn", name:"มื้อเย็น", short:"เย็น", schedId:"dinner", share:.3, win:[17*60+15, 20*60], v:"--m-dn"},
];
const MEAL = Object.fromEntries(MEALS.map(m=>[m.k,m]));
const GROUPS = [
  {k:"protein", name:"โปรตีน", long:"หมู่ 1 เนื้อสัตว์ ไข่ นม ถั่ว", unit:"ช้อนกินข้าว", daily:3, v:"--g-protein"},
  {k:"carb", name:"ข้าว-แป้ง", long:"หมู่ 2 ข้าว แป้ง เผือก มัน", unit:"ทัพพี", daily:3, v:"--g-carb"},
  {k:"veg", name:"ผัก", long:"หมู่ 3 ผัก", unit:"ทัพพี", daily:1.5, v:"--g-veg"},
  {k:"fruit", name:"ผลไม้", long:"หมู่ 4 ผลไม้", unit:"ส่วน", daily:3, v:"--g-fruit"},
  {k:"fat", name:"ไขมัน", long:"หมู่ 5 ไขมัน", unit:null, daily:null, v:"--g-fat"},
];
const STATES = { S:{label:"นั่งที่โต๊ะ", v:"--s-seat"}, A:{label:"ยืน/เดินวนรอบโต๊ะ", v:"--s-around"}, E:{label:"ไปเล่นที่อื่น", v:"--s-away"}, "?":{label:"ไม่เห็นในภาพ", v:"--s-unk"} };
const ST = {
  ate:{lab:"กินหมด/ได้", short:"หมด", cls:"good", v:"--good"},
  part:{lab:"กินบางส่วน", short:"บางส่วน", cls:"warn", v:"--part"},
  none:{lab:"ไม่กิน", short:"ไม่กิน", cls:"bad", v:"--bad"},
  spit:{lab:"เคี้ยวแล้วคาย", short:"คาย", cls:"spit", v:"--spit"},
  unk:{lab:"ไม่ทราบ", short:"ไม่ทราบ", cls:"neutral", v:"--unk"},
};
const CATS = ["ข้าว-แป้ง","ไข่","เนื้อสัตว์-ปลา","ผัก","ผลไม้","นม-โยเกิร์ต","ขนม-เบเกอรี่","น้ำมัน-ไขมัน","ซุป-เมนูรวม","เครื่องดื่ม-น้ำปั่น"];
const UNITS = ["คำ","ช้อน","ทัพพี","ชิ้น","ฟอง","ลูก","ส่วน","ห่อ","ถ้วย","กำมือ","แผ่น","มล.","ช้อนชา","กรัม"];
const FEED = [["self","กินเองทั้งหมด"],["mostself","กินเองเป็นหลัก"],["mixed","กินเองและป้อนพอๆ กัน"],["mostfed","ป้อนเป็นหลัก"],["fed","ป้อนทั้งหมด"]];
const BEHAV = ["นั่งกินจนจบ","ขอกินเอง","ขอเพิ่ม","ลุกจากเก้าอี้","เดินวนรอบโต๊ะ","ไปเล่นที่อื่น","ต้องเดินตามป้อน","ปัด/ผลักอาหาร","อมข้าวไม่เคี้ยว","คายอาหาร","ร้องไห้/งอแง","ต่อรองให้กิน"];
const MOOD = ["หิว","ปกติ","ไม่ค่อยหิว","ง่วง/เพิ่งตื่น","ไม่สบาย"];
const SYM = ["ไอหรือสำลักระหว่างกิน","อาเจียน","ปวดท้อง/งอแงหลังกิน","ท้องผูก","ท้องเสีย","ผื่นหรือสงสัยแพ้อาหาร","ไข้/ไม่สบาย","ไม่มีอาการ"];
const STOOL = ["ถ่ายปกติ","ถ่ายแข็ง","ถ่ายเหลว","ไม่ถ่ายวันนี้"];
const PLACES = ["บ้าน","บ้านญาติ","ร้านอาหาร","นอกบ้านอื่นๆ"];
const DEFAULT_MEMBERS = ["แม่","พ่อ"];
const DEFAULT_SCHED = [
  {id:"wake", start:"07:00", end:"08:00", label:"ตื่น ล้างหน้าแปรงฟัน ปั่นจักรยาน เดินเล่น", focus:true},
  {id:"breakfast", start:"08:00", end:"09:00", label:"กินมื้อเช้า", focus:true},
  {id:"playbath", start:"09:00", end:"10:00", label:"เล่น และอาบน้ำ", focus:false},
  {id:"milk_am", start:"10:00", end:"10:30", label:"กินนมเช้า", focus:true},
  {id:"nap", start:"10:30", end:"12:30", label:"นอนกลางวัน", focus:true},
  {id:"lunch", start:"12:30", end:"13:30", label:"ข้าวกลางวัน", focus:true},
  {id:"play_pm", start:"13:30", end:"15:00", label:"เล่น", focus:false},
  {id:"milk_pm", start:"15:00", end:"15:30", label:"กินนมบ่าย", focus:false},
  {id:"walk", start:"15:30", end:"17:30", label:"เดินเล่นนอกบ้าน", focus:false},
  {id:"dinner", start:"17:30", end:"18:30", label:"ข้าวเย็น", focus:true},
  {id:"bath", start:"18:45", end:"19:00", label:"อาบน้ำ", focus:true},
  {id:"family", start:"19:00", end:"19:45", label:"เล่นกับครอบครัว", focus:true},
  {id:"milk_eve", start:"19:45", end:"20:15", label:"กินนมเย็น", focus:false},
  {id:"bedroom", start:"20:15", end:"20:30", label:"เข้าห้องนอน และอ่านหนังสือ", focus:true},
  {id:"sleep", start:"20:30", end:"07:00", label:"หลับ", focus:true},
];
const PERIODS = [
  {k:"morning", name:"เช้า", from:360, to:720, v:"--p-morning"},
  {k:"noon", name:"กลางวัน", from:720, to:1020, v:"--p-noon"},
  {k:"evening", name:"เย็น", from:1020, to:1200, v:"--p-evening"},
  {k:"night", name:"กลางคืน", from:1200, to:1800, v:"--p-night"},
];
const periodOf = m => { const x = m < 360 ? m+1440 : m; return PERIODS.find(p => x >= p.from && x < p.to) || PERIODS[3]; };
Object.assign(App, {MEALS,MEAL,GROUPS,STATES,ST,CATS,UNITS,FEED,BEHAV,MOOD,SYM,STOOL,PLACES,DEFAULT_MEMBERS,DEFAULT_SCHED,PERIODS,periodOf});

/* ---------------- store ---------------- */
const LS = {
  get(k){ try{ return JSON.parse(localStorage.getItem("imdee:"+k)); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem("imdee:"+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem("imdee:"+k); }catch(e){} },
};
const S = App.S = {
  entries:{}, daylogs:{}, growthExtra:{}, logs:{}, profile:{},
  settings:{ child:null, members:null, demo:true },
  schedule: DEFAULT_SCHED.map(x=>({...x})), schedRemote:null,
  db:null, assets:null, canWrite:true, mode:"local", uid:null, sync:"กำลังเชื่อมต่อ…",
  range: LS.get("range") || "14",
  theme: LS.get("theme") || "dark",
};
App.LS = LS;
const subs = [];
App.on = fn => subs.push(fn);
let emitT = null;
App.emit = (why) => { clearTimeout(emitT); emitT = setTimeout(()=>subs.forEach(f=>{ try{ f(why); }catch(e){ console.error(e); } }), 16); };
App.setSync = t => { S.sync = t; const el=$("#sync"); if(el){ el.textContent = t; el.dataset.state = /ไม่สำเร็จ|ไม่ได้/.test(t)?"err":/เชื่อมต่อแล้ว|บันทึกแล้ว/.test(t)?"ok":"idle"; } };
App.save = async (path, data) => {
  if(S.db){
    try{ await S.db.doc(path).set(data); App.setSync("บันทึกแล้ว · แชร์กับทุกคนในบ้าน"); return true; }
    catch(e){ if(e && e.code==="invalid_argument"){ S.canWrite=false; App.setSync("บัญชีนี้ดูได้อย่างเดียว"); } else App.setSync("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"); return false; }
  }
  LS.set(path, data); App.setSync("บันทึกในเครื่องนี้แล้ว"); return true;
};
App.remove = async (path) => {
  if(S.db){ try{ await S.db.doc(path).delete(); return true; }catch(e){ App.setSync("ลบไม่สำเร็จ"); return false; } }
  LS.del(path); return true;
};
function loadLocal(){
  try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(!k.startsWith("imdee:")) continue; const p=k.slice(6), v=JSON.parse(localStorage.getItem(k));
    if(p.startsWith("mealentries/")) S.entries[p.slice(12)]=v;
    else if(p.startsWith("daylogs/")) S.daylogs[p.slice(8)]=v;
    else if(p.startsWith("growth/")) S.growthExtra[p.slice(7)]=v;
    else if(p.startsWith("lifelogs/")) S.logs[p.slice(9)]=v;
    else if(p==="app/schedule" && v && v.items) { S.schedRemote=v; S.schedule=v.items; }
    else if(p==="app/profile") S.profile=v||{};
    else if(p==="app/settings") Object.assign(S.settings, v||{});
  } }catch(e){}
}
/* รูปภาพเมื่อไม่มี claude.use("assets"): เก็บ blob ใน IndexedDB ของเบราว์เซอร์นี้ (อยู่ในเครื่องเดียว ไม่แชร์) */
const LA = App.localAssets = (() => {
  const urls = {}; let dbp = null;
  const open = () => dbp || (dbp = new Promise((res,rej)=>{ if(!window.indexedDB) return rej(new Error("no idb")); const r=indexedDB.open("imdee",1); r.onupgradeneeded=()=>r.result.createObjectStore("blobs"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }));
  const run = async (mode, fn) => { const d=await open(); return new Promise((res,rej)=>{ const t=d.transaction("blobs",mode); const q=fn(t.objectStore("blobs")); t.oncomplete=()=>res(q&&q.result); t.onerror=t.onabort=()=>rej(t.error); }); };
  return {
    local:true, urls,
    async upload(blob){ const id="l"+Date.now().toString(36)+Math.random().toString(36).slice(2,8); await run("readwrite", s=>s.put(blob,id)); urls[id]=URL.createObjectURL(blob); return {id, url:urls[id]}; },
    async load(){ try{ const d=await open(); await new Promise(res=>{ const q=d.transaction("blobs").objectStore("blobs").openCursor(); q.onsuccess=()=>{ const c=q.result; if(c){ urls[c.key]=URL.createObjectURL(c.value); c.continue(); } else res(); }; q.onerror=()=>res(); }); }catch(e){} },
  };
})();
App.photoUrl = p => (p && p.id && LA.urls[p.id]) || (p && p.url) || ("/_blob/"+(p&&p.id));
App.connect = async () => {
  let db=null, user=null, assets=null;
  try{ if(window.claude && claude.use){ [db,user,assets] = await Promise.all([claude.use("db"),claude.use("user"),claude.use("assets")]); } }catch(e){}
  if(!assets){ await LA.load(); assets = LA; }
  S.assets = assets;
  if(!db){ S.mode="local"; loadLocal(); App.setSync("โหมดออฟไลน์ · บันทึกในเครื่องนี้"); App.emit("all"); return; }
  S.db=db; S.mode="db"; App.setSync("เชื่อมต่อแล้ว · แชร์กับทุกคนในบ้าน");
  try{ if(user && user.can){ const c = await user.can("data.write"); if(c===false){ S.canWrite=false; App.setSync("ดูได้อย่างเดียว"); } } }catch(e){}
  try{ if(user && user.id) S.uid = await user.id(); }catch(e){}
  const timer=setTimeout(()=>App.setSync("ยังเชื่อมต่อข้อมูลไม่ได้ อาจไม่ใช่ข้อมูลล่าสุด"),10000);
  const done=()=>clearTimeout(timer);
  const coll = (name, key) => db.collection(name).onSnapshot(q=>{ done(); const o={}; q.docs.forEach(d=>o[d.id]=d.data()); S[key]=o; App.emit(key); }, ()=>done());
  coll("mealentries","entries"); coll("daylogs","daylogs"); coll("growth","growthExtra"); coll("lifelogs","logs");
  db.doc("app/schedule").onSnapshot(s=>{ done(); if(s.exists){ const v=s.data(); S.schedRemote=v; if(!S.editSched && v.items&&v.items.length) S.schedule=v.items.map(x=>({...x})); } App.emit("schedule"); }, ()=>done());
  db.doc("app/profile").onSnapshot(s=>{ S.profile = s.exists? s.data() : {}; App.emit("profile"); }, ()=>{});
  db.doc("app/settings").onSnapshot(s=>{ if(s.exists) Object.assign(S.settings, s.data()); App.emit("settings"); }, ()=>{});
};

/* ---------------- child + base data ---------------- */
App.child = () => {
  const c = S.settings.child || {};
  return { name: c.name || (S.settings.demo ? (DEMO.child.name||"ลูก") : "ลูก"), sex: c.sex || DEMO.child.sex || "ชาย", birth: c.birth || DEMO.child.birth || "2024-12-18" };
};
/* หน่วยที่เลือกได้ของแต่ละหมวดอาหาร (ตามตารางหน่วยครัวเรือน) — [ค่าที่เก็บ, ชื่อที่แสดง]
   ค่าที่เก็บตรงกับตาราง CONV ใน nutri.js (เช่น "ช้อน" แสดงเป็น "ช้อนกินข้าว", "ถ้วย" แสดงเป็น "ถ้วยตวง")
   หน่วยใหม่ที่ยังไม่มีตัวคูณแปลง (ก้อน ฝ่ามือ ขวด หยด เม็ด ซอง ฯลฯ) บันทึกได้ แต่ระบบจะยังไม่คำนวณหมู่อาหารให้ */
const UU = (v,l) => [v, l||v];
App.UNITS_BY_CAT = {
  "ข้าว-แป้ง":[UU("ทัพพี"),UU("แผ่น"),UU("ก้อน"),UU("คำ"),UU("กรัม")],
  "ไข่":[UU("ฟอง"),UU("ช้อน","ช้อนกินข้าว"),UU("ชิ้น"),UU("ฝ่ามือ"),UU("คำ"),UU("กรัม")],
  "เนื้อสัตว์-ปลา":[UU("ช้อน","ช้อนกินข้าว"),UU("ฟอง"),UU("ชิ้น"),UU("ฝ่ามือ"),UU("คำ"),UU("กรัม")],
  "ผัก":[UU("ทัพพี"),UU("ถ้วย","ถ้วยตวง"),UU("กำมือ"),UU("คำ"),UU("กรัม")],
  "ผลไม้":[UU("ลูก"),UU("ผล"),UU("ชิ้น","ชิ้นพอดีคำ"),UU("ส่วน"),UU("คำ"),UU("กรัม")],
  "นม-โยเกิร์ต":[UU("แก้ว"),UU("กล่อง"),UU("ขวด"),UU("ช้อนชา"),UU("มล.")],
  "เครื่องดื่ม-น้ำปั่น":[UU("แก้ว"),UU("กล่อง"),UU("ขวด"),UU("มล.")],
  "น้ำมัน-ไขมัน":[UU("ช้อนชา"),UU("ช้อนโต๊ะ"),UU("หยด"),UU("กรัม"),UU("มล.")],
  "ขนม-เบเกอรี่":[UU("ชิ้น"),UU("ลูก"),UU("แผ่น"),UU("ห่อ"),UU("กำมือ"),UU("เม็ด"),UU("ซอง"),UU("คำ"),UU("กรัม")],
  "ซุป-เมนูรวม":[UU("ถ้วย"),UU("ช้อน"),UU("ชิ้น"),UU("ส่วน"),UU("คำ"),UU("กรัม")],
};
App.unitsFor = cat => App.UNITS_BY_CAT[cat] || UNITS.map(u=>[u,u]);
/* หน่วยเริ่มต้นของหมวด: ที่ผู้ใช้ตั้งไว้ (ตั้งค่า → หน่วยที่มักเสิร์ฟลูก) ไม่งั้นใช้หน่วยแรกของหมวด */
App.defaultUnit = cat => { const list = App.unitsFor(cat), u = (S.settings.defaultUnits||{})[cat]; return u && list.some(([v])=>v===u) ? u : (list[0]||[""])[0]; };
App.members = () => (S.settings.members && S.settings.members.length) ? S.settings.members : DEFAULT_MEMBERS;
const base = () => S.settings.demo ? DEMO : {meals:{}, days:{}, growth:[], talk:[], fixes:[], notes:null, ref:DEMO.ref};
App.base = base;
App.ref = () => DEMO.ref;
App.ageAt = (dateObj) => {
  const b = parseD(App.child().birth);
  let y = dateObj.getFullYear()-b.getFullYear(), m = dateObj.getMonth()-b.getMonth(), d = dateObj.getDate()-b.getDate();
  if(d<0){ m--; d += new Date(dateObj.getFullYear(), dateObj.getMonth(), 0).getDate(); }
  if(m<0){ y--; m+=12; }
  return {y,m,d,months:(dateObj - b)/(1000*60*60*24*30.4375)};
};
App.ageText = (dObj=new Date()) => { const a=App.ageAt(dObj); return `${a.y?a.y+" ปี ":""}${a.m} เดือน`; };

/* ---------------- domain: meals ---------------- */
const fmtAmt = (a,u) => a==null||a===""?"":`${a} ${u||""}`.trim();
App.fmtAmt = fmtAmt;
App.guessCat = n => {
  n=n||"";
  if(/โยเกิร์ต|นม/.test(n)) return "นม-โยเกิร์ต";
  if(/ซุป|ต้มจืด|ต้มข่า|แกง|พะโล้/.test(n)) return "ซุป-เมนูรวม";
  if(/น้ำปั่น|สมูทตี้|น้ำผลไม้/.test(n)) return "เครื่องดื่ม-น้ำปั่น";
  if(/วาฟเฟิล|แพนเค้ก|ขนม|ซาลาเปา|โดนัท|ตะโก้|เค้ก|คุกกี้/.test(n)) return "ขนม-เบเกอรี่";
  if(/^ไข่/.test(n)) return "ไข่";
  if(/สตรอว์|บลูเบอร์|แอปเปิ|ส้ม|ฝรั่ง|อะโวคาโด|กล้วย|มะละกอ|แตงโม|องุ่น|มะม่วง|ผลไม้|สาลี่|แก้วมังกร/.test(n)) return "ผลไม้";
  if(/บร็?อ?กโคลี|กะหล่ำ|แตงกวา|ข้าวโพด|ฟักทอง|ฟัก|แครอท|ผัก|ถั่วฝักยาว|ตำลึง|กวางตุ้ง|มะเขือ/.test(n)) return "ผัก";
  if(/ปลา|หมู|ไก่|เนื้อ|กุ้ง|ตับ|เป็ด|เต้าหู้|แซลมอน/.test(n)) return "เนื้อสัตว์-ปลา";
  if(/น้ำมัน|เนย|กะทิ|มายองเนส|^ครีม|ซอสครีม|ครีมซอส/.test(n)) return "น้ำมัน-ไขมัน";
  return "ข้าว-แป้ง";
};
function entryToMeal(e, b){
  b = b && !b.none ? b : {};
  const num = v => { const x=parseFloat(String(v??"").replace(",",".")); return isFinite(x)?x:null; };
  const rnd = v => Math.round(v*100)/100;
  // eaten amount → fraction of what was served; converts small units (คำ ช้อน) into the served unit when they differ
  const EQ = {"คำ>ทัพพี":.12,"ช้อน>ทัพพี":.25,"คำ>ถ้วย":.08,"ช้อน>ถ้วย":.17,"คำ>ช้อน":.5,"คำ>ส่วน":.15,"ชิ้น>ส่วน":.15};
  const fracOf = i => { if(i.frac!=null && i.frac!=="?") return +i.frac; const a=num(i.ea), sv=num(i.sa); if(a==null || !sv) return null;
    const x = i.eu===i.su ? a : EQ[i.eu+">"+i.su]!=null ? a*EQ[i.eu+">"+i.su] : null; return x==null ? null : Math.min(1.5, x/sv); };
  const partsOf = i => (i.comps||[]).filter(c=>c.n).map(c=>{
    const out = {n:c.n, g:c.g||App.guessCat(c.n), served: fmtAmt(c.sa,c.su), size:i.size||null};
    if(["none","spit","unk"].includes(i.st)||!i.st) return {...out, st:i.st||"unk", eaten:""};
    if(i.compMode){ const st=c.st||"unk"; return {...out, st, eaten: st==="ate" ? (fmtAmt(c.ea,c.eu||c.su) || "หมด") : ""}; }
    const fr = fracOf(i);
    return {...out, st: fr!=null ? (fr>=1?"ate":"part") : "unk", eaten: fr!=null && num(c.sa)!=null ? fmtAmt(rnd(num(c.sa)*fr), c.su) : ""};
  });
  const items = (e.items||[]).filter(i=>i.n).map(i=>({n:i.n, g:i.g||App.guessCat(i.n), st:i.st||"unk", size:i.size||null, parts: (i.comps||[]).some(c=>c.n) && (i.compMode || !["ate","part"].includes(i.st) || fracOf(i)!=null) ? partsOf(i) : null,
    served: fmtAmt(i.sa,i.su) || "ไม่ระบุ",
    eaten: [i.st==="none"?"ไม่กิน":i.st==="spit"?"เคี้ยวแล้วคาย":i.st==="unk"?"ไม่ทราบ":"", fmtAmt(i.ea,i.eu) || (i.st==="ate"?"หมด":i.st==="part"?"บางส่วน":"")].filter(Boolean).join(" · ") }));
  const dur = e.start&&e.end ? ((toMin(e.end)-toMin(e.start)+1440)%1440) : null;
  const feed = (FEED.find(f=>f[0]===e.feed)||[])[1];
  const man = e.groups && Object.values(e.groups).some(v=>v!=null&&v!=="");
  const useAi = e.trust==="ai" && e.ai && e.ai.eaten;
  const eaten = useAi ? {...e.ai.eaten} : man ? {carb:+e.groups.carb||0, protein:+e.groups.protein||0, veg:+e.groups.veg||0, fruit:+e.groups.fruit||0, fat:null} : null;
  const ph = k => (e.photos&&e.photos[k]||[]).map(p=>App.photoUrl(p));
  const env = [];
  if(e.mood) env.push("ก่อนกิน "+e.mood);
  if(e.screen===true) env.push("มีจอ/ทีวีเปิด"); else if(e.screen===false) env.push("ไม่มีจอ");
  if(e.toys===true) env.push("มีของเล่นที่โต๊ะ");
  if(e.snackBefore===true) env.push("กินนม/ขนมก่อนมื้อไม่ถึง 1 ชม.");
  if(e.with&&e.with.length) env.push("กินกับ "+e.with.join(", "));
  if(e.place) env.push("ที่"+e.place);
  return {...b, none:false, entry:e, logged:true, items,
    time: e.start ? `${e.start}${e.end?"–"+e.end:""}` : null, durMin: dur,
    feedText: [feed, e.follow?"ต้องเดินตามป้อน":""].filter(Boolean).join(" · ") || null,
    feedKey: e.feed || null, follow: !!e.follow,
    behav: e.behav||[], sitMax: e.sitMax? +e.sitMax : null, env, note: e.note||"",
    photos: {before: ph("before").length?ph("before"):(b.photos&&b.photos.before)||[], after: ph("after").length?ph("after"):(b.photos&&b.photos.after)||[]},
    eaten: eaten || b.eaten || null,
    estimateNote: useAi ? `ประเมินโดย AI${e.ai.confidence?` · ความมั่นใจ${({low:"ต่ำ",medium:"ปานกลาง",high:"สูง"})[e.ai.confidence]||""}`:""}${e.ai.note?" · "+e.ai.note:""}` : man ? `${e.by||"ผู้ป้อน"}ประเมินเอง` : b.estimateNote,
    source: `บันทึกโดย${e.by||"ไม่ระบุ"}${e.updatedAt?" · "+new Date(e.updatedAt).toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"}):""}`,
    by: e.by };
}
function baseToMeal(b){
  if(!b) return {none:true};
  const mt = b.momTime && !/^ไม่ทราบเวลา/.test(b.momTime) ? b.momTime.replace(/ ตามข้อความเพิ่มเรื่องเวลา/,"").replace(/ น\.?/," ").trim() : null;
  return {...b, none:false, logged: !!b.items, time: mt, feedText: b.momFeeding || b.feeding || null, clipFeeding: b.momFeeding && b.feeding && b.feeding!==b.momFeeding ? b.feeding : null,
    behav:[], env:[], note:"", source: b.source};
}
App.entryToMeal = entryToMeal;
App.meal = (date,k) => {
  const e=S.entries[date+"_"+k]; const b=(base().meals[date]||{})[k];
  if(e) return entryToMeal(e,b);
  return baseToMeal(b);
};
App.clipStats = m => {
  if(!m || !m.clip) return null;
  const c = m.clip.codes, start = toMin(m.clip.start);
  const cnt = {S:0,A:0,E:0,"?":0}; let best=0, run=0, bestStart=null, runStart=0;
  [...c].forEach((ch,i)=>{ cnt[ch]++; if(ch==="S"){ if(run===0) runStart=i; run++; if(run>best){best=run; bestStart=runStart;} } else run=0; });
  return {start, end:start+c.length, len:c.length, cnt, longest:best, longestAt: bestStart==null?null:start+bestStart, codes:c};
};
App.accept = m => {
  if(!m||!m.items) return null;
  let ok=0,no=0,unk=0,spit=0; m.items.forEach(i=>{ if(i.st==="ate"||i.st==="part") ok++; else if(i.st==="none"||i.st==="spit"){ no++; if(i.st==="spit") spit++; } else unk++; });
  const k=ok+no; return {ok,no,unk,spit,k,n:m.items.length,p:k?ok/k:null};
};
App.lev = p => p==null?"neutral":p>=0.7?"good":p>=0.4?"warn":"bad";
App.allDates = () => {
  const set = new Set(Object.keys(base().meals));
  Object.values(S.entries).forEach(e=>e&&e.date&&set.add(e.date));
  Object.keys(S.daylogs).forEach(d=>set.add(d));
  return [...set].sort();
};
App.rangeDates = (rng=S.range) => {
  const all = App.allDates(); if(rng==="all" || !all.length) return all;
  const n=+rng, end = today(); const from = addDays(end, -(n-1));
  return all.filter(d=>d>=from && d<=end);
};
App.rangeLabel = (rng=S.range) => rng==="all" ? "ทั้งหมด" : `${rng} วันล่าสุด`;
App.rows = (dates) => { const r=[]; dates.forEach(d=>MEALS.forEach(M=>r.push({date:d, M, m:App.meal(d,M.k)}))); return r; };
App.hasDay = d => !!base().meals[d] || MEALS.some(M=>S.entries[d+"_"+M.k]) || !!S.daylogs[d];

/* period stats used by home, insights and report */
App.stats = (dates) => {
  const rows = App.rows(dates);
  const withItems = rows.filter(r=>r.m.items);
  let ok=0,no=0,k=0,spit=0; const items=[];
  withItems.forEach(r=>{ const a=App.accept(r.m); ok+=a.ok; no+=a.no; k+=a.k; spit+=a.spit; r.m.items.forEach(i=>items.push({...i, date:r.date, M:r.M})); });
  const clips = rows.map(r=>({r, st:App.clipStats(r.m)})).filter(x=>x.st);
  const sitLongest = [...clips.map(x=>x.st.longest), ...rows.filter(r=>r.m.sitMax).map(r=>r.m.sitMax)];
  const durs = rows.map(r=>r.m.durMin ?? (App.clipStats(r.m)||{}).len).filter(v=>v!=null);
  const tot = {}; GROUPS.forEach(g=>tot[g.k]={eat:0,tgt:0,n:0,has:0});
  rows.forEach(r=>{ const e=r.m.eaten; if(!e) return; GROUPS.forEach(g=>{ if(g.k==="fat"){ if(e.fat!=null){tot.fat.n++; if(e.fat) tot.fat.has++;} return; } tot[g.k].eat+=+e[g.k]||0; tot[g.k].tgt+=g.daily*r.M.share; tot[g.k].n++; }); });
  const est = rows.filter(r=>r.m.eaten).length;
  const dl = dates.map(d=>S.daylogs[d]).filter(Boolean);
  const milkDays = dl.filter(l=>(l.milk||[]).some(m=>+m.ml));
  const milkAvg = milkDays.length ? Math.round(milkDays.reduce((a,l)=>a+(l.milk||[]).reduce((s,m)=>s+(+m.ml||0),0),0)/milkDays.length) : null;
  const symDays = dl.filter(l=>l.sym&&l.sym.length);
  return {rows, withItems, ok, no, k, spit, p:k?ok/k:null, items, clips, sitMed: median(sitLongest), sitN: sitLongest.length, durMed: median(durs), tot, est, dl, milkDays, milkAvg, symDays,
    logged: withItems.length, total: rows.length};
};
App.foodTable = (items) => {
  const m = {};
  items.forEach(i=>{ const key=i.n.split(" (")[0].replace(/\s+\d.*$/,"").trim(); const x = m[key] || (m[key]={n:key, g:i.g, ok:0, no:0, spit:0, unk:0, list:[]}); if(i.st==="ate"||i.st==="part") x.ok++; else if(i.st==="none") x.no++; else if(i.st==="spit"){ x.no++; x.spit++; } else x.unk++; x.list.push(i); });
  return Object.values(m);
};

/* insights: rule-based, honest, short */
App.insights = (dates) => {
  const s = App.stats(dates), out = [];
  const ft = App.foodTable(s.items);
  const loved = ft.filter(f=>f.ok>=2 && f.no===0).sort((a,b)=>b.ok-a.ok).slice(0,4);
  const refused = ft.filter(f=>f.no>=2 && f.no>f.ok).sort((a,b)=>b.no-a.no).slice(0,4);
  if(loved.length) out.push({lev:"good", ic:"check", t:"เมนูที่ยอมรับได้ดี", d:`${loved.map(f=>f.n).join(", ")} กินได้ทุกครั้งที่เสิร์ฟ ใช้เป็นเมนูตั้งต้นจับคู่กับอาหารใหม่ได้`});
  if(refused.length) out.push({lev:"bad", ic:"no", t:"เมนูที่มักปฏิเสธ", d:`${refused.map(f=>`${f.n} (${f.no}/${f.ok+f.no} ครั้ง)`).join(", ")}`});
  if(s.spit) out.push({lev:"warn", ic:"warn", t:`เคี้ยวแล้วคาย ${s.spit} ครั้ง`, d:`${s.items.filter(i=>i.st==="spit").map(i=>`${i.n.split(" ")[0]} (${thShort(i.date)})`).join(", ")} · ควรเล่าให้คุณหมอฟังเรื่องเนื้อสัมผัสอาหาร`});
  const g = s.tot;
  if(!s.milkDays.length) out.push({lev:"neutral", ic:"milk", t:"ยังไม่มีบันทึกปริมาณนม", d:"นมเป็นแหล่งพลังงานและแคลเซียมหลักของวัยนี้ คุณหมอมักถามเป็นอันดับแรก"});
  const screenRows = s.rows.filter(r=>r.m.entry&&r.m.entry.screen!=null&&r.m.items);
  if(screenRows.length>=4){ const on=screenRows.filter(r=>r.m.entry.screen), off=screenRows.filter(r=>!r.m.entry.screen); const ap=a=>{ let o=0,k=0; a.forEach(r=>{const x=App.accept(r.m); o+=x.ok; k+=x.k;}); return k?Math.round(o/k*100):null; }; if(on.length&&off.length) out.push({lev:"neutral", ic:"info", t:"จอระหว่างมื้อ", d:`มีจอ ${on.length} มื้อ กินได้ ${ap(on)}% · ไม่มีจอ ${off.length} มื้อ กินได้ ${ap(off)}% (ข้อมูลยังน้อย ใช้ดูแนวโน้มเท่านั้น)`}); }
  return out;
};

/* ---------------- growth ---------------- */
App.growthAll = () => {
  const map = {};
  (base().growth||[]).forEach(g=>map[g.date]={...g, src:"ข้อมูลตัวอย่าง"});
  Object.entries(S.growthExtra).forEach(([d,g])=>{ map[d] = {...(map[d]||{}), ...g, date:d, src:g.src||"บันทึกในแอป"}; });
  return Object.values(map).filter(g=>g.weight||g.height).sort((a,b)=>a.date<b.date?-1:1);
};
function refAt(ref,x){
  if(x<=ref[0][0]) return ref[0].slice(1);
  for(let i=1;i<ref.length;i++){ if(x<=ref[i][0]){ const a=ref[i-1],b=ref[i],t=(x-a[0])/(b[0]-a[0]); return a.slice(1).map((v,j)=>v+(b[j+1]-v)*t); } }
  return ref[ref.length-1].slice(1);
}
App.zAt = (ref,x,v) => {
  if(!ref||v==null||x==null||!isFinite(v)) return null;
  const L = refAt(ref,x), Z=[-3,-2,-1,0,1,2,3];
  if(v<=L[0]) return -3-(L[0]-v)/(L[1]-L[0]);
  for(let i=1;i<7;i++){ if(v<=L[i]) return Z[i-1]+(v-L[i-1])/(L[i]-L[i-1]); }
  return 3+(v-L[6])/(L[6]-L[5]);
};
const CLASS = {
  wfa:[[-2,"น้ำหนักน้อยกว่าเกณฑ์","bad"],[-1.5,"น้ำหนักค่อนข้างน้อย","warn"],[1.5,"น้ำหนักตามเกณฑ์","good"],[2,"น้ำหนักค่อนข้างมาก","warn"],[99,"น้ำหนักมากเกินเกณฑ์","bad"]],
  lfa:[[-2,"เตี้ย","bad"],[-1.5,"ค่อนข้างเตี้ย","warn"],[1.5,"สูงตามเกณฑ์","good"],[2,"ค่อนข้างสูง","good"],[99,"สูง","good"]],
  wfl:[[-2,"ผอม","bad"],[-1.5,"ค่อนข้างผอม","warn"],[1.5,"สมส่วน","good"],[2,"ท้วม","warn"],[3,"เริ่มอ้วน","bad"],[99,"อ้วน","bad"]],
};
App.classify = (kind,z) => { if(z==null) return {lab:"ไม่มีข้อมูล",lev:"neutral"}; for(const [lim,lab,lev] of CLASS[kind]) if(z<lim) return {lab,lev}; return {lab:"",lev:"neutral"}; };
App.zfmt = z => z==null?"–":(z>=0?"+":"−")+Math.abs(z).toFixed(1);
App.zPill = (kind,z) => { const c=App.classify(kind,z); return `<span class="pill ${c.lev}" data-tip="z-score ${App.zfmt(z)} SD">${icon(c.lev==="good"?"check":c.lev==="neutral"?"no":"warn")}${esc(c.lab)}${z!=null?` <span class="num">${App.zfmt(z)}</span>`:""}</span>`; };
App.growthNow = () => {
  const g=App.growthAll(), R=App.ref();
  const lw=[...g].reverse().find(x=>x.weight), lh=[...g].reverse().find(x=>x.height);
  const near = lw&&lh && Math.abs(parseD(lw.date)-parseD(lh.date)) <= 31*864e5;
  const z1 = lw?App.zAt(R.wfa, App.ageAt(parseD(lw.date)).months, lw.weight):null;
  const z2 = lh?App.zAt(R.lfa, App.ageAt(parseD(lh.date)).months, lh.height):null;
  const z3 = near?App.zAt(R.wfl, lh.height, lw.weight):null;
  const last = lw||lh;
  const zs=[z1,z2,z3].filter(v=>v!=null);
  const worst = zs.length ? ["wfa","lfa","wfl"].map((k,i)=>App.classify(k,[z1,z2,z3][i])).map(c=>c.lev) : [];
  const lev = !zs.length?"neutral": worst.includes("bad")?"bad": worst.includes("warn")?"warn":"good";
  return {g, lw, lh, z1, z2, z3, lev, last, ago: last? Math.round((parseD(today())-parseD(last.date))/864e5):null};
};

/* ---------------- UI primitives ---------------- */
App.pill = (cls, txt, ic) => `<span class="pill ${cls}">${ic?icon(ic):""}${txt}</span>`;
App.stPill = k => { const t=ST[k]||ST.unk; return `<span class="pill ${t.cls}">${t.lab}</span>`; };
App.empty = (title, sub="", action="") => `<div class="empty">${icon("no")}<b>${esc(title)}</b>${sub?`<span>${esc(sub)}</span>`:""}${action}</div>`;
App.legend = (items) => `<div class="legend">${items.map(([c,l,extra])=>`<span><i class="sw" style="background:var(${c})${extra||""}"></i>${l}</span>`).join("")}</div>`;
App.seg = (name, opts, val, cls="") => `<div class="seg ${cls}" role="group" data-seg="${name}">${opts.map(([v,l])=>`<button type="button" aria-pressed="${v===val}" data-v="${esc(v)}">${l}</button>`).join("")}</div>`;
App.toast = (t) => { const el=$("#toast"); if(!el) return; el.textContent=t; el.classList.add("on"); clearTimeout(App._tt); App._tt=setTimeout(()=>el.classList.remove("on"),2600); };
/* summary number boxes (dashboard style) */
App.statBoxes = (list) => `<div class="sboxes">${list.map(b=>`<div class="sbox ${b.lev||""}"><span class="k">${b.label}</span><span class="v num">${b.v}${b.unit?`<small> ${b.unit}</small>`:""}</span>${b.p!=null?`<span class="meter"><i style="width:${Math.min(100,Math.max(0,b.p))}%;background:var(--${b.lev&&b.lev!=="neutral"?b.lev:"accent"})"></i></span>`:""}${b.sub?`<span class="s">${b.sub}</span>`:""}</div>`).join("")}</div>`;
/* sleep rounds (สาย บ่าย เย็น กลางคืน); older logs stored one nap as napS/napE */
App.SLEEP_P = ["สาย","บ่าย","เย็น","กลางคืน"];
App.sleepPeriod = t => { const m = t ? toMin(t) : null; if(m==null) return "บ่าย"; return m>=5*60&&m<12*60 ? "สาย" : m>=12*60&&m<16*60 ? "บ่าย" : m>=16*60&&m<19*60 ? "เย็น" : "กลางคืน"; };
App.sleeps = l => { if(!l) return []; if(l.sleeps && l.sleeps.length) return l.sleeps.filter(x=>x.s||x.e); if(l.napS||l.napE) return [{p:App.sleepPeriod(l.napS), s:l.napS||"", e:l.napE||""}]; return []; };
App.sleepText = l => App.sleeps(l).map(x=>`${x.p||""} ${x.s||"?"}${x.e?"–"+x.e:" (ยังไม่ระบุเวลาตื่น)"}`.trim()).join(" · ");
App.cardHead = (title, sub="", right="") => `<div class="card-h"><div><h3>${title}</h3>${sub?`<p class="sub">${sub}</p>`:""}</div>${right}</div>`;

/* tooltip */
const tipEl = () => $("#tip");
document.addEventListener("pointerover", e=>{ const t=e.target.closest("[data-tip]"); const tp=tipEl(); if(!tp) return; if(!t){ tp.classList.remove("on"); return; } tp.innerHTML=t.dataset.tip; tp.classList.add("on"); posTip(e); });
document.addEventListener("pointermove", e=>{ if(tipEl()&&tipEl().classList.contains("on")) posTip(e); });
document.addEventListener("scroll", ()=>{ const tp=tipEl(); if(tp) tp.classList.remove("on"); }, true);
function posTip(e){ const tp=tipEl(); const w=tp.offsetWidth,h=tp.offsetHeight; let x=e.clientX+14, y=e.clientY+14; if(x+w>innerWidth-8) x=e.clientX-w-14; if(y+h>innerHeight-8) y=e.clientY-h-14; tp.style.left=Math.max(8,x)+"px"; tp.style.top=Math.max(8,y)+"px"; }

/* image resize */
App.resizeImg = (file, max) => new Promise(res=>{ const img=new Image(); img.onload=()=>{ const s=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement("canvas"); c.width=Math.round(img.width*s); c.height=Math.round(img.height*s); c.getContext("2d").drawImage(img,0,0,c.width,c.height); c.toBlob(b=>res({blob:b,url:c.toDataURL("image/jpeg",.82)}),"image/jpeg",.82); }; img.src=URL.createObjectURL(file); });

/* ---------------- charts ---------------- */
const unkPat = id => `<defs><pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--surface-2)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--s-unk)" stroke-width="3"/></pattern></defs>`;
App.unkPat = unkPat;
App.chartTimeline = (st, id) => {
  const W=640,H=56,l=2,r=2; const X=i=>l+i*(W-l-r)/st.len;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="ไทม์ไลน์รายนาที">`+unkPat(id);
  [...st.codes].forEach((ch,i)=>{ s+=`<rect class="hit" x="${X(i)}" y="4" width="${Math.max(1,X(i+1)-X(i)-1)}" height="24" rx="2" fill="${ch==="?"?"url(#"+id+")":"var("+STATES[ch].v+")"}" data-tip="${hhmm(st.start+i)} · ${STATES[ch].label}"/>`; });
  const step = st.len>60?15:10;
  for(let m=Math.ceil(st.start/step)*step; m<=st.end; m+=step){ const i=m-st.start; s+=`<text class="axis" x="${Math.min(W-18,Math.max(16,X(i)))}" y="48" text-anchor="middle">${hhmm(m)}</text>`; }
  return s+"</svg>";
};
App.chartSitBars = (rows) => {
  const W=600, rowH=24, top=6, left=96, right=36, max=Math.max(60, ...rows.map(x=>x.st.len));
  const x = v => left + v/max*(W-left-right);
  let s = `<svg viewBox="0 0 ${W} ${top+rows.length*rowH+26}" role="img" aria-label="เวลาที่โต๊ะแต่ละมื้อ">`+unkPat("unkSB");
  for(let t=0;t<=max;t+=20){ s+=`<line class="gridl" x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${top+rows.length*rowH}"/><text class="axis" x="${x(t)}" y="${top+rows.length*rowH+16}" text-anchor="middle">${t}</text>`; }
  let prev=null;
  rows.forEach(({r,st},i)=>{ const y=top+i*rowH;
    if(prev!==r.date){ prev=r.date; s+=`<text class="axis-strong" x="0" y="${y+16}">${thShort(r.date)}</text>`; }
    s+=`<text class="axis" x="${left-8}" y="${y+16}" text-anchor="end">${r.M.short}</text>`;
    let acc=0; ["S","A","E","?"].forEach(k=>{ const v=st.cnt[k]; if(!v) return; s+=`<rect class="hit" x="${x(acc)}" y="${y+4}" width="${Math.max(1,x(acc+v)-x(acc)-1.5)}" height="${rowH-8}" rx="3" fill="${k==="?"?"url(#unkSB)":"var("+STATES[k].v+")"}" data-tip="${thShort(r.date)} ${r.M.name}<br>${STATES[k].label} ${v} นาที"/>`; acc+=v; });
    s+=`<text class="axis num" x="${x(acc)+6}" y="${y+16}">${st.len}</text>`; });
  return s+`<text class="axis" x="${W-right}" y="${top+rows.length*rowH+16}" text-anchor="start">นาที</text></svg>`;
};
App.chartLines = (cats, series, opt={}) => {
  const W=opt.W||560,H=opt.H||220,l=34,r=84,t=12,b=28, max=opt.max||Math.max(10, ...series.flatMap(s=>s.pts.filter(p=>p!=null)));
  const X = i => l + (cats.length<2?0.5:i/(cats.length-1))*(W-l-r), Y = v => t + (1-v/max)*(H-t-b);
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label||"กราฟเส้น")}">`;
  const step = opt.step || Math.ceil(max/4/5)*5;
  for(let v=0;v<=max;v+=step){ s+=`<line class="gridl" x1="${l}" x2="${W-r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${l-6}" y="${Y(v)+4}" text-anchor="end">${v}</text>`; }
  const every = Math.ceil(cats.length/8);
  cats.forEach((c,i)=>{ if(i%every===0||i===cats.length-1) s+=`<text class="axis" x="${X(i)}" y="${H-8}" text-anchor="middle">${c}</text>`; });
  const labels=[];
  series.forEach(se=>{ let path="", last=false;
    se.pts.forEach((v,i)=>{ if(v==null){ last=false; return; } path += (last?"L":"M")+X(i)+","+Y(v); last=true; });
    s+=`<path d="${path}" fill="none" stroke="var(${se.v})" stroke-width="2.5" stroke-linejoin="round" ${se.dash?'stroke-dasharray="4 4" opacity=".7"':""}/>`;
    let lp=null; se.pts.forEach((v,i)=>{ if(v==null) return; lp={i,v}; s+=`<circle class="hit" cx="${X(i)}" cy="${Y(v)}" r="4.5" fill="var(${se.v})" stroke="var(--surface)" stroke-width="2" data-tip="${esc(cats[i])} · ${esc(se.name)}<br>${v} ${esc(opt.unit||"")}"/>`; });
    if(lp && !se.dash) labels.push({x:X(lp.i)+8, y:Y(lp.v)+4, t:`${se.name} ${lp.v}`});
  });
  labels.sort((a,b)=>a.y-b.y); for(let i=1;i<labels.length;i++) if(labels[i].y-labels[i-1].y<14) labels[i].y=labels[i-1].y+14;
  labels.forEach(L=>{ s+=`<text class="axis-strong" x="${L.x}" y="${L.y}">${esc(L.t)}</text>`; });
  return s+"</svg>";
};
App.chartGrowth = (kind, ref, xr, yr, pts, xlab, ylab, xstep, ystep, name) => {
  const W=380,H=280,l=40,r=14,t=22,b=40;
  const X=x=>l+(x-xr[0])/(xr[1]-xr[0])*(W-l-r), Y=y=>t+(1-(y-yr[0])/(yr[1]-yr[0]))*(H-t-b);
  const rows = ref.filter(rw=>rw[0]>=xr[0]&&rw[0]<=xr[1]);
  const line = idx => rows.map((rw,i)=>(i?"L":"M")+X(rw[0])+","+Y(typeof idx==="function"?idx(rw):rw[idx])).join("");
  const band = (fa,fb) => line(fa)+rows.slice().reverse().map(rw=>"L"+X(rw[0])+","+Y(fb(rw))).join("")+"Z";
  const m15 = rw => (rw[2]+rw[3])/2, p15 = rw => (rw[5]+rw[6])/2;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${xlab} ${ylab}"><clipPath id="cp-${kind}"><rect x="${l}" y="${t}" width="${W-l-r}" height="${H-t-b}"/></clipPath><g clip-path="url(#cp-${kind})">`;
  s+=`<path d="${band(()=>yr[0]-50,rw=>rw[2])}" fill="var(--bad-soft)"/><path d="${band(rw=>rw[2],m15)}" fill="var(--warn-soft)"/><path d="${band(m15,p15)}" fill="var(--good-soft)"/><path d="${band(p15,rw=>rw[6])}" fill="var(--warn-soft)"/><path d="${band(rw=>rw[6],()=>yr[1]+50)}" fill="var(--bad-soft)"/>`;
  for(let y=Math.ceil(yr[0]/ystep)*ystep;y<=yr[1];y+=ystep) s+=`<line class="gridl" x1="${l}" x2="${W-r}" y1="${Y(y)}" y2="${Y(y)}" opacity=".5"/>`;
  s+=`<path d="${line(2)}" fill="none" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 3"/><path d="${line(6)}" fill="none" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 3"/>`;
  s+=`<path d="${line(4)}" fill="none" stroke="var(--good)" stroke-width="2"/></g>`;
  for(let y=Math.ceil(yr[0]/ystep)*ystep;y<=yr[1];y+=ystep) s+=`<text class="axis" x="${l-6}" y="${Y(y)+4}" text-anchor="end">${y}</text>`;
  for(let x=Math.ceil(xr[0]/xstep)*xstep;x<=xr[1];x+=xstep) s+=`<text class="axis" x="${X(x)}" y="${H-24}" text-anchor="middle">${x}</text>`;
  s+=`<text class="axis" x="${(l+W-r)/2}" y="${H-6}" text-anchor="middle">${xlab}</text><text class="axis" x="${l-6}" y="${t-8}" text-anchor="end">${ylab}</text>`;
  const lr = rows[rows.length-1]; if(lr) s+=`<text class="axis" x="${W-r-2}" y="${Y(lr[4])-5}" text-anchor="end" fill="var(--good)">ค่ากลาง</text>`;
  pts.forEach((p,i)=>{ const last=i===pts.length-1; s+=`<circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="${last?6:4}" fill="${last?"var(--accent)":"var(--surface)"}" stroke="var(--accent)" stroke-width="2" data-tip="${p.tip}"/>`; if(last) s+=`<text class="axis-strong" x="${X(p.x)-9}" y="${Y(p.y)-10}" text-anchor="end">${esc(name)} ${esc(p.label)}</text>`; });
  return s+"</svg>";
};

/* ช่องกรอกเวลา: พิมพ์เองได้ ขึ้นแป้งตัวเลข ใส่ ":" ให้อัตโนมัติ (เช่น พิมพ์ 0930 → 09:30) ค่าที่เก็บเป็น "HH:MM" เหมือนเดิม */
App.TIME_ATTR = 'type="text" inputmode="numeric" pattern="[0-9]*" maxlength="5" placeholder="--:--" autocomplete="off" data-time';
const timeTyping = v => {
  let d = String(v).replace(/\D/g,"").slice(0,4);
  if(d.length===1 && +d>2) d = "0"+d;                 // 9 → 09
  if(d.length>=2 && +d.slice(0,2)>23) d = "23"+d.slice(2);
  if(d.length===3 && +d[2]>5) d = d.slice(0,2)+"0"+d[2]; // 097 → 09:07
  if(d.length>=4 && +d.slice(2)>59) d = d.slice(0,2)+"59";
  return d.length>2 ? d.slice(0,2)+":"+d.slice(2) : d;
};
App.normTime = v => {
  const s = String(v||"").trim(); if(!/\d/.test(s)) return "";
  let h, m;
  if(s.includes(":")){ const p = s.split(":"); h = p[0].replace(/\D/g,"") || "0"; m = (p[1]||"").replace(/\D/g,""); m = m.padEnd(2,"0").slice(0,2); }
  else { const d = s.replace(/\D/g,""); h = d.slice(0,2) || "0"; m = d.length>2 ? d.slice(2,4).padEnd(2,"0") : "00"; }
  return String(Math.min(23,+h)).padStart(2,"0")+":"+String(Math.min(59,+m)).padStart(2,"0");
};
document.addEventListener("input", e=>{ const t=e.target; if(!(t && t.dataset && "time" in t.dataset)) return; if(e.inputType && e.inputType.startsWith("delete")) { t.value = timeTyping(t.value); return; } t.value = timeTyping(t.value); try{ t.setSelectionRange(t.value.length, t.value.length); }catch(_){} }, true);
document.addEventListener("change", e=>{ const t=e.target; if(t && t.dataset && "time" in t.dataset) t.value = App.normTime(t.value); }, true);
})();
