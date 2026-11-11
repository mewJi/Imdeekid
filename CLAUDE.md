# อิ่มดี (ImDee) — ติดตามการกินและการเติบโตของลูก

Web app สำหรับผู้ปกครองบันทึกมื้ออาหาร นม การนอน อาการ น้ำหนัก/ส่วนสูงของลูก
แปลงปริมาณเป็นพลังงานและอาหารหลัก 5 หมู่ เทียบกับความต้องการตามอายุ และออกรายงานให้กุมารแพทย์

Persona: (1) ผู้ปกครองที่กังวลว่าลูกกินพอไหม (2) กุมารแพทย์/นักโภชนาการเด็ก
UI ภาษาไทยทั้งหมด ธีมมืดเป็นค่าเริ่มต้น สลับสว่างได้

## โครงสร้างไฟล์
- `index.html` — shell: sidebar, topbar, ส่วน `#v-home #v-days #v-insights #v-report #v-routine #v-settings`, แผงบันทึก `#sheet`
- `css/app.css` — design tokens (สี กลุ่มอาหาร `--g-*`, สถานะ good/warn/bad) + components
- `js/demo-data.js`, `js/demo-notes.js` — ข้อมูลตัวอย่าง 1–8 พ.ย. และตารางอ้างอิง WHO (`TAWAN.ref`, เด็กชายเท่านั้น)
- `js/core.js` — `window.App`: utils, store `S`, การเชื่อมฐานข้อมูล, domain (meal, stats, growth z-score), charts
- `js/nutri.js` — โภชนาการ: ความต้องการ (`App.req`), แปลงหน่วยครัวเรือน → หมู่อาหาร (`App.itemServ`), `App.mealIntake`, `App.dayIntake`, `App.nutri`, อาหารหลัก 5 หมู่
- `js/views/*.js` — หน้าละไฟล์: home, days, log (แบบบันทึก), insights (behavior/nutrition/growth), report, routine, settings
- `js/main.js` — router แบบ hash (`#home`, `#days-YYYY-MM-DD`, `#nutrition`, `#report` …)
- `img/` — รูปตัวอย่าง

ไม่มี build step: เปิด `index.html` ผ่าน static server ได้เลย (`npx serve .`)

## สิ่งที่ผูกกับ claude.ai (ต้องเปลี่ยนเมื่อย้ายออก)
โค้ดเดิมรันเป็น claude.ai artifact และเรียก `claude.use(...)` ซึ่งไม่มีนอก claude.ai:
- `claude.use("db")` — ฐานข้อมูลแบบ document (`db.doc(path).set/delete`, `collection().onSnapshot`) ใช้ใน `App.connect` / `App.save` / `App.remove` (core.js)
  collections: `mealentries/{date}_{meal}`, `daylogs/{date}`, `growth/{date}`, `lifelogs`, `app/schedule`, `app/profile`, `app/settings`
- `claude.use("user")` — ตัวตนผู้ใช้ (uid, ชื่อ)
- `claude.use("assets")` — อัปโหลดรูป คืน `{id,url}` (log.js `addPhoto`)
- `claude.use("sample")` — เรียก AI วิเคราะห์รูปอาหาร (log.js `aiFromPhotos`, `aiEstimate`)
- `claude.use("downloads")` — บันทึกไฟล์รายงาน (report.js)

ถ้าไม่มี `claude.use` แอปจะใช้ localStorage (prefix `imdee:`) แทนฐานข้อมูล — ใช้ได้บนเครื่องเดียว ไม่แชร์กันในบ้าน

แนวทางแทนที่:
- db + user + assets → Supabase (Postgres + Auth + Storage, มี realtime) หรือ Firebase (Firestore + Auth + Storage)
  ทำ adapter ชื่อเดียวกับที่ `App.save/remove/connect` เรียก เพื่อไม่ต้องแก้ view
- sample (AI) → Anthropic API ผ่าน serverless function (เช่น Vercel/Netlify/Supabase Edge Function) ห้ามใส่ API key ในโค้ดฝั่ง browser
- downloads → สร้าง Blob แล้ว `<a download>` หรือ `window.print()`

## หลักการคำนวณ (อย่าเปลี่ยนโดยไม่บอกผู้ใช้)
- พลังงาน: FAO/WHO/UNU 2004 (TEE ตามน้ำหนัก อายุ 1–2 ปีลด 7% + 2 kcal/กรัมที่โต)
- โปรตีน: WHO/FAO/UNU 2007 g/kg · แคลเซียม: DRI ไทย 2563 · ไขมัน: AMDR 30–40% (1–3 ปี)
- หมู่อาหารต่อวัน: ธงโภชนาการสำหรับเด็ก (1–3 ปี: ข้าว-แป้ง 3 ทัพพี เนื้อสัตว์ 3 ช้อน ผัก 1.5 ทัพพี ผลไม้ 3 ส่วน นม 400 มล.)
- สัดส่วนมื้อ เช้า 20% กลางวัน 30% เย็น 30% (สมมติฐานของแอป)
- ค่าแปลงหน่วย: รายการอาหารแลกเปลี่ยน ศิริราช (ตาราง `EX`, `CONV` ใน nutri.js)
- ทุกตัวเลขเป็นค่าประมาณ ไม่ใช่การวินิจฉัย ต้องมีข้อความนี้ในหน้าที่แสดงผล

## สไตล์งาน
- เน้นภาพเรียบง่าย ตัวเลขชัด (กล่องสรุป `App.statBoxes`) หมู่ที่ไม่มีให้เป็นสีเทา
- ข้อความภาษาไทย สั้น เป็นมิตร ไม่ใช้ศัพท์เทคนิคกับผู้ปกครอง
- รองรับมือถือ (แถบล่าง `#bnav`) และพิมพ์รายงานได้
