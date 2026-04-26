-- Homepage hero banners + Storage bucket policies.
-- Run once in Supabase SQL Editor (or via supabase db push). Adjust policy names if they collide.

create table if not exists public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sort_order integer not null default 0,
  is_active boolean not null default true,

  image_url text not null,
  image_path text,

  title_sq text not null default '',
  subtitle_sq text not null default '',
  cta_label_sq text not null default '',

  title_en text not null default '',
  subtitle_en text not null default '',
  cta_label_en text not null default '',

  cta_url text not null default ''
);

create index if not exists hero_banners_active_sort_idx
  on public.hero_banners (is_active, sort_order, created_at);

-- Keep updated_at in sync on row updates
create or replace function public.hero_banners_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists hero_banners_updated_at on public.hero_banners;
create trigger hero_banners_updated_at
  before update on public.hero_banners
  for each row
  execute function public.hero_banners_set_updated_at();

alter table public.hero_banners enable row level security;

drop policy if exists "hero_banners_select_active_anon" on public.hero_banners;
drop policy if exists "hero_banners_select_all_authenticated" on public.hero_banners;
drop policy if exists "hero_banners_insert_authenticated" on public.hero_banners;
drop policy if exists "hero_banners_update_authenticated" on public.hero_banners;
drop policy if exists "hero_banners_delete_authenticated" on public.hero_banners;

-- Anonymous site visitors: only active banners
create policy "hero_banners_select_active_anon"
  on public.hero_banners
  for select
  to anon
  using (is_active = true);

-- Signed-in users (admin UI): full list including inactive
create policy "hero_banners_select_all_authenticated"
  on public.hero_banners
  for select
  to authenticated
  using (true);

create policy "hero_banners_insert_authenticated"
  on public.hero_banners
  for insert
  to authenticated
  with check (true);

create policy "hero_banners_update_authenticated"
  on public.hero_banners
  for update
  to authenticated
  using (true)
  with check (true);

create policy "hero_banners_delete_authenticated"
  on public.hero_banners
  for delete
  to authenticated
  using (true);

-- Storage: public bucket for banner images
insert into storage.buckets (id, name, public)
values ('hero-banners', 'hero-banners', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "hero_banners_storage_select" on storage.objects;
drop policy if exists "hero_banners_storage_insert" on storage.objects;
drop policy if exists "hero_banners_storage_update" on storage.objects;
drop policy if exists "hero_banners_storage_delete" on storage.objects;

-- Anyone can read objects in this bucket (public site + OG)
create policy "hero_banners_storage_select"
  on storage.objects
  for select
  using (bucket_id = 'hero-banners');

create policy "hero_banners_storage_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'hero-banners');

create policy "hero_banners_storage_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'hero-banners')
  with check (bucket_id = 'hero-banners');

create policy "hero_banners_storage_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'hero-banners');
