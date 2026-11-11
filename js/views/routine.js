(function(){
"use strict";
const A = window.App, {$,$$,esc,icon,S,PERIODS,periodOf,DEFAULT_SCHED,toMin,hhmm,today,thShort,thLong,addDays} = A;
const nowMin = () => { const n=new Date(); return n.getHours()*60+n.getMinutes(); };
const curItem = m => S.schedule.find(it=>{ const a=toMin(it.start), b=toMin(it.end); return b<=a ? (m>=a||m<b) : (m>=a&&m<b); });
const schedItem = id => S.schedule.find(x=>x.id===id);
let lcDate = today();

function dial(){
  const R=128, c=170, W=340; const ang=m=>(m/1440)*2*Math.PI-Math.PI/2; const P=(m,r)=>[c+r*Math.cos(ang(m)), c+r*Math.sin(ang(m))];
  const arc=(a,b,r1,r2)=>{ if(b<=a) b+=1440; const lg=(b-a)>720?1:0; const [x1,y1]=P(a,r2),[x2,y2]=P(b,r2),[x3,y3]=P(b,r1),[x4,y4]=P(a,r1); return `M${x1},${y1}A${r2},${r2} 0 ${lg} 1 ${x2},${y2}L${x3},${y3}A${r1},${r1} 0 ${lg} 0 ${x4},${y4}Z`; };
  let s=`<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="นาฬิกา 24 ชั่วโมงของตารางกิจวัตร">`;
  PERIODS.forEach(p=>{ s+=`<path d="${arc(p.from%1440,p.to%1440,R+2,R+10)}" fill="var(${p.v})" opacity=".5"/>`; });
  S.schedule.forEach(it=>{ const a=toMin(it.start), b=toMin(it.end), p=periodOf(a); s+=`<path class="hit" d="${arc(a,b-1.5,R-46,R-12)}" fill="var(${p.v})" stroke="var(--surface)" stroke-width="1.5" data-tip="${it.start}–${it.end}<br>${esc(it.label)}${it.focus?"<br>★ เน้นเวลาเริ่ม":""}"/>`; if(it.focus){ const [x,y]=P(a,R-29); s+=`<circle cx="${x}" cy="${y}" r="4" fill="var(--ink)" stroke="var(--surface)" stroke-width="1.5" pointer-events="none"/>`; } });
  for(let h=0;h<24;h+=3){ const [x,y]=P(h*60,R+22); s+=`<text class="axis" x="${x}" y="${y+4}" text-anchor="middle">${String(h).padStart(2,"0")}</text>`; }
  const m=nowMin(); const [hx,hy]=P(m,R+4); const it=curItem(m);
  s+=`<line x1="${c}" y1="${c}" x2="${hx}" y2="${hy}" stroke="var(--bad)" stroke-width="2.5" stroke-linecap="round"/><circle cx="${c}" cy="${c}" r="5" fill="var(--bad)"/><text x="${c}" y="${c+34}" text-anchor="middle" class="axis">${esc(it?it.label.slice(0,18):"")}</text>`;
  return s+"</svg>";
}
function line(){
  const W=1140,l=6,r=6,H=170,base=360, X=m=>l+(((m-base)+1440)%1440)/1440*(W-l-r);
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="ไทม์ไลน์ 24 ชั่วโมง">`;
  PERIODS.forEach(p=>{ s+=`<rect x="${X(p.from%1440)}" y="4" width="${(p.to-p.from)/1440*(W-l-r)}" height="18" fill="var(${p.v})" opacity=".6"/><text class="axis-strong" x="${X(p.from%1440)+6}" y="17">${p.name}</text>`; });
  for(let h=0;h<24;h++){ const m=(base+h*60)%1440; s+=`<line class="gridl" x1="${X(m)}" x2="${X(m)}" y1="26" y2="140"/>`; if(h%2===0) s+=`<text class="axis" x="${X(m)+2}" y="${H-14}">${hhmm(m)}</text>`; }
  s+=`<text class="axis" x="${l}" y="40">ตารางกิจวัตร</text>`;
  S.schedule.forEach((it,i)=>{ const a=toMin(it.start), b=toMin(it.end), xa=X(a); let xb=X(b); if(xb<=xa) xb=W-r; const p=periodOf(a), y=46+(i%2)*22;
    s+=`<rect class="hit" x="${xa}" y="${y}" width="${Math.max(3,xb-xa-1)}" height="18" rx="4" fill="var(${p.v})" data-tip="${it.start}–${it.end}<br>${esc(it.label)}"/>`;
    const n=Math.floor((xb-xa-10)/6.5); if(n>=3) s+=`<text class="axis" x="${xa+5}" y="${y+13}" style="fill:#0d0f1e" pointer-events="none">${esc(it.label.length>n?it.label.slice(0,n-1)+"…":it.label)}</text>`; });
  s+=`<text class="axis" x="${l}" y="104">ทำจริง (${thShort(lcDate)})</text>`;
  const lg=S.logs[lcDate]||{}, ents=lg.entries||{};
  Object.entries(ents).forEach(([id,e])=>{ const it=schedItem(id);
    if(e.skip&&!e.start&&it){ const t=toMin(it.start); s+=`<circle class="hit" cx="${X(t)}" cy="121" r="7" fill="var(--bad-soft)" stroke="var(--bad)" stroke-width="1.5" data-tip="${esc(it.label)}<br>วันนี้ทำไม่ได้"/>`; return; }
    if(!e.start) return; const t=toMin(e.start), d=it?t-toMin(it.start):null;
    s+=`<circle class="hit" cx="${X(t)}" cy="121" r="6" fill="var(--accent)" data-tip="${esc(it?it.label:id)}<br>เริ่ม ${e.start}${d!=null?`<br>${d>=0?"ช้ากว่า":"เร็วกว่า"}ตาราง ${Math.abs(d)} นาที`:""}${e.note?"<br>"+esc(e.note):""}"/>`;
    if(d!=null) s+=`<text class="axis-strong" x="${X(t)+8}" y="125" style="fill:var(${Math.abs(d)<=15?"--good":"--warn"})">${d>0?"+":""}${d}</text>`; });
  (lg.extra||[]).forEach(e=>{ if(!e.start) return; s+=`<circle class="hit" cx="${X(toMin(e.start))}" cy="121" r="5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2" data-tip="${esc(e.label)} ${e.start}"/>`; });
  if(lcDate===today()){ const m=nowMin(); s+=`<line x1="${X(m)}" x2="${X(m)}" y1="4" y2="140" stroke="var(--bad)" stroke-width="2"/><text class="axis-strong" x="${X(m)+4}" y="${H-28}" style="fill:var(--bad)">ตอนนี้</text>`; }
  return s+"</svg>";
}
function schedHtml(){
  if(!S.editSched){ const it=curItem(nowMin());
    return S.schedule.map(x=>{ const p=periodOf(toMin(x.start)); return `<div class="srow${it&&it.id===x.id?" cur":""}"><span class="t num">${x.start}<small>ถึง ${x.end}</small></span><span><i class="per" style="background:var(${p.v})"></i>${esc(x.label)}</span>${x.focus?'<span class="pill accent">เน้นเวลาเริ่ม</span>':"<span></span>"}</div>`; }).join(""); }
  return `<div class="edit-row tiny"><span>เริ่ม</span><span>สิ้นสุด</span><span class="lbl">กิจกรรม</span><span>เน้น</span><span></span></div>`+S.schedule.map((x,i)=>`<div class="edit-row" data-i="${i}"><input class="inp" type="time" id="es-s${i}" value="${x.start}" aria-label="เวลาเริ่ม"><input class="inp" type="time" id="es-e${i}" value="${x.end}" aria-label="เวลาสิ้นสุด"><input class="inp lbl" id="es-l${i}" value="${esc(x.label)}" aria-label="ชื่อกิจกรรม"><label class="check"><input type="checkbox" id="es-f${i}" ${x.focus?"checked":""}>เริ่ม</label><button class="icbtn" data-del="${i}" aria-label="ลบ">${icon("x")}</button></div>`).join("")+
    `<div class="chips" style="margin-top:8px"><button class="btn sm" id="es-add">${icon("plus")}เพิ่มกิจกรรม</button><button class="btn sm" id="es-reset">ใช้ตารางเริ่มต้น</button><button class="btn primary sm" id="es-save">บันทึกตาราง</button></div>`;
}
function collect(){ S.schedule.forEach((it,i)=>{ const s=$("#es-s"+i); if(!s) return; it.start=s.value||it.start; it.end=$("#es-e"+i).value||it.end; it.label=$("#es-l"+i).value.trim()||it.label; it.focus=$("#es-f"+i).checked; }); }
function logHtml(){
  const d=lcDate, td=today(), lg=S.logs[d]||{entries:{},extra:[]}, ents=lg.entries||{};
  return `<div class="day-head" style="margin-bottom:8px"><button class="icbtn" id="lh-prev" aria-label="วันก่อนหน้า">${icon("chevL")}</button><input class="inp" style="width:auto" type="date" id="lh-date" value="${d}" max="${td}" aria-label="วันที่"><button class="icbtn" id="lh-next" aria-label="วันถัดไป" ${d>=td?"disabled":""}>${icon("chevR")}</button>${d<td?`<span class="pill warn">บันทึกย้อนหลัง</span>`:""}</div>
  <p class="tiny">${d===td?"กด “ตอนนี้” เมื่อเริ่มกิจกรรม หรือพิมพ์เวลาเอง บันทึกทันที":"พิมพ์เวลาที่เกิดขึ้นจริงของวันนั้นได้เลย"}</p>`+
  S.schedule.map(it=>{ const e=ents[it.id]||{}, dl=e.start?toMin(e.start)-toMin(it.start):null;
    return `<div class="lrow"><span>${esc(it.label)}<small>ตาราง ${it.start}</small></span><input class="inp" type="time" data-lt="${it.id}" value="${e.start||""}" aria-label="เวลาเริ่มจริงของ ${esc(it.label)}" ${S.canWrite?"":"disabled"}><span>${e.skip&&!e.start?'<span class="pill bad">ทำไม่ได้</span>':dl==null?'<span class="tiny">ยังไม่บันทึก</span>':`<span class="pill ${Math.abs(dl)<=15?"good":"warn"} num">${dl>0?"+":""}${dl} นาที</span>`}</span>${S.canWrite&&d===td?`<button class="btn sm" data-lnow="${it.id}">ตอนนี้</button>`:"<span></span>"}
      <div class="lnote"><label class="check tiny"><input type="checkbox" data-lskip="${it.id}" ${e.skip?"checked":""}>ทำไม่ได้</label><input class="inp" style="flex:1;min-height:34px;padding:4px 8px;font-size:.84rem" data-lnote="${it.id}" value="${esc(e.note||"")}" placeholder="หมายเหตุ"></div></div>`; }).join("")+
  (lg.extra||[]).map((e,i)=>`<div class="lrow"><span>${esc(e.label)}<small>กิจกรรมเพิ่มเติม</small></span><span class="num">${e.start}</span><span></span>${S.canWrite?`<button class="btn sm" data-xdel="${i}">ลบ</button>`:""}</div>`).join("")+
  (S.canWrite?`<div class="frow" style="margin-top:10px"><label class="field">กิจกรรมอื่น<input id="lx-l" placeholder="เช่น กินขนม ตื่นนอนกลางวัน"></label><label class="field">เวลา<input type="time" id="lx-t"></label><button class="btn" id="lx-add" style="align-self:end">${icon("plus")}เพิ่ม</button></div>`:"")+
  `<label class="field" style="margin-top:10px">หมายเหตุของวันนี้<textarea class="inp" id="day-note" rows="2" ${S.canWrite?"":"disabled"}>${esc(lg.dayNote||"")}</textarea></label>`;
}
const clone = d => { const lg=S.logs[d]||{}; return {entries:JSON.parse(JSON.stringify(lg.entries||{})), extra:JSON.parse(JSON.stringify(lg.extra||[])), dayNote:lg.dayNote||""}; };
async function put(L){ S.logs[lcDate]=L; await A.save("lifelogs/"+lcDate, L); }
async function setField(id,k,v){ const L=clone(lcDate), e={...(L.entries[id]||{})}; if(v===""||v===false) delete e[k]; else e[k]=v; e.at=new Date().toISOString(); L.entries[id]=e; await put(L); }

A.views.routine = {
  tick(){ const n=$("#now-time"); if(!n) return; n.textContent=hhmm(nowMin()); $("#dial").innerHTML=dial(); $("#lc-line").innerHTML=line(); },
  render(){
    const el=$("#v-routine"), m=nowMin(), it=curItem(m);
    const nx = S.schedule.filter(x=>x.focus).map(x=>({x,d:((toMin(x.start)-m)+1440)%1440})).filter(o=>o.d>0).sort((a,b)=>a.d-b.d)[0];
    el.innerHTML = `<div class="g-21">
      <div class="card now"><p class="sub">${thLong(today())}</p><div class="clock num" id="now-time">${hhmm(m)}</div>
        <div class="note"><span class="tiny">ตามตารางกิจวัตร ตอนนี้ควรเป็นช่วง</span><br><b style="font-size:1.1rem">${it?`${esc(it.label)} (${it.start}–${it.end})`:"ช่วงว่าง"}</b></div>
        ${nx?`<p class="sub">ถัดไป: <b>${esc(nx.x.label)}</b> ${nx.x.start} (อีก ${Math.floor(nx.d/60)?Math.floor(nx.d/60)+" ชม. ":""}${nx.d%60} นาที)</p>`:""}</div>
      <div class="card">${A.cardHead("นาฬิกา 24 ชั่วโมง","จุดดำ = เน้นเวลาเริ่ม · เข็มแดง = ตอนนี้")}<div class="dial" id="dial">${dial()}</div></div></div>
      <div class="card">${A.cardHead("ไทม์ไลน์ 24 ชั่วโมง: ตารางกับสิ่งที่ทำจริง", "จุดสีแถวล่าง = เวลาที่บันทึกจริง · ± = ช้าหรือเร็วกว่าตาราง (นาที)")}${A.legend(PERIODS.map(p=>[p.v,`${p.name} ${hhmm(p.from)}–${hhmm(p.to)}`]))}<div class="chart" id="lc-line">${line()}</div></div>
      <div class="g2"><div class="card">${A.cardHead("ตารางกิจวัตรที่ใช้", "", S.canWrite?`<button class="btn sm" id="sched-edit">${S.editSched?"ยกเลิก":icon("edit")+"แก้ไขเวลา"}</button>`:"")}<div id="sched">${schedHtml()}</div></div>
      <div class="card">${A.cardHead("บันทึกเวลาจริงของวัน")}<div id="lclog">${logHtml()}</div></div></div>`;
    const se=$("#sched-edit"); if(se) se.onclick=()=>{ S.editSched=!S.editSched; if(!S.editSched){ const c=S.schedRemote; S.schedule=c&&c.items&&c.items.length?c.items.map(x=>({...x})):DEFAULT_SCHED.map(x=>({...x})); } this.render(); };
    if(S.editSched){
      $$("[data-del]",el).forEach(b=>b.onclick=()=>{ collect(); S.schedule.splice(+b.dataset.del,1); this.render(); });
      $("#es-add").onclick=()=>{ collect(); S.schedule.push({id:"c"+Date.now(),start:"12:00",end:"12:30",label:"กิจกรรมใหม่",focus:false}); this.render(); };
      $("#es-reset").onclick=()=>{ S.schedule=DEFAULT_SCHED.map(x=>({...x})); this.render(); };
      $("#es-save").onclick=async()=>{ collect(); S.schedule.sort((a,b)=>((toMin(a.start)-360+1440)%1440)-((toMin(b.start)-360+1440)%1440)); if(await A.save("app/schedule",{items:S.schedule})){ S.schedRemote={items:S.schedule.map(x=>({...x}))}; S.editSched=false; A.toast("บันทึกตารางแล้ว"); this.render(); } };
    }
    const go=v=>{ if(!v) return; lcDate=v>today()?today():v; this.render(); };
    $("#lh-prev").onclick=()=>go(addDays(lcDate,-1)); $("#lh-next").onclick=()=>go(addDays(lcDate,1)); $("#lh-date").onchange=e=>go(e.target.value);
    $$("[data-lt]",el).forEach(i=>i.onchange=async()=>{ const L=clone(lcDate); if(i.value) L.entries[i.dataset.lt]={...(L.entries[i.dataset.lt]||{}),start:i.value,at:new Date().toISOString()}; else if(L.entries[i.dataset.lt]) delete L.entries[i.dataset.lt].start; await put(L); this.render(); });
    $$("[data-lnow]",el).forEach(b=>b.onclick=async()=>{ const L=clone(lcDate); L.entries[b.dataset.lnow]={...(L.entries[b.dataset.lnow]||{}),start:hhmm(nowMin()),at:new Date().toISOString()}; await put(L); this.render(); });
    $$("[data-lskip]",el).forEach(c=>c.onchange=async()=>{ await setField(c.dataset.lskip,"skip",c.checked); this.render(); });
    $$("[data-lnote]",el).forEach(n=>n.onchange=()=>setField(n.dataset.lnote,"note",n.value.trim()));
    $$("[data-xdel]",el).forEach(b=>b.onclick=async()=>{ const L=clone(lcDate); L.extra.splice(+b.dataset.xdel,1); await put(L); this.render(); });
    const ad=$("#lx-add"); if(ad) ad.onclick=async()=>{ const l=$("#lx-l").value.trim(); let t=$("#lx-t").value; if(!t&&lcDate===today()) t=hhmm(nowMin()); if(!l||!t) return; const L=clone(lcDate); L.extra.push({label:l,start:t}); L.extra.sort((a,b)=>a.start<b.start?-1:1); await put(L); this.render(); };
    const dn=$("#day-note"); if(dn) dn.onchange=async()=>{ const L=clone(lcDate); L.dayNote=dn.value.trim(); await put(L); };
  }
};
})();
