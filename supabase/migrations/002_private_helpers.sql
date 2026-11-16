-- ย้ายฟังก์ชันตรวจสิทธิ์ออกจาก schema public (ไม่ให้เรียกผ่าน REST /rpc ได้) policy ที่ใช้อยู่ยังทำงานต่อ
-- รันต่อจาก 001_init.sql (ถ้าตั้งโปรเจกต์ใหม่ ให้รันทั้งสองไฟล์ตามลำดับ)
create schema if not exists private;
alter function public.is_member(uuid) set schema private;
alter function public.can_write(uuid) set schema private;
alter function public.is_owner(uuid) set schema private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke all on function private.is_member(uuid), private.can_write(uuid), private.is_owner(uuid) from public, anon;
grant execute on function private.is_member(uuid), private.can_write(uuid), private.is_owner(uuid) to authenticated;
-- ฟังก์ชัน RPC ที่ตั้งใจให้ผู้ล็อกอินเรียก (create_household / create_invite / join_household) เรียกตัวช่วยจาก private
create or replace function public.create_invite(hid uuid, invite_role text default 'editor') returns text
language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if not private.is_owner(hid) then raise exception 'only owner can invite'; end if;
  if invite_role not in ('editor','viewer') then raise exception 'invalid role'; end if;
  c := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
  insert into public.household_invites (code, household_id, role, created_by) values (c, hid, invite_role, auth.uid());
  return c;
end $$;
revoke all on function public.create_invite(uuid, text) from public, anon;
grant execute on function public.create_invite(uuid, text) to authenticated;
