(function(){
"use strict";
/* ตัวเชื่อมต่อฐานข้อมูลกลาง (Supabase) — ทำให้ข้อมูลอยู่ที่เดียวกัน ดูย้อนหลังได้ และแชร์กับคนในบ้าน
   ออกแบบให้หน้าจอต่างๆ ไม่ต้องแก้: เลียนแบบ db.doc(path).set/delete และ db.collection(name).onSnapshot ที่ App.connect/save/remove เรียกอยู่เดิม
   ปิดอยู่ถ้าไม่ได้ใส่ค่าใน js/config.js */
const A = window.App, {$,esc,icon,S} = A;
const CFG = window.IMDEE_CONFIG || {};
const cloud = A.cloud = { enabled: !!(CFG.supabaseUrl && CFG.supabaseKey) };
if(!cloud.enabled) return;

const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
let sb=null, session=null, hid=null, hname="", role="editor", chan=null;
const cache = {};            // path -> data (ทุกเอกสารของครอบครัว)
const listeners = [];        // {prefix|path, kind, cb}
const urls = {};             // photo id -> signed url

/* ---------- utils ---------- */
const loadLib = () => new Promise((res,rej)=>{ if(window.supabase) return res(); const s=document.createElement("script"); s.src=LIB; s.onload=res; s.onerror=()=>rej(new Error("โหลดไลบรารีไม่ได้")); document.head.appendChild(s); });
const errMsg = e => { const m=(e&&e.message)||String(e||""); if(/Invalid login/i.test(m)) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง"; if(/already registered|User already/i.test(m)) return "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบ"; if(/Password should/i.test(m)) return "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร"; if(/Email not confirmed/i.test(m)) return "ยังไม่ได้ยืนยันอีเมล ตรวจกล่องจดหมายแล้วกดลิงก์ยืนยัน"; if(/invalid or expired invite/i.test(m)) return "รหัสเชิญไม่ถูกต้องหรือหมดอายุ"; if(/rate limit|too many/i.test(m)) return "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่"; return "เกิดข้อผิดพลาด: "+m; };
const mapErr = e => { if(e && (e.code==="42501" || /row-level security|permission denied/i.test(e.message||""))) return Object.assign(new Error("read-only"), {code:"invalid_argument"}); return e; };
function notify(path){ listeners.forEach(l=>{ try{
  if(l.kind==="doc"){ if(l.path===path || path==="*") l.cb({exists: path!=="*" ? path in cache : l.path in cache, data:()=>cache[l.path]}); }
  else if(path==="*" || path.startsWith(l.prefix)) l.cb(snapshot(l.prefix)); }catch(e){ console.error(e); } }); }
function snapshot(prefix){ return {docs:Object.keys(cache).filter(p=>p.startsWith(prefix)).map(p=>({id:p.slice(prefix.length), data:()=>cache[p]}))}; }

/* ---------- ข้อมูล: โหลดทั้งหมด + realtime ---------- */
async function loadAll(){
  let from=0; const size=1000;
  for(;;){ const {data,error}=await sb.from("docs").select("path,data").eq("household_id",hid).range(from,from+size-1); if(error) throw error;
    (data||[]).forEach(r=>{ cache[r.path]=r.data; }); if(!data || data.length<size) break; from+=size; }
}
function subscribe(){
  if(chan) sb.removeChannel(chan);
  chan = sb.channel("docs-"+hid).on("postgres_changes",{event:"*",schema:"public",table:"docs",filter:"household_id=eq."+hid}, p=>{
    if(p.eventType==="DELETE"){ const o=p.old||{}; if(o.path){ delete cache[o.path]; notify(o.path); resolvePhotos(); } }
    else { const n=p.new||{}; if(n.path){ cache[n.path]=n.data; notify(n.path); resolvePhotos(); } }
  }).subscribe();
}
const db = {
  doc(path){ return {
    async set(data){ const {error}=await sb.from("docs").upsert({household_id:hid, path, data}); if(error) throw mapErr(error); cache[path]=data; notify(path); resolvePhotos(); },
    async delete(){ const {error}=await sb.from("docs").delete().eq("household_id",hid).eq("path",path); if(error) throw mapErr(error); delete cache[path]; notify(path); },
    onSnapshot(cb){ listeners.push({kind:"doc", path, cb}); cb({exists: path in cache, data:()=>cache[path]}); } }; },
  collection(name){ const prefix=name+"/"; return { onSnapshot(cb){ listeners.push({kind:"col", prefix, cb}); cb(snapshot(prefix)); } }; },
};

/* ---------- รูปภาพ: bucket ส่วนตัว + signed URL ---------- */
const assets = { local:false, idOnly:true, urls,
  async upload(blob){ const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(36).slice(2)) + ".jpg"; const path = hid+"/"+id;
    const {error}=await sb.storage.from("photos").upload(path, blob, {contentType: blob.type||"image/jpeg"}); if(error) throw error;
    const {data}=await sb.storage.from("photos").createSignedUrl(path, 60*60*24*7); urls[id]=data&&data.signedUrl; return {id, url:urls[id]}; },
};
let resolving=false;
async function resolvePhotos(){
  if(resolving) return; const need=new Set();
  Object.entries(cache).forEach(([p,v])=>{ if(p.startsWith("mealentries/") && v && v.photos) ["before","after"].forEach(k=>(v.photos[k]||[]).forEach(x=>{ if(x&&x.id&&!urls[x.id]) need.add(x.id); })); if(p==="app/profile" && v && v.photoId && !urls[v.photoId]) need.add(v.photoId); });
  if(!need.size) return; resolving=true;
  try{ const ids=[...need]; const {data}=await sb.storage.from("photos").createSignedUrls(ids.map(i=>hid+"/"+i), 60*60*24*7);
    (data||[]).forEach((r,i)=>{ if(r && r.signedUrl) urls[ids[i]]=r.signedUrl; }); A.emit("all"); }catch(e){} finally{ resolving=false; }
}

/* ---------- หน้า login / เลือกครอบครัว ---------- */
function gate(inner){ let el=$("#cloud-gate"); if(!el){ el=document.createElement("div"); el.id="cloud-gate"; el.className="cgate"; document.body.appendChild(el); }
  el.innerHTML=`<div class="cg-card" role="dialog" aria-modal="true" aria-label="เข้าสู่ระบบ"><div class="cg-logo">อ</div><h2>อิ่มดี</h2>${inner}</div>`; return el; }
const closeGate = () => { const el=$("#cloud-gate"); if(el) el.remove(); };
function showLogin(){ return new Promise(resolve=>{
  let mode="in";
  const draw=(msg="")=>{ const el=gate(`<p class="sub">${mode==="in"?"เข้าสู่ระบบเพื่อดูและบันทึกข้อมูลของลูก":"สร้างบัญชีใหม่"}</p>
    <label class="field">อีเมล<input class="inp" id="cg-email" type="email" autocomplete="email" inputmode="email"></label>
    <label class="field">รหัสผ่าน<input class="inp" id="cg-pass" type="password" autocomplete="${mode==="in"?"current-password":"new-password"}" minlength="6"></label>
    <p class="tiny field-err" id="cg-err" ${msg?"":"hidden"}>${esc(msg)}</p>
    <button class="btn primary" id="cg-go" type="button">${mode==="in"?"เข้าสู่ระบบ":"สมัครใช้งาน"}</button>
    <button class="ctog" id="cg-sw" type="button">${mode==="in"?"ยังไม่มีบัญชี? สมัครใช้งาน":"มีบัญชีแล้ว? เข้าสู่ระบบ"}</button>`);
    $("#cg-sw").onclick=()=>{ mode=mode==="in"?"up":"in"; draw(); };
    const go=async()=>{ const email=$("#cg-email").value.trim(), password=$("#cg-pass").value; if(!email||!password){ draw("กรุณาระบุอีเมลและรหัสผ่าน"); return; }
      $("#cg-go").disabled=true;
      try{ if(mode==="in"){ const {data,error}=await sb.auth.signInWithPassword({email,password}); if(error) throw error; session=data.session; closeGate(); resolve(); }
        else { const {data,error}=await sb.auth.signUp({email,password}); if(error) throw error; if(data.session){ session=data.session; closeGate(); resolve(); } else { mode="in"; draw("สมัครแล้ว กรุณายืนยันอีเมลตามลิงก์ที่ส่งไป แล้วกลับมาเข้าสู่ระบบ"); } } }
      catch(e){ draw(errMsg(e)); } };
    $("#cg-go").onclick=go; $("#cg-pass").onkeydown=e=>{ if(e.key==="Enter") go(); }; };
  draw(); }); }
function showHousehold(){ return new Promise(resolve=>{
  const draw=(msg="")=>{ gate(`<p class="sub">ยังไม่ได้อยู่ในครอบครัวไหน เลือกอย่างใดอย่างหนึ่ง</p>
    <div class="cg-opt"><b>สร้างครอบครัวใหม่</b><input class="inp" id="cg-hn" placeholder="ชื่อ เช่น บ้านของตะวัน" maxlength="40"><button class="btn primary" id="cg-new" type="button">สร้าง</button></div>
    <div class="cg-opt"><b>เข้าร่วมด้วยรหัสเชิญ</b><input class="inp" id="cg-code" placeholder="รหัส 8 ตัว" maxlength="8" autocapitalize="characters"><button class="btn" id="cg-join" type="button">เข้าร่วม</button></div>
    <p class="tiny field-err" id="cg-err" ${msg?"":"hidden"}>${esc(msg)}</p>
    <button class="ctog" id="cg-out" type="button">ออกจากระบบ</button>`);
    $("#cg-new").onclick=async()=>{ try{ const {data,error}=await sb.rpc("create_household",{household_name:$("#cg-hn").value}); if(error) throw error; closeGate(); resolve(data); }catch(e){ draw(errMsg(e)); } };
    $("#cg-join").onclick=async()=>{ try{ const {data,error}=await sb.rpc("join_household",{invite_code:$("#cg-code").value}); if(error) throw error; closeGate(); resolve(data); }catch(e){ draw(errMsg(e)); } };
    $("#cg-out").onclick=async()=>{ await sb.auth.signOut(); location.reload(); }; };
  draw(); }); }

/* ---------- เริ่มต้น ---------- */
cloud.init = async () => {
  try{ await loadLib(); }catch(e){ A.setSync("โหลดระบบฐานข้อมูลไม่ได้ ใช้โหมดในเครื่อง"); return null; }
  sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {auth:{persistSession:true, autoRefreshToken:true}});
  const cur = await sb.auth.getSession(); session = cur.data && cur.data.session;
  if(!session) await showLogin();
  const mem = await sb.from("household_members").select("household_id, role, households(name)").order("created_at").limit(1);
  if(mem.error){ A.setSync("เชื่อมต่อฐานข้อมูลไม่สำเร็จ"); return null; }
  if(mem.data && mem.data.length){ hid=mem.data[0].household_id; role=mem.data[0].role; hname=(mem.data[0].households||{}).name||""; }
  else { hid = await showHousehold(); role="owner"; const h=await sb.from("households").select("name").eq("id",hid).single(); hname=(h.data||{}).name||""; }
  await loadAll(); subscribe(); resolvePhotos();
  sb.auth.onAuthStateChange((ev,s)=>{ if(ev==="SIGNED_OUT") location.reload(); });
  return { db, assets, user:{ id: async()=>session.user.id, can: async()=>role!=="viewer" } };
};

/* ---------- ใช้ในหน้าตั้งค่า ---------- */
cloud.info = () => ({ email: session&&session.user&&session.user.email, household:hname, role, hid });
cloud.members = async () => { const {data}=await sb.from("household_members").select("user_id, role, display_name, created_at").eq("household_id",hid); return data||[]; };
cloud.invite = async (r="editor") => { const {data,error}=await sb.rpc("create_invite",{hid, invite_role:r}); if(error) throw new Error(errMsg(error)); return data; };
cloud.signOut = async () => { await sb.auth.signOut(); location.reload(); };
/* นำเข้าข้อมูลที่เคยบันทึกไว้ในเบราว์เซอร์เครื่องนี้ (localStorage + รูปใน IndexedDB) ขึ้นฐานข้อมูลกลาง */
cloud.localCount = () => { let n=0; try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith("imdee:") && /^imdee:(mealentries|daylogs|growth|lifelogs)\//.test(k)) n++; } }catch(e){} return n; };
cloud.importLocal = async (onProgress) => {
  const rows=[]; const photoMap={};
  const blobs = await (A.localAssets.blobs ? A.localAssets.blobs() : Promise.resolve({}));
  const mapPhoto = async p => { if(!p||!p.id) return p; if(!blobs[p.id]) return p; if(!photoMap[p.id]){ const r=await assets.upload(blobs[p.id]); photoMap[p.id]=r.id; } return {id:photoMap[p.id]}; };
  for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(!k.startsWith("imdee:")) continue; const path=k.slice(6);
    if(!/^(mealentries|daylogs|growth|lifelogs)\//.test(path) && !/^app\/(schedule|settings|profile)$/.test(path)) continue;
    let v; try{ v=JSON.parse(localStorage.getItem(k)); }catch(e){ continue; } if(!v) continue;
    if(path.startsWith("mealentries/") && v.photos){ for(const kk of ["before","after"]) v.photos[kk]=await Promise.all((v.photos[kk]||[]).map(mapPhoto)); }
    if(path==="app/profile" && v.photoData){ delete v.photoData; }
    rows.push({household_id:hid, path, data:v}); }
  for(let i=0;i<rows.length;i+=100){ const {error}=await sb.from("docs").upsert(rows.slice(i,i+100)); if(error) throw new Error(errMsg(error)); if(onProgress) onProgress(Math.min(rows.length,i+100), rows.length); }
  rows.forEach(r=>{ cache[r.path]=r.data; }); notify("*"); resolvePhotos(); return rows.length;
};
})();
