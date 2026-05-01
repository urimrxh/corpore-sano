-- Rich article body (HTML), separate from short description/excerpt used on cards and SEO.
alter table public.posts
  add column if not exists content_sq text,
  add column if not exists content_en text;
