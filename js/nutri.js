/* อิ่มดี · nutrition engine
   Converts what the family recorded (food-group estimates, household units, milk) into
   energy and nutrients, and compares them with what a child of this age, sex and weight needs.
   All numbers are estimates for conversation with a doctor, not a diagnosis. */
(function(){
"use strict";
const A = window.App, {S,MEALS,parseD,today} = A;

/* ---------- 1. conversion factors (Thai food exchange lists) ----------
   per 1 unit of each group as the app records it */
const EX = {
  carb:    {kcal:80,   p:2,    f:0,    c:18,   ca:3,    unit:"ทัพพี",       name:"ข้าว-แป้ง",  basis:"ข้าวสวย 1 ทัพพี ≈ 55 ก. = 80 kcal"},
  protein: {kcal:37.5, p:3.5,  f:2.5,  c:0,    ca:12,   unit:"ช้อนกินข้าว", name:"เนื้อสัตว์ ไข่", basis:"เนื้อสัตว์สุก 1 ช้อนกินข้าว ≈ 15 ก. (ครึ่งส่วน ไขมันปานกลาง) · ไข่ 1 ฟอง = 2 ช้อน = 75 kcal"},
  veg:     {kcal:25,   p:1,    f:0,    c:5,    ca:30,   unit:"ทัพพี",       name:"ผัก",        basis:"ผักสุก 1 ทัพพี ≈ 25 kcal"},
  fruit:   {kcal:60,   p:0.5,  f:0,    c:15,   ca:10,   unit:"ส่วน",        name:"ผลไม้",      basis:"ผลไม้ 1 ส่วน ≈ 1 กำมือ = 60 kcal"},
  oil:     {kcal:45,   p:0,    f:5,    c:0,    ca:0,    unit:"ช้อนชา",      name:"น้ำมัน ไขมัน", basis:"น้ำมัน 1 ช้อนชา = 45 kcal"},
  milk:    {kcal:0.625,p:0.033,f:0.033,c:0.05, ca:1.16, unit:"มล.",         name:"นม",         basis:"นมจืดครบส่วน 240 มล. = 150 kcal โปรตีน 8 ก. แคลเซียม ~290 มก./250 มล."},
};
const NUTR = ["kcal","p","f","c","ca"];
const zero = () => ({kcal:0,p:0,f:0,c:0,ca:0, serv:{carb:0,protein:0,veg:0,fruit:0,oil:0,milk:0}});
function addServ(t, k, v){ if(!v) return; t.serv[k]+=v; NUTR.forEach(n=>t[n]+=EX[k][n]*v); }
function addAll(t, o, mul=1){ NUTR.forEach(n=>t[n]+=o[n]*mul); Object.keys(t.serv).forEach(k=>t.serv[k]+=o.serv[k]*mul); }
A.EX = EX;

/* ---------- 2. requirements ---------- */
const interp = (tab, x) => { if(x<=tab[0][0]) return tab[0][1]; for(let i=1;i<tab.length;i++){ if(x<=tab[i][0]){ const [x0,y0]=tab[i-1],[x1,y1]=tab[i]; return y0+(y1-y0)*(x-x0)/(x1-x0); } } return tab[tab.length-1][1]; };
// WHO/FAO/UNU 2007 safe level of protein intake, g/kg/day
const PROT = [[1,1.14],[1.5,1.03],[2,0.97],[3,0.90],[4,0.86],[5,0.85],[6,0.89],[7,0.91],[8,0.92],[10,0.91]];
// FAO/WHO/UNU 2004 mean weight gain, g/day (energy deposited ≈ 2 kcal per g)
const GAIN = {ชาย:[[1.5,6.6],[2.5,5.5],[3.5,5.2],[4.5,5.2],[5.5,5.5],[8,6.6]], หญิง:[[1.5,6.6],[2.5,5.8],[3.5,5.2],[4.5,5.2],[5.5,5.5],[8,6.3]]};
// Thai food-based daily servings (ธงโภชนาการเด็ก 1–3 ปี). Older ages scaled by energy as an approximation.
const SERV = { "1–3 ปี":{carb:3, protein:3, veg:1.5, fruit:3, milk:400}, "4–5 ปี":{carb:5, protein:3, veg:2, fruit:3, milk:500}, "6 ปีขึ้นไป":{carb:8, protein:6, veg:4, fruit:3, milk:500} };
const FLAG_KCAL = {"1–3 ปี":1000, "4–5 ปี":1250, "6 ปีขึ้นไป":1600};

function medianWeight(months){ const R=A.ref(); if(!R||!R.wfa) return null; const t=R.wfa; let row=t[0]; for(const r of t){ if(r[0]<=months) row=r; } return row[4]; }

A.req = (dateObj=parseD(today())) => {
  const c = A.child(), age = A.ageAt(dateObj), ageY = age.months/12;
  const ds = A.isoD ? A.isoD(dateObj) : today();
  const g = A.growthAll().filter(x=>x.weight);
  const before = g.filter(x=>x.date<=ds);
  const w = before.length ? before[before.length-1] : g[g.length-1];
  let W = w ? +w.weight : null, wSrc = w ? `น้ำหนัก ${w.weight} กก. (${A.thShort(w.date)})` : null;
  if(!W){ W = medianWeight(age.months) || 11; wSrc = `ยังไม่มีน้ำหนัก ใช้ค่ากลางตามอายุ ${W} กก.`; }
  const girl = c.sex === "หญิง";
  let tee = girl ? 263.4 + 65.3*W - 0.454*W*W : 310.2 + 63.3*W - 0.263*W*W;
  if(ageY < 2) tee *= 0.93;                         // FAO 2004: TEE at 1–2 y reduced by 7%
  const gain = interp(GAIN[girl?"หญิง":"ชาย"], ageY);
  const kcal = Math.round(tee + gain*2);
  const band = ageY < 4 ? "1–3 ปี" : ageY < 6 ? "4–5 ปี" : "6 ปีขึ้นไป";
  const thaiKcal = FLAG_KCAL[band];
  const protein = +(interp(PROT, Math.max(1,ageY)) * W).toFixed(1);
  const ca = ageY < 4 ? 500 : 800;                  // Thai DRI 2020
  const amdr = ageY < 4 ? {p:[5,20], f:[30,40], c:[45,65]} : {p:[10,30], f:[25,35], c:[45,65]};
  const serv = {...SERV[band]};
  return {ageY, ageM:age.months, W, wSrc, estW: !w, sex:c.sex, girl, tee:Math.round(tee), gain, kcal, perKg: Math.round(kcal/W), thaiKcal, band,
    protein, protPerKg: +interp(PROT, Math.max(1,ageY)).toFixed(2), ca, amdr, serv, outOfRange: ageY<1 || ageY>10,
    fat:[Math.round(kcal*amdr.f[0]/900), Math.round(kcal*amdr.f[1]/900)], carbG:[Math.round(kcal*amdr.c[0]/400), Math.round(kcal*amdr.c[1]/400)]};
};

/* ---------- 3. household units → servings ---------- */
const FR = {"½":.5,"¼":.25,"¾":.75,"⅓":1/3,"⅔":2/3};
const normNum = s => String(s||"")
  .replace(/(\d)\s*([½¼¾⅓⅔])/g,(m,d,f)=>String(+d+FR[f]))
  .replace(/([½¼¾⅓⅔])/g,(m,f)=>String(FR[f]))
  .replace(/(\d+)\s*\/\s*(\d+)/g,(m,a,b)=>String(+(+a/+b).toFixed(3)))
  .replace(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/g,(m,a,b)=>String((+a + +b)/2))
  .replace(/ครึ่ง(ห่อ|ลูก|ฟอง|ถ้วย|ทัพพี|ชิ้น|แผ่น|หัว)/g,"0.5 $1");
const UNIT = "(ทัพพี|ช้อนโต๊ะ|ช้อนชา|ช้อน|คำ|ชิ้น|ฟอง|ลูก|ส่วน|ห่อ|ถ้วย|กำมือ|แผ่น|มล\\.?|ml|กรัม|ก\\.|หัว|พู|ฝัก|กระทง|กล่อง|แก้ว|ไม้|ตัว|ผล)";
const U = u => u.replace(/\.$/,"").replace(/^ml$/,"มล").replace(/^ก$/,"กรัม");
function qty(s){
  const t = normNum(s);
  const pick = re => { const m = t.match(re); return m ? {n:+m[1], u:U(m[2])} : null; };
  return pick(new RegExp("รวม(?:ประมาณ)?\\s*(\\d*\\.?\\d+)\\s*"+UNIT)) || pick(new RegExp("(\\d*\\.?\\d+)\\s*(กรัม|ก\\.)")) || pick(new RegExp("(\\d*\\.?\\d+)\\s*"+UNIT));
}
const CONV = {
  "ข้าว-แป้ง":     {carb:{ทัพพี:1,คำ:.12,ช้อน:.25,ช้อนโต๊ะ:.25,แผ่น:1,ชิ้น:.25,ห่อ:1.5,ถ้วย:1.5,กำมือ:1,หัว:1,ลูก:1,ส่วน:1,กรัม:1/55}},
  "ไข่":           {protein:{ฟอง:2,คำ:.5,ชิ้น:.5,ช้อน:1,ช้อนโต๊ะ:1,ส่วน:2,กรัม:1/15}},
  "เนื้อสัตว์-ปลา": {protein:{ช้อน:1,ช้อนโต๊ะ:1,คำ:.5,ชิ้น:1,ส่วน:2,กรัม:1/15,ไม้:2,ตัว:2,ฟอง:2}},
  "ผัก":           {veg:{ทัพพี:1,ช้อน:.25,ช้อนโต๊ะ:.25,คำ:.15,ชิ้น:.12,ลูก:1,ฝัก:1,กำมือ:1,ถ้วย:1,ส่วน:1,กรัม:1/60}},
  "ผลไม้":         {fruit:{ส่วน:1,ชิ้น:.15,คำ:.15,ลูก:1,ผล:1,พู:.5,ถ้วย:1,กำมือ:1,กรัม:1/100}},
  "นม-โยเกิร์ต":    {milk:{ถ้วย:120,ช้อน:15,ช้อนโต๊ะ:15,คำ:10,มล:1,กล่อง:200,แก้ว:200,ส่วน:240}},
  "ขนม-เบเกอรี่":   {carb:{ชิ้น:1,ลูก:1.5,ถ้วย:1.5,คำ:.15,กระทง:1,แผ่น:1,ห่อ:1,ช้อน:.25}, oil:{ชิ้น:.5,ลูก:.5,ถ้วย:.5,คำ:.07,กระทง:1,แผ่น:.5,ห่อ:.5,ช้อน:.1}},
  "ซุป-เมนูรวม":    {carb:{ถ้วย:.5}, protein:{ถ้วย:1,ช้อน:.5,ช้อนโต๊ะ:.5,คำ:.3,ส่วน:2,กรัม:1/15,ชิ้น:1}, veg:{ถ้วย:.3}},
  "น้ำมัน-ไขมัน":   {oil:{ช้อนชา:1,ช้อน:3,ช้อนโต๊ะ:3,คำ:.3,ชิ้น:1,กรัม:1/5,มล:1/5,ส่วน:1}},
  "เครื่องดื่ม-น้ำปั่น":{fruit:{ถ้วย:1,แก้ว:1,มล:1/150,คำ:.05}, milk:{ถ้วย:50,แก้ว:50,มล:.3}},
};
const NAME = [   // [pattern, table, replace category table?]
  [/สตรอว์?เบอร์รี|สตรอเบอร์รี/, {fruit:{ลูก:.1}}, false],
  [/องุ่น/, {fruit:{ลูก:.08}}, false], [/บลูเบอร์รี/, {fruit:{ลูก:.03}}, false],
  [/ส้มโอ/, {fruit:{พู:.5}}, false],
  [/อะโวคาโด/, {oil:{ลูก:5,ชิ้น:.7,คำ:.4,ส่วน:1,ช้อน:.7}}, true],
  [/ข้าวโพด/, {carb:{ฝัก:2,คำ:.15,ช้อน:.25,ทัพพี:1}}, true],
  [/เกี๊ยว/, {protein:{ชิ้น:.5,คำ:.3}, carb:{ชิ้น:.1,คำ:.05}}, true],
  [/ซาลาเปา/, {carb:{ลูก:1.5,คำ:.15}, oil:{ลูก:.5}}, true],
];
function table(i){
  const base = CONV[i.g||A.guessCat(i.n)] || CONV["ข้าว-แป้ง"];
  const o = NAME.find(([re])=>re.test(i.n)); if(!o) return base;
  if(o[2]) return o[1];
  const t = {}; new Set([...Object.keys(base), ...Object.keys(o[1])]).forEach(k=>t[k]={...(base[k]||{}), ...(o[1][k]||{})}); return t;
}
const SIZE = {s:{f:.5, lab:"เล็ก"}, m:{f:1, lab:"กลาง"}, l:{f:1.5, lab:"ใหญ่"}};
A.SIZE = SIZE;
const COOKFAT = /ผัด|ทอด|เจียว|ไข่ดาว|กะทิ|ครีม|เนย|มายองเนส|ชีส|ซอสครีม/;
// eaten amount of one item → servings or null (unknown) ; returns {serv, known}
A.itemServ = (i) => {
  if(i.parts && i.parts.length){
    const serv = {}; let known = 0, unknown = 0, zero = 0;
    i.parts.forEach(p=>{ const r = A.itemServ(p); if(r.zero){ zero++; return; } if(!r.known){ unknown++; return; } known++; Object.entries(r.serv).forEach(([k,v])=>serv[k]=(serv[k]||0)+v); });
    if(zero===i.parts.length) return {serv:{}, known:true, zero:true};
    if(known && COOKFAT.test(i.n) && !serv.oil){ const b=(serv.carb||0)+(serv.protein||0)+(serv.veg||0); if(b) serv.oil=Math.min(1, +(b*0.3).toFixed(2)); }
    return known ? {serv, known:true, partsUnknown:unknown} : {serv:{}, known:false};
  }
  if(i.st==="none" || i.st==="spit") return {serv:{}, known:true, zero:true};
  if(i.st==="unk") return {serv:{}, known:false};
  const tbl = table(i);
  const sv = qty(i.served), ev = String(i.eaten||"");
  let q = /^\s*(กิน)?(เกือบ)?หมด/.test(ev) && sv ? {n: sv.n*(/เกือบ/.test(ev)?0.85:1), u:sv.u} : qty(ev);
  if(!q || q.n===0){
    if(sv && /เกือบหมด/.test(i.eaten)) q = {n:sv.n*0.85, u:sv.u};
    else if(sv && /หมด/.test(i.eaten)) q = sv;
    else if(sv && /ครึ่ง/.test(i.eaten)) q = {n:sv.n*0.5, u:sv.u};
    else if(sv && i.st==="ate") q = sv;
  }
  if(!q) return {serv:{}, known:false};
  if(i.size && SIZE[i.size] && (q.u==="ชิ้น"||q.u==="คำ")) q = {...q, n: q.n*SIZE[i.size].f};
  const serv = {}; let hit = false;
  Object.entries(tbl).forEach(([k,map])=>{ const f = map[q.u]; if(f!=null){ serv[k] = (serv[k]||0) + q.n*f; hit = true; } });
  if(hit && COOKFAT.test(i.n) && !serv.oil){ const base = (serv.carb||0)+(serv.protein||0)+(serv.veg||0); if(base) serv.oil = Math.min(1, +(base*0.3).toFixed(2)); }
  return hit ? {serv, known:true, q} : {serv:{}, known:false, q};
};

/* ---------- 4. meal / day intake ---------- */
A.mealIntake = (m) => {
  if(!m || m.none) return null;
  const t = zero(); let method = "none", counted = 0, unknown = 0, zeroN = 0;
  const items = m.items || [];
  if(m.eaten){
    method = m.entry && m.entry.trust==="ai" ? "ai" : "group";
    ["carb","protein","veg","fruit"].forEach(k=>addServ(t, k, +m.eaten[k]||0));
    if(m.eaten.fat===true) addServ(t, "oil", 0.5);
    else if(m.eaten.fat==null && items.some(i=>(i.st==="ate"||i.st==="part") && COOKFAT.test(i.n))) addServ(t, "oil", 0.3);
    items.filter(i=>(i.g||A.guessCat(i.n))==="นม-โยเกิร์ต").forEach(i=>{ const r=A.itemServ(i); if(r.known && r.serv.milk){ addServ(t,"milk",r.serv.milk); counted++; } });
  } else if(items.length){
    items.forEach(i=>{ const r=A.itemServ(i); if(r.zero){ zeroN++; return; } if(!r.known){ unknown++; return; } counted++; Object.entries(r.serv).forEach(([k,v])=>addServ(t,k,v)); });
    method = counted ? "items" : "none";
  }
  return {...t, method, counted, unknown, zeroN, ok: method!=="none"};
};
A.METHOD = {group:"ผู้ป้อนประเมินเป็นหมู่", ai:"AI ประเมินจากรูป", items:"แปลงจากรายการและหน่วยที่บันทึก", none:"ประเมินไม่ได้"};

function snackIntake(l){
  const t = zero(); let ok = 0, bad = [];
  (l && l.snacks || []).forEach(s=>{ const r = A.itemServ({n:s.n, g:A.guessCat(s.n), st:"part", eaten:s.a||"", served:""}); if(r.known){ ok++; Object.entries(r.serv).forEach(([k,v])=>addServ(t,k,v)); } else bad.push(s.n); });
  return {...t, ok, bad};
}

A.dayIntake = (d) => {
  const meals = MEALS.map(M=>{ const m=A.meal(d,M.k); return {M, m, it:A.mealIntake(m)}; });
  const est = meals.filter(x=>x.it && x.it.ok);
  const l = S.daylogs[d];
  const milkMl = l && (l.milk||[]).some(x=>+x.ml) ? l.milk.reduce((s,x)=>s+(+x.ml||0),0) : null;
  const sn = snackIntake(l);
  const meal = zero(); est.forEach(x=>addAll(meal, x.it));
  const share = est.reduce((s,x)=>s+x.M.share,0);
  const tot = zero(); addAll(tot, meal); if(milkMl) addServ(tot,"milk",milkMl); addAll(tot, sn);
  const req = A.req(parseD(d));
  return {date:d, meals, est:est.length, share, meal, tot, milkMl, snack:sn, req, five: A.present5(tot.serv),
    complete: est.length===MEALS.length && milkMl!=null, hasAny: est.length>0 || milkMl!=null};
};

/* ---------- 5. อาหารหลัก 5 หมู่ ---------- */
A.FIVE = [
  {n:1, short:"โปรตีน", name:"หมู่ 1 โปรตีน", food:"เนื้อสัตว์ ไข่ นม ถั่ว", v:"--g-protein"},
  {n:2, short:"คาร์โบไฮเดรต", name:"หมู่ 2 คาร์โบไฮเดรต", food:"ข้าว แป้ง เผือก มัน", v:"--g-carb"},
  {n:3, short:"แร่ธาตุ", name:"หมู่ 3 แร่ธาตุ", food:"ผักต่างๆ", v:"--g-veg"},
  {n:4, short:"วิตามิน", name:"หมู่ 4 วิตามิน", food:"ผลไม้ต่างๆ", v:"--g-fruit"},
  {n:5, short:"ไขมัน", name:"หมู่ 5 ไขมัน", food:"น้ำมัน กะทิ เนย ไขมันในเนื้อสัตว์และนม", v:"--g-fat"},
];
A.present5 = sv => { const h=[(sv.protein||0)+(sv.milk||0)/100>0, (sv.carb||0)>0, (sv.veg||0)>0, (sv.fruit||0)>0, (sv.oil||0)>0]; return {h, n:h.filter(Boolean).length}; };
A.fiveGroups = ({mealsDay, snackAvg, milkAvg, milkKnown, day, req}) => {
  const pc = (v,need) => need ? Math.round(v/need*100) : null;
  const sv = k => mealsDay.serv[k] + snackAvg.serv[k];
  const meat = sv("protein"), milk = (milkAvg||0) + sv("milk"), carb = sv("carb"), veg = sv("veg"), fruit = sv("fruit"), oil = sv("oil");
  const part = (lab, v, need, unit, known=true) => ({lab, v, need, unit, p: known ? pc(v,need) : null});
  const lv = p => p==null?"neutral": p<50?"bad": p<80?"warn":"good";
  const H = A.FIVE.map(x=>({...x}));
  // หมู่ 1
  H[0].parts = [part("เนื้อสัตว์ ไข่ ถั่ว", meat, req.serv.protein, "ช้อนกินข้าว"), part("นม โยเกิร์ต", milk, req.serv.milk, "มล.", milkKnown || milk>0)];
  H[0].nut = {lab:"โปรตีน", v:day.p, need:req.protein, unit:"ก.", p:pc(day.p, req.protein)};
  // หมู่ 2
  H[1].parts = [part("ข้าว แป้ง", carb, req.serv.carb, "ทัพพี")];
  H[1].nut = {lab:"คาร์โบไฮเดรต", v:day.c, need:req.carbG[0], range:req.carbG, unit:"ก.", p:pc(day.c, req.carbG[0])};
  // หมู่ 3
  H[2].parts = [part("ผัก", veg, req.serv.veg, "ทัพพี")];
  H[2].nut = {lab:"แคลเซียม", v:day.ca, need:req.ca, unit:"มก.", p:pc(day.ca, req.ca), note:"แร่ธาตุหลักที่คำนวณได้ (รวมจากนม)"};
  // หมู่ 4
  H[3].parts = [part("ผลไม้", fruit, req.serv.fruit, "ส่วน")];
  H[3].nut = null;
  // หมู่ 5
  H[4].parts = [part("ไขมันที่เพิ่มจากการปรุง", oil, null, "ช้อนชา")];
  H[4].nut = {lab:"ไขมันรวมทุกแหล่ง", v:day.f, need:req.fat[0], range:req.fat, unit:"ก.", p:pc(day.f, req.fat[0]*(milkKnown?1:0.8)), note: milkKnown?"":"ยังไม่รวมนม เทียบกับ 80% จากมื้อหลัก"};
  H.forEach(h=>{
    const ps = h.parts.map(x=>x.p).filter(x=>x!=null);
    h.p = h.n===5 ? h.nut.p : ps.length ? Math.round(ps.reduce((a,b)=>a+b,0)/ps.length) : null;
    if(h.n===1 && !milkKnown) h.p = h.parts[0].p;
    h.lev = lv(h.p);
  });
  const f = fmt;
  H[0].summary = `เนื้อสัตว์ ไข่ ${f(meat)}/${req.serv.protein} ช้อน${milkKnown?` · นม ${Math.round(milk)}/${req.serv.milk} มล.`:""}`; H[0].advice = "ไข่ 1 ฟอง = 2 ช้อนกินข้าว · ปลา ไก่ หมูสับ เต้าหู้ สลับกัน";
  H[1].summary = `ข้าว แป้ง ${f(carb)} จาก ${req.serv.carb} ทัพพี/วัน (${H[1].parts[0].p}%)`; H[1].advice = "ข้าวและแป้งเป็นแหล่งพลังงานหลักของมื้อ ถ้าได้น้อย พลังงานรวมจะต่ำตาม";
  H[2].summary = `ผัก ${f(veg)} จาก ${req.serv.veg} ทัพพี/วัน (${H[2].parts[0].p}%)`; H[2].advice = "ผักเป็นแหล่งแร่ธาตุ ใยอาหาร และวิตามิน ลองผักต้มนุ่มจิ้มซอส หรือสับผสมในไข่และข้าว";
  H[3].summary = `ผลไม้ ${f(fruit)} จาก ${req.serv.fruit} ส่วน/วัน (${H[3].parts[0].p}%)`; H[3].advice = "ผลไม้ 1 ส่วน ≈ 6–8 ชิ้นพอดีคำ · ให้เป็นอาหารว่างเช้าและบ่ายได้ ถ้าไม่ได้บันทึกของว่าง ตัวเลขจะต่ำกว่าความจริง";
  H[4].summary = `ไขมันรวม ${f(day.f)} ก./วัน · ควร ${req.fat[0]}–${req.fat[1]} ก. (${req.amdr.f.join("–")}% ของพลังงาน)${milkKnown?"":" ยังไม่รวมนม"}`; H[4].advice = "เด็กเล็กต้องการไขมันมากกว่าผู้ใหญ่ เพื่อพลังงานและการดูดซึมวิตามิน เอ ดี อี เค · ผัดด้วยน้ำมันพืชเล็กน้อย ไข่แดง อะโวคาโด นมจืดครบส่วน";
  return H;
};

/* ---------- 6. period summary ---------- */
const MEAL_SHARE = MEALS.reduce((s,M)=>s+M.share,0);   // 0.8 of the day from main meals (กรมอนามัย)
A.nutri = (dates) => {
  const days = dates.map(A.dayIntake);
  const req = A.req(parseD(dates.length ? dates[dates.length-1] : today()));
  const estMeals = []; days.forEach(dd=>dd.meals.forEach(x=>{ if(x.it&&x.it.ok) estMeals.push({...x, date:dd.date}); }));
  const sum = zero(); estMeals.forEach(x=>addAll(sum, x.it));
  const shareSum = estMeals.reduce((s,x)=>s+x.M.share,0);
  // day-equivalent from main meals: scale estimated meals up to the 3-meal share of a day
  const mealsDay = zero(); if(shareSum) addAll(mealsDay, sum, MEAL_SHARE/shareSum);
  const milkDays = days.filter(dd=>dd.milkMl!=null);
  const milkAvg = milkDays.length ? milkDays.reduce((s,dd)=>s+dd.milkMl,0)/milkDays.length : null;
  const snackDays = days.filter(dd=>dd.snack.ok);
  const snackAvg = zero(); const dlDays = days.filter(dd=>S.daylogs[dd.date]);
  if(dlDays.length) dlDays.forEach(dd=>addAll(snackAvg, dd.snack, 1/dlDays.length));
  const milkPart = zero(); if(milkAvg) addServ(milkPart, "milk", milkAvg);
  const day = zero(); addAll(day, mealsDay); addAll(day, milkPart); addAll(day, snackAvg);
  const pct = (v, need) => need ? Math.round(v/need*100) : null;
  const macro = t => t.kcal ? {p:Math.round(t.p*4/t.kcal*100), f:Math.round(t.f*9/t.kcal*100), c:Math.round(t.c*4/t.kcal*100)} : null;
  const unknownItems = estMeals.reduce((s,x)=>s+x.it.unknown,0);
  const notEst = days.reduce((s,dd)=>s+dd.meals.filter(x=>x.it && !x.it.ok).length,0);
  const missing = days.reduce((s,dd)=>s+dd.meals.filter(x=>!x.it).length,0);
  const methods = {}; estMeals.forEach(x=>methods[x.it.method]=(methods[x.it.method]||0)+1);
  const milkKnown = milkAvg!=null;
  const lev = (p, lo=90, hi=115) => p==null?"neutral": p<75?"bad": p<lo?"warn": p>hi+10?"warn":"good";
  const R = {
    kcal:{v:day.kcal, need:req.kcal, p:pct(day.kcal, req.kcal), meals:mealsDay.kcal, milk:milkPart.kcal, snack:snackAvg.kcal},
    p:{v:day.p, need:req.protein, p:pct(day.p, req.protein), meals:mealsDay.p, milk:milkPart.p, snack:snackAvg.p},
    ca:{v:day.ca, need:req.ca, p:pct(day.ca, req.ca), meals:mealsDay.ca, milk:milkPart.ca, snack:snackAvg.ca},
  };
  R.kcal.lev = milkKnown ? lev(R.kcal.p) : lev(pct(mealsDay.kcal, req.kcal*MEAL_SHARE));
  R.p.lev = milkKnown ? lev(R.p.p, 100, 400) : lev(pct(mealsDay.p, req.protein*MEAL_SHARE), 100, 400);
  R.ca.lev = milkKnown ? lev(R.ca.p, 100, 400) : "neutral";
  const mac = macro(day);
  const groups = ["carb","protein","veg","fruit"].map(k=>({k, v:mealsDay.serv[k]+snackAvg.serv[k], need:req.serv[k], p:pct(mealsDay.serv[k]+snackAvg.serv[k], req.serv[k]), fromMeals:mealsDay.serv[k]}));
  groups.push({k:"milk", v:(milkAvg||0)+mealsDay.serv.milk+snackAvg.serv.milk, need:req.serv.milk, p: milkKnown?pct((milkAvg||0)+mealsDay.serv.milk+snackAvg.serv.milk, req.serv.milk):null, fromMeals:mealsDay.serv.milk});
  // อาหารหลัก 5 หมู่
  const five = A.fiveGroups({mealsDay, snackAvg, milkAvg, milkKnown, day, req});
  const fiveDays = days.filter(dd=>dd.est>=MEALS.length);
  const fiveFull = fiveDays.filter(dd=>dd.five.n===5).length;
  // gaps: what looks short, in plain words
  const gaps = [];
  const iron = A.ironCheck(dates);
  if(!estMeals.length){ gaps.push({lev:"neutral", k:"data", t:"ยังคำนวณพลังงานไม่ได้", d:"ใส่ปริมาณที่กินในแต่ละมื้อ (หน่วยครัวเรือนหรือเป็นหมู่อาหาร) แล้วระบบจะแปลงเป็นพลังงานให้"}); }
  else {
    const pk = milkKnown ? R.kcal.p : pct(mealsDay.kcal, req.kcal*MEAL_SHARE);
    if(pk!=null && pk<90) gaps.push({lev:pk<75?"bad":"warn", k:"kcal", t:`พลังงานได้ราว ${milkKnown?pk+"% ของความต้องการทั้งวัน":pk+"% ของส่วนที่ควรได้จากมื้อหลัก"}`, d:`ต้องการราว ${req.kcal.toLocaleString()} kcal/วัน · ได้ ${Math.round(milkKnown?day.kcal:mealsDay.kcal).toLocaleString()} kcal${milkKnown?"":" จากมื้อหลัก (ยังไม่รวมนม)"} · ขาดราว ${Math.max(0,Math.round((milkKnown?req.kcal:req.kcal*MEAL_SHARE)-(milkKnown?day.kcal:mealsDay.kcal)))} kcal/วัน`});
    const pp = milkKnown ? R.p.p : pct(mealsDay.p, req.protein*MEAL_SHARE);
    if(pp!=null && pp<100) gaps.push({lev:pp<75?"bad":"warn", k:"p", t:`โปรตีนได้ราว ${pp}%${milkKnown?"":" ของส่วนจากมื้อหลัก"}`, d:`ต้องการ ${req.protein} ก./วัน (${req.protPerKg} ก./กก.) · ไข่ 1 ฟองให้ราว 7 ก. นม 1 กล่องราว 7 ก.`});
    if(milkKnown){ if(R.ca.p<100){ const ml = Math.round((req.ca-day.ca)/EX.milk.ca/10)*10; gaps.push({lev:R.ca.p<70?"bad":"warn", k:"ca", t:`แคลเซียมได้ราว ${R.ca.p}% (${Math.round(day.ca)} จาก ${req.ca} มก.)`, d:`ถ้าเติมจากนมจืด ต้องเพิ่มอีกราว ${ml} มล./วัน หรือเพิ่มเต้าหู้ ปลาเล็กปลาน้อย ผักใบเขียวเข้ม`}); } }
    else gaps.push({lev:"warn", k:"ca", t:"แคลเซียมยังประเมินไม่ได้ เพราะยังไม่มีบันทึกนม", d:`ต้องการ ${req.ca} มก./วัน · จากมื้อหลักได้ราว ${Math.round(mealsDay.ca)} มก. · ส่วนที่เหลือราว ${Math.max(0,Math.round(req.ca-mealsDay.ca))} มก. เท่ากับนมจืดราว ${Math.max(0,Math.round((req.ca-mealsDay.ca)/EX.milk.ca/10)*10)} มล.`});
    five.filter(h=>h.p!=null && h.p<(h.n===5?90:60)).forEach(h=>gaps.push({lev:h.p<40?"bad":"warn", k:"h"+h.n, t:`หมู่ ${h.n} ${h.short}: ${h.summary}`, d:h.advice}));
    if(!milkKnown) gaps.push({lev:"warn", k:"milk", t:"หมู่ 1 ส่วนของนม: ยังไม่มีบันทึก", d:`วัย ${req.band} แนะนำนมจืดวันละ ${req.serv.milk} มล. (2 กล่อง) เป็นแหล่งโปรตีน แคลเซียม และไขมันที่สำคัญ`});
  }
  const weeks = Math.max(1, dates.length/7), real = iron.hitList.filter(x=>!x.inRecipe);
  if(dates.length && real.length/weeks < 1) gaps.push({lev:"warn", k:"fe", t: iron.hit ? `เมนูแหล่งธาตุเหล็กสูงพบน้อย (${iron.hit} ครั้งใน ${dates.length} วัน${real.length<iron.hit?" เป็นส่วนผสมเล็กน้อย":""})` : "ไม่พบเมนูแหล่งธาตุเหล็กสูงในช่วงนี้", d:"ระบบคำนวณธาตุเหล็กเป็นตัวเลขไม่ได้ จึงดูจากเมนูแทน (ตับ เลือด เนื้อแดง) · ข้อแนะนำทั่วไปคือสัปดาห์ละ 1–2 ครั้ง ร่วมกับผลไม้วิตามินซี · ปรึกษาคุณหมอเรื่องการตรวจภาวะโลหิตจาง"});
  return {five, fiveDays:fiveDays.length, fiveFull, days, req, estMeals, sum, shareSum, mealsDay, milkAvg, milkDays:milkDays.length, milkKnown, snackDays:snackDays.length, snackAvg, day, R, macro:mac, mealsMacro:macro(mealsDay), groups, gaps, iron,
    unknownItems, notEst, missing, methods, totalMeals: days.length*MEALS.length, MEAL_SHARE};
};
const fmt = v => v==null?"–": v>=10?Math.round(v): +v.toFixed(1);
A.nfmt = fmt;

A.ironCheck = (dates) => {
  const s = A.stats(dates), hit = [], egg = [];
  const RE=/ตับ|เลือด|เนื้อวัว|เนื้อแดง|หอยแครง/;
  s.items.filter(i=>i.st==="ate"||i.st==="part").forEach(i=>{ if(RE.test(i.n)) hit.push(i); else if(/ไข่/.test(i.n)) egg.push(i); });
  s.rows.forEach(r=>{ if(r.m.recipe && RE.test(r.m.recipe) && !hit.some(h=>h.date===r.date&&h.M===r.M)) hit.push({n:"ส่วนผสมใน"+r.M.name, date:r.date, M:r.M, inRecipe:true}); });
  return {hit: hit.length, hitList: hit, egg: egg.length};
};

/* small UI helpers */
A.nbar = (r, opts={}) => {   // stacked bar: meals / milk / snack against 100% need with 80% tick
  const max = Math.max(130, r.p||0), w = v => Math.max(0, v/r.need*100/max*100);
  const tick = (p,lab) => `<b style="left:${p/max*100}%" data-tip="${lab}"></b>`;
  return `<span class="nbar"><span class="track"><i class="m" style="width:${w(r.meals)}%"></i><i class="k" style="width:${w(r.milk)}%"></i><i class="s" style="width:${w(r.snack)}%"></i>${opts.mealTick!==false?tick(80,"80% = ส่วนที่ควรได้จากมื้อหลัก"):""}${tick(100,"100% = ความต้องการทั้งวัน")}</span></span>`;
};
/* adequacy rows used by home, nutrition and report */
A.adequacy = (n, opts={}) => {
  const row = (lab, sub, r, unit, dec=0) => {
    const v = r.v, pc = r.p;
    const val = `<b class="num">${v?Math.round(v*10**dec)/10**dec:"–"}</b> <span class="tiny">/ ${r.need.toLocaleString()} ${unit}</span>`;
    return `<div class="nrow"><div class="nl"><b>${lab}</b><span>${sub}</span></div>${A.nbar(r)}<div class="nv">${val}<br>${pc!=null&&v?`<span class="pill ${r.lev} num">${pc}%${n.milkKnown?"":" *"}</span>`:'<span class="pill neutral">ไม่มีข้อมูล</span>'}</div></div>`;
  };
  return `<div class="nrows">${row("พลังงาน", `${n.req.perKg} kcal/กก.`, n.R.kcal, "kcal")}${row("โปรตีน", `${n.req.protPerKg} ก./กก.`, n.R.p, "ก.", 1)}${row("แคลเซียม", "นมเป็นแหล่งหลัก", n.R.ca, "มก.")}</div>`;
};
A.macroBar = (m, req) => !m ? "" : `<div style="display:grid;gap:6px"><div class="macro" role="img" aria-label="สัดส่วนพลังงาน คาร์โบไฮเดรต ${m.c}% โปรตีน ${m.p}% ไขมัน ${m.f}%"><i style="width:${m.c}%;background:var(--g-carb)" data-tip="คาร์โบไฮเดรต ${m.c}% (ควร ${req.amdr.c.join("–")}%)"></i><i style="width:${m.p}%;background:var(--g-protein)" data-tip="โปรตีน ${m.p}% (ควร ${req.amdr.p.join("–")}%)"></i><i style="width:${m.f}%;background:var(--g-fat)" data-tip="ไขมัน ${m.f}% (ควร ${req.amdr.f.join("–")}%)"></i></div>
  <div class="legend" style="margin:0">${[["--g-carb","คาร์บ",m.c,req.amdr.c],["--g-protein","โปรตีน",m.p,req.amdr.p],["--g-fat","ไขมัน",m.f,req.amdr.f]].map(([v,l,x,r])=>`<span><i class="sw" style="background:var(${v})"></i>${l} <b class="num">${x}%</b> <span class="tiny">(ควร ${r[0]}–${r[1]}%)</span> ${x<r[0]?'<span class="pill warn">ต่ำ</span>':x>r[1]?'<span class="pill warn">สูง</span>':'<span class="pill good">ปกติ</span>'}</span>`).join("")}</div></div>`;
A.gapsHTML = (gaps, max=99) => gaps.length ? `<div class="ins">${gaps.slice(0,max).map(g=>`<div class="ins-i ${g.lev}"><span class="ico">${A.icon(g.lev==="good"?"check":"warn")}</span><div><b>${A.esc(g.t)}</b><span>${A.esc(g.d)}</span></div></div>`).join("")}</div>` : `<div class="ins"><div class="ins-i good"><span class="ico">${A.icon("check")}</span><div><b>ยังไม่พบจุดที่ขาดชัดเจน</b><span>จากข้อมูลที่บันทึกในช่วงนี้</span></div></div></div>`;
A.coverageText = n => `ประเมินปริมาณได้ ${n.estMeals.length}/${n.totalMeals} มื้อ (${Object.entries(n.methods).map(([k,v])=>`${A.METHOD[k]} ${v}`).join(" · ")||"–"})${n.unknownItems?` · ${n.unknownItems} รายการไม่ทราบปริมาณ ไม่ได้นับ`:""} · นม ${n.milkDays?`บันทึก ${n.milkDays} วัน`:"ยังไม่บันทึก"}`;
/* อาหารหลัก 5 หมู่: full list, compact tiles, presence chips */
A.fiveHTML = (n) => {
  const e = A.esc, f = fmt;
  const bar = (p, v) => `<span class="meter"><i style="width:${Math.min(100,(p||0)/1.3)}%;background:var(${v})"></i><b style="left:${100/1.3}%"></b></span>`;
  return `<div class="five">${n.five.map(h=>`<div class="five-r">
    <span class="five-n" style="background:var(${h.v})">${h.n}</span>
    <div class="five-t"><b>${e(h.name)}</b><span>${e(h.food)}</span></div>
    <div class="five-p">${h.parts.map(x=>`<div class="five-part"><span class="tiny">${e(x.lab)}</span>${x.need?bar(x.p,h.v):""}<span class="num tiny">${x.need?(x.p!=null?`${f(x.v)} / ${x.need} ${x.unit}`:"ยังไม่มีบันทึก"):`${f(x.v)} ${x.unit}/วัน`}</span></div>`).join("")}
      ${h.nut?`<div class="five-part"><span class="tiny">${e(h.nut.lab)}</span>${bar(h.nut.p, h.v)}<span class="num tiny">${f(h.nut.v)} / ${h.nut.range?h.nut.range.join("–"):h.nut.need} ${h.nut.unit}${h.nut.note?` · ${e(h.nut.note)}`:""}</span></div>`:""}</div>
    <span class="pill ${h.lev} num">${h.p!=null?h.p+"%":"–"}</span></div>`).join("")}</div>`;
};
A.fiveTiles = (n) => `<div class="five-tiles">${n.five.map(h=>`<a class="five-tile" href="#nutrition" data-tip="${A.esc(h.name)}<br>${A.esc(h.summary)}"><span class="five-n sm" style="background:var(${h.v})">${h.n}</span><b>${h.short}</b><span class="meter"><i style="width:${Math.min(100,h.p||0)}%;background:var(--${h.lev==="neutral"?"unk":h.lev})"></i></span><span class="num tiny">${h.p!=null?h.p+"%":"–"}</span></a>`).join("")}</div>`;
A.fiveChips = (pr) => `<span class="five-chips" aria-label="ได้ ${pr.n} จาก 5 หมู่">${A.FIVE.map((h,i)=>`<i class="${pr.h[i]?"on":""}" style="${pr.h[i]?`background:var(${h.v})`:""}" data-tip="${h.name}: ${pr.h[i]?"มี":"ไม่มี"}">${h.n}</i>`).join("")}</span>`;
/* one meal by the 5 food groups; groups with nothing are greyed out */
A.fiveSource = (q, share) => `<details class="fold" style="margin-top:8px"><summary>ที่มาของตัวเลข %</summary><div class="tiny" style="display:grid;gap:5px;margin-top:6px">
  <span>${share===1?`<b>% = ปริมาณที่กินทั้งวัน (3 มื้อ + นม + ของว่างที่บันทึก) ÷ ปริมาณที่ควรได้ต่อวัน</b>`:`<b>% = ปริมาณที่กินในมื้อนี้ ÷ เป้าของมื้อ</b> · เป้าของมื้อ = ปริมาณที่ควรได้ต่อวัน × สัดส่วนของมื้อ${share?` (มื้อนี้ ${Math.round(share*100)}%)`:""}`}</span>
  <span><b>ปริมาณต่อวัน ${q.band}</b> จากธงโภชนาการสำหรับเด็ก: หมู่ 1 เนื้อสัตว์ ${q.serv.protein} ช้อนกินข้าว (ต้นฉบับใช้ช้อนโต๊ะ ขนาดใกล้เคียงกัน) + นม 2 กล่อง · หมู่ 2 ข้าว-แป้ง ${q.serv.carb} ทัพพี · หมู่ 3 ผัก ${q.serv.veg} ทัพพี · หมู่ 4 ผลไม้ ${q.serv.fruit} ส่วน · หมู่ 5 น้ำมัน "ใช้แต่น้อย" ไม่มีตัวเลข จึงไม่คิด % รายมื้อ <a href="https://th.rajanukul.go.th/_admin/file-research/869-0-1706064067.pdf" target="_blank" rel="noopener">สถาบันราชานุกูล</a></span>
  <span><b>สัดส่วนมื้อ</b> เช้า 20% · กลางวัน 30% · เย็น 30% อีก 20% มาจากนมและอาหารว่าง เป็นสมมติฐานของแอป อิงหลักที่ว่ามื้อหลักให้พลังงานส่วนใหญ่ และกรมอนามัยกำหนดอาหารกลางวันรวมอาหารว่างของเด็กเล็กไว้ที่ 40% ของทั้งวัน <a href="https://nutrition2.anamai.moph.go.th/web-upload/6x22caac0452648c8dd1f534819ba2f16c/filecenter/mother%20and%20child/29.pdf" target="_blank" rel="noopener">สำนักโภชนาการ กรมอนามัย</a></span>
  <span><b>ขนาด 1 หน่วย</b> ข้าวสวย 1 ทัพพี ≈ 55 ก. · เนื้อสัตว์สุก 1 ช้อนกินข้าว ≈ 15 ก. (2 ช้อน = 1 ส่วน = 30 ก.) · ไข่ 1 ฟอง = 2 ช้อน · ผลไม้ 1 ส่วน ≈ 1 กำมือ หรือ 6–8 ชิ้นพอดีคำ <a href="https://www.si.mahidol.ac.th/th/division/HpH/admin/download_files/177_49_194Qe4S.pdf" target="_blank" rel="noopener">อาหารแลกเปลี่ยน ศิริราช</a></span>
</div></details>`;
A.mealFive = (sv, kcal, share, req) => {
  const q = req || A.req(), f = fmt;
  const cells = [
    [1,"เนื้อสัตว์ ไข่ ถั่ว", sv.protein, "ช้อน", q.serv.protein*share, "--g-protein"],
    [1,"นม โยเกิร์ต", sv.milk, "มล.", share===1 ? q.serv.milk : null, "--g-milk"],
    [2,"ข้าว แป้ง", sv.carb, "ทัพพี", q.serv.carb*share, "--g-carb"],
    [3,"ผัก", sv.veg, "ทัพพี", q.serv.veg*share, "--g-veg"],
    [4,"ผลไม้", sv.fruit, "ส่วน", q.serv.fruit*share, "--g-fruit"],
    [5,"ไขมันเพิ่ม", sv.oil, "ช้อนชา", null, "--g-fat"]];
  const pr = A.present5(sv);
  return `<div class="mfive">${cells.map(([n,l,v,u,t,c])=>{ const on = v>0.001; return `<div class="mf${on?"":" off"}" ${on?"":'aria-disabled="true"'}><span class="five-n sm" style="background:var(${on?c:"--surface-3"})">${n}</span><b>${l}</b><span class="num">${on?`${f(v)} ${u}`:"ไม่มี"}</span>${on&&t?`<span class="tiny num" data-tip="${share===1?"เป้าทั้งวัน":"เป้าของมื้อนี้"} = ${l} วันละ ${f(t/share)} ${u} (ธงโภชนาการ ${q.band}) × สัดส่วนมื้อ ${Math.round(share*100)}%<br>กินได้ ${f(v)} ÷ เป้า ${f(t)} = ${Math.round(v/t*100)}%">${Math.round(v/t*100)}% · ${share===1?"เป้าวัน":"เป้ามื้อ"} ${f(t)} ${u}</span>`:""}</div>`; }).join("")}</div>
  ${A.fiveSource(q, share)}
  <p class="tiny" style="margin-top:6px">${kcal?`พลังงานราว <b class="num">${Math.round(kcal)} kcal</b>${share?` · ${Math.round(kcal/(q.kcal*share)*100)}% ของเป้ามื้อนี้ (${Math.round(q.kcal*share)} kcal)`:""} · `:""}${pr.n===5?"ครบ 5 หมู่":`ได้ ${pr.n}/5 หมู่ · ยังไม่มี ${A.FIVE.filter((h,i)=>!pr.h[i]).map(h=>"หมู่ "+h.n).join(" ")}`}</p>`;
};
/* what one eaten item converts to, for showing next to the input */
A.servText = (serv) => {
  const L = [["carb","ข้าว-แป้ง","ทัพพี"],["protein","เนื้อสัตว์ ไข่","ช้อน"],["veg","ผัก","ทัพพี"],["fruit","ผลไม้","ส่วน"],["milk","นม","มล."],["oil","ไขมัน","ช้อนชา"]];
  const parts = L.filter(([k])=>serv[k]>0.001).map(([k,l,u])=>`${l} ${serv[k]<1?+serv[k].toFixed(2):fmt(serv[k])} ${u}`);
  const kcal = Object.entries(serv).reduce((a,[k,v])=>a+(EX[k]?EX[k].kcal*v:0),0);
  return parts.length ? `${parts.join(" + ")} · ≈ ${Math.round(kcal)} kcal` : "";
};
A.nLegend = () => A.legend([["--accent","มื้อหลัก"],["--g-milk","นม"],["--g-fruit","ของว่าง"]]);
})();
