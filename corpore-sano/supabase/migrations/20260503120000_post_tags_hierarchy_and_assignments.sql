-- Post tag titles, parent/subcategory hierarchy, and many-to-many post–tag assignments.
-- Existing posts.tag_id remains; backfill copies into post_tag_assignments for queries.

alter table public.post_tags
  add column if not exists is_active boolean not null default true;

alter table public.post_tags
  add column if not exists title_sq text;

alter table public.post_tags
  add column if not exists title_en text;

alter table public.post_tags
  add column if not exists parent_id uuid references public.post_tags (id) on delete cascade;

create index if not exists post_tags_parent_id_idx
  on public.post_tags (parent_id);

-- Junction: posts can be assigned to one or more tags (parents and/or subcategories).
create table if not exists public.post_tag_assignments (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id uuid not null references public.post_tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

create index if not exists post_tag_assignments_tag_id_idx
  on public.post_tag_assignments (tag_id);

-- Backfill assignments from legacy posts.tag_id
insert into public.post_tag_assignments (post_id, tag_id)
select p.id, p.tag_id
from public.posts p
where p.tag_id is not null
on conflict (post_id, tag_id) do nothing;

alter table public.post_tag_assignments enable row level security;

drop policy if exists "post_tag_assignments_select_anon" on public.post_tag_assignments;
drop policy if exists "post_tag_assignments_all_authenticated" on public.post_tag_assignments;

create policy "post_tag_assignments_select_anon"
  on public.post_tag_assignments
  for select
  to anon
  using (true);

create policy "post_tag_assignments_all_authenticated"
  on public.post_tag_assignments
  for all
  to authenticated
  using (true)
  with check (true);
