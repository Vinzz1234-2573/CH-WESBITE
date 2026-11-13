-- ════════════════════════════════════════════════════════════════════════════
--  Amitabha Foundation Children Home website: database setup
--  Run this once in Supabase → SQL Editor → New query → paste everything → Run.
--  It is safe to run again: nothing that already exists is deleted.
--
--  Everything here starts with "ch_" (and the picture folder is "ch-media"),
--  so it never touches any other tables in the same Supabase project.
--
--  Who can do what:
--    • Visitors (the website):  read PUBLISHED programs and moments, view pictures.
--    • Admins (signed in, listed in ch_admins):  add, edit, delete everything,
--      upload pictures, and see the Google Sheet links.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;   -- for gen_random_uuid()

-- ── Admins: the people allowed to use admin.html ───────────────────────────
create table if not exists public.ch_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- true when the signed-in person is an admin (used by every rule below)
create or replace function public.ch_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.ch_admins where user_id = auth.uid());
$$;
revoke all on function public.ch_is_admin() from public;
grant execute on function public.ch_is_admin() to anon, authenticated;

-- keeps "updated_at" current whenever a row is edited
create or replace function public.ch_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Programs: shown on the Home page, above Credentials ────────────────────
create table if not exists public.ch_programs (
  id                 uuid primary key default gen_random_uuid(),
  title_en           text not null,
  title_zh           text,
  summary_en         text,          -- short text on the card
  summary_zh         text,
  body_en            text,          -- full text in the pop-up (blank line = new paragraph)
  body_zh            text,
  image_url          text,
  corporate_form_url text,          -- Google Form for CORPORATE partners (companies / CSR)
  donate_url         text,          -- optional; empty = the main donation page
  published          boolean not null default false,
  sort_order         integer not null default 0,   -- smaller numbers come first
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── Moments: shown on the Moments page, above the older moments ────────────
create table if not exists public.ch_moments (
  id          uuid primary key default gen_random_uuid(),
  tag         text not null default 'activities' check (tag in ('activities', 'community', 'appeal')),
  moment_date date not null default current_date,  -- the page shows the year
  title_en    text not null,
  title_zh    text,
  summary_en  text,                 -- short text on the card
  summary_zh  text,
  body_en     text,                 -- the rest of the story, under "Read more"
  body_zh     text,
  image_url   text,
  photos      jsonb not null default '[]'::jsonb,  -- extra photos: [{"src": "...", "thumb": "..."}]
  show_donate boolean not null default false,      -- adds a "Donate now" button (for appeals)
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Google Sheets with the Google Form responses (admins only) ─────────────
create table if not exists public.ch_sheets (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  url        text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- the six forms the website already links to (fill in each sheet link in admin.html)
insert into public.ch_sheets (name, sort_order)
select v.name, v.ord
from (values ('Seek Help', 1), ('Volunteer', 2), ('Sponsor a Child', 3),
             ('Company partnership (CSR)', 4), ('Give Hope', 5), ('Enquiry', 6)) as v(name, ord)
where not exists (select 1 from public.ch_sheets);

drop trigger if exists ch_programs_touch on public.ch_programs;
create trigger ch_programs_touch before update on public.ch_programs for each row execute function public.ch_touch();
drop trigger if exists ch_moments_touch on public.ch_moments;
create trigger ch_moments_touch before update on public.ch_moments for each row execute function public.ch_touch();
drop trigger if exists ch_sheets_touch on public.ch_sheets;
create trigger ch_sheets_touch before update on public.ch_sheets for each row execute function public.ch_touch();

create index if not exists ch_programs_list on public.ch_programs (published, sort_order, created_at desc);
create index if not exists ch_moments_list  on public.ch_moments  (published, moment_date desc, created_at desc);

-- ── Security rules ─────────────────────────────────────────────────────────
alter table public.ch_admins   enable row level security;
alter table public.ch_programs enable row level security;
alter table public.ch_moments  enable row level security;
alter table public.ch_sheets   enable row level security;

grant select on public.ch_programs, public.ch_moments to anon, authenticated;
grant insert, update, delete on public.ch_programs, public.ch_moments to authenticated;
grant select, insert, update, delete on public.ch_sheets to authenticated;
grant select on public.ch_admins to authenticated;

drop policy if exists "ch admins see the admin list" on public.ch_admins;
create policy "ch admins see the admin list" on public.ch_admins
  for select to authenticated using (public.ch_is_admin());

drop policy if exists "ch anyone reads published programs" on public.ch_programs;
create policy "ch anyone reads published programs" on public.ch_programs
  for select to anon, authenticated using (published or public.ch_is_admin());
drop policy if exists "ch admins add programs" on public.ch_programs;
create policy "ch admins add programs" on public.ch_programs
  for insert to authenticated with check (public.ch_is_admin());
drop policy if exists "ch admins edit programs" on public.ch_programs;
create policy "ch admins edit programs" on public.ch_programs
  for update to authenticated using (public.ch_is_admin()) with check (public.ch_is_admin());
drop policy if exists "ch admins delete programs" on public.ch_programs;
create policy "ch admins delete programs" on public.ch_programs
  for delete to authenticated using (public.ch_is_admin());

drop policy if exists "ch anyone reads published moments" on public.ch_moments;
create policy "ch anyone reads published moments" on public.ch_moments
  for select to anon, authenticated using (published or public.ch_is_admin());
drop policy if exists "ch admins add moments" on public.ch_moments;
create policy "ch admins add moments" on public.ch_moments
  for insert to authenticated with check (public.ch_is_admin());
drop policy if exists "ch admins edit moments" on public.ch_moments;
create policy "ch admins edit moments" on public.ch_moments
  for update to authenticated using (public.ch_is_admin()) with check (public.ch_is_admin());
drop policy if exists "ch admins delete moments" on public.ch_moments;
create policy "ch admins delete moments" on public.ch_moments
  for delete to authenticated using (public.ch_is_admin());

drop policy if exists "ch admins manage sheets" on public.ch_sheets;
create policy "ch admins manage sheets" on public.ch_sheets
  for all to authenticated using (public.ch_is_admin()) with check (public.ch_is_admin());

-- ── Picture folder: "ch-media" (pictures are public so the website can show them) ──
insert into storage.buckets (id, name, public)
values ('ch-media', 'ch-media', true)
on conflict (id) do update set public = true;

drop policy if exists "ch admins see media" on storage.objects;
create policy "ch admins see media" on storage.objects
  for select to authenticated using (bucket_id = 'ch-media' and public.ch_is_admin());
drop policy if exists "ch admins upload media" on storage.objects;
create policy "ch admins upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'ch-media' and public.ch_is_admin());
drop policy if exists "ch admins replace media" on storage.objects;
create policy "ch admins replace media" on storage.objects
  for update to authenticated using (bucket_id = 'ch-media' and public.ch_is_admin());
drop policy if exists "ch admins delete media" on storage.objects;
create policy "ch admins delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'ch-media' and public.ch_is_admin());

-- ════════════════════════════════════════════════════════════════════════════
--  LAST STEP: make yourself an admin.
--  First create your login in Authentication → Users → Add user (tick "Auto Confirm User"),
--  then run this line on its own, with YOUR email:
--
--  insert into public.ch_admins (user_id, email)
--  select id, email from auth.users where email = 'your-email@example.com'
--  on conflict (user_id) do nothing;
-- ════════════════════════════════════════════════════════════════════════════
