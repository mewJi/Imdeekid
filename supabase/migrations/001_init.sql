-- อิ่มดี (ImDee): ฐานข้อมูลกลางของครอบครัว
-- โครงสร้าง: ครอบครัว (household) + สมาชิก + เอกสารข้อมูล (docs) + รูปภาพ (storage bucket "photos")
-- docs เก็บข้อมูลเป็น jsonb ตาม path เดิมของแอป เช่น mealentries/2026-11-08_ln, daylogs/2026-11-08, growth/..., app/settings
-- ทุกตารางเปิด Row Level Security: เห็นเฉพาะสมาชิกของครอบครัวนั้น เขียนได้เฉพาะ owner/editor

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'บ้านของเรา',
  created_by uuid not null default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists household_members_user_idx on public.household_members (user_id);

create table if not exists public.household_invites (
  code text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor','viewer')),
  created_by uuid not null default auth.uid(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid,
  used_at timestamptz
);
create index if not exists household_invites_hid_idx on public.household_invites (household_id);

create table if not exists public.docs (
  household_id uuid not null references public.households(id) on delete cascade,
  path text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (household_id, path)
);
create index if not exists docs_path_idx on public.docs (household_id, path text_pattern_ops);

create or replace function public.touch_docs() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before update on public.docs for each row execute function public.touch_docs();

-- ฟังก์ชันตรวจสิทธิ์ (security definer เพื่อไม่ให้ RLS ของ household_members วนซ้ำ)
create or replace function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members m where m.household_id = hid and m.user_id = (select auth.uid()));
$$;
create or replace function public.can_write(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members m where m.household_id = hid and m.user_id = (select auth.uid()) and m.role in ('owner','editor'));
$$;
create or replace function public.is_owner(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members m where m.household_id = hid and m.user_id = (select auth.uid()) and m.role = 'owner');
$$;

-- RPC: สร้างครอบครัวใหม่ (ผู้สร้างเป็น owner)
create or replace function public.create_household(household_name text default 'บ้านของเรา') returns uuid
language plpgsql security definer set search_path = '' as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.households (name, created_by) values (coalesce(nullif(trim(household_name), ''), 'บ้านของเรา'), auth.uid()) returning id into hid;
  insert into public.household_members (household_id, user_id, role) values (hid, auth.uid(), 'owner');
  return hid;
end $$;

-- RPC: owner สร้างรหัสเชิญ (ใช้ได้ครั้งเดียว หมดอายุใน 7 วัน)
create or replace function public.create_invite(hid uuid, invite_role text default 'editor') returns text
language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if not public.is_owner(hid) then raise exception 'only owner can invite'; end if;
  if invite_role not in ('editor','viewer') then raise exception 'invalid role'; end if;
  c := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
  insert into public.household_invites (code, household_id, role, created_by) values (c, hid, invite_role, auth.uid());
  return c;
end $$;

-- RPC: เข้าร่วมครอบครัวด้วยรหัสเชิญ
create or replace function public.join_household(invite_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.household_invites;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into inv from public.household_invites
    where code = upper(trim(invite_code)) and used_by is null and expires_at > now() for update;
  if not found then raise exception 'invalid or expired invite'; end if;
  insert into public.household_members (household_id, user_id, role) values (inv.household_id, auth.uid(), inv.role)
    on conflict (household_id, user_id) do nothing;
  update public.household_invites set used_by = auth.uid(), used_at = now() where code = inv.code;
  return inv.household_id;
end $$;

-- Row Level Security
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.docs enable row level security;

drop policy if exists households_select on public.households;
create policy households_select on public.households for select to authenticated using (public.is_member(id));
drop policy if exists households_update on public.households;
create policy households_update on public.households for update to authenticated using (public.is_owner(id)) with check (public.is_owner(id));

drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members for select to authenticated using (public.is_member(household_id));
drop policy if exists members_update on public.household_members;
create policy members_update on public.household_members for update to authenticated using (public.is_owner(household_id)) with check (public.is_owner(household_id));
drop policy if exists members_delete on public.household_members;
create policy members_delete on public.household_members for delete to authenticated using (public.is_owner(household_id) or user_id = (select auth.uid()));

drop policy if exists invites_all on public.household_invites;
create policy invites_all on public.household_invites for all to authenticated using (public.is_owner(household_id)) with check (public.is_owner(household_id));

drop policy if exists docs_select on public.docs;
create policy docs_select on public.docs for select to authenticated using (public.is_member(household_id));
drop policy if exists docs_insert on public.docs;
create policy docs_insert on public.docs for insert to authenticated with check (public.can_write(household_id));
drop policy if exists docs_update on public.docs;
create policy docs_update on public.docs for update to authenticated using (public.can_write(household_id)) with check (public.can_write(household_id));
drop policy if exists docs_delete on public.docs;
create policy docs_delete on public.docs for delete to authenticated using (public.can_write(household_id));

-- สิทธิ์เรียกฟังก์ชัน: เฉพาะผู้ที่ล็อกอินแล้ว
revoke all on function public.create_household(text), public.create_invite(uuid, text), public.join_household(text) from public, anon;
grant execute on function public.create_household(text), public.create_invite(uuid, text), public.join_household(text) to authenticated;
revoke all on function public.is_member(uuid), public.can_write(uuid), public.is_owner(uuid) from public, anon;
grant execute on function public.is_member(uuid), public.can_write(uuid), public.is_owner(uuid) to authenticated;

-- Realtime: ให้เครื่องอื่นเห็นข้อมูลที่เพิ่งบันทึกทันที
alter table public.docs replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;

-- รูปภาพ: bucket ส่วนตัว โฟลเดอร์แรกของ path = household_id
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
drop policy if exists photos_select on storage.objects;
create policy photos_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.can_write(((storage.foldername(name))[1])::uuid));
drop policy if exists photos_update on storage.objects;
create policy photos_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.can_write(((storage.foldername(name))[1])::uuid));
drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.can_write(((storage.foldername(name))[1])::uuid));
