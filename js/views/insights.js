(function(){
"use strict";
const A = window.App, {$,$$,esc,icon,S,MEALS,GROUPS,STATES,thShort,parseD,toMin,hhmm,today,isoD} = A;

function subtabs(a){ return `<div class="subtabs no-print">${A.seg("ins", [["behavior","พฤติกรรมการกิน"],["nutrition","โภชนาการ"],["growth","การเติบโต"]], a, "")}</div>`; }
function mini(k,v,s,cls=""){ return `<div class="kpi ${cls}"><span class="bar"></span><span class="k">${k}</span><span class="v num">${v}</span><span class="s">${s}</span></div>`; }

function gantt(dates){
  const sched = id => S.schedule.find(x=>x.id===id);
  return MEALS.map((M,mi)=>{
    const ds = dates.filter(d=>A.clipStats(A.meal(d,M.k)) || A.meal(d,M.k).time);
    if(!ds.length) return "";
    const [w0,w1]=M.win, W=360, l=50, r=8, t=24, rowH=30, H=t+ds.length*rowH+22, X=m=>l+(m-w0)/(w1-w0)*(W-l-r);
    let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="เวลา${M.name}">`+A.unkPat("ug"+mi);
    const it=sched(M.schedId); if(it){ const a=Math.max(w0,toMin(it.start)), b=Math.min(w1,toMin(it.end)); if(b>a) s+=`<rect x="${X(a)}" y="${t-6}" width="${X(b)-X(a)}" height="${ds.length*rowH+6}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="3 3" rx="4" data-tip="ตารางกิจวัตร ${it.start}–${it.end}"/>`; }
    for(let m=Math.ceil(w0/30)*30;m<=w1;m+=30){ s+=`<line class="gridl" x1="${X(m)}" x2="${X(m)}" y1="${t-6}" y2="${t+ds.length*rowH}" opacity="${m%60?.4:1}"/>`; if(m%60===0) s+=`<text class="axis" x="${X(m)}" y="${H-6}" text-anchor="middle">${hhmm(m)}</text>`; }
    s+=`<text class="axis-strong" x="0" y="13">${M.name}</text>`;
    ds.forEach((d,i)=>{ const y=t+i*rowH, md=A.meal(d,M.k), st=A.clipStats(md); s+=`<text class="axis" x="0" y="${y+17}">${thShort(d)}</text>`;
      if(st){ [...st.codes].forEach((ch,j)=>{ const m=st.start+j; if(m<w0||m>=w1) return; s+=`<rect x="${X(m)}" y="${y+5}" width="${Math.max(.5,X(m+1)-X(m)-.4)}" height="17" fill="${ch==="?"?"url(#ug"+mi+")":"var("+STATES[ch].v+")"}"/>`; });
        s+=`<rect class="hit" x="${X(st.start)}" y="${y+3}" width="${X(st.end)-X(st.start)}" height="21" fill="transparent" data-tip="${thShort(d)} ${M.name}<br>${hhmm(st.start)}–${hhmm(st.end)} (${st.len} นาที)<br>นั่ง ${st.cnt.S} · วนโต๊ะ ${st.cnt.A} · ที่อื่น ${st.cnt.E} นาที"/>`; }
      else { const tm=(md.time||"").match(/\d{1,2}:\d{2}/g)||[]; const a=tm[0]?toMin(tm[0]):null, b=tm[1]?toMin(tm[1]):null; if(a!=null){ const bb=b!=null?b:a+30; s+=`<rect class="hit" x="${X(Math.max(w0,a))}" y="${y+5}" width="${Math.max(2,X(Math.min(w1,bb))-X(Math.max(w0,a)))}" height="17" rx="3" fill="none" stroke="var(--ink-3)" stroke-dasharray="3 2" data-tip="${thShort(d)} ${M.name}<br>เวลาที่บันทึก ${esc(md.time)} (ไม่มีคลิป)"/>`; } }
    });
    return `<div class="chart fit">${s}</svg></div>`;
  }).join("");
}
function behavior(dates){
  const s = A.stats(dates);
  const clipRows = s.rows.map(r=>({r, st:A.clipStats(r.m)})).filter(x=>x.st);
  const withClipDates = [...new Set(clipRows.map(x=>x.r.date))];
  const follow = s.rows.filter(r=>r.m.follow || (r.m.behav||[]).includes("ต้องเดินตามป้อน") || /เดินตามป้อน/.test(r.m.feedText||"")).length;
  const feedRows = s.rows.filter(r=>r.m.feedText);
  const envRows = s.rows.filter(r=>r.m.env&&r.m.env.length);
  const behavCount = {}; s.rows.forEach(r=>(r.m.behav||[]).forEach(b=>behavCount[b]=(behavCount[b]||0)+1));
  let h = `<div class="g4">
    ${mini("นั่งต่อเนื่องนานสุด", s.sitMed==null?"–":`${Math.round(s.sitMed)}<small> นาที</small>`, `จาก ${s.sitN} มื้อ`, s.sitMed==null?"":s.sitMed>=15?"good":s.sitMed>=8?"warn":"bad")}
    ${mini("เวลามื้อ", s.durMed==null?"–":`${Math.round(s.durMed)}<small> นาที</small>`, "ตั้งแต่เริ่มจนเก็บโต๊ะ", s.durMed!=null&&s.durMed>45?"warn":"")}
    ${mini("เคี้ยวแล้วคาย", `${s.spit}<small> ครั้ง</small>`, s.spit?"ดูรายการในแท็บโภชนาการ":"ไม่พบในช่วงนี้", s.spit?"warn":"good")}
    ${mini("มื้อที่ต้องเดินตามป้อน", `${follow}<small> มื้อ</small>`, `จาก ${s.rows.filter(r=>!r.m.none).length} มื้อที่มีข้อมูล`, follow?"warn":"")}
  </div>`;
  h += `<div class="card">${A.cardHead("เวลาที่อยู่ที่โต๊ะ แต่ละมื้อ", "จากคลิปกล้องวงจรปิด · แท่งยาว = มื้อยาว · สีน้ำเงิน = นั่งที่โต๊ะ")}${clipRows.length?A.legend(Object.entries(STATES).map(([k,x])=>[x.v,x.label]))+`<div class="chart">${A.chartSitBars(clipRows)}</div>`:A.empty("ยังไม่มีคลิปในช่วงนี้","เวลานั่งจากคลิปจะแสดงที่นี่ · มื้อที่บันทึกเองใช้ช่อง “นั่งต่อเนื่องนานสุด” แทน")}</div>`;
  if(withClipDates.length>1){
    const series = MEALS.map(M=>({name:M.short, v:M.v, pts:withClipDates.map(d=>{ const st=A.clipStats(A.meal(d,M.k)); return st?st.cnt.S:null; })}));
    h += `<div class="card">${A.cardHead("แนวโน้มเวลานั่งรวมต่อมื้อ", "นาทีที่นั่งที่โต๊ะ แยกตามมื้อ")}${A.legend(MEALS.map(M=>[M.v,M.name]))}<div class="chart">${A.chartLines(withClipDates.map(thShort), series, {unit:"นาที", label:"แนวโน้มเวลานั่ง"})}</div></div>`;
  }
  h += `<div class="card">${A.cardHead("เวลามื้อเทียบตารางกิจวัตร", "กรอบเส้นประ = เวลาในตารางกิจวัตร · แถบสี = คลิป · กรอบเทา = เวลาที่บันทึก", `<a class="btn sm" href="#routine">แก้ตารางกิจวัตร</a>`)}
    ${A.legend([...Object.entries(STATES).slice(0,3).map(([k,x])=>[x.v,x.label]),["--accent-soft","ตารางกิจวัตร",";border:1px dashed var(--accent)"]])}<div class="g3">${gantt(dates)||A.empty("ยังไม่มีเวลามื้อในช่วงนี้")}</div></div>`;
  h += `<div class="g2"><div class="card">${A.cardHead("ใครป้อน แต่ละมื้อ", `${feedRows.length} มื้อที่มีข้อมูล`)}${feedRows.length?`<div class="tw scroll"><table class="t"><thead><tr><th>มื้อ</th><th>การป้อน</th></tr></thead><tbody>${feedRows.slice().reverse().map(r=>`<tr><td style="white-space:nowrap"><a href="#days-${r.date}">${thShort(r.date)}</a> ${r.M.short}</td><td>${esc(r.m.feedText)}</td></tr>`).join("")}</tbody></table></div>`:A.empty("ยังไม่มีข้อมูลการป้อน")}</div>
    <div class="card">${A.cardHead("พฤติกรรมและบรรยากาศที่บันทึก", "จากแบบบันทึกในแอป")}
      ${Object.keys(behavCount).length?`<div style="display:grid;gap:8px">${Object.entries(behavCount).sort((a,b)=>b[1]-a[1]).map(([b,n])=>`<div class="accept-row"><span>${esc(b)}</span><span class="meter"><i style="width:${n/Math.max(...Object.values(behavCount))*100}%;background:var(--accent)"></i></span><span class="num tiny">${n} มื้อ</span></div>`).join("")}</div>`:A.empty("ยังไม่มีการบันทึกพฤติกรรม","เลือกพฤติกรรมในแบบบันทึกมื้ออาหาร")}
      ${envRows.length?`<ul class="list" style="margin-top:12px">${envRows.slice(-6).reverse().map(r=>`<li><span class="tiny">${thShort(r.date)} ${r.M.short}:</span> ${esc(r.m.env.join(" · "))}</li>`).join("")}</ul>`:""}
    </div></div>`;
  return h;
}

function acceptByCat(items){
  const order=A.CATS, cats={}; items.forEach(i=>{ const c=i.g||"อื่นๆ"; (cats[c]=cats[c]||{ate:[],part:[],none:[],spit:[],unk:[]})[i.st].push(`${thShort(i.date)} ${i.M.short}: ${i.n}`); });
  const keys = order.filter(k=>cats[k]).concat(Object.keys(cats).filter(k=>!order.includes(k)));
  if(!keys.length) return A.empty("ยังไม่มีรายการอาหาร");
  const so=Object.keys(A.ST);
  return A.legend(so.map(k=>[A.ST[k].v, A.ST[k].lab])) + `<div style="display:grid;gap:8px">${keys.map(k=>{ const c=cats[k], n=so.reduce((a,x)=>a+c[x].length,0); return `<div class="accept-row"><b>${esc(k)}</b><span class="stack">${so.filter(x=>c[x].length).map(x=>`<i style="flex:${c[x].length};background:var(${A.ST[x].v})" data-tip="${A.ST[x].lab} ${c[x].length}/${n}<br>${c[x].map(esc).join("<br>")}">${c[x].length}</i>`).join("")}</span><span class="num tiny">${n} รายการ</span></div>`; }).join("")}</div><p class="tiny" style="margin-top:8px">1 รายการ = 1 เมนูในหนึ่งมื้อ (นับจำนวนครั้ง ไม่ใช่ปริมาณ)</p>`;
}
function nutrition(dates){
  const s = A.stats(dates), notes=(A.base().notes||{}).needs||{}, n = A.nutri(dates), q = n.req, c = A.child(), f = A.nfmt;
  const GN = {carb:["ข้าว-แป้ง","--g-carb"], protein:["เนื้อสัตว์ ไข่","--g-protein"], veg:["ผัก","--g-veg"], fruit:["ผลไม้","--g-fruit"], milk:["นม","--g-milk"]};
  const unit = k => k==="milk"?"มล.":A.EX[k].unit;
  const servLine = `หมู่ 1 เนื้อสัตว์ ไข่ ${q.serv.protein} ช้อนกินข้าว + นม ${q.serv.milk} มล. · หมู่ 2 ข้าว-แป้ง ${q.serv.carb} ทัพพี · หมู่ 3 ผัก ${q.serv.veg} ทัพพี · หมู่ 4 ผลไม้ ${q.serv.fruit} ส่วน · หมู่ 5 ไขมัน ${q.fat[0]}–${q.fat[1]} ก. (น้ำมันใช้แต่น้อย)`;
  let h = `<div class="card">${A.cardHead(`ความต้องการต่อวันของ${esc(c.name)}`, `อายุ ${A.ageText()} · ${esc(q.sex)} · ${esc(q.wSrc)}`)}
    <div class="reqbox">
      <div><span class="k">พลังงาน</span><span class="v num">${q.kcal.toLocaleString()}<small> kcal</small></span><span class="s">${q.perKg} kcal/กก. · FAO/WHO/UNU 2004 · ค่าอ้างอิงไทย ${q.band} ${q.thaiKcal.toLocaleString()} kcal</span></div>
      <div><span class="k">โปรตีน</span><span class="v num">${q.protein}<small> ก.</small></span><span class="s">${q.protPerKg} ก./กก. · WHO/FAO/UNU 2007</span></div>
      <div><span class="k">แคลเซียม</span><span class="v num">${q.ca}<small> มก.</small></span><span class="s">ปริมาณอ้างอิงคนไทย 2563 · ${q.band}</span></div>
      <div><span class="k">ไขมัน</span><span class="v num">${q.fat[0]}–${q.fat[1]}<small> ก.</small></span><span class="s">${q.amdr.f.join("–")}% ของพลังงาน (AMDR)</span></div>
    </div>
    <p class="sub" style="margin-top:12px"><b>อาหารหลัก 5 หมู่ต่อวัน (ธงโภชนาการ ${q.band}):</b> ${servLine}</p>
    ${q.estW?`<p class="note" style="border-color:var(--warn);background:var(--warn-soft)">ยังไม่มีน้ำหนักจริง ระบบใช้ค่ากลางตามอายุ ใส่น้ำหนักล่าสุดในแท็บการเติบโตเพื่อให้ตัวเลขตรงกับลูก</p>`:""}
    ${q.girl?`<p class="tiny">สูตรพลังงานใช้สมการของเด็กหญิง · ค่ากลางน้ำหนักในเวอร์ชันนี้ยังเป็นของเด็กชาย</p>`:""}
    <details class="fold" style="margin-top:8px"><summary>วิธีคำนวณและค่าแปลงหน่วย</summary><div class="tiny" style="display:grid;gap:6px;margin-top:8px">
      <span><b>พลังงานที่ต้องการ</b> = TEE + พลังงานสำหรับการเติบโต · TEE ${q.girl?"หญิง = 263.4 + 65.3×น้ำหนัก − 0.454×น้ำหนัก²":"ชาย = 310.2 + 63.3×น้ำหนัก − 0.263×น้ำหนัก²"} = ${q.tee} kcal${q.ageY<2?" (อายุ 1–2 ปีลด 7%)":""} + เติบโต ${f(q.gain)} ก./วัน × 2 kcal</span>
      <span><b>โปรตีน</b> = ${q.protPerKg} ก./กก. × ${q.W} กก. · <b>แคลเซียม</b> ${q.ca} มก. · <b>สัดส่วนพลังงาน</b> คาร์บ ${q.amdr.c.join("–")}% โปรตีน ${q.amdr.p.join("–")}% ไขมัน ${q.amdr.f.join("–")}%</span>
      <span><b>มื้อหลัก</b> ควรให้ราว ${Math.round(n.MEAL_SHARE*100)}% ของทั้งวัน (เช้า 20% กลางวัน 30% เย็น 30%) ที่เหลือมาจากนมและอาหารว่าง</span>
      ${Object.values(A.EX).map(x=>`<span>${esc(x.name)}: ${esc(x.basis)}</span>`).join("")}
      <span>หน่วยครัวเรือนอื่นแปลงโดยประมาณ เช่น ข้าว 1 คำ ≈ ⅛ ทัพพี · ผลไม้ 1 ชิ้นพอดีคำ ≈ 0.15 ส่วน · ขนมปัง 1 แผ่น ≈ 1 ทัพพี · ไข่ 1 ฟอง = 2 ช้อนกินข้าว</span>
    </div></details></div>`;
  h += `<div class="g-21"><div class="card">${A.cardHead("ได้รับเทียบความต้องการ", "เฉลี่ยต่อวันในช่วงที่เลือก")}
      ${n.estMeals.length?`${A.nLegend()}${A.adequacy(n)}
      <div style="margin-top:18px"><h4 style="margin-bottom:8px">พลังงานมาจากอะไร${n.milkKnown?"":" (มื้อหลัก)"}</h4>${A.macroBar(n.macro, q)}</div>
      <p class="tiny" style="margin-top:12px">${n.milkKnown?"":"* ยังไม่รวมนม จึงเทียบกับ 80% ที่ควรได้จากมื้อหลัก · "}${esc(A.coverageText(n))} · มื้อที่ไม่ได้ประเมินไม่นับเป็นศูนย์ ใช้ค่าเฉลี่ยของมื้อที่ประเมินได้แทน</p>`:A.empty("ยังคำนวณไม่ได้","ใส่ปริมาณที่กินในแต่ละมื้อ เป็นหน่วยครัวเรือนหรือเป็นหมู่อาหาร")}</div>
    <div class="card">${A.cardHead("ขาดอะไร ควรเพิ่มอะไร", "จากการคำนวณ ไม่ใช่การวินิจฉัย")}${A.gapsHTML(n.gaps)}</div></div>`;
  const mx = Math.max(130, ...n.groups.map(g=>g.p||0));
  h += `<div class="card">${A.cardHead("อาหารหลัก 5 หมู่ ต่อวัน", `เทียบธงโภชนาการ ${q.band} และความต้องการสารอาหาร · เฉลี่ยต่อวัน รวมนมและของว่างที่บันทึก`, n.fiveDays?`<span class="pill ${n.fiveFull===n.fiveDays?"good":n.fiveFull?"warn":"bad"}">ครบ 5 หมู่ ${n.fiveFull}/${n.fiveDays} วัน</span>`:"")}
    ${n.estMeals.length?`${A.fiveHTML(n)}<p class="tiny" style="margin-top:10px">เส้นขีด = 100% ของที่ควรได้ทั้งวัน · % ของหมู่ = ค่าเฉลี่ยของส่วนย่อยในหมู่ · หมู่ 5 เทียบไขมันรวมกับขั้นต่ำ ${q.amdr.f[0]}% ของพลังงาน · "ครบ 5 หมู่" นับเฉพาะวันที่ประเมินได้ครบ 3 มื้อ${n.milkKnown?"":" · ยังไม่มีบันทึกนม หมู่ 1 จึงคิดจากเนื้อสัตว์ ไข่ ถั่วเท่านั้น"}</p>`:A.empty("ยังไม่มีการประเมินปริมาณ")}</div>
  <div class="card">${A.cardHead("บันทึกของผู้ปกครองรายหมู่")}<div class="g3" style="gap:8px">
      ${[["protein","หมู่ 1 เนื้อสัตว์ ไข่"],["milk","หมู่ 1 นม"],["carb","หมู่ 2 ข้าว-แป้ง"],["veg","หมู่ 3 ผัก"],["fruit","หมู่ 4 ผลไม้"],["iron","ธาตุเหล็ก (ตับ เลือด เนื้อแดง)"]].map(([k,nm])=>{ const g=n.groups.find(x=>x.k===k); const need = k==="iron"?"สัปดาห์ละ 1–2 ครั้ง":`วันละ ${q.serv[k]} ${unit(k)}`; const pv = k==="iron"?(n.iron.hit?`พบ ${n.iron.hit} ครั้ง`:null):g&&g.p!=null?`${g.p}%`:null; const lv = k==="iron"?(n.iron.hit?"warn":"bad"):!g||g.p==null?"neutral":g.p<50?"bad":g.p<80?"warn":"good"; return `<div class="need"><div class="need-h"><b>${nm} <span class="tiny">· ${need}</span></b><span class="pill ${lv}">${pv||"ไม่มีข้อมูล"}</span></div>${notes[k]?`<p>${esc(notes[k])}</p>`:""}</div>`; }).join("")}
    </div></div></div>`;
  // daily table
  const dd = n.days.filter(x=>x.hasAny);
  h += `<div class="card">${A.cardHead("พลังงานและสารอาหารรายวัน", `${dd.length} วันที่คำนวณได้ · ความต้องการ ${q.kcal} kcal · โปรตีน ${q.protein} ก. · แคลเซียม ${q.ca} มก.`)}
    ${dd.length?`<div class="tw scroll"><table class="t"><thead><tr><th>วัน</th><th>มื้อที่ประเมิน</th><th>จากมื้อหลัก</th><th>นม</th><th>รวม</th><th>% ความต้องการ</th><th>โปรตีน</th><th>แคลเซียม</th><th>ไขมัน</th><th>ข้าว-แป้ง</th><th>เนื้อสัตว์ ไข่</th><th>นม</th><th>ผัก</th><th>ผลไม้</th><th>5 หมู่</th></tr></thead><tbody>${dd.slice().reverse().map(x=>{
      const k=x.tot.kcal, pc=Math.round(k/x.req.kcal*100), pm = x.milkMl==null?pc/0.8:pc, lv = pm<75?"bad":pm<90?"warn":"good";
      const fp = k?Math.round(x.tot.f*9/k*100):null;
      return `<tr><td style="white-space:nowrap"><a href="#days-${x.date}">${thShort(x.date)}</a></td><td class="num">${x.est}/3${x.est<3?' <span class="tiny">ไม่ครบ</span>':""}</td><td class="num">${Math.round(x.meal.kcal)} kcal</td><td class="num">${x.milkMl!=null?x.milkMl+" มล.":'<span class="tiny">ไม่ได้บันทึก</span>'}</td><td class="num"><b>${Math.round(k)}</b> kcal</td><td><span class="meter" style="width:90px;display:block"><i style="width:${Math.min(100,pc)}%;background:var(--${lv})"></i></span><span class="tiny num">${pc}%${x.milkMl==null?" (ไม่รวมนม)":""}</span></td><td class="num">${f(x.tot.p)} ก. <span class="tiny">${Math.round(x.tot.p/x.req.protein*100)}%</span></td><td class="num">${Math.round(x.tot.ca)} มก. <span class="tiny">${Math.round(x.tot.ca/x.req.ca*100)}%</span></td><td class="num">${fp!=null?fp+"%":"–"}</td>${[["carb","--g-carb"],["protein","--g-protein"],["milk","--g-milk"],["veg","--g-veg"],["fruit","--g-fruit"]].map(([k,c])=>{ const v=x.tot.serv[k], need=x.req.serv[k]; if(k==="milk"&&x.milkMl==null&&!v) return `<td class="off tiny">ไม่ได้บันทึก</td>`; if(!v) return `<td class="off tiny num">0%</td>`; const pc=Math.round(v/need*100); return `<td><span class="meter" style="width:56px;display:block"><i style="width:${Math.min(100,pc)}%;background:var(${c})"></i></span><span class="tiny num">${pc}%</span></td>`; }).join("")}<td style="white-space:nowrap">${A.fiveChips(x.five)} <span class="tiny num">${x.five.n}/5</span></td></tr>`; }).join("")}</tbody></table></div>
    <p class="tiny" style="margin-top:8px">% ของแต่ละหมู่ = ปริมาณที่กินทั้งวัน ÷ ปริมาณที่ควรได้ต่อวันตามธงโภชนาการ ${q.band} (ข้าว-แป้ง ${q.serv.carb} ทัพพี · เนื้อสัตว์ ${q.serv.protein} ช้อน · นม ${q.serv.milk} มล. · ผัก ${q.serv.veg} ทัพพี · ผลไม้ ${q.serv.fruit} ส่วน) · วันที่ประเมินไม่ครบ 3 มื้อ ตัวเลขรวมจะต่ำกว่าความจริง · ดูค่าเฉลี่ยด้านบนซึ่งปรับตามมื้อที่ประเมินได้</p>`:A.empty("ยังไม่มีวันที่คำนวณได้")}</div>`;
  const ft = A.foodTable(s.items).sort((a,b)=>(b.ok+b.no)-(a.ok+a.no));
  h += `<div class="g2"><div class="card">${A.cardHead("การยอมรับอาหารตามหมวด")}${acceptByCat(s.items)}</div>
    <div class="card">${A.cardHead("เมนูที่เสิร์ฟ: กินได้กี่ครั้ง", `${ft.length} เมนู`)}${ft.length?`<div class="tw" style="max-height:420px"><table class="t ftable"><thead><tr><th>เมนู</th><th>กินได้</th><th>ไม่กิน/คาย</th><th></th></tr></thead><tbody>${ft.map(f=>{ const n=f.ok+f.no; return `<tr><td>${esc(f.n)}<br><span class="tiny">${esc(f.g||"")}</span></td><td class="num">${f.ok}</td><td class="num">${f.no}</td><td>${n?`<span class="meter" style="width:70px;display:block"><i style="width:${f.ok/n*100}%;background:var(--${A.lev(f.ok/n)})"></i></span>`:""}</td></tr>`; }).join("")}</tbody></table></div>`:A.empty("ยังไม่มีรายการอาหาร")}</div></div>`;
  const COLS = [["protein","หมู่ 1 เนื้อสัตว์","ช้อน"],["milk","หมู่ 1 นม","มล."],["carb","หมู่ 2 ข้าว-แป้ง","ทัพพี"],["veg","หมู่ 3 ผัก","ทัพพี"],["fruit","หมู่ 4 ผลไม้","ส่วน"],["oil","หมู่ 5 ไขมันเพิ่ม","ช้อนชา"]];
  const colV = {protein:"--g-protein", milk:"--g-milk", carb:"--g-carb", veg:"--g-veg", fruit:"--g-fruit", oil:"--g-fat"};
  h += `<div class="card">${A.cardHead("5 หมู่และพลังงาน รายมื้อ", "ค่าประเมิน ไม่ได้ชั่ง · % เทียบเป้าของมื้อนั้น (สัดส่วนมื้อ × ปริมาณที่ควรได้ทั้งวัน)")}${n.estMeals.length?`<div class="tw scroll"><table class="t"><thead><tr><th>มื้อ</th>${COLS.map(([k,l,u])=>`<th>${l}<br><span class="tiny">${u}</span></th>`).join("")}<th>พลังงาน</th><th>หมู่ที่มี</th><th>วิธีประเมิน</th></tr></thead><tbody>${n.estMeals.slice().reverse().map(x=>{ const it=x.it, sh=x.M.share; const tds=COLS.map(([k])=>{ const v=it.serv[k]||0; if(k==="oil"||k==="milk") return `<td class="num tiny${v?"":" off"}">${v?f(v):"ไม่มี"}</td>`; const tg=q.serv[k]*sh, pc=Math.round(v/tg*100); if(!v) return `<td class="off tiny">ไม่มี</td>`; return `<td><span class="meter" style="width:64px;display:block"><i style="width:${Math.min(100,pc)}%;background:var(${colV[k]})"></i></span><span class="tiny num">${f(v)} · ${pc}%</span></td>`; }).join(""); const tk=it.kcal, pk=Math.round(tk/(q.kcal*sh)*100), pr=A.present5(it.serv); return `<tr><td style="white-space:nowrap"><a href="#days-${x.date}">${thShort(x.date)}</a> ${x.M.short}</td>${tds}<td class="num" style="white-space:nowrap"><b>${Math.round(tk)}</b> kcal <span class="pill ${pk<60?"bad":pk<85?"warn":"good"} num">${pk}%</span></td><td style="white-space:nowrap">${A.fiveChips(pr)}</td><td class="tiny">${esc(A.METHOD[it.method])}${it.unknown?` · ${it.unknown} รายการไม่ทราบปริมาณ`:""}</td></tr>`; }).join("")}</tbody></table></div><p class="tiny" style="margin-top:8px">หมู่ 5 นับเฉพาะไขมันที่เพิ่มจากการปรุง (ผัด ทอด เจียว กะทิ ครีม เนย) ไขมันในเนื้อสัตว์และนมรวมอยู่ในไขมันรวมด้านบนแล้ว</p>`:A.empty("ยังไม่มีการประเมินปริมาณ")}</div>`;
  return h;
}

function growth(){
  const gn = A.growthNow(), R=A.ref(), c=A.child(), g=gn.g;
  const wp = g.filter(x=>x.weight).map(x=>{ const am=A.ageAt(parseD(x.date)).months; return {x:am,y:x.weight,label:x.weight+" กก.",tip:`${thShort(x.date)} · ${am.toFixed(1)} เดือน<br>น้ำหนัก ${x.weight} กก. (z ${A.zfmt(A.zAt(R.wfa,am,x.weight))})`}; });
  const hp = g.filter(x=>x.height).map(x=>{ const am=A.ageAt(parseD(x.date)).months; return {x:am,y:x.height,label:(x.heightText||x.height)+" ซม.",tip:`${thShort(x.date)} · ${am.toFixed(1)} เดือน<br>ส่วนสูง ${x.heightText||x.height} ซม. (z ${A.zfmt(A.zAt(R.lfa,am,x.height))})`}; });
  const fp = g.filter(x=>x.weight&&x.height).map(x=>({x:x.height,y:x.weight,label:x.weight+" กก.",tip:`${thShort(x.date)}<br>${x.weight} กก. ที่ ${x.heightText||x.height} ซม.`}));
  const leg = A.legend([["--good-soft","ตามเกณฑ์ (±1.5 SD)",";border:1px solid var(--good)"],["--warn-soft","ค่อนข้างน้อย/มาก (1.5–2 SD)",";border:1px solid var(--warn)"],["--bad-soft","เกิน 2 SD",";border:1px solid var(--bad)"]]);
  const card = (t,sub,svg) => `<div class="card">${A.cardHead(t,sub)}<div class="chart fit">${svg}</div></div>`;
  let h = `<div class="g-21"><div class="card">${A.cardHead("สถานะล่าสุด", gn.last?`วัดล่าสุด ${thShort(gn.last.date)} · อายุ ${A.ageText(parseD(gn.last.date))}`:"ยังไม่มีข้อมูล")}
      <div class="growth-hero"><div class="ring ${gn.lev}">${gn.lev==="good"?"ตามเกณฑ์":gn.lev==="warn"?"เฝ้าดู":gn.lev==="bad"?"ปรึกษาหมอ":"–"}</div><div><div class="gh-v num">${gn.lw?`${gn.lw.weight} กก.`:"–"}</div><div class="sub num">${gn.lh?`ส่วนสูง ${esc(gn.lh.heightText||gn.lh.height)} ซม.`:""}</div></div></div><div class="zlist">
        <div class="zrow"><span class="sub">น้ำหนักตามอายุ</span>${A.zPill("wfa",gn.z1)}</div><div class="zrow"><span class="sub">ส่วนสูงตามอายุ</span>${A.zPill("lfa",gn.z2)}</div><div class="zrow"><span class="sub">น้ำหนักตามส่วนสูง</span>${A.zPill("wfl",gn.z3)}</div></div>
      ${c.sex!=="ชาย"?`<p class="note" style="margin-top:12px;border-color:var(--warn);background:var(--warn-soft)">เกณฑ์อ้างอิงในเวอร์ชันนี้เป็นของเด็กชาย ค่า z-score ของเด็กหญิงยังไม่ถูกต้อง</p>`:""}</div>
    <div class="card">${A.cardHead("เพิ่มการวัด")}${S.canWrite?`<div style="display:grid;gap:10px"><label class="field">วันที่<input type="date" id="gf-d" value="${today()}" max="${today()}"></label><div class="frow"><label class="field">น้ำหนัก (กก.)<input type="number" step="0.1" min="3" max="30" id="gf-w"></label><label class="field">ส่วนสูง (ซม.)<input type="number" step="0.1" min="45" max="120" id="gf-h"></label></div><button class="btn primary" id="gf-save">${icon("plus")}บันทึกการวัด</button><span class="tiny" id="gf-msg"></span></div>`:`<p class="sub">บัญชีนี้ดูได้อย่างเดียว</p>`}</div></div>
    ${leg}<div class="g3">
      ${card("น้ำหนักตามอายุ","อายุ 12–36 เดือน", A.chartGrowth("wfa",R.wfa,[12,36],[6,20],wp,"อายุ (เดือน)","กก.",6,2,c.name))}
      ${card("ความยาวตามอายุ","อายุ 12–24 เดือน (วัดแบบนอน)", A.chartGrowth("lfa",R.lfa,[12,24],[66,96],hp,"อายุ (เดือน)","ซม.",3,5,c.name))}
      ${card("น้ำหนักตามความยาว","ความยาว 75–95 ซม.", A.chartGrowth("wfl",R.wfl,[75,95],[7,18],fp,"ความยาว (ซม.)","กก.",5,2,c.name))}
    </div>
    <div class="card">${A.cardHead("ประวัติการวัด", `${g.length} ครั้ง`)}${g.length?`<div class="tw"><table class="t"><thead><tr><th>วันที่</th><th>อายุ</th><th>น้ำหนัก</th><th>ส่วนสูง</th><th>น้ำหนัก/อายุ</th><th>ส่วนสูง/อายุ</th><th>น้ำหนัก/ส่วนสูง</th><th>ที่มา</th></tr></thead><tbody>${g.slice().reverse().map(x=>{ const am=A.ageAt(parseD(x.date)).months; return `<tr><td>${thShort(x.date)}</td><td class="num">${am.toFixed(1)} ด.</td><td class="num">${x.weight??"–"}</td><td class="num">${esc(x.heightText||x.height||"–")}</td><td>${x.weight?A.zPill("wfa",A.zAt(R.wfa,am,x.weight)):"–"}</td><td>${x.height?A.zPill("lfa",A.zAt(R.lfa,am,x.height)):"–"}</td><td>${x.weight&&x.height?A.zPill("wfl",A.zAt(R.wfl,x.height,x.weight)):"–"}</td><td class="tiny">${esc(x.src||"")}${x.note?" · "+esc(x.note):""}</td></tr>`; }).join("")}</tbody></table></div>`:A.empty("ยังไม่มีการวัด")}
    <p class="tiny" style="margin-top:8px">เกณฑ์กรมอนามัย (ประยุกต์จากมาตรฐาน WHO) แบ่งระดับที่ ±1.5 และ ±2 SD · ก่อนอายุ 2 ปีวัดแบบนอน (ความยาว)</p></div>`;
  return h;
}
A.views.insights = { render(a){
  const tab = ["behavior","nutrition","growth"].includes(a)?a:"behavior";
  const el=$("#v-insights"), dates=A.rangeDates();
  el.innerHTML = subtabs(tab) + (tab==="behavior"?behavior(dates):tab==="nutrition"?nutrition(dates):growth());
  $$('[data-seg="ins"] button', el).forEach(b=>b.onclick=()=>A.go(b.dataset.v));
  const sv=$("#gf-save"); if(sv) sv.onclick=async()=>{ const d=$("#gf-d").value, w=parseFloat($("#gf-w").value), hh=parseFloat($("#gf-h").value);
    if(!d||(!w&&!hh)){ $("#gf-msg").textContent="ใส่วันที่ และน้ำหนักหรือส่วนสูงอย่างน้อยหนึ่งค่า"; return; }
    const rec={...(S.growthExtra[d]||{})}; if(w) rec.weight=w; if(hh){ rec.height=hh; rec.heightText=String(hh); } rec.src="บันทึกในแอป";
    if(await A.save("growth/"+d, rec)){ S.growthExtra[d]=rec; A.toast("บันทึกการวัดแล้ว"); A.emit("growthExtra"); } else $("#gf-msg").textContent="บันทึกไม่สำเร็จ"; };
}};
})();
