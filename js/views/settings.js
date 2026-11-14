(function(){
"use strict";
const A = window.App, {$,$$,esc,icon,S,today} = A;
let draftMembers = null;
async function saveSettings(patch){
  Object.assign(S.settings, patch);
  const ok = await A.save("app/settings", JSON.parse(JSON.stringify(S.settings)));
  if(ok){ A.toast("บันทึกการตั้งค่าแล้ว"); A.emit("settings"); }
  return ok;
}
A.views.settings = { render(){
  const el=$("#v-settings"), c=A.child(), ph=S.profile.photoUrl||S.profile.photoData;
  const mem = draftMembers || [...A.members()];
  el.innerHTML = `<div class="card">${A.cardHead("ข้อมูลลูก","ใช้คำนวณอายุและเกณฑ์การเจริญเติบโต")}
    <div class="set-row"><div><h4>รูปโปรไฟล์</h4><p class="tiny">แสดงในเมนูและรายงาน</p></div><div style="display:flex;gap:12px;align-items:center"><span class="ava" style="width:64px;height:64px;font-size:1.4rem">${ph?`<img src="${esc(ph)}" alt="">`:esc(c.name.slice(0,1))}</span><label class="btn sm">${icon("camera")}เปลี่ยนรูป<input type="file" accept="image/*" id="st-photo" hidden></label></div></div>
    <div class="set-row"><div><h4>ชื่อเล่น</h4></div><label class="field"><input id="st-name" value="${esc(c.name)}" maxlength="30"></label></div>
    <div class="set-row"><div><h4>เพศ</h4><p class="tiny">เวอร์ชันนี้มีตารางอ้างอิงการเจริญเติบโตของเด็กชายเท่านั้น</p></div><div>${A.seg("sex", [["ชาย","ชาย"],["หญิง","หญิง"]], c.sex)}</div></div>
    <div class="set-row"><div><h4>วันเกิด</h4></div><label class="field"><input type="date" id="st-birth" value="${esc(c.birth)}" max="${today()}"></label></div>
    <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn primary" id="st-save-child">บันทึกข้อมูลลูก</button></div>
  </div>
  <div class="card">${A.cardHead("คนในบ้านที่ช่วยบันทึก","ชื่อเหล่านี้จะเป็นตัวเลือก “ผู้บันทึก” และ “กินด้วยกันกับ”")}
    <div class="tagin">${mem.map((m,i)=>`<span class="tag">${esc(m)}<button type="button" data-mdel="${i}" aria-label="เอา ${esc(m)} ออก">${icon("x")}</button></span>`).join("")}
      <input class="inp" id="st-mem" placeholder="เพิ่มชื่อ เช่น น้า" style="width:160px"><button class="btn sm" id="st-madd">${icon("plus")}เพิ่ม</button></div>
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" id="st-save-mem">บันทึกรายชื่อ</button></div>
  </div>
  <div class="card">${A.cardHead("หน่วยที่มักเสิร์ฟลูก","ตั้งหน่วยเริ่มต้นของแต่ละหมวดอาหาร เวลาเพิ่มอาหารระบบจะเลือกหน่วยนี้ให้ก่อน (เปลี่ยนในแต่ละรายการได้)")}
    ${A.CATS.map(c=>`<div class="set-row"><div><h4>${esc(c)}</h4></div><label class="field"><select class="du-sel" data-cat="${esc(c)}" aria-label="หน่วยเริ่มต้นของ ${esc(c)}">${A.unitsFor(c).map(([v,l])=>`<option value="${esc(v)}"${v===A.defaultUnit(c)?" selected":""}>${esc(l)}</option>`).join("")}</select></label></div>`).join("")}
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" id="st-save-units">บันทึกหน่วยเริ่มต้น</button></div>
  </div>
  <div class="card">${A.cardHead("การแสดงผลและข้อมูล")}
    <div class="set-row"><div><h4>ธีม</h4></div><div>${A.seg("theme", [["dark","มืด"],["light","สว่าง"]], S.theme)}</div></div>
    <div class="set-row"><div><h4>ข้อมูลตัวอย่าง</h4><p class="tiny">ข้อมูลสาธิต 8 วัน (คลิป รูป และบันทึกผู้ปกครอง) ปิดเมื่อเริ่มใช้งานจริง ข้อมูลที่บันทึกเองไม่หาย</p></div><div>${A.seg("demo", [["on","แสดง"],["off","ซ่อน"]], S.settings.demo?"on":"off")}</div></div>
    <div class="set-row"><div><h4>การซิงก์</h4></div><div><p class="sub">${esc(S.sync)}</p><p class="tiny">${S.mode==="db"?"ทุกคนที่เปิดลิงก์นี้และได้รับสิทธิ์แก้ไข จะเห็นและบันทึกข้อมูลชุดเดียวกัน":"ยังไม่ได้เชื่อมต่อ ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น"}</p></div></div>
  </div>
  <div class="card flat"><p class="tiny">อิ่มดี เป็นเครื่องมือช่วยบันทึกสำหรับครอบครัว ข้อมูลและข้อสังเกตทั้งหมดใช้ประกอบการปรึกษาแพทย์ ไม่ใช่การวินิจฉัยหรือคำแนะนำทางการแพทย์ · เกณฑ์การเจริญเติบโต: มาตรฐาน WHO / กรมอนามัย · ปริมาณอาหาร: ธงโภชนาการเด็ก 1–3 ปี</p></div>`;
  let sex = c.sex;
  $$('[data-seg="sex"] button', el).forEach(b=>b.onclick=()=>{ sex=b.dataset.v; $$('[data-seg="sex"] button', el).forEach(x=>x.setAttribute("aria-pressed", x===b)); });
  $("#st-save-child").onclick = ()=>{ const name=$("#st-name").value.trim(), birth=$("#st-birth").value; if(!name||!birth){ A.toast("ใส่ชื่อและวันเกิดก่อนบันทึก"); return; } saveSettings({child:{name, sex, birth}}); };
  $$('[data-seg="theme"] button', el).forEach(b=>b.onclick=()=>{ S.theme=b.dataset.v; document.documentElement.dataset.theme=S.theme; A.LS.set("theme",S.theme); A.render(); });
  $$('[data-seg="demo"] button', el).forEach(b=>b.onclick=()=>saveSettings({demo: b.dataset.v==="on"}));
  const addM = ()=>{ const v=$("#st-mem").value.trim(); if(!v) return; draftMembers=[...mem.filter(x=>x!==v), v]; this.render(); $("#st-mem").focus(); };
  $("#st-madd").onclick = addM; $("#st-mem").onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); addM(); } };
  $$("[data-mdel]", el).forEach(b=>b.onclick=()=>{ draftMembers = mem.filter((_,i)=>i!==+b.dataset.mdel); this.render(); });
  $("#st-save-units").onclick = ()=>{ const du={}; $$(".du-sel", el).forEach(x=>{ du[x.dataset.cat]=x.value; }); saveSettings({defaultUnits: du}); };
  $("#st-save-mem").onclick = async ()=>{ if(!mem.length){ A.toast("ต้องมีอย่างน้อย 1 คน"); return; } if(await saveSettings({members: mem})) draftMembers=null; };
  $("#st-photo").onchange = async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; const sm=await A.resizeImg(f,480);
    if(S.assets && !S.assets.local){ try{ A.setSync("กำลังอัปโหลดรูป…"); const r=await S.assets.upload(sm.blob); S.profile={photoId:r.id, photoUrl:r.url}; await A.save("app/profile", S.profile); }catch(_){ A.toast("อัปโหลดรูปไม่สำเร็จ"); return; } }
    else { S.profile={photoData:sm.url}; A.LS.set("app/profile", S.profile); }
    A.toast("เปลี่ยนรูปแล้ว"); A.emit("profile"); };
}};
})();
