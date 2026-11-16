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
  const el=$("#v-settings"), c=A.child(), ph=S.profile.photoUrl||S.profile.photoData||(S.profile.photoId&&A.photoUrl({id:S.profile.photoId}));
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
  <div class="card">${A.cardHead("หน่วยของอาหารแต่ละหมวด","เลือกหน่วยเริ่มต้นที่ระบบใส่ให้ก่อนเวลาเพิ่มอาหาร และเพิ่มหรือเอาหน่วยออกได้ตามที่บ้านใช้ (เปลี่ยนในแต่ละรายการได้)")}
    ${A.CATS.map(c=>{ const ed=(S.settings.unitEdits||{})[c]||{}, edited=(ed.added&&ed.added.length)||(ed.removed&&ed.removed.length); return `<div class="unit-box">
      <div class="set-row"><div><h4>${esc(c)}</h4><p class="tiny">หน่วยเริ่มต้น</p></div><label class="field"><select class="du-sel" data-cat="${esc(c)}" aria-label="หน่วยเริ่มต้นของ ${esc(c)}">${A.unitsFor(c).map(([v,l])=>`<option value="${esc(v)}"${v===A.defaultUnit(c)?" selected":""}>${esc(l)}</option>`).join("")}</select></label></div>
      <div class="tagin">${A.unitsFor(c).map(([v,l])=>`<span class="tag">${esc(l)}<button type="button" data-udel="${esc(v)}" data-cat="${esc(c)}" aria-label="เอาหน่วย ${esc(l)} ออกจาก ${esc(c)}">${icon("x")}</button></span>`).join("")}
        <input class="inp u-in" data-cat="${esc(c)}" placeholder="เพิ่มหน่วย เช่น ถุง" maxlength="12" aria-label="เพิ่มหน่วยของ ${esc(c)}"><button type="button" class="btn sm u-add" data-cat="${esc(c)}">${icon("plus")}เพิ่ม</button></div>
      ${edited?`<button type="button" class="ctog u-reset" data-cat="${esc(c)}">คืนหน่วยเดิมของหมวดนี้</button>`:""}
    </div>`; }).join("")}
    <p class="tiny" style="margin-top:8px">หน่วยที่เพิ่มเองบันทึกได้ตามปกติ แต่ระบบยังไม่แปลงเป็นพลังงานหรือหมู่อาหาร ส่วนรายการที่เคยบันทึกด้วยหน่วยที่เอาออกจะยังแสดงตามเดิม</p>
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" id="st-save-units">บันทึกหน่วยเริ่มต้น</button></div>
  </div>
  ${(A.cloud && A.cloud.enabled && S.mode==="db") ? (()=>{ const ci=A.cloud.info(), nLocal=A.cloud.localCount(); return `<div class="card">${A.cardHead("บัญชีและครอบครัว","ข้อมูลทั้งหมดเก็บในฐานข้อมูลกลาง เปิดจากเครื่องไหนก็เห็นชุดเดียวกัน")}
    <div class="set-row"><div><h4>บัญชีที่ใช้</h4><p class="tiny">${esc(ci.email||"")}</p></div><div><p class="sub">${esc(ci.household||"ครอบครัว")} · ${ci.role==="owner"?"เจ้าของ":ci.role==="viewer"?"ดูอย่างเดียว":"แก้ไขได้"}</p><div id="cl-members" class="tiny"></div></div></div>
    ${ci.role==="owner"?`<div class="set-row"><div><h4>เชิญคนในบ้าน</h4><p class="tiny">สร้างรหัสให้อีกคนเอาไปกรอกตอนเข้าสู่ระบบ ใช้ได้ครั้งเดียว หมดอายุใน 7 วัน</p></div><div style="display:grid;gap:8px"><div class="stseg" id="cl-role"><button type="button" class="m-u" data-r="editor" aria-pressed="true">แก้ไขได้</button><button type="button" class="m-u" data-r="viewer" aria-pressed="false">ดูอย่างเดียว</button></div><button class="btn" id="cl-inv" type="button">${icon("plus")}สร้างรหัสเชิญ</button><b id="cl-code" class="num" style="font-size:1.3rem;letter-spacing:.12em"></b></div></div>`:""}
    ${nLocal?`<div class="set-row"><div><h4>นำเข้าข้อมูลจากเครื่องนี้</h4><p class="tiny">พบข้อมูลที่เคยบันทึกในเบราว์เซอร์เครื่องนี้ ${nLocal} รายการ ย้ายขึ้นฐานข้อมูลกลาง (ไม่ลบของเดิม)</p></div><div><button class="btn" id="cl-imp" type="button">นำเข้า</button><p class="tiny" id="cl-impmsg"></p></div></div>`:""}
    <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn" id="cl-out" type="button">ออกจากระบบ</button></div>
  </div>`; })() : ""}
  <div class="card">${A.cardHead("การแสดงผลและข้อมูล")}
    <div class="set-row"><div><h4>ธีม</h4></div><div>${A.seg("theme", [["dark","มืด"],["light","สว่าง"]], S.theme)}</div></div>
    <div class="set-row"><div><h4>ข้อมูลตัวอย่าง</h4><p class="tiny">ข้อมูลสาธิต 8 วัน (คลิป รูป และบันทึกผู้ปกครอง) ปิดเมื่อเริ่มใช้งานจริง ข้อมูลที่บันทึกเองไม่หาย</p></div><div>${A.seg("demo", [["on","แสดง"],["off","ซ่อน"]], S.settings.demo?"on":"off")}</div></div>
    <div class="set-row"><div><h4>การซิงก์</h4></div><div><p class="sub">${esc(S.sync)}</p><p class="tiny">${S.mode==="db"?"ทุกคนที่เปิดลิงก์นี้และได้รับสิทธิ์แก้ไข จะเห็นและบันทึกข้อมูลชุดเดียวกัน":"ยังไม่ได้เชื่อมต่อ ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น"}</p></div></div>
  </div>
  <div class="card flat"><p class="tiny">อิ่มดี เป็นเครื่องมือช่วยบันทึกสำหรับครอบครัว ข้อมูลและข้อสังเกตทั้งหมดใช้ประกอบการปรึกษาแพทย์ ไม่ใช่การวินิจฉัยหรือคำแนะนำทางการแพทย์ · เกณฑ์การเจริญเติบโต: มาตรฐาน WHO / กรมอนามัย · ปริมาณอาหาร: ธงโภชนาการเด็ก 1–3 ปี</p></div>`;
  let sex = c.sex;
  $$('[data-seg="sex"] button', el).forEach(b=>b.onclick=()=>{ sex=b.dataset.v; $$('[data-seg="sex"] button', el).forEach(x=>x.setAttribute("aria-pressed", x===b)); });
  $("#st-save-child").onclick = ()=>{ const name=$("#st-name").value.trim(), birth=$("#st-birth").value; if(!name||!birth){ A.toast("กรุณาระบุชื่อเล่นและวันเกิด"); return; } saveSettings({child:{name, sex, birth}}); };
  $$('[data-seg="theme"] button', el).forEach(b=>b.onclick=()=>{ S.theme=b.dataset.v; document.documentElement.dataset.theme=S.theme; A.LS.set("theme",S.theme); A.render(); });
  $$('[data-seg="demo"] button', el).forEach(b=>b.onclick=()=>saveSettings({demo: b.dataset.v==="on"}));
  const addM = ()=>{ const v=$("#st-mem").value.trim(); if(!v) return; draftMembers=[...mem.filter(x=>x!==v), v]; this.render(); $("#st-mem").focus(); };
  $("#st-madd").onclick = addM; $("#st-mem").onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); addM(); } };
  $$("[data-mdel]", el).forEach(b=>b.onclick=()=>{ draftMembers = mem.filter((_,i)=>i!==+b.dataset.mdel); this.render(); });
  const curDu = ()=>{ const du={...(S.settings.defaultUnits||{})}; $$(".du-sel", el).forEach(x=>{ du[x.dataset.cat]=x.value; }); return du; };
  const unitEdits = ()=>JSON.parse(JSON.stringify(S.settings.unitEdits||{}));
  const saveUnits = ue=>saveSettings({unitEdits: ue, defaultUnits: curDu()});
  const addUnit = cat=>{ const inp=$$(".u-in", el).find(x=>x.dataset.cat===cat), v=((inp&&inp.value)||"").trim(); if(!v) return;
    if(A.unitsFor(cat).some(([u,l])=>u===v||l===v)){ A.toast("มีหน่วยนี้อยู่แล้ว"); return; }
    const ue=unitEdits(), e=ue[cat]||(ue[cat]={added:[],removed:[]}); e.added=e.added||[]; e.removed=e.removed||[];
    if(e.removed.includes(v)) e.removed=e.removed.filter(x=>x!==v); else e.added.push(v); saveUnits(ue); };
  $$(".u-add", el).forEach(b=>b.onclick=()=>addUnit(b.dataset.cat));
  $$(".u-in", el).forEach(i=>i.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); addUnit(i.dataset.cat); } });
  $$("[data-udel]", el).forEach(b=>b.onclick=()=>{ const cat=b.dataset.cat, v=b.dataset.udel; if(A.unitsFor(cat).length<=1){ A.toast("กรุณาเหลือหน่วยไว้อย่างน้อย 1 หน่วย"); return; }
    const ue=unitEdits(), e=ue[cat]||(ue[cat]={added:[],removed:[]}); e.added=e.added||[]; e.removed=e.removed||[];
    if(A.baseUnitsFor(cat).some(([u])=>u===v)){ if(!e.removed.includes(v)) e.removed.push(v); } else e.added=e.added.filter(x=>x!==v); saveUnits(ue); });
  $$(".u-reset", el).forEach(b=>b.onclick=()=>{ const ue=unitEdits(); delete ue[b.dataset.cat]; saveUnits(ue); });
  if($("#cl-out")){ let invRole="editor";
    $$("#cl-role button", el).forEach(b=>b.onclick=()=>{ invRole=b.dataset.r; $$("#cl-role button", el).forEach(x=>x.setAttribute("aria-pressed", x===b)); });
    if($("#cl-inv")) $("#cl-inv").onclick=async()=>{ try{ $("#cl-code").textContent = await A.cloud.invite(invRole); }catch(e){ A.toast(e.message); } };
    if($("#cl-imp")) $("#cl-imp").onclick=async()=>{ const b=$("#cl-imp"), m=$("#cl-impmsg"); b.disabled=true; try{ const n=await A.cloud.importLocal((a,t)=>{ m.textContent=`กำลังนำเข้า ${a}/${t}`; }); m.textContent=`นำเข้าแล้ว ${n} รายการ`; A.emit("all"); }catch(e){ m.textContent=e.message||"นำเข้าไม่สำเร็จ"; b.disabled=false; } };
    $("#cl-out").onclick=()=>A.cloud.signOut();
    A.cloud.members().then(ms=>{ const t=$("#cl-members"); if(t) t.textContent = `สมาชิก ${ms.length} คน`; }).catch(()=>{}); }
  $("#st-save-units").onclick = ()=>{ saveSettings({defaultUnits: curDu()}); };
  $("#st-save-mem").onclick = async ()=>{ if(!mem.length){ A.toast("กรุณาระบุคนในบ้านอย่างน้อย 1 คน"); return; } if(await saveSettings({members: mem})) draftMembers=null; };
  $("#st-photo").onchange = async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; const sm=await A.resizeImg(f,480);
    if(S.assets && !S.assets.local){ try{ A.setSync("กำลังอัปโหลดรูป…"); const r=await S.assets.upload(sm.blob); S.profile = S.assets.idOnly ? {photoId:r.id} : {photoId:r.id, photoUrl:r.url}; await A.save("app/profile", S.profile); }catch(_){ A.toast("อัปโหลดรูปไม่สำเร็จ"); return; } }
    else { S.profile={photoData:sm.url}; A.LS.set("app/profile", S.profile); }
    A.toast("เปลี่ยนรูปแล้ว"); A.emit("profile"); };
}};
})();
