-- Localized post copy used by the admin Albanian/English switch.
alter table public.posts
  add column if not exists title_sq text,
  add column if not exists title_en text,
  add column if not exists description_sq text,
  add column if not exists description_en text;

-- Keep existing Albanian content visible after the columns are introduced.
update public.posts
set
  title_sq = coalesce(nullif(title_sq, ''), title),
  description_sq = coalesce(nullif(description_sq, ''), description)
where title_sq is null
   or title_sq = ''
   or description_sq is null
   or description_sq = '';
